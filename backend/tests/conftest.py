"""
Test harness for the ThermalAI backend.

Heavy optional dependencies (torch, segment-anything, openai, stripe, psycopg2)
are stubbed so that the application calculation path can be exercised in CI
without a GPU, model weights or third-party credentials.  The segmentation model
is replaced by a deterministic mock.
"""
import sys, os, types, contextlib
import numpy as np
import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.insert(0, BACKEND)


def _stub(name, **attrs):
    mod = sys.modules.get(name) or types.ModuleType(name)
    for k, v in attrs.items():
        setattr(mod, k, v)
    sys.modules[name] = mod
    return mod


class _Compose:
    def __init__(self, *a, **k): pass
    def __call__(self, x): return x


_stub("torch", cuda=types.SimpleNamespace(is_available=lambda: False),
      inference_mode=lambda: contextlib.nullcontext(), load=lambda *a, **k: {},
      hub=types.SimpleNamespace(download_url_to_file=lambda *a, **k: None))
_stub("torchvision")
_stub("torchvision.transforms", Compose=_Compose, ToTensor=_Compose, Normalize=lambda *a, **k: _Compose(),
      Resize=lambda *a, **k: _Compose())
_stub("torchvision.models")
_stub("torchvision.models.segmentation", deeplabv3_resnet101=lambda *a, **k: None)
_stub("segment_anything", sam_model_registry={}, SamAutomaticMaskGenerator=object)
_stub("openai", OpenAI=object)
_stub("stripe")
_stub("psycopg2")
_stub("gdown", download=lambda *a, **k: None)


class MockSeg:
    """Deterministic facade segmentation: everything is wall except a central window."""
    def predict_masks(self, rgb_img):
        w, h = rgb_img.size
        wall = np.ones((h, w), dtype=bool)
        window = np.zeros((h, w), dtype=bool)
        window[h // 3: 2 * h // 3, w // 3: 2 * w // 3] = True
        wall &= ~window
        door = np.zeros((h, w), dtype=bool)
        counts = {"wall_pixels": int(wall.sum()), "window_pixels": int(window.sum()),
                  "door_pixels": int(door.sum()), "total_pixels": int(w * h)}
        return types.SimpleNamespace(wall_mask=wall, window_mask=window, door_mask=door, counts=counts, indexed=None)


@pytest.fixture(scope="session")
def app_module():
    import importlib
    try:
        import app_improved
    except Exception as exc:  # pragma: no cover
        pytest.skip(f"app_improved cannot be imported in this environment: {exc!r}")
    app_improved.SEG_MODEL = MockSeg()
    # no billing side effects in tests
    app_improved.billing_can_analyze_internal = lambda **kw: {"allowed": True, "reason": None}
    return app_improved
