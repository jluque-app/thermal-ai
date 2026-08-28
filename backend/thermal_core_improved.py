"""
thermal_core_improved.py
========================
Core thermal screening utilities for the ThermalAI backend (audit-integration, v2).

Contents
--------
* Hotspot (thermal anomaly) detection restricted to an *active analysis mask*
  (facade pixels that also have valid interpolation support from registration).
* External combined heat-transfer coefficient h_tot = h_c(wind) + h_r(T).
* Dimensionally consistent instantaneous heat-loss proxy  Q_inst [W].
* Degree-hour annualisation with explicit validity flags (no silent clamping).
* U-value / degree-day comparative method.
* Multi-year cost projection with an explicit (kWh, price, inflation, discount)
  contract.  Returns the legacy "{n}_years" keys used by the report builders and
  a yearly breakdown.

All physical quantities carry SI units in their names or docstrings.
"""

from __future__ import annotations

import io
import math
import base64
from dataclasses import dataclass, field
from typing import Optional, Tuple, Dict, Any, List

import numpy as np
from PIL import Image

STEFAN_BOLTZMANN = 5.670374419e-8  # W/(m^2 K^4)


# --------------------------------------------------------------------------- #
# Hotspot detection
# --------------------------------------------------------------------------- #
@dataclass
class HotspotResult:
    mask: np.ndarray              # boolean (H, W)
    threshold: float              # grey-level threshold used
    hotspot_ratio: float          # hot pixels / active pixels
    hot_pixel_count: int
    total_pixels: int             # active pixels considered (legacy name)
    total_facade_pixels: int = 0  # same as total_pixels (kept for the audited API)
    status: str = "ok"            # "ok" | "empty_active_mask" | "flat_image"


def _to_gray_array(img: Image.Image) -> np.ndarray:
    """PIL image -> float32 grey array (0..255)."""
    if img.mode != "L":
        img = img.convert("L")
    return np.array(img, dtype=np.float32)


def detect_hotspot_mask(
    thermal_img: Image.Image,
    threshold_percentile: float = 95.0,
    active_analysis_mask: Optional[np.ndarray] = None,
    min_excess_relative: float = 1.5,
) -> HotspotResult:
    """
    Flag thermal anomalies *within the active analysis region only*.

    A pixel is an anomaly when its grey level is at least the P-th percentile of
    the active-region distribution AND at least `min_excess_relative` grey levels
    above the active-region median (guards against flagging the top 5 % of a
    perfectly uniform facade).

    If the active mask has no valid pixels the function returns an empty result
    with status "empty_active_mask".  It never falls back to whole-image
    statistics: an empty analysis region is *not* evidence of a defect-free wall.
    """
    arr = _to_gray_array(thermal_img)
    empty = np.zeros(arr.shape, dtype=bool)

    if active_analysis_mask is not None:
        if active_analysis_mask.shape != arr.shape:
            raise ValueError("active_analysis_mask shape must match the thermal image")
        valid = (active_analysis_mask > 0) & np.isfinite(arr)
        if not valid.any():
            return HotspotResult(empty, 0.0, 0.0, 0, 0, 0, "empty_active_mask")
        values = arr[valid]
        n_active = int(valid.sum())
    else:
        valid = np.isfinite(arr)
        values = arr[valid]
        n_active = int(valid.sum())

    if values.size == 0 or float(values.std()) < 1e-6:
        return HotspotResult(empty, float(values.mean()) if values.size else 0.0, 0.0, 0, n_active, n_active, "flat_image")

    pct_thr = float(np.percentile(values, threshold_percentile))
    med_val = float(np.median(values))
    thr = max(pct_thr, med_val + float(min_excess_relative))
    mask = (arr >= thr) & valid
    hot = int(mask.sum())
    ratio = float(hot) / float(n_active) if n_active > 0 else 0.0
    return HotspotResult(mask, thr, ratio, hot, n_active, n_active, "ok")


def overlay_mask_on_rgb(
    rgb_img: Image.Image,
    mask: np.ndarray,
    rgba_color: Tuple[int, int, int, int] = (255, 0, 0, 100),
) -> Image.Image:
    """RGBA overlay highlighting mask pixels (vectorised)."""
    base = np.array(rgb_img.convert("RGBA"), dtype=np.uint8)
    m = mask.astype(bool)
    if m.shape[:2] != base.shape[:2]:
        pil_m = Image.fromarray(m.astype(np.uint8) * 255).resize((base.shape[1], base.shape[0]), Image.Resampling.NEAREST)
        m = np.array(pil_m) > 0
    overlay = np.zeros_like(base, dtype=np.uint8)
    overlay[..., 0] = rgba_color[0]
    overlay[..., 1] = rgba_color[1]
    overlay[..., 2] = rgba_color[2]
    overlay[m, 3] = rgba_color[3]
    alpha = overlay[..., 3:4].astype(np.float32) / 255.0
    out = base.astype(np.float32)
    out[..., :3] = overlay[..., :3].astype(np.float32) * alpha + out[..., :3] * (1 - alpha)
    out[..., 3] = 255
    return Image.fromarray(out.astype(np.uint8), mode="RGBA")


def encode_image_to_base64_png(img: Image.Image) -> str:
    buff = io.BytesIO()
    img.save(buff, format="PNG")
    return base64.b64encode(buff.getvalue()).decode("utf-8")


# --------------------------------------------------------------------------- #
# Physics
# --------------------------------------------------------------------------- #
def calculate_external_heat_transfer_coefficient(
    wind_speed_m_s: float = 1.5,
    surface_temp_k: float = 275.0,
    sky_temp_k: Optional[float] = None,
    emissivity: float = 0.90,
) -> float:
    """
    Combined external surface coefficient h_tot = h_c + h_r  [W/(m^2 K)].

    h_c = 4.0 + 4.0 * v^0.75           (Jürges-type low-wind correlation, v in m/s, clamped >= 0.1)
    h_r = 4 * eps * sigma * T_mean^3    (linearised radiative exchange with the sky;
                                         T_mean = mean of surface and sky temperature,
                                         sky assumed 6 K below the surface when unknown)

    Default (v = 1.5 m/s, T_s = 275 K, eps = 0.90) evaluates to 13.53 W/(m^2 K):
    h_c = 4.0 + 4.0 * 1.5^0.75 = 9.42;  h_r = 4 * 0.90 * sigma * 272^3 = 4.11.
    """
    v = max(0.1, float(wind_speed_m_s))
    h_c = 4.0 + 4.0 * math.pow(v, 0.75)
    t_surf = max(200.0, float(surface_temp_k))
    t_sky = t_surf - 6.0 if sky_temp_k is None else max(200.0, float(sky_temp_k))
    t_mean = 0.5 * (t_surf + t_sky)
    h_r = 4.0 * float(emissivity) * STEFAN_BOLTZMANN * math.pow(t_mean, 3)
    return float(h_c + h_r)


def instantaneous_loss_proxy_watts(
    hotspot_area_m2: float,
    t_inside_c: float,
    t_outside_c: float,
    kappa_calibration: float = 0.05,
    h_ext: Optional[float] = None,
) -> float:
    """
    Instantaneous excess heat-loss proxy for the anomalous area [W]:

        Q_inst = A_anom [m^2] * kappa [-] * h_tot [W/(m^2 K)] * (T_in - T_out) [K]

    kappa is the dimensionless ratio between the surface-temperature excess of the
    anomaly and the indoor-outdoor air temperature difference.  The default 0.05
    is a screening calibration constant, not a measured property of any wall.
    """
    a_anom = max(0.0, float(hotspot_area_m2))
    delta_t = max(0.0, float(t_inside_c) - float(t_outside_c))
    kappa = max(0.0, float(kappa_calibration))
    h_tot = calculate_external_heat_transfer_coefficient() if h_ext is None else float(h_ext)
    if not math.isfinite(h_tot) or h_tot <= 0.0:
        raise ValueError("h_ext must be a positive finite number in W/(m^2 K)")
    return float(a_anom * kappa * h_tot * delta_t)


@dataclass
class AnnualisationResult:
    annual_kwh: float
    valid: bool
    status: str                     # "ok" | "delta_t_too_small" | "invalid_input" | "zero_loss"
    delta_t_capture_c: float
    degree_hours_annual: float
    conductance_w_per_k: Optional[float] = None
    warnings: List[str] = field(default_factory=list)


MIN_RELIABLE_DELTA_T_C = 5.0   # below this indoor-outdoor difference the proxy is not reported
MIN_VALID_DELTA_T_C = 1.0      # below this the estimate is refused outright


def annualize_proxy_kwh(
    instantaneous_watts: float,
    delta_t_capture_c: float,
    degree_hours_annual: float,
    *,
    strict: bool = False,
) -> AnnualisationResult:
    """
    Annualise the snapshot proxy with heating degree-hours:

        k        = Q_inst / dT_capture              [W/K]
        E_annual = k * HDH / 1000                   [kWh/year]

    Validity rules (no silent clamping):
      * non-finite or negative inputs                        -> invalid_input, 0 kWh
      * dT_capture < MIN_VALID_DELTA_T_C (1 K)               -> delta_t_too_small, 0 kWh
      * MIN_VALID <= dT_capture < MIN_RELIABLE (5 K)         -> value returned, valid=False,
                                                                 warning "low_delta_t_unreliable"
      * Q_inst == 0                                          -> zero_loss, valid=True

    With strict=True a ValueError is raised instead of returning an invalid result.
    """
    try:
        q = float(instantaneous_watts)
        dt = float(delta_t_capture_c)
        hdh = float(degree_hours_annual)
    except (TypeError, ValueError):
        if strict:
            raise ValueError("non-numeric annualisation input")
        return AnnualisationResult(0.0, False, "invalid_input", float("nan"), float("nan"))

    if not (math.isfinite(q) and math.isfinite(dt) and math.isfinite(hdh)) or q < 0 or hdh < 0:
        if strict:
            raise ValueError("annualisation inputs must be finite and non-negative")
        return AnnualisationResult(0.0, False, "invalid_input", dt, hdh)

    if dt < MIN_VALID_DELTA_T_C:
        if strict:
            raise ValueError(f"capture temperature difference {dt:.2f} K below {MIN_VALID_DELTA_T_C} K")
        return AnnualisationResult(0.0, False, "delta_t_too_small", dt, hdh,
                                   warnings=[f"delta_t_capture {dt:.2f} K < {MIN_VALID_DELTA_T_C} K; estimate refused"])

    if q == 0.0:
        return AnnualisationResult(0.0, True, "zero_loss", dt, hdh, 0.0)

    k = q / dt
    e = k * hdh / 1000.0
    warnings = []
    valid = True
    if dt < MIN_RELIABLE_DELTA_T_C:
        valid = False
        warnings.append(f"low_delta_t_unreliable: {dt:.2f} K < {MIN_RELIABLE_DELTA_T_C} K")
    return AnnualisationResult(round(e, 4), valid, "ok", dt, hdh, round(k, 6), warnings)


# --------------------------------------------------------------------------- #
# U-value comparative method
# --------------------------------------------------------------------------- #
U_VALUE_PRESETS: Dict[str, float] = {
    "uninsulated_brick_wall": 1.2,
    "uninsulated_brick": 1.7,
    "partially_insulated": 0.85,
    "insulated_wall": 0.3,
    "modern_insulated": 0.24,
    "deep_retrofit_passive": 0.14,
    "single_glazed_window": 2.8,
    "single_glazing": 4.8,
    "double_glazed_window": 1.1,
    "double_glazing_standard": 2.8,
    "double_glazing_low_e": 1.4,
    "triple_glazed_window": 0.8,
    "triple_glazing": 0.8,
    "solid_timber_door": 2.0,
    "insulated_composite_door": 1.0,
    "default": 1.0,
}


def infer_u_value(material: Optional[str]) -> float:
    """Indicative U-values [W/(m^2 K)] by material label; 'default' when unknown."""
    if not material:
        return U_VALUE_PRESETS["default"]
    return float(U_VALUE_PRESETS.get(str(material).lower().strip(), U_VALUE_PRESETS["default"]))


def annual_kwh_saved_u_method(u_current: float, u_improved: float, area_m2: float, heating_degree_days: float) -> float:
    """Annual saving [kWh] from a U-value upgrade over `area_m2` with `heating_degree_days` [K day]."""
    delta_u = max(float(u_current) - float(u_improved), 0.0)
    return round(delta_u * max(0.0, float(area_m2)) * max(0.0, float(heating_degree_days)) * 24.0 / 1000.0, 4)


def annual_total_loss_u_method(u_current: float, area_m2: float, heating_degree_days: float) -> float:
    """Theoretical annual transmission loss [kWh] = U * A * HDD * 24 / 1000."""
    return round(max(0.0, float(u_current)) * max(0.0, float(area_m2)) * max(0.0, float(heating_degree_days)) * 24.0 / 1000.0, 4)


# --------------------------------------------------------------------------- #
# Economics
# --------------------------------------------------------------------------- #
def compute_multi_year_costs(
    annual_kwh: float,
    energy_price_per_kwh: float = 0.25,
    inflation_rate: float = 0.03,
    discount_rate: float = 0.04,
    years: int = 30,
    horizons: Tuple[int, ...] = (1, 5, 10, 15, 20, 30),
) -> Dict[str, Any]:
    """
    Present value of the energy cost of `annual_kwh` [kWh/year] over time.

    price_y  = p0 * (1 + inflation)^(y-1)
    cost_y   = annual_kwh * price_y                       (nominal)
    pv_y     = cost_y / (1 + discount)^y                  (discounted)

    Returns
      "{n}_years"            cumulative discounted cost at each horizon (legacy report keys)
      "yearly_breakdown"     per-year price / nominal / discounted
      "cumulative_nominal", "cumulative_discounted"  over `years`
      "assumptions"          the parameters actually used
    """
    kwh = max(0.0, float(annual_kwh))
    p0 = max(0.0, float(energy_price_per_kwh))
    infl = float(inflation_rate)
    disc = float(discount_rate)
    n_years = max(int(years), max(horizons) if horizons else 1)

    yearly = []
    cum_nominal = 0.0
    cum_disc = 0.0
    out: Dict[str, Any] = {}
    for y in range(1, n_years + 1):
        price_y = p0 * math.pow(1.0 + infl, y - 1)
        cost_y = kwh * price_y
        pv_y = cost_y / math.pow(1.0 + disc, y)
        cum_nominal += cost_y
        cum_disc += pv_y
        yearly.append({"year": y, "price_per_kwh": round(price_y, 4), "cost_nominal": round(cost_y, 2), "cost_discounted": round(pv_y, 2)})
        if y in horizons:
            out[f"{y}_years"] = round(cum_disc, 2)
    out["yearly_breakdown"] = yearly[:int(years)]
    out["cumulative_nominal"] = round(cum_nominal, 2)
    out["cumulative_discounted"] = round(cum_disc, 2)
    out["assumptions"] = {"annual_kwh": round(kwh, 4), "energy_price_per_kwh": p0, "inflation_rate": infl, "discount_rate": disc, "years": n_years}
    return out
