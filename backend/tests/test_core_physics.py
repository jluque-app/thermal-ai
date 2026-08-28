import math
import numpy as np
import pytest
from PIL import Image

from thermal_core_improved import (
    detect_hotspot_mask, calculate_external_heat_transfer_coefficient, instantaneous_loss_proxy_watts,
    annualize_proxy_kwh, compute_multi_year_costs, annual_kwh_saved_u_method, annual_total_loss_u_method,
)


def test_h_ext_default_documented_value():
    h = calculate_external_heat_transfer_coefficient()
    assert abs(h - 13.53) < 0.02, h          # documented default, not 13.67
    assert calculate_external_heat_transfer_coefficient(wind_speed_m_s=4.0) > h


def test_q_inst_dimensional_form():
    h = calculate_external_heat_transfer_coefficient(1.5, 275.0)
    q = instantaneous_loss_proxy_watts(10.0, 21.0, 1.0, kappa_calibration=0.05, h_ext=h)
    assert abs(q - 10.0 * 0.05 * h * 20.0) < 1e-9
    assert instantaneous_loss_proxy_watts(10.0, 1.0, 21.0, h_ext=h) == 0.0   # no reverse flow
    with pytest.raises(ValueError):
        instantaneous_loss_proxy_watts(10.0, 21.0, 1.0, h_ext=0.0)           # no silent floor


def test_annualisation_no_silent_clamp():
    # the audited version returned 100 kWh here (silent 1 K clamp); equation gives 200 kWh but dT < 1 K is refused
    r = annualize_proxy_kwh(100.0, 0.5, 1000.0)
    assert r.annual_kwh == 0.0 and not r.valid and r.status == "delta_t_too_small"
    r = annualize_proxy_kwh(100.0, 2.0, 1000.0)          # 1 K <= dT < 5 K: value returned but flagged
    assert abs(r.annual_kwh - 50.0) < 1e-6 and not r.valid and r.warnings
    r = annualize_proxy_kwh(100.0, 20.0, 62000.0)
    assert r.valid and abs(r.annual_kwh - 310.0) < 1e-6 and r.status == "ok"
    for bad in (float("nan"), float("inf"), -1.0):
        assert not annualize_proxy_kwh(100.0, bad, 1000.0).valid
    assert not annualize_proxy_kwh(-5.0, 20.0, 1000.0).valid
    assert annualize_proxy_kwh(0.0, 20.0, 1000.0).status == "zero_loss"
    with pytest.raises(ValueError):
        annualize_proxy_kwh(100.0, 0.5, 1000.0, strict=True)


def test_multi_year_cost_contract_uses_kwh_and_price():
    out = compute_multi_year_costs(1000.0, energy_price_per_kwh=0.10, inflation_rate=0.0, discount_rate=0.0, years=5, horizons=(1, 5))
    assert out["1_years"] == 100.0 and out["5_years"] == 500.0
    assert out["yearly_breakdown"][0]["cost_nominal"] == 100.0
    out = compute_multi_year_costs(1000.0, energy_price_per_kwh=0.10, inflation_rate=0.03, discount_rate=0.04, years=1, horizons=(1,))
    assert abs(out["1_years"] - 100.0 / 1.04) < 0.01
    assert out["assumptions"]["energy_price_per_kwh"] == 0.10


def test_hotspot_empty_and_flat_masks():
    img = Image.fromarray(np.random.RandomState(0).randint(50, 200, (100, 100), dtype=np.uint8))
    r = detect_hotspot_mask(img, 95.0, active_analysis_mask=np.zeros((100, 100), bool))
    assert r.hot_pixel_count == 0 and r.status == "empty_active_mask" and r.hotspot_ratio == 0.0
    flat = Image.fromarray(np.full((100, 100), 128, np.uint8))
    assert detect_hotspot_mask(flat, 95.0).hot_pixel_count == 0
    # statistics are computed inside the mask: a hot corner outside the mask must not drive the threshold
    arr = np.full((100, 100), 100, np.uint8); arr[:10, :10] = 255; arr[50, 50] = 110
    m = np.ones((100, 100), bool); m[:10, :10] = False
    r = detect_hotspot_mask(Image.fromarray(arr), 95.0, active_analysis_mask=m)
    assert r.threshold <= 110 and r.mask[50, 50] and not r.mask[0, 0]


def test_u_methods():
    assert annual_kwh_saved_u_method(1.7, 0.3, 100.0, 2500.0) == pytest.approx(1.4 * 100 * 2500 * 24 / 1000)
    assert annual_total_loss_u_method(1.7, 100.0, 2500.0) == pytest.approx(1.7 * 100 * 2500 * 24 / 1000)
