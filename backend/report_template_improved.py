# report_template_improved.py
#
# Builds a report payload compatible with Gamma (frontend makes the API call).
# Includes:
# - Per-component results (wall/window/door) and totals
# - Both ΔT annualization and U+HDD annualization
# - User-editable inputs explicitly listed
# - Explanation of U-values and how to get them

from __future__ import annotations
from typing import Dict, Any

U_VALUE_EXPLANATION = (
    "U-value (W/m²·K) measures how easily heat passes through a building element. "
    "Lower U means better insulation; higher U means worse insulation. "
    "You can often find U-values in: (1) an EPC/energy audit, (2) renovation invoices/spec sheets, "
    "(3) manufacturer datasheets (windows/insulation), or (4) by selecting a typical material preset."
)

def build_gamma_payload(analysis: Dict[str, Any]) -> Dict[str, Any]:
    inputs = analysis.get("inputs", {})
    results = analysis.get("results", {})
    comps = results.get("components", {})
    totals = results.get("totals", {})
    artifacts = analysis.get("artifacts", {})

    city = inputs.get("city") or "Unknown city"
    country = inputs.get("country") or "Unknown country"
    dt_iso = inputs.get("datetime_iso") or "Unknown date"

    md_lines = []
    md_lines.append(f"# ThermalAI Heat Loss Report")
    md_lines.append("")
    md_lines.append(f"**Location:** {city}, {country}  ")
    md_lines.append(f"**Capture / analysis time:** {dt_iso}")
    md_lines.append("")
    md_lines.append("## 1) Visual evidence (thermal hotspot overlay)")
    md_lines.append("The red highlighted regions indicate areas in the thermal image above the selected percentile threshold.")
    md_lines.append("")
    md_lines.append("## 2) Inputs and assumptions")
    md_lines.append(f"- Indoor temperature: **{inputs.get('t_inside_c')} °C** (editable)")
    md_lines.append(f"- Outdoor temperature: **{inputs.get('t_outside_c')} °C** (source: {inputs.get('t_outside_source')})")
    md_lines.append(f"- Heating base temperature: **{inputs.get('heating_base_temp_c')} °C** (default 13°C; editable)")
    md_lines.append(f"- Annual degree-hours below base: **{inputs.get('degree_hours_annual')}** (source: {inputs.get('degree_hours_source')})")
    md_lines.append(f"- Fuel price: **€{inputs.get('fuel_price_eur_per_kwh')}/kWh** (editable)")
    md_lines.append(f"- Hotspot threshold: **{inputs.get('overlay_threshold_percentile')}th percentile** (editable)")
    md_lines.append("")
    md_lines.append("## 3) Results by façade component (wall / window / door)")
    md_lines.append("| Component | Hotspot area (m²) | Instantaneous (W) | Annual (kWh) ΔT-method | Annual (kWh) U-method |")
    md_lines.append("|---|---:|---:|---:|---:|")
    for k in ["wall","window","door"]:
        c = comps.get(k, {})
        md_lines.append(f"| {k.title()} | {c.get('hotspot_area_m2')} | {c.get('instantaneous_watts')} | {c.get('annual_kwh_delta')} | {c.get('annual_kwh_u')} |")
    md_lines.append("")
    md_lines.append("## 4) Totals (whole façade hotspot)")
    md_lines.append(f"- Instantaneous heat loss (ΔT proxy): **{totals.get('instantaneous_watts')} W**")
    md_lines.append(f"- Annual heat loss (ΔT annualized): **{totals.get('annual_kwh_delta')} kWh/year** → **€{totals.get('annual_cost_delta')} / year**")
    md_lines.append(f"- Annual heat loss (U+HDD method): **{totals.get('annual_kwh_u')} kWh/year** → **€{totals.get('annual_cost_u')} / year**")
    md_lines.append("")
    md_lines.append("### Long-horizon projections (ΔT annualized method)")
    proj = totals.get("multi_year_costs_delta", {}) or {}
    md_lines.append(f"- 5 years: **€{proj.get('5_years')}**")
    md_lines.append(f"- 10 years: **€{proj.get('10_years')}**")
    md_lines.append(f"- 20 years: **€{proj.get('20_years')}**")
    md_lines.append(f"- 30 years: **€{proj.get('30_years')}**")
    md_lines.append("")
    md_lines.append("## 5) What is a U-value and where do I find it?")
    md_lines.append(U_VALUE_EXPLANATION)
    md_lines.append("")
    md_lines.append("## 6) Notes and limitations")
    md_lines.append("- This is a private energy assessment and not a statutory EPC.")
    md_lines.append("- Accuracy depends on image quality, capture conditions (wind/sun), and correct geometry scaling.")
    md_lines.append("- If you provide measured façade dimensions, hotspot areas can be scaled more precisely.")

    md = "\n".join(md_lines)

    payload = {
        "title": f"ThermalAI Report — {city}",
        "format": "document",
        "export": "pdf",
        "content_markdown": md,
        "images": [
            {"name": "thermal_overlay", "data_base64_png": artifacts.get("overlay_image_base64_png")}
        ],
    }
    return payload