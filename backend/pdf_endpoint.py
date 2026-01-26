from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from io import BytesIO

router = APIRouter()

class ReportPayload(BaseModel):
    report: dict

@router.post("/v1/report/pdf")
def create_report_pdf(payload: ReportPayload):
    report = payload.report or {}
    meta = report.get("meta", {}) or {}
    headline = report.get("headline", {}) or {}
    breakdown = (report.get("breakdown", {}) or {}).get("by_component", []) or []
    assumptions = report.get("assumptions", []) or []
    disclaimer = report.get("disclaimer", []) or []

    buffer = BytesIO()

    # reportlab is the quickest reliable approach on Render
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    x0 = 50
    y = height - 50

    def line(txt, dy=14, font="Helvetica", size=10):
        nonlocal y
        c.setFont(font, size)
        s = str(txt)  # ✅ safe for numbers/None
        c.drawString(x0, y, s[:120])
        y -= dy
        if y < 70:
            c.showPage()
            y = height - 50

    # Title
    line("ThermalAI — Thermal Assessment Report", dy=22, font="Helvetica-Bold", size=16)
    line(f"City: {meta.get('city','—')}    Analysis ID: {meta.get('analysis_id','—')}", dy=18, font="Helvetica", size=10)

    # Summary
    line("Summary", dy=18, font="Helvetica-Bold", size=12)
    line(f"Estimated annual heat loss: {headline.get('estimated_annual_heat_loss_kwh','—')} kWh/year")
    line(f"Estimated annual cost impact: {headline.get('estimated_annual_cost_eur','—')} {meta.get('currency','EUR')}/year")
    line(f"Confidence: {headline.get('confidence','—')}")
    if headline.get("key_driver"):
        line(f"Key driver: {headline.get('key_driver')}", dy=18)

    # Breakdown
    line("Breakdown (indicative)", dy=18, font="Helvetica-Bold", size=12)
    for r in breakdown[:20]:
        line(f"- {r.get('label','—')}: {r.get('heat_loss_kwh','—')} kWh/y, {r.get('cost_eur','—')} {meta.get('currency','EUR')}/y")

    # Assumptions
    line("Assumptions & transparency", dy=18, font="Helvetica-Bold", size=12)
    for a in assumptions[:20]:
        nm = a.get("name", "—")
        val = a.get("value", "—")
        why = a.get("why_it_matters", "")
        line(f"- {nm}: {val}")
        if why:
            line(f"  {why}", dy=14, font="Helvetica-Oblique", size=9)

    # Disclaimer
    line("Disclaimer", dy=18, font="Helvetica-Bold", size=12)
    for d in disclaimer[:20]:
        line(f"- {d}", dy=12, font="Helvetica", size=9)

    c.save()
    buffer.seek(0)

    filename = f"ThermalAI_Report_{meta.get('analysis_id','analysis')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
