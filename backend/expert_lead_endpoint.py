# expert_lead_endpoint.py
import os
import json
import datetime as dt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

router = APIRouter()

LEADS_LOG_PATH = os.path.join(os.getenv("THERMALAI_LOG_DIR", "./logs"), "expert_leads.jsonl")

class LeadIn(BaseModel):
    email: EmailStr
    role: str = Field(..., max_length=50)  # e.g., "energy consultant"
    notes: str = Field("", max_length=300)

def _log_lead(record: dict):
    os.makedirs(os.path.dirname(LEADS_LOG_PATH), exist_ok=True)
    with open(LEADS_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

@router.post("/v1/expert/lead")
def capture_lead(lead: LeadIn):
    entry = {
        "ts_utc": dt.datetime.utcnow().isoformat(),
        "email": lead.email,
        "role": lead.role,
        "notes": lead.notes,
    }
    try:
        _log_lead(entry)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
