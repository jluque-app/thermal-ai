# climate_data_improved.py
#
# Climate utilities designed to preserve the spirit of thermal2.py:
# - City-specific annualization via degree-hours below a base temperature (default 13°C)
# - If city tables are incomplete, compute degree-hours using Open-Meteo climate monthly means
#
# Also supports capture-time outdoor temperature via Open-Meteo Archive (hourly).
#
# NOTE: Your provided thermal2.py has list placeholders (ellipsis) in the city tables,
# so we treat the city table as optional and fall back to an API-based computation.

from __future__ import annotations

from typing import Optional, Tuple, Dict
import datetime as dt
import requests
import math

# --- Optional city table (extend manually if you want deterministic behavior) ---
# degree-hours below base temp (13°C) per year. (Not HDD; this is already hours*°C summed)
DEGREE_HOURS_BELOW_BASE_13C: Dict[Tuple[str, str], float] = {
    # Examples (you can overwrite with your calibrated numbers if available):
    ("Salamanca", "Spain"): 40000.0,
    ("Cordoba", "Spain"): 16000.0,
    ("Córdoba", "Spain"): 16000.0,
    ("Madrid", "Spain"): 30000.0,
    ("Barcelona", "Spain"): 22000.0,
    ("Budapest", "Hungary"): 52000.0,
    ("Gyor", "Hungary"): 50000.0,
    ("Győr", "Hungary"): 50000.0,
}

CITY_COORDS: Dict[Tuple[str, str], Tuple[float, float]] = {
    ("Salamanca", "Spain"): (40.9701, -5.6635),
    ("Cordoba", "Spain"): (37.8882, -4.7794),
    ("Córdoba", "Spain"): (37.8882, -4.7794),
    ("Madrid", "Spain"): (40.4168, -3.7038),
    ("Barcelona", "Spain"): (41.3851, 2.1734),
    ("Budapest", "Hungary"): (47.4979, 19.0402),
    ("Gyor", "Hungary"): (47.6875, 17.6504),
    ("Győr", "Hungary"): (47.6875, 17.6504),
}


def _parse_iso(datetime_iso: Optional[str]) -> Optional[dt.datetime]:
    if not datetime_iso:
        return None
    try:
        s = datetime_iso.replace("Z", "+00:00")
        return dt.datetime.fromisoformat(s)
    except Exception:
        return None


def _coords(city: Optional[str], country: Optional[str], lat: Optional[float], lon: Optional[float]) -> Optional[Tuple[float, float]]:
    if lat is not None and lon is not None:
        return (lat, lon)
    if city and country:
        return CITY_COORDS.get((city, country))
    return None


def get_outdoor_temperature_c(
    city: Optional[str] = None,
    country: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    datetime_iso: Optional[str] = None,
) -> Optional[float]:
    coords = _coords(city, country, latitude, longitude)
    when = _parse_iso(datetime_iso)
    if coords is None or when is None:
        return None

    date_str = when.date().isoformat()
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": coords[0],
        "longitude": coords[1],
        "start_date": date_str,
        "end_date": date_str,
        "hourly": "temperature_2m",
        "timezone": "UTC",
    }
    try:
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        times = data.get("hourly", {}).get("time", [])
        temps = data.get("hourly", {}).get("temperature_2m", [])
        if not times or not temps or len(times) != len(temps):
            return None

        target = when.replace(minute=0, second=0, microsecond=0)
        best_i = 0
        best_d = None
        for i, t in enumerate(times):
            try:
                tt = dt.datetime.fromisoformat(t)
            except Exception:
                continue
            d = abs((tt - target).total_seconds())
            if best_d is None or d < best_d:
                best_d = d
                best_i = i
        return float(temps[best_i])
    except Exception:
        return None


def degree_hours_below_base(
    base_temp_c: float,
    city: Optional[str] = None,
    country: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    prefer_city_table: bool = True,
) -> Optional[float]:
    """Return annual degree-hours below base temperature.
    - If city table has an entry (and prefer_city_table=True), return it (only if base=13).
    - Else compute from Open-Meteo Climate API monthly means (approx).
    """
    if prefer_city_table and abs(base_temp_c - 13.0) < 1e-6 and city and country:
        v = DEGREE_HOURS_BELOW_BASE_13C.get((city, country))
        if v is not None:
            return float(v)

    coords = _coords(city, country, latitude, longitude)
    if coords is None:
        return None

    # Open-Meteo climate API: monthly mean temp. Approximate degree-hours using 30-day months
    url = "https://climate-api.open-meteo.com/v1/climate"
    params = {
        "latitude": coords[0],
        "longitude": coords[1],
        "models": "ERA5",
        "monthly": "temperature_2m_mean",
    }
    try:
        r = requests.get(url, params=params, timeout=20)
        r.raise_for_status()
        data = r.json()
        temps = data.get("monthly", {}).get("temperature_2m_mean", [])
        if not temps or len(temps) != 12:
            return None

        # days per month (non-leap typical)
        days = [31,28,31,30,31,30,31,31,30,31,30,31]
        dh = 0.0
        for mtemp, d in zip(temps, days):
            diff = max(0.0, float(base_temp_c) - float(mtemp))
            dh += diff * d * 24.0
        return float(dh)
    except Exception:
        return None