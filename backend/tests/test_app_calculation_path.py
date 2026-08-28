"""Regression tests through the FastAPI /analyze calculation path (mock segmentation)."""
import io, json
import numpy as np, pytest
from PIL import Image
from fastapi.testclient import TestClient


def _png(arr):
    b = io.BytesIO(); Image.fromarray(arr).save(b, format="PNG"); return b.getvalue()


def _images(w=400, h=300, hot=True):
    rng = np.random.RandomState(1)
    rgb = rng.randint(80, 160, (h, w, 3), dtype=np.uint8)
    th = rng.randint(90, 110, (h, w), dtype=np.uint8)
    if hot:
        th[h // 3: h // 3 + 30, 20:80] = 240            # hot patch inside the wall
    return _png(rgb), _png(np.stack([th] * 3, -1))


def _analyze(app_module, **form):
    client = TestClient(app_module.app)
    rgb, th = _images()
    data = {"t_inside": "21", "t_outside": "1", "fuel_price_eur_per_kwh": "0.20", "facade_area_m2": "500",
            "city": "Gyor", "country": "Hungary", "inflation_rate": "0.02", "discount_rate": "0.05",
            "include_overlay_base64": "false"}
    data.update(form)
    r = client.post("/analyze", data=data, files={"rgb_image": ("r.png", rgb, "image/png"), "thermal_image": ("t.png", th, "image/png")})
    assert r.status_code == 200, r.text
    return r.json()["raw"]


def test_cost_projection_uses_kwh_price_and_rates(app_module):
    raw = _analyze(app_module)
    tot = raw["results"]["totals"]
    proj = tot["multi_year_costs_delta"]
    kwh = tot["annual_kwh_theoretical"]
    assert proj["assumptions"]["annual_kwh"] == pytest.approx(kwh, rel=1e-6)
    assert proj["assumptions"]["energy_price_per_kwh"] == 0.20
    assert proj["assumptions"]["inflation_rate"] == 0.02 and proj["assumptions"]["discount_rate"] == 0.05
    # first-year discounted cost = kWh * price / (1+dr)
    assert proj["1_years"] == pytest.approx(kwh * 0.20 / 1.05, rel=1e-3)
    assert "5_years" in proj and "30_years" in proj                      # legacy report keys preserved
    assert tot["multi_year_costs_hotspot_proxy"]["assumptions"]["annual_kwh"] == pytest.approx(tot["annual_kwh_delta"], rel=1e-6)


def test_physics_path_dimensional(app_module):
    raw = _analyze(app_module, wind_speed_mps="3.0")
    pa = raw["results"]["totals"]["physics_assumptions"]
    assert pa["kappa_calibration"] == 0.05 and pa["wind_speed_m_s_used"] == 3.0
    from thermal_core_improved import calculate_external_heat_transfer_coefficient
    assert pa["h_ext_w_per_m2k"] == pytest.approx(calculate_external_heat_transfer_coefficient(3.0, 274.15), abs=1e-3)
    wall = raw["results"]["components"]["wall"]
    expected_w = wall["hotspot_area_m2"] * 0.05 * pa["h_ext_w_per_m2k"] * 20.0
    assert wall["instantaneous_watts"] == pytest.approx(expected_w, rel=1e-3)
    expected_kwh = expected_w / 20.0 * raw["inputs"]["degree_hours_annual"] / 1000.0
    assert wall["annual_kwh_hotspot_delta"] == pytest.approx(expected_kwh, rel=1e-3)


def test_low_delta_t_is_flagged_not_clamped(app_module):
    raw = _analyze(app_module, t_inside="21", t_outside="20.5")
    assert raw["results"]["totals"]["annual_kwh_delta"] == 0.0
    flags = raw["inputs"]["analysis_flags"]
    assert any("delta_t" in f for f in flags)


def test_registration_diagnostics_propagated(app_module):
    raw = _analyze(app_module)
    reg = raw["inputs"]["registration"]
    for k in ("method", "reliable", "quality_label", "prior_source", "alignment_score_prior", "alignment_score_final",
              "support_coverage", "ecc_completed_levels", "ecc_diagnostics", "rejections", "engine_version"):
        assert k in reg, k
    assert raw["inputs"]["backend_version"].startswith("v2026")


def test_empty_active_region_gives_zero_not_global_detection(app_module):
    class EmptySeg:
        def predict_masks(self, img):
            import types
            w, h = img.size; z = np.zeros((h, w), bool)
            return types.SimpleNamespace(wall_mask=z, window_mask=z, door_mask=z, indexed=None,
                                         counts={"wall_pixels": 0, "window_pixels": 0, "door_pixels": 0, "total_pixels": w * h})
    old = app_module.SEG_MODEL
    app_module.SEG_MODEL = EmptySeg()
    try:
        raw = _analyze(app_module)
    finally:
        app_module.SEG_MODEL = old
    assert raw["results"]["totals"]["instantaneous_watts"] == 0.0
    assert raw["results"]["totals"]["physics_assumptions"]["hotspot_status"] == "empty_active_mask"
    assert any("empty_active_region" in f for f in raw["inputs"]["analysis_flags"])
