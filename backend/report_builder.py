from datetime import datetime, timezone

def _safe(v, default=None):
    return v if v is not None else default

def build_report(raw: dict) -> dict:
    inputs = raw.get("inputs", {}) or {}
    results = raw.get("results", {}) or {}
    totals = results.get("totals", {}) or {}
    comps = results.get("components", {}) or {}

    annual_kwh = totals.get("annual_kwh_theoretical")
    annual_cost = totals.get("annual_cost_theoretical")

    # Component breakdown using annual_kwh_delta by component
    rows = []
    total = float(annual_kwh) if isinstance(annual_kwh, (int, float)) and annual_kwh > 0 else None
    price = inputs.get("fuel_price_eur_per_kwh")
    currency = "EUR"

    label_map = {
        "wall": "Wall",
        "window": "Openings/windows",
        "door": "Door",
    }

    for key, c in comps.items():
        if key.lower() == "roof":
            continue
            
        kwh = c.get("annual_kwh_total_loss")
        cost = (kwh * price) if isinstance(kwh, (int, float)) and isinstance(price, (int, float)) else None
        share = (100.0 * kwh / total) if total and isinstance(kwh, (int, float)) else None
        rows.append({
            "label": label_map.get(key, key),
            "heat_loss_kwh": kwh,
            "cost_eur": cost,
            "share_pct": share,
        })

    # Hotspot proxy info (you currently have hotspot pixels but not per-hotspot objects)
    # We'll keep it conservative: "count" unknown -> use null or a computed proxy.
    wall = comps.get("wall", {}) or {}
    win = comps.get("window", {}) or {}
    door = comps.get("door", {}) or {}

    hotspot_notes = []
    # Simple, explainable notes based on ratios
    def ratio_note(component_label, ratio):
        if isinstance(ratio, (int, float)):
            pct = ratio * 100.0
            if pct >= 7:
                hotspot_notes.append(f"Relatively concentrated hotspots in {component_label} (≈{pct:.1f}% of area flagged).")
            elif pct >= 3:
                hotspot_notes.append(f"Moderate hotspot presence in {component_label} (≈{pct:.1f}% of area flagged).")
            else:
                hotspot_notes.append(f"Low hotspot presence in {component_label} (≈{pct:.1f}% of area flagged).")

    ratio_note("walls", wall.get("hotspot_ratio_in_component"))
    ratio_note("windows/openings", win.get("hotspot_ratio_in_component"))
    ratio_note("doors", door.get("hotspot_ratio_in_component"))

    # Confidence heuristic (simple + defensible)
    # Based on whether we have segmentation counts + facade area + degree-hours + user-provided outdoor temp
    score = 0
    if inputs.get("segmentation_counts"): score += 1
    if inputs.get("facade_area_m2"): score += 1
    if inputs.get("degree_hours_annual"): score += 1
    if inputs.get("t_outside_source") == "user_input": score += 1

    if score >= 4:
        confidence = "Medium"  # keep conservative by default
    elif score >= 2:
        confidence = "Low"
    else:
        confidence = "Low"

    key_driver = None
    # crude driver: highest component kWh
    if rows:
        top = max([r for r in rows if isinstance(r.get("heat_loss_kwh"), (int, float))], key=lambda r: r["heat_loss_kwh"], default=None)
        if top:
            key_driver = f"Most estimated losses attributed to {top['label']}."

    # --- FIX: Calculate Financials & CO2 for Frontend ---
    co2_kg = round(annual_kwh * 0.2, 0) if annual_kwh else None
    
    # Financial projections (polishing the 'financials' object Results.jsx expects)
    # Savings often = 100% of losses (theoretical max) or a % of it? 
    # The frontend labels it "Est. Energy Savings" vs "Cost of Inaction". 
    # "Cost of Inaction" is simply the cumulative cost of heat loss.
    # "Savings" is usually the same in these simple models (if you retrofit, you save the loss).
    
    financials = {}
    if annual_cost:
        financials["cost_1y"] = f"{annual_cost:,.0f}"
        financials["savings_1y"] = f"{annual_cost:,.0f}"
        
        financials["cost_5y"] = f"{annual_cost * 5:,.0f}"
        financials["savings_5y"] = f"{annual_cost * 5:,.0f}"
        
        financials["cost_15y"] = f"{annual_cost * 15:,.0f}"
        financials["savings_15y"] = f"{annual_cost * 15:,.0f}"
    
    # Present Value (15y)
    pv_eur = annual_cost * 15 if annual_cost else None

    # --- FIX: Restructure Breakdown for Results.jsx ---
    # Results.jsx expects 'walls_kwh' and 'windows_kwh' directly in report.breakdown
    breakdown_flat = {"by_component": rows}
    
    # Extract specific components for the flat keys
    wall_data = next((r for r in rows if "Wall" in r["label"]), None)
    window_data = next((r for r in rows if "window" in r["label"].lower()), None)
    
    if wall_data:
        breakdown_flat["walls_kwh"] = wall_data["heat_loss_kwh"]
    if window_data:
        breakdown_flat["windows_kwh"] = window_data["heat_loss_kwh"]
        
    # Also ensure there are reasonable defaults if missing (avoid frontend crashes)
    if "walls_kwh" not in breakdown_flat: breakdown_flat["walls_kwh"] = 0
    if "windows_kwh" not in breakdown_flat: breakdown_flat["windows_kwh"] = 0

    report = {
        "meta": {
            "analysis_id": raw.get("analysis_id") or raw.get("meta", {}).get("analysis_id") or None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "city": inputs.get("city"),
            "currency": currency,
            "units": {"energy": "kWh/year", "cost": "EUR/year", "area": "m²"},
        },
        "headline": {
            "estimated_annual_heat_loss_kwh": annual_kwh,
            "estimated_annual_cost_eur": annual_cost,
            "estimated_co2_emissions_kg": co2_kg,
            "present_value_eur": pv_eur,
            "confidence": confidence,
            "key_driver": key_driver,
        },
        "breakdown": breakdown_flat,
        "financials": financials,
        "hotspots": {
            "count": None,  # you don't yet have hotspot instances; keep honest
            "severity": {"high": None, "medium": None, "low": None},
            "notes": hotspot_notes[:6],
        },
        "assumptions": [
            {
                "name": "Indoor setpoint",
                "value": f"{_safe(inputs.get('t_inside_c'), '—')}°C",
                "why_it_matters": "Sets the temperature difference (ΔT) vs. outside conditions, driving heat-loss estimates.",
            },
            {
                "name": "Outdoor temperature",
                "value": f"{_safe(inputs.get('t_outside_c'), '—')}°C ({_safe(inputs.get('t_outside_source'), 'unknown')})",
                "why_it_matters": "Heat loss is proportional to ΔT; outdoor inputs strongly affect estimates.",
            },
            {
                "name": "Annual degree-hours",
                "value": f"{_safe(inputs.get('degree_hours_annual'), '—')} (source: {_safe(inputs.get('degree_hours_source'), '—')})",
                "why_it_matters": "Scales instantaneous heat flow into an annualized energy estimate.",
            },
            {
                "name": "Energy price",
                "value": f"{_safe(inputs.get('fuel_price_eur_per_kwh'), '—')} EUR/kWh",
                "why_it_matters": "Converts estimated kWh/year into an indicative annual cost.",
            },
            {
                "name": "Facade area",
                "value": f"{_safe(inputs.get('facade_area_m2'), '—')} m² (source: {_safe(inputs.get('component_area_source'), '—')})",
                "why_it_matters": "Used to scale pixel-based detections into approximate real-world areas.",
            },
            {
                "name": "Hotspot threshold",
                "value": f"{_safe(inputs.get('overlay_threshold_percentile'), '—')}th percentile",
                "why_it_matters": "Controls what is flagged as an anomaly; higher thresholds typically produce fewer hotspots.",
            },
        ],
        "disclaimer": [
            "Indicative thermal assessment based on images and simplified modelling.",
            "Not an official EPC / energy performance certificate and not a substitute for an on-site inspection.",
            "Results depend on camera setup, emissivity, weather conditions, façade materials, and user inputs.",
        ],
    }

    return report
