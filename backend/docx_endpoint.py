from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from io import BytesIO
from typing import Any, Dict, Optional

from ThermalAI_report import build_docx_bytes

router = APIRouter()

class ReportPayload(BaseModel):
    report: Dict[str, Any]
    raw: Optional[Dict[str, Any]] = None

@router.post("/v1/report/docx")
def create_report_docx(payload: ReportPayload):
    data = {"report": payload.report, "raw": payload.raw or {}}
    docx_bytes = build_docx_bytes(data)

    buffer = BytesIO(docx_bytes)
    buffer.seek(0)

    analysis_id = (payload.report.get("meta") or {}).get("analysis_id") or "analysis"
    filename = f"ThermalAI_Report_{analysis_id}.docx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
