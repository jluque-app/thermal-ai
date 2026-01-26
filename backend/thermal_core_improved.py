# thermal_core_improved.py
#
# Core image/physics utilities for ThermalAI backend.
# - Hotspot detection from thermal image (percentile threshold)
# - Overlay generation (fast vectorized)
# - ΔT-based instantaneous heat loss proxy (your original philosophy: no U-values required)
# - ΔT annualization via degree-hours (city/coords dependent)
# - U-value + HDD annualization (optional comparative method)
#
# NOTE: The ΔT-based method is a calibrated proxy. It becomes more accurate if hotspot area scaling is accurate.

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Dict, Tuple, Any

import numpy as np
from PIL import Image
import io
import base64


@dataclass
class HotspotResult:
    mask: np.ndarray              # boolean mask (H, W)
    threshold: float              # threshold used in grayscale units
    hotspot_ratio: float          # fraction of pixels in hotspot
    hot_pixel_count: int
    total_pixels: int


def _to_gray_array(img: Image.Image) -> np.ndarray:
    return np.array(img.convert("L"))


def detect_hotspot_mask(
    thermal_img: Image.Image,
    threshold_percentile: float = 95.0
) -> HotspotResult:
    arr = _to_gray_array(thermal_img).astype(np.float32)
    thr = float(np.percentile(arr, threshold_percentile))
    mask = arr >= thr
    hot = int(mask.sum())
    total = int(mask.size)
    ratio = float(hot) / float(total) if total else 0.0
    return HotspotResult(mask=mask, threshold=thr, hotspot_ratio=ratio, hot_pixel_count=hot, total_pixels=total)


def overlay_mask_on_rgb(
    rgb_img: Image.Image,
    mask: np.ndarray,
    rgba_color: Tuple[int, int, int, int] = (255, 0, 0, 100),
) -> Image.Image:
    """Creates an RGBA overlay highlighting mask pixels. Vectorized (fast)."""
    base = np.array(rgb_img.convert("RGBA"), dtype=np.uint8)
    overlay = np.zeros_like(base, dtype=np.uint8)
    overlay[..., 0] = rgba_color[0]
    overlay[..., 1] = rgba_color[1]
    overlay[..., 2] = rgba_color[2]
    overlay[..., 3] = 0  # alpha set only on mask
    overlay[mask, 3] = rgba_color[3]

    # Alpha composite: out = overlay + base*(1-alpha)
    alpha = overlay[..., 3:4].astype(np.float32) / 255.0
    out = base.astype(np.float32)
    out[..., :3] = (overlay[..., :3].astype(np.float32) * alpha + out[..., :3] * (1 - alpha))
    out[..., 3] = 255  # full opacity output
    return Image.fromarray(out.astype(np.uint8), mode="RGBA")


def encode_image_to_base64_png(img: Image.Image) -> str:
    buff = io.BytesIO()
    img.save(buff, format="PNG")
    return base64.b64encode(buff.getvalue()).decode("utf-8")


# -------------------------
# Your ΔT proxy method
# -------------------------

def instantaneous_loss_proxy_watts(
    hotspot_area_m2: float,
    t_inside_c: float,
    t_outside_c: float,
    scale_w_per_m2k: float = 1.0
) -> float:
    """Proxy instantaneous heat loss (W).
    We preserve your original 'temperature difference drives losses' approach without U-values.
    scale_w_per_m2k is a calibration knob (default 1.0).
    """
    delta_t = float(t_inside_c) - float(t_outside_c)
    return round(max(0.0, hotspot_area_m2) * max(0.0, delta_t) * float(scale_w_per_m2k), 4)


def annualize_proxy_kwh(
    instantaneous_watts: float,
    delta_t_capture_c: float,
    degree_hours_annual: float
) -> float:
    """Annualize the snapshot proxy.
    k = W / °C at capture time.
    Annual Wh = k * degree_hours_annual
    """
    if delta_t_capture_c <= 0:
        return 0.0
    k_w_per_c = float(instantaneous_watts) / float(delta_t_capture_c)
    annual_wh = k_w_per_c * float(degree_hours_annual)
    return round(annual_wh / 1000.0, 4)  # kWh


# -------------------------
# U-value + HDD method (optional comparative)
# -------------------------

U_VALUE_PRESETS: Dict[str, float] = {
    "uninsulated_brick_wall": 1.2,
    "insulated_wall": 0.3,
    "single_glazed_window": 2.8,
    "double_glazed_window": 1.1,
    "triple_glazed_window": 0.8,
    "default": 1.0
}

def infer_u_value(material: Optional[str]) -> float:
    if not material:
        return U_VALUE_PRESETS["default"]
    return float(U_VALUE_PRESETS.get(material, U_VALUE_PRESETS["default"]))


def annual_kwh_saved_u_method(
    u_current: float,
    u_improved: float,
    area_m2: float,
    heating_degree_days: float
) -> float:
    delta_u = max(float(u_current) - float(u_improved), 0.0)
    annual_kwh = delta_u * float(area_m2) * float(heating_degree_days) * 24.0 / 1000.0
    return round(annual_kwh, 4)


def compute_multi_year_costs(
    annual_cost_eur: float,
    horizons=(1, 5, 10, 20, 30),
    discount_rate: Optional[float] = None
) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for n in horizons:
        if discount_rate is None:
            out[f"{n}_years"] = round(float(annual_cost_eur) * n, 2)
        else:
            r = float(discount_rate)
            if r <= 0:
                out[f"{n}_years"] = round(float(annual_cost_eur) * n, 2)
            else:
                pv = float(annual_cost_eur) * ((1 - (1 + r) ** (-n)) / r)
                out[f"{n}_years"] = round(pv, 2)
    return out