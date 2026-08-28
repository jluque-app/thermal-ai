import numpy as np, cv2, pytest
from PIL import Image
import registration_engine as re_
from registration_engine import MultiModalImageAligner, resize_pixel_map, validate_homography_domain, plausibility_check, polarity_invariant_edges


def _grid(shift=0, size=400, step=40):
    im = np.zeros((size, size, 3), np.uint8)
    for i in range(20, size - 20, step):
        for j in range(20, size - 20, step):
            cv2.rectangle(im, (i + shift, j + shift), (i + 20 + shift, j + 20 + shift), (255, 255, 255), -1)
    return im


def test_resize_pixel_map_half_pixel_offset():
    C = resize_pixel_map((640, 512), (1280, 1024))
    assert C[0, 0] == 2.0 and C[0, 2] == 0.5 and C[1, 2] == 0.5


def test_safe_float_handles_rational_and_tuple():
    class R:
        def __float__(self): return 9.0
    assert MultiModalImageAligner._safe_float(R()) == 9.0
    assert MultiModalImageAligner._safe_float((24, 1)) == 24.0
    assert MultiModalImageAligner._safe_float(None) is None


def test_projective_pole_rejected():
    H = np.array([[1, 0, 0], [0, 1, 0], [-0.01, 0, 1.0]])   # pole at x = 100 inside a 400 px frame
    with pytest.raises(ValueError):
        validate_homography_domain(H, (400, 300))


def test_plausibility_gate():
    ok = np.array([[1.02, 0, 3], [0, 1.01, -4], [1e-6, 0, 1]])
    bad = np.array([[1.6, 0, 3], [0, 1.0, -4], [0, 0, 1]])   # anisotropic and off-scale
    assert plausibility_check(ok, np.eye(3), (1280, 960), (1280, 960))["plausible"]
    assert not plausibility_check(bad, np.eye(3), (1280, 960), (1280, 960))["plausible"]


def test_polarity_invariance():
    g = cv2.cvtColor(_grid(), cv2.COLOR_BGR2GRAY)
    e1 = polarity_invariant_edges(g); e2 = polarity_invariant_edges(255 - g)
    assert np.abs(e1.astype(int) - e2.astype(int)).mean() < 2.0


def test_ecc_failure_keeps_sift_label(monkeypatch):
    def failing(*a, **k):
        return a[2], [{"level": l, "converged": False, "error": "forced"} for l in (2, 1, 0)]
    monkeypatch.setattr(re_, "refine_ecc_pyramid", failing)
    res = MultiModalImageAligner().register(Image.fromarray(_grid()), Image.fromarray(_grid(shift=3)))
    assert res.metadata["ecc_completed_levels"] == 0
    assert res.method_used in ("sift_magsac", "sensor_prior")   # never labelled as ECC-refined
    assert "ecc_diagnostics" in res.metadata


def test_same_dims_prior_is_identity_and_deterministic():
    a = MultiModalImageAligner(); rgb = Image.fromarray(_grid()); th = Image.fromarray(_grid(shift=4))
    r1 = a.register(rgb, th); r2 = a.register(rgb, th)
    assert r1.metadata["prior_source"] == "identity_same_dims"
    assert np.allclose(r1.homography_matrix, r2.homography_matrix)
    assert r1.metadata["alignment_score_final"] is None or r1.metadata["alignment_score_final"] >= (r1.metadata["alignment_score_prior"] or -1) - 0.011


def test_exif_sensor_prior_scale():
    a = MultiModalImageAligner()
    H0, src = a.sensor_prior((4056, 3040), (640, 512), {"focal_length_35mm": 24}, {"focal_length_35mm": 58})
    assert src == "exif_f35" and abs(H0[0, 0] - 4056 * 24 / (640 * 58)) < 1e-9
    H0, src = a.sensor_prior((4056, 3040), (640, 512), {"model": "ZH20T"}, {"model": "ZH20T"})
    assert src.startswith("camera_table")
    H0, src = a.sensor_prior((4056, 3040), (640, 512), {}, {})
    assert src == "plain_rescale_no_prior"
