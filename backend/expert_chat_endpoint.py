# expert_chat_endpoint.py
import os
import json
import uuid
import datetime as dt
from typing import Optional, Dict, Any
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from openai import OpenAI

router = APIRouter()

# -----------------------------
# Rate limiting (simple, in-memory)
# -----------------------------
_rate_limits = defaultdict(list)  # ip -> [timestamps]


def _check_rate(ip: str) -> bool:
    now = dt.datetime.utcnow().timestamp()
    window = 3600  # 1 hour
    limit = 25     # max 25 calls/hour per IP

    calls = _rate_limits[ip]
    _rate_limits[ip] = [t for t in calls if now - t < window]
    if len(_rate_limits[ip]) >= limit:
        return False
    _rate_limits[ip].append(now)
    return True


def _get_client_ip(request: Request) -> str:
    # Behind CF/Render you may get forwarded headers
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


# -----------------------------
# Prompting (v1, no RAG yet)
# -----------------------------
SYSTEM_PROMPT = """
You are ThermalAI Expert, a specialized AI assistant in thermal imaging, building physics,
and energy efficiency applied to real estate.

You provide scientifically grounded, technically accurate and regulation-aware explanations
based only on publicly available knowledge.

When responding, follow this structure when relevant:

1) Likely interpretation: 2–5 bullets (what the observation could indicate)
2) Confounders / pitfalls: 2–6 bullets (emissivity, reflections, wind, moisture, ΔT, settings)
3) Verification checklist: 3–8 bullets (what to check onsite / with extra data)
4) If the user asks for numbers or reporting: one sentence directing them to the ThermalAI App
   (do not mention savings; do not mention ROI or subsidies)

Rules:
- Always state assumptions and limitations.
- Distinguish what thermal imaging can indicate vs what it cannot prove.
- Do NOT claim certified audit status or official guarantees.
- Do NOT mention guaranteed savings, retrofit ROI, or subsidy eligibility.
- Do not invent citations or claim to have read proprietary documents.
Tone: professional, precise, accessible.

### ThermalAI's Own Scientific Model

ThermalAI uses an image-based heat-loss screening pipeline:
1. **AI Segmentation** (SAM): RGB images are segmented into wall, window, and door masks.
2. **Hotspot Detection**: Thermal images are analyzed using percentile thresholding (default: 95th
   percentile) to identify thermally anomalous areas. Hotspots are clipped to the façade mask
   (excluding ground, cars, sky).
3. **ΔT Proxy Method**: Instantaneous heat loss is estimated as:
   Q_inst = A_hotspot × (T_inside − T_outside) × scale_factor [W]
   This is then annualized using degree-hours:
   k = Q_inst / ΔT_capture; Annual_kWh = k × degree_hours / 1000
4. **U-value Comparative Method**: If U-values are provided (current vs improved), savings are
   computed as: ΔQ_annual = (U_current − U_improved) × Area × HDD × 24 / 1000 [kWh/yr]
5. Both methods run in parallel per component (wall, window, door).

This is a *screening-level* approach: it provides directional estimates from field imagery without
requiring access to construction drawings or detailed material data.

### Thermal Bridges and the Ψ Coefficient

A thermal bridge is a localized disruption in the thermal envelope's homogeneity (geometry or
conductivity) that causes increased heat transfer and localized surface temperature drops.
Common locations: window-to-wall junctions, balcony connections, corners, lintels.

The **linear thermal transmittance coefficient Ψ** [W/(m·K)] quantifies the *additional* heat
flow caused by a thermal bridge beyond what 1D U-value calculations predict:
  Ψ = (Q_total − Q_ref) / (ΔT × L)
where Q_total is the actual heat flow through the junction (from 2D/3D FEM), Q_ref is the
sum of reference component flows, ΔT is the indoor-outdoor temperature difference, and L is
the bridge length.

Thermal bridges can account for 5–10% of total building heat losses. Window-to-wall junctions
are a major contributor, especially in well-insulated buildings where the relative share of
thermal bridge losses increases.

**EN ISO 14683** provides catalog Ψ-values for common junction types. **EN ISO 10211** defines
the numerical simulation methodology (2D/3D FEM, e.g., TRISCO, THERM, COMSOL). Catalog values
may differ by ~20% from actual values; numerical simulations are ~95% consistent.

### AI-Based Thermal Bridge Analysis (Scientific Reports, Nature, 2025)

A recent peer-reviewed publication (Scientific Reports, 2025, s41598-025-16811-x) proposes
using a Mamdani-type Fuzzy System (FS) as a surrogate model for predicting Ψ at window-to-wall
connections. Key aspects:

- **Training data**: 378 samples from 3D FEM simulations (TRISCO, EN ISO 10211 compliant)
- **Inputs (5 variables)**:
  1. λ_w: thermal conductivity of load-bearing wall layer [W/(m·K)]
  2. th_w: thickness of load-bearing wall [cm]
  3. λ_i: thermal conductivity of insulation [W/(m·K)]
  4. th_i: thickness of insulation [mm]
  5. o: window offset into the insulation layer [mm]
- **Output**: Ψ [W/(m·K)]
- **Accuracy**: RMSE = 2.23 × 10⁻⁴ (extremely precise)
- **Key findings**:
  * Shifting windows into the insulation layer can reduce Ψ by up to 40%
  * Insulation material type and thickness have the dominant influence
  * Higher wall material λ_w → lower Ψ (counterintuitive)
  * The FS generalizes well to unseen configurations within the training range
  * Unlike neural networks, fuzzy rules are interpretable ("gray box")

### How ThermalAI Differs from the Nature Article Approach

| Aspect | ThermalAI | Nature Article FS |
|---|---|---|
| Purpose | Field screening of existing buildings | Design-time optimization of new construction |
| Input | Thermal + RGB images | Geometric/material parameters only |
| Scope | Full façade (wall + window + door) | Window-to-wall junction only |
| Physics | ΔT proxy + U-value method | 3D FEM → Fuzzy surrogate of Ψ |
| AI role | Segmentation (SAM) + hotspot detection | Approximation of FEM results |
| Thermal bridges | Partially captured by hotspot detection, but not explicitly quantified as Ψ | Explicitly quantified as Ψ |
| Standards | Implicit (U-value lookups) | Explicit (EN ISO 10211, 14683, 6946) |

When a user asks about thermal bridges visible in their thermal images (e.g., warm lines along
window frames), explain that ThermalAI's hotspot detection captures these visually but
attributes them to wall or window area. The Ψ coefficient approach from the scientific
literature would provide a more precise quantification of the junction-specific loss.
Both approaches are complementary: ThermalAI for rapid field screening, FEM/FS methods for
detailed design optimization.

### Important Positioning
ThermalAI is a screening and decision-support tool. It is NOT a certified energy audit,
NOT a regulatory compliance certificate, and NOT a replacement for detailed engineering analysis.
The Nature article's FS approach is likewise a surrogate model, not a replacement for full FEM.
Both tools accelerate professional workflows but require domain expertise for interpretation.
""".strip()

MODE_INSTRUCTIONS = {
    "Explain": (
        "Explain mode: focus on clear building-physics concepts and thermal imaging fundamentals."
    ),
    "Interpret": (
        "Interpretation mode: list plausible causes and confounders (emissivity, reflections, wind, moisture, "
        "temperature gradient, camera settings). Use uncertainty language. Include what to verify onsite."
    ),
    "DecisionSupport": (
        "Decision-support mode: frame implications for real estate due diligence and risk, "
        "without overclaiming. Highlight what additional data would change confidence."
    ),
}

SAFETY_RULES = (
    "Constraints:\n"
    "- Do NOT claim this is a certified audit or official calculation.\n"
    "- Do NOT mention guaranteed savings, subsidy eligibility, or retrofit ROI.\n"
    "- Do NOT invent citations or claim to have read proprietary documents.\n"
    "- Always state assumptions and limitations.\n"
    "- Distinguish 'indicates' vs 'proves'.\n"
    "- If the user asks for quantification or formal reporting, direct them to ThermalAI App.\n"
)

# -----------------------------
# IO models
# -----------------------------
class ChatIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    mode: Optional[str] = Field(default="Explain")  # Explain | Interpret | DecisionSupport
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ChatOut(BaseModel):
    answer: str
    session_id: str


# -----------------------------
# Logging (JSONL)
# -----------------------------
LOG_DIR = os.getenv("THERMALAI_LOG_DIR", "./logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_PATH = os.path.join(LOG_DIR, "expert_chat.jsonl")


def _append_log(record: Dict[str, Any]) -> None:
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception:
        pass


# -----------------------------
# OpenAI client (cached)
# -----------------------------
_OPENAI_CLIENT: Optional[OpenAI] = None


def _get_openai_client() -> OpenAI:
    global _OPENAI_CLIENT
    if _OPENAI_CLIENT is None:
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set.")
        _OPENAI_CLIENT = OpenAI(api_key=api_key)
    return _OPENAI_CLIENT


def _normalize_mode(mode: Optional[str]) -> str:
    if not mode:
        return "Explain"
    m = mode.strip()
    ml = m.lower()
    if ml in ("decision", "decision_support", "decision-support", "decisionsupport"):
        return "DecisionSupport"
    if ml in ("interpretation",):
        return "Interpret"
    if m not in MODE_INSTRUCTIONS:
        return "Explain"
    return m


def _model_name() -> str:
    return (os.getenv("THERMALAI_EXPERT_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini")


def _call_llm(user_message: str, mode: str) -> str:
    client = _get_openai_client()
    chosen_mode = _normalize_mode(mode)
    mode_text = MODE_INSTRUCTIONS.get(chosen_mode, MODE_INSTRUCTIONS["Explain"])
    model_name = _model_name()

    resp = client.chat.completions.create(
        model=model_name,
        temperature=0.3,
        max_tokens=1200,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "system", "content": f"Mode: {chosen_mode}\n{mode_text}\n\n{SAFETY_RULES}"},
            {"role": "user", "content": (user_message or "").strip()},
        ],
    )
    return (resp.choices[0].message.content or "").strip()


def _wants_quantification(user_text: str) -> bool:
    t = (user_text or "").lower()
    keywords = [
        "quantify", "estimate", "kwh", "kw", "watts", "watt", "cost", "€", "euro",
        "report", "calculate", "calculation", "annual", "yearly",
    ]
    return any(k in t for k in keywords)


def _maybe_append_cta(answer: str, user_text: str) -> str:
    if not _wants_quantification(user_text):
        return answer
    if "ThermalAI App" in answer:
        return answer
    return answer + (
        "\n\nIf you want to quantify heat losses under defined assumptions and generate a professional report, "
        "run an analysis in the ThermalAI App."
    )


# -----------------------------
# Endpoint
# -----------------------------
@router.post("/v1/expert/chat", response_model=ChatOut)
def expert_chat(payload: ChatIn, request: Request) -> ChatOut:
    ip = _get_client_ip(request)
    if not _check_rate(ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

    session_id = payload.session_id or str(uuid.uuid4())
    mode = _normalize_mode(payload.mode)

    try:
        answer = _call_llm(payload.message, mode)
        answer = _maybe_append_cta(answer, payload.message)
    except Exception as e:
        print("ERROR in /v1/expert/chat:", repr(e))
        raise HTTPException(status_code=500, detail=f"Expert chat failed: {type(e).__name__}: {e}")

    _append_log({
        "ts_utc": dt.datetime.utcnow().isoformat(),
        "session_id": session_id,
        "mode": mode,
        "message": payload.message,
        "metadata": payload.metadata or {},
        "model": _model_name(),
        "ip": ip,
    })

    return ChatOut(answer=answer, session_id=session_id)
