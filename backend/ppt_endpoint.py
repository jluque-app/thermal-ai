# ppt_endpoint.py
from __future__ import annotations

import base64
import os
import traceback
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, List

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter()

OUTPUTS_DIR = Path("outputs")


# -----------------------------
# Small helpers
# -----------------------------
def _safe_float(v: Optional[Any]) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if s == "":
        return None
    try:
        return float(s)
    except Exception:
        return None


def _dig(d: Dict[str, Any], path: str, default=None):
    cur: Any = d
    for key in path.split("."):
        if not isinstance(cur, dict) or key not in cur:
            return default
        cur = cur[key]
    return cur


def _template_path() -> str:
    # Absolute template path (robust)
    return str((Path(__file__).resolve().parent / "templates" / "ThermalAI.pptx").resolve())


def _b64_from_bytes_png(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")


def _normalize_data_url(b64: Optional[str]) -> Optional[str]:
    """
    Accepts either pure base64 or data:image/png;base64,... and returns pure base64.
    """
    if not b64:
        return None
    s = str(b64).strip()
    if not s:
        return None
    if s.startswith("data:image"):
        return s.split(",", 1)[-1].strip()
    return s


def _png_bytes_from_b64(b64: Optional[str]) -> Optional[bytes]:
    """
    Returns decoded PNG bytes, or None if invalid.
    """
    b64 = _normalize_data_url(b64)
    if not b64:
        return None
    try:
        return base64.b64decode(b64, validate=False)
    except Exception:
        return None


def _save_png_b64(out_dir: Path, b64: Optional[str], filename: str) -> Optional[str]:
    data = _png_bytes_from_b64(b64)
    if not data:
        return None
    p = out_dir / filename
    p.write_bytes(data)
    return str(p)


# -----------------------------
# Box-drawing for multipart (no dependency on SEG model)
# We use hotspot mask returned by detect_hotspot_mask and draw connected-component boxes.
# -----------------------------
def _connected_components_boxes(mask, min_area_px: int = 200) -> List[Tuple[int, int, int, int]]:
    """
    8-neighborhood connected components bounding boxes from a boolean numpy mask.
    Returns (x1,y1,x2,y2).
    """
    import numpy as np

    if mask is None:
        return []
    if not isinstance(mask, np.ndarray):
        mask = np.array(mask)
    if mask.dtype != np.bool_:
        mask = mask.astype(bool)

    h, w = mask.shape
    visited = np.zeros((h, w), dtype=np.bool_)
    boxes: List[Tuple[int, int, int, int]] = []

    neighbors = [
        (-1, -1), (-1, 0), (-1, 1),
        (0, -1),           (0, 1),
        (1, -1),  (1, 0),  (1, 1),
    ]

    for y in range(h):
        for x in range(w):
            if not mask[y, x] or visited[y, x]:
                continue

            stack = [(y, x)]
            visited[y, x] = True
            min_x = max_x = x
            min_y = max_y = y
            area = 0

            while stack:
                cy, cx = stack.pop()
                area += 1
                if cx < min_x: min_x = cx
                if cx > max_x: max_x = cx
                if cy < min_y: min_y = cy
                if cy > max_y: max_y = cy

                for dy, dx in neighbors:
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        stack.append((ny, nx))

            if area >= int(min_area_px):
                boxes.append((min_x, min_y, max_x, max_y))

    # largest first
    boxes.sort(key=lambda b: (b[2] - b[0] + 1) * (b[3] - b[1] + 1), reverse=True)
    return boxes


def _draw_hotspot_boxes_pil(pil_img, hotspot_mask, min_area_px: int = 200, max_boxes: int = 20):
    from PIL import ImageDraw

    img = pil_img.copy()
    draw = ImageDraw.Draw(img)
    boxes = _connected_components_boxes(hotspot_mask, min_area_px=min_area_px)[:max_boxes]

    outline = (255, 215, 0)  # gold
    thickness = 3
    for (x1, y1, x2, y2) in boxes:
        for t in range(thickness):
            draw.rectangle([x1 - t, y1 - t, x2 + t, y2 + t], outline=outline)
    return img


# -----------------------------
# Legacy multipart endpoint (kept for backward-compat)
# Generates RGB + Overlay + boxed thermal locally.
# -----------------------------
@router.post("/report/ppt")
async def generate_ppt_report_multipart(
    request: Request,
    thermal_image: Optional[UploadFile] = File(default=None),
    rgb_image: Optional[UploadFile] = File(default=None),
    building_name: str = Form(default="Not provided"),
    location: str = Form(default="Not provided"),
    report_date: str = Form(default="Not provided"),
    # Mandatory
    t_inside: str = Form(default="22"),
    t_outside: str = Form(default="5"),
    # Optional
    hdd: Optional[str] = Form(default=None),
    energy_price_eur_per_kwh: Optional[str] = Form(default=None),
    overlay_threshold_percentile: str = Form(default="95"),
):
    """
    Generates a PPTX report from uploaded images (multipart form-data).
    Canonical filename: ThermalAI_Report_<analysis_id>.pptx
    """
    try:
        import io
        from PIL import Image

        from thermal_core_improved import detect_hotspot_mask, overlay_mask_on_rgb
        from ppt_report_builder import build_reports

        template_pptx = _template_path()
        if not Path(template_pptx).exists():
            return JSONResponse(
                status_code=500,
                content={
                    "error": "PPT template not found in container",
                    "template_path": template_pptx,
                    "cwd": os.getcwd(),
                    "templates_dir_files": [p.name for p in Path("templates").glob("*")] if Path("templates").exists() else None,
                },
            )

        # Fallback: try request.form() if files not bound properly
        if rgb_image is None or thermal_image is None:
            form = await request.form()
            rgb_image = rgb_image or form.get("rgb_image")
            thermal_image = thermal_image or form.get("thermal_image")
            if rgb_image is None or thermal_image is None:
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "Missing files. Expected multipart form-data fields rgb_image and thermal_image.",
                        "received_keys": list(form.keys()),
                    },
                )

        # Parse mandatory temps
        T_inside = _safe_float(t_inside)
        T_outside = _safe_float(t_outside)
        if T_inside is None or T_outside is None:
            return JSONResponse(status_code=400, content={"error": "Invalid t_inside or t_outside (must be numeric)."})

        hdd_val = _safe_float(hdd)
        price_val = _safe_float(energy_price_eur_per_kwh)
        overlay_pct = _safe_float(overlay_threshold_percentile) or 95.0

        analysis_id = uuid.uuid4().hex[:10]
        out_dir = OUTPUTS_DIR / analysis_id
        out_dir.mkdir(parents=True, exist_ok=True)

        rgb_bytes = await rgb_image.read()
        thermal_bytes = await thermal_image.read()

        vis_img = Image.open(io.BytesIO(rgb_bytes)).convert("RGB")
        thr_img = Image.open(io.BytesIO(thermal_bytes)).convert("RGB").resize(vis_img.size)

        hs = detect_hotspot_mask(thr_img, threshold_percentile=float(overlay_pct))
        overlay_img = overlay_mask_on_rgb(vis_img, hs.mask)

        # boxed thermal (from hotspot mask)
        thr_boxed_img = _draw_hotspot_boxes_pil(thr_img, hs.mask, min_area_px=200, max_boxes=20)

        # Encode base64 PNGs
        rgb_buf = BytesIO()
        vis_img.save(rgb_buf, format="PNG")
        rgb_b64 = _b64_from_bytes_png(rgb_buf.getvalue())

        overlay_buf = BytesIO()
        overlay_img.save(overlay_buf, format="PNG")
        overlay_b64 = _b64_from_bytes_png(overlay_buf.getvalue())

        thr_boxed_buf = BytesIO()
        thr_boxed_img.save(thr_boxed_buf, format="PNG")
        thermal_boxed_b64 = _b64_from_bytes_png(thr_boxed_buf.getvalue())

        # Build payloads in the SAME SHAPE that /v1 endpoint uses
        report_payload: Dict[str, Any] = {
            "meta": {
                "building_name": building_name,
                "location": location,
                "report_date": report_date,
                "analysis_id": analysis_id,
            },
            "inputs": {
                "indoor_temp_c": T_inside,
                "outdoor_temp_c": T_outside,
                "hdd": hdd_val,
                "energy_price_eur_kwh": price_val,
            },
            "images": {
                "rgb_png_base64": rgb_b64,
                "overlay_png_base64": overlay_b64,
            },
        }

        raw_payload: Dict[str, Any] = {
            "analysis_id": analysis_id,
            "inputs": {
                "t_inside_c": T_inside,
                "t_outside_c": T_outside,
                "hdd": hdd_val,
                "fuel_price_eur_per_kwh": price_val,
            },
            "artifacts": {
                "rgb_image_base64_png": rgb_b64,
                "overlay_image_base64_png": overlay_b64,
                "thermal_hotspot_boxes_base64_png": thermal_boxed_b64,
            },
        }

        pptx_path, _ = build_reports(
            template_pptx_path=template_pptx,
            out_dir=str(out_dir),
            analysis_id=analysis_id,
            report_data={"report": report_payload, "raw": raw_payload},
            export_pdf=False,
        )

        return FileResponse(
            pptx_path,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            filename=f"ThermalAI_Report_{analysis_id}.pptx",
        )

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": traceback.format_exc()})


# -----------------------------
# Canonical JSON endpoint for Base44 Results page
# -----------------------------
@router.post("/v1/report/ppt")
async def generate_ppt_report_v1(request: Request):
    """
    Accepts JSON payload like: { report: {...}, raw: {...} }

    Requires RGB + Overlay base64 in either:
      - raw.artifacts.rgb_image_base64_png / raw.artifacts.overlay_image_base64_png (preferred), OR
      - report.images.rgb_png_base64 / report.images.overlay_png_base64

    Boxed thermal (optional but desired):
      - raw.artifacts.thermal_hotspot_boxes_base64_png
    """
    try:
        import ppt_report_builder as prb

        if hasattr(prb, "build_reports"):
            build_reports_fn = prb.build_reports
        elif hasattr(prb, "build_report"):
            # fallback if your function was named differently
            build_reports_fn = prb.build_report
        else:
            raise ImportError("ppt_report_builder must expose build_reports (or build_report).")

        payload = await request.json()
        report = payload.get("report") or {}
        raw = payload.get("raw") or {}

        analysis_id = (
            _dig(report, "meta.analysis_id")
            or raw.get("analysis_id")
            or uuid.uuid4().hex[:10]
        )

        out_dir = OUTPUTS_DIR / str(analysis_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        # Temps (best-effort; builder may require them)
        t_in = (
            _dig(report, "inputs.indoor_temp_c")
            or _dig(raw, "inputs.t_inside_c")
            or _dig(raw, "inputs.t_inside")
        )
        t_out = (
            _dig(report, "inputs.outdoor_temp_c")
            or _dig(raw, "inputs.t_outside_c")
            or _dig(raw, "inputs.t_outside")
        )

        # Optional
        hdd = _dig(report, "inputs.hdd") or _dig(raw, "inputs.hdd")
        price = (
            _dig(report, "inputs.energy_price_eur_kwh")
            or _dig(raw, "inputs.fuel_price_eur_per_kwh")
            or _dig(raw, "inputs.energy_price_eur_per_kwh")
        )

        building_name = _dig(report, "meta.building_name") or _dig(report, "meta.building") or "Not provided"
        location = _dig(report, "meta.location") or _dig(report, "meta.city") or _dig(raw, "inputs.city") or "Not provided"

        # Images — prefer raw.artifacts (this is what /analyze returns)
        rgb_b64 = _dig(raw, "artifacts.rgb_image_base64_png") or _dig(report, "images.rgb_png_base64")
        overlay_b64 = _dig(raw, "artifacts.overlay_image_base64_png") or _dig(report, "images.overlay_png_base64")
        thermal_boxed_b64 = _dig(raw, "artifacts.thermal_hotspot_boxes_base64_png") or _dig(
            report, "images.thermal_hotspot_boxes_png_base64"
        )

        rgb_b64 = _normalize_data_url(rgb_b64)
        overlay_b64 = _normalize_data_url(overlay_b64)
        thermal_boxed_b64 = _normalize_data_url(thermal_boxed_b64)

        if not rgb_b64 or not overlay_b64:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Missing images for PPT. Need rgb + overlay base64 in raw.artifacts or report.images.",
                    "have_rgb": bool(rgb_b64),
                    "have_overlay": bool(overlay_b64),
                    "have_boxed_thermal": bool(thermal_boxed_b64),
                },
            )

        template_pptx = _template_path()
        if not Path(template_pptx).exists():
            return JSONResponse(
                status_code=500,
                content={"error": "PPT template not found in container", "template_path": template_pptx, "cwd": os.getcwd()},
            )

        # Build canonical payload for builder
        report_payload: Dict[str, Any] = {
            **report,
            "meta": {
                **(report.get("meta") or {}),
                "analysis_id": analysis_id,
                "building_name": building_name,
                "location": location,
            },
            "inputs": {
                **(report.get("inputs") or {}),
                "indoor_temp_c": _safe_float(t_in),
                "outdoor_temp_c": _safe_float(t_out),
                "hdd": _safe_float(hdd),
                "energy_price_eur_kwh": _safe_float(price),
            },
            "images": {
                **(report.get("images") or {}),
                "rgb_png_base64": rgb_b64,
                "overlay_png_base64": overlay_b64,
            },
        }

        raw_payload: Dict[str, Any] = {
            **raw,
            "analysis_id": analysis_id,
            "inputs": {
                **(raw.get("inputs") or {}),
                "t_inside_c": _safe_float(t_in),
                "t_outside_c": _safe_float(t_out),
                "hdd": _safe_float(hdd),
                "fuel_price_eur_per_kwh": _safe_float(price),
            },
            "artifacts": {
                **(raw.get("artifacts") or {}),
                "rgb_image_base64_png": rgb_b64,
                "overlay_image_base64_png": overlay_b64,
                # boxed thermal optional but preferred
                "thermal_hotspot_boxes_base64_png": thermal_boxed_b64,
            },
        }

        pptx_path, pdf_path = build_reports_fn(
            template_pptx_path=template_pptx,
            out_dir=str(out_dir),
            analysis_id=str(analysis_id),
            report_data={"report": report_payload, "raw": raw_payload},
            export_pdf=False,
        )

        return FileResponse(
            pptx_path,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            filename=f"ThermalAI_Report_{analysis_id}.pptx",
        )

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": traceback.format_exc()})
