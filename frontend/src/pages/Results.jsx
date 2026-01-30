// Pages/Results.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Download, Share2, ArrowLeft, Zap, TrendingUp, AlertTriangle, CloudFog, Coins, FileText, Presentation } from "lucide-react";

function formatNumber(n, decimals = 0) {
  const x = typeof n === "string" ? Number(n) : n;
  if (typeof x !== "number" || Number.isNaN(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const payload = useMemo(() => {
    return location?.state?.result ?? JSON.parse(sessionStorage.getItem("thermalai_last_result_payload") || "null");
  }, [location?.state]);

  const report = payload?.report || null;
  const meta = report?.meta || {};

  // Images
  // Images - Robust fallback for various API response structures
  const overlayB64 = report?.images?.overlay_png_base64 || payload?.raw?.artifacts?.overlay_image_base64_png || payload?.overlay_base64 || null;
  const rgbB64 = report?.images?.rgb_png_base64 || payload?.raw?.artifacts?.rgb_image_base64_png || payload?.rgb_base64 || null;
  const thermalB64 = report?.images?.thermal_png_base64 || payload?.raw?.artifacts?.thermal_image_base64_png || payload?.thermal_base64 || payload?.thermal_image_base64 || null;
  const boxedB64 = report?.images?.boxed_rgb_png_base64 || payload?.raw?.artifacts?.boxed_rgb_image_base64_png || payload?.boxed_base64 || payload?.boxed_image_base64 || null;

  // Metrics
  const annualTotalKwh = report?.headline?.estimated_annual_heat_loss_kwh || null;
  const annualTotalEur = report?.headline?.estimated_annual_cost_eur || null;
  const co2Kg = report?.headline?.estimated_co2_emissions_kg || (annualTotalKwh ? annualTotalKwh * 0.2 : null); // Fallback estimate if missing
  const pvEur = report?.headline?.present_value_eur || (annualTotalEur ? annualTotalEur * 15 : null); // Fallback PV estimate

  function b64img(b64) {
    if (!b64) return null;
    if (b64.startsWith('/') || b64.startsWith('http')) return b64;
    return b64.startsWith("data:image") ? b64 : `data:image/png;base64,${b64}`;
  }

  // Export Handlers
  const handleExport = async (format) => {
    if (!payload) return;

    // Use meta.api_base or fallback to localhost:8000 if not set, or relative path if proxied
    // Since we are running on port 5173 and backend on 8000, we need to explicitly point to 8000
    // unless a proxy is set up. The user didn't mention proxy.
    const apiBase = meta?.api_base || "";
    const endpoint = `${apiBase}/v1/report/ppt${format === 'pdf' ? '?format=pdf' : ''}`;

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report: payload.report || {},
          raw: payload.raw || {}
        })
      });

      if (!resp.ok) {
        const err = await resp.text();
        alert(`Export failed: ${err}`);
        return;
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ThermalAI_Report.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Export error:", e);
      alert("Failed to export. Is the backend running?");
    }
  };

  const handleExportPDF = () => handleExport('pdf');
  const handleExportPPT = () => handleExport('pptx');

  if (!payload) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">No Result Data</h2>
          <Button onClick={() => navigate('/NewAnalysis')} className="bg-emerald-600 text-white hover:bg-emerald-700">New Analysis</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-10 px-4 md:px-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/NewAnalysis')} className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Analysis Report</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                {meta?.city && <span className="flex items-center gap-1">📍 {meta.city}</span>}
                <span className="text-slate-300">|</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportPPT} className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <Presentation className="w-4 h-4 mr-2" /> Export PPT
            </Button>
            <Button onClick={handleExportPDF} className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold">
              <FileText className="w-4 h-4 mr-2" /> Export PDF
            </Button>
          </div>
        </div>

        {/* KEY METRICS GRID */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border-t-4 border-t-emerald-500 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Annual Heat Loss</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-900">{formatNumber(annualTotalKwh)}</span>
              <span className="text-sm font-medium text-slate-500 mb-1">kWh</span>
            </div>
            <Zap className="w-8 h-8 text-emerald-100 absolute right-4 top-4" />
          </div>

          <div className="bg-white p-6 rounded-xl border-t-4 border-t-amber-500 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Est. Annual Cost</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-900">{formatNumber(annualTotalEur)}</span>
              <span className="text-sm font-medium text-slate-500 mb-1">€</span>
            </div>
            <TrendingUp className="w-8 h-8 text-amber-100 absolute right-4 top-4" />
          </div>

          <div className="bg-white p-6 rounded-xl border-t-4 border-t-blue-500 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">CO2 Emissions</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-900">{formatNumber(co2Kg)}</span>
              <span className="text-sm font-medium text-slate-500 mb-1">kg</span>
            </div>
            <CloudFog className="w-8 h-8 text-blue-100 absolute right-4 top-4" />
          </div>

          <div className="bg-white p-6 rounded-xl border-t-4 border-t-purple-500 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">PV of Losses (15y)</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-900">{formatNumber(pvEur)}</span>
              <span className="text-sm font-medium text-slate-500 mb-1">€</span>
            </div>
            <Coins className="w-8 h-8 text-purple-100 absolute right-4 top-4" />
          </div>
        </div>

        {/* IMAGES (2x2 Grid) */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> Visual Analysis
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 1. Overlay (Primary) */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">AI Hotspot Overlay</p>
              <div className="relative aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                {overlayB64 ?
                  <img src={b64img(overlayB64)} className="w-full h-full object-cover" alt="Overlay" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Overlay</div>
                }
              </div>
            </div>

            {/* 2. RGB */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Original RGB</p>
              <div className="relative aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                {rgbB64 ?
                  <img src={b64img(rgbB64)} className="w-full h-full object-cover" alt="RGB" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No RGB</div>
                }
              </div>
            </div>

            {/* 3. Thermal */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Raw Thermal</p>
              <div className="relative aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                {thermalB64 ?
                  <img src={b64img(thermalB64)} className="w-full h-full object-contain bg-slate-900" alt="Thermal" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Thermal</div>
                }
              </div>
            </div>

            {/* 4. Boxed/Annotated */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">AI Detection Boxes</p>
              <div className="relative aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                {boxedB64 ?
                  <img src={b64img(boxedB64)} className="w-full h-full object-cover" alt="Boxed" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Detections</div>
                }
              </div>
            </div>
          </div>
        </div>

        {/* FINDINGS */}
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Key Findings & Recommendations</h3>
          <div className="prose max-w-none text-slate-600 text-sm">
            <p className="leading-relaxed">
              Based on the analysis, significant thermal anomalies were detected. The key driver of heat loss appears to be
              <strong className="text-emerald-700"> {report?.headline?.key_driver || "the building envelope"}</strong>.
            </p>
            <ul className="mt-4 space-y-2">
              <li>• Verify window seals for potential air leakage.</li>
              <li>• Inspect insulation continuity in identified hotspot areas.</li>
              <li>• Consider thermographic re-inspection after remedial works.</li>
            </ul>
          </div>
          <div className="mt-8 flex justify-end">
            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => navigate('/ExpertPreview')}>
              Ask AI Expert for Interpretation →
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
