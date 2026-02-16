// Pages/Results.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

import { Button } from "@/components/ui/button";
import { Download, Share2, ArrowLeft, Zap, TrendingUp, AlertTriangle, CloudFog, Coins, FileText, Presentation } from "lucide-react";

function formatNumber(n, decimals = 0) {
  if (n === null || n === undefined) return "—";
  const x = typeof n === "string" ? Number(n.replace(/,/g, '')) : n;
  if (typeof x !== "number" || Number.isNaN(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const payload = useMemo(() => {
    const data = location?.state?.result ?? JSON.parse(sessionStorage.getItem("thermalai_last_result_payload") || "null");
    console.log("Results Payload Debug:", data);
    return data;
  }, [location?.state]);

  const report = payload?.report || null;
  const meta = report?.meta || {};

  // Images
  const rgbB64 = report?.images?.rgb_png_base64 || payload?.raw?.artifacts?.rgb_image_base64_png || payload?.rgb_base64 || null;
  const rgbBoxedB64 = report?.images?.rgb_boxed_png_base64 || payload?.raw?.artifacts?.rgb_boxed_image_base64_png || payload?.rgb_boxed_base64 || null;
  const thermalB64 = report?.images?.thermal_png_base64 || payload?.raw?.artifacts?.thermal_image_base64_png || payload?.thermal_base64 || payload?.thermal_image_base64 || null;
  const thermalBoxedB64 = report?.images?.thermal_boxed_png_base64 || payload?.raw?.artifacts?.thermal_boxed_image_base64_png || payload?.raw?.artifacts?.thermal_hotspot_boxes_base64_png || payload?.thermal_boxed_base64 || null;

  // Metrics
  const annualTotalKwh = report?.headline?.estimated_annual_heat_loss_kwh || null;
  const annualTotalEur = report?.headline?.estimated_annual_cost_eur || null;
  const co2Kg = report?.headline?.estimated_co2_emissions_kg || (annualTotalKwh ? annualTotalKwh * 0.2 : null); // Fallback estimate
  const pvEur = report?.headline?.present_value_eur || (annualTotalEur ? annualTotalEur * 15 : null); // Fallback PV estimate

  // Helper for image src
  function b64img(b64) {
    if (!b64) return null;
    if (b64.startsWith('/') || b64.startsWith('http')) return b64;
    return b64.startsWith("data:image") ? b64 : `data:image/png;base64,${b64}`;
  }

  // Export Handlers
  const handleExport = async (format) => {
    if (!payload) return;

    try {
      // Use absolute backend URL (no proxy guaranteed on manual Render deploys)
      const backendUrl = "https://thermal-ai.onrender.com";
      let endpoint = `${backendUrl}/v1/report/ppt`;

      // If PDF, use the same endpoint but with ?format=pdf to trigger LibreOffice conversion
      if (format === 'pdf') {
        endpoint = `${backendUrl}/v1/report/ppt?format=pdf`;
      }
      // Helper to fetch and convert path to base64 if needed
      const ensureBase64 = async (val) => {
        if (!val) return null;
        if (typeof val !== 'string') return null;
        if (val.startsWith("data:image")) return val.replace(/^data:image\/[a-z]+;base64,/, "");
        if (val.startsWith("/") || val.startsWith("http")) {
          try {
            const r = await fetch(val);
            if (!r.ok) return null;
            const b = await r.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result.replace(/^data:image\/[a-z]+;base64,/, ""));
              reader.readAsDataURL(b);
            });
          } catch (e) { return null; }
        }
        return val;
      };

      // PRE-PROCESS payload logic...
      const reportImages = payload.report?.images || {};
      const rawArtifacts = payload.raw?.artifacts || {};
      const exportPayload = JSON.parse(JSON.stringify(payload));
      if (!exportPayload.report) exportPayload.report = {};
      if (!exportPayload.report.images) exportPayload.report.images = {};

      // Mapping keys to what backend expects
      // Backend (ppt_endpoint.py) expects:
      // - rgb_png_base64
      // - overlay_png_base64 (crucial for PPT)
      // - thermal_hotspot_boxes_base64_png

      const keyMap = {
        "rgb_png_base64": ["rgb_png_base64", "rgb_image_base64_png"],
        "overlay_png_base64": ["overlay_png_base64", "overlay_image_base64_png"],
        "thermal_hotspot_boxes_png_base64": ["thermal_boxed_png_base64", "thermal_boxed_image_base64_png", "thermal_hotspot_boxes_base64_png"]
      };

      for (const [targetKey, sourceKeys] of Object.entries(keyMap)) {
        let val = null;
        for (const k of sourceKeys) {
          val = reportImages[k] || rawArtifacts[k] || payload[k] || payload.raw?.artifacts?.[k];
          if (val) break;
        }

        // Frontend state specific fallbacks
        if (!val && targetKey === "rgb_png_base64") val = rgbB64;
        // if (!val && targetKey === "overlay_png_base64") ... (we don't have a distinct state var for overlay, usually comes from artifacts)

        if (val) {
          exportPayload.report.images[targetKey] = await ensureBase64(val);
        }
      }

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: exportPayload.report || {}, raw: exportPayload.raw || {} })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "API Export Failed");
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ThermalAI_Report.${format === 'pptx' ? 'pptx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (e) {
      console.warn("Backend export failed, falling back to print/alert.", e);
      if (format === 'pdf') {
        alert("PDF Generation failed (Backend error). Falling back to browser print.");
        window.print();
      } else {
        alert(`PowerPoint export failed: ${e.message || "Unknown Error"}`);
      }
    }
  };

  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const handleAddToDashboard = async () => {
    setIsSaving(true);
    try {
      // 1. Construct Building Object
      const b = {
        id: payload?.meta?.analysis_id || crypto.randomUUID(),
        lat: parseFloat(payload?.raw?.inputs?.latitude || payload?.raw?.inputs?.gps_lat || meta.latitude || 0),
        lng: parseFloat(payload?.raw?.inputs?.longitude || payload?.raw?.inputs?.gps_lon || meta.longitude || 0),
        addr: meta.address || "Unknown Address",
        type: meta.building_type || "Unknown Type",
        // Basic rating logic based on letter
        rating: (payload.report?.headline?.eec_letter || "C") === "A" ? "good" : (payload.report?.headline?.eec_letter === "B" || payload.report?.headline?.eec_letter === "C") ? "medium" : "poor",
        loss: payload.report?.headline?.eec_letter || "N/A",
        savings: `€${formatNumber(payload.report?.financials?.savings_1y, 0)}/yr`,
        sqft: `${formatNumber(meta.floor_area_m2, 0)} m²`,
        google_maps_link: meta.google_maps_link || payload.raw?.inputs?.google_maps_link,
        reportData: payload
      };

      // 2. Validate
      const hasLoc = (b.lat && b.lng) || b.google_maps_link || (b.addr && b.addr.length > 5);
      if (!hasLoc) {
        alert("Cannot add to Dashboard: Missing Location Data (Lat/Lon, Google Maps Link, or Full Address).");
        setIsSaving(false);
        return;
      }

      // 3. Send to Backend
      const backendUrl = "https://thermal-ai.onrender.com"; // Consider making this dynamic
      const resp = await fetch(`${backendUrl}/v1/dashboard/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Mock Auth Header for now until full auth
          "x-user-email": user?.email || "guest"
        },
        body: JSON.stringify({
          user_email: user?.email,
          building: b
        })
      });

      if (!resp.ok) throw new Error("Failed to save to dashboard");

      alert("Successfully added to Dashboard!");
    } catch (e) {
      console.error(e);
      alert("Error saving to dashboard: " + e.message);
    } finally {
      setIsSaving(false);
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
            {user && (
              <Button
                variant="outline"
                onClick={handleAddToDashboard}
                disabled={isSaving}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                {isSaving ? "Saving..." : (user.email === 'jaime@allretech.org' ? "Add to Pilot Map" : "Save to Dashboard")}
              </Button>
            )}
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

        {/* FINANCIAL IMPACT TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" /> Financial Impact Analysis
            </h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Time Horizon</th>
                    <th className="px-6 py-3">Est. Energy Savings</th>
                    <th className="px-6 py-3">Est. Cost of Inaction</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white border-b border-slate-100">
                    <td className="px-6 py-4 font-medium text-slate-900">1 Year</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">€{formatNumber(report?.financials?.savings_1y || payload?.financials?.savings_1y)}</td>
                    <td className="px-6 py-4 text-red-600">€{formatNumber(report?.financials?.cost_1y || payload?.financials?.cost_1y)}</td>
                  </tr>
                  <tr className="bg-white border-b border-slate-100">
                    <td className="px-6 py-4 font-medium text-slate-900">5 Years</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">€{formatNumber(report?.financials?.savings_5y || payload?.financials?.savings_5y)}</td>
                    <td className="px-6 py-4 text-red-600">€{formatNumber(report?.financials?.cost_5y || payload?.financials?.cost_5y)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-6 py-4 font-medium text-slate-900">15 Years</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">€{formatNumber(report?.financials?.savings_15y || payload?.financials?.savings_15y)}</td>
                    <td className="px-6 py-4 text-red-600">€{formatNumber(report?.financials?.cost_15y || payload?.financials?.cost_15y)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* HEAT LOSS BREAKDOWN */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Heat Loss Breakdown
            </h3>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Analysis of the building envelope reveals the distribution of heat loss across major elements.
                Targeting <strong>{(report?.breakdown?.walls_kwh > report?.breakdown?.windows_kwh) ? "Walls" : "Windows"}</strong> will yield the highest immediate return.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="flex items-center gap-2">🪟 Windows</span>
                  <span>{formatNumber(report?.breakdown?.windows_kwh || payload?.breakdown?.windows_kwh)} kWh</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${(Number(String(report?.breakdown?.windows_kwh).replace(/,/g, '')) / (Number(String(report?.breakdown?.windows_kwh).replace(/,/g, '')) + Number(String(report?.breakdown?.walls_kwh).replace(/,/g, '')))) * 100}%` }}></div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="flex items-center gap-2">🧱 Walls</span>
                  <span>{formatNumber(report?.breakdown?.walls_kwh || payload?.breakdown?.walls_kwh)} kWh</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${(Number(String(report?.breakdown?.walls_kwh).replace(/,/g, '')) / (Number(String(report?.breakdown?.windows_kwh).replace(/,/g, '')) + Number(String(report?.breakdown?.walls_kwh).replace(/,/g, '')))) * 100}%` }}></div>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center p-6 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Priority Retrofit</p>
                <h4 className="text-2xl font-black text-slate-900 mb-1">
                  {(report?.breakdown?.walls_kwh > report?.breakdown?.windows_kwh) ? "External Wall Insulation" : "Window Replacement"}
                </h4>
                <p className="text-emerald-600 font-medium text-sm">Recommended Action</p>
              </div>
            </div>
          </div>
        </div>

        {/* IMAGES (2x2 Grid) */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> Visual Analysis
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 1. Normal RGB */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Normal RGB</p>
              <div className="relative aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                {rgbB64 ?
                  <img src={b64img(rgbB64)} className="w-full h-full object-cover" alt="Normal RGB" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No RGB</div>
                }
              </div>
            </div>

            {/* 2. RGB with Boxed */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">RGB with Hotspot Boxes</p>
              <div className="relative aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                {rgbBoxedB64 ?
                  <img src={b64img(rgbBoxedB64)} className="w-full h-full object-cover" alt="RGB Boxed" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Boxed RGB</div>
                }
              </div>
            </div>

            {/* 3. Normal Thermal */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Normal Thermal</p>
              <div className="relative aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                {thermalB64 ?
                  <img src={b64img(thermalB64)} className="w-full h-full object-contain bg-slate-900" alt="Normal Thermal" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Thermal</div>
                }
              </div>
            </div>

            {/* 4. Thermal with Boxed */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Thermal with Hotspot Boxes</p>
              <div className="relative aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                {thermalBoxedB64 ?
                  <img src={b64img(thermalBoxedB64)} className="w-full h-full object-cover" alt="Thermal Boxed" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Boxed Thermal</div>
                }
              </div>
            </div>
          </div>
        </div>



      </div>
    </div>
  );
}
