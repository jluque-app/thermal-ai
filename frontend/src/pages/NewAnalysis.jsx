// Pages/NewAnalysis.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getUserIdentity } from "@/components/userIdentity";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Upload, Image as ImageIcon, AlertCircle, Info, ArrowRight, Zap, Thermometer, Settings2 } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UsageBadge from "../components/UsageBadge";
import { cn } from "@/lib/utils";

const THERMAL_API_ANALYZE_URL = "/analyze";
const OVERLAY_MIN = 80;
const OVERLAY_MAX = 98;

function extractErrorMessage(payload, fallback = "Something went wrong. Please try again.") {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload === "object") {
    return (
      payload?.message ||
      payload?.error ||
      payload?.detail ||
      payload?.msg ||
      (payload?.entitlement?.message ? payload.entitlement.message : null) ||
      fallback
    );
  }
  return fallback;
}

import { useAuth } from "@/lib/AuthContext";

export default function NewAnalysis() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigateToLogin();
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin]);

  // Files
  const [rgbImage, setRgbImage] = useState(null);
  const [thermalImage, setThermalImage] = useState(null);
  const [rgbPreview, setRgbPreview] = useState(null);
  const [thermalPreview, setThermalPreview] = useState(null);

  // Required inputs
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [facadeArea, setFacadeArea] = useState("");
  const [fuelPrice, setFuelPrice] = useState("");
  const [heatingBaseTemp, setHeatingBaseTemp] = useState("13");
  const [tInside, setTInside] = useState("22");
  const [tOutside, setTOutside] = useState("");

  // Advanced inputs
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [datetimeIso, setDatetimeIso] = useState("");
  const [discountRate, setDiscountRate] = useState("0.03");
  const [inflationRate, setInflationRate] = useState("0.03");
  const [hotspotAreaOverride, setHotspotAreaOverride] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [buildingYear, setBuildingYear] = useState("");
  const [floorArea, setFloorArea] = useState("");
  const [envelopeArea, setEnvelopeArea] = useState("");
  const [numStories, setNumStories] = useState("");
  const [heatingSystem, setHeatingSystem] = useState("");
  const [climateZone, setClimateZone] = useState("");
  const [hdd, setHdd] = useState("");
  const [outdoorRh, setOutdoorRh] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [skyConditions, setSkyConditions] = useState("");
  const [address, setAddress] = useState("");
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [importantNote, setImportantNote] = useState("");

  // Materials & U-values (Restored)
  const [uCurrentWall, setUCurrentWall] = useState("");
  const [uImprovedWall, setUImprovedWall] = useState("");
  const [uCurrentWindow, setUCurrentWindow] = useState("");
  const [uImprovedWindow, setUImprovedWindow] = useState("");
  const [uCurrentDoor, setUCurrentDoor] = useState("");
  const [uImprovedDoor, setUImprovedDoor] = useState("");

  const [materialCurrentWall, setMaterialCurrentWall] = useState("uninsulated_brick_wall");
  const [materialImprovedWall, setMaterialImprovedWall] = useState("insulated_wall");
  const [materialCurrentWindow, setMaterialCurrentWindow] = useState("single_glazed_window");
  const [materialImprovedWindow, setMaterialImprovedWindow] = useState("double_glazed_window");
  const [materialCurrentDoor, setMaterialCurrentDoor] = useState("default");
  const [materialImprovedDoor, setMaterialImprovedDoor] = useState("default");

  const [overlayThreshold, setOverlayThreshold] = useState("80");
  const [includeOverlayBase64, setIncludeOverlayBase64] = useState(true);
  const [includeGammaPayload, setIncludeGammaPayload] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTitle, setUpgradeTitle] = useState("Upgrade required");
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [upgradeCtaLabel, setUpgradeCtaLabel] = useState("View plans");

  const buildMapsLink = (addr, existing) => {
    if (existing && String(existing).trim()) return String(existing).trim();
    if (addr && String(addr).trim()) {
      const q = encodeURIComponent(String(addr).trim());
      return `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    return "";
  };

  const openUpgrade = useCallback(({ title, message, ctaLabel } = {}) => {
    setUpgradeTitle(title || "Upgrade required");
    setUpgradeMessage(message || "You have reached your limit. Please upgrade or purchase more credits.");
    setUpgradeCtaLabel(ctaLabel || "View plans");
    setShowUpgradeModal(true);
  }, []);

  const checkEntitlementBeforeAnalyze = useCallback(async () => {
    const { userId, userEmail } = getUserIdentity(user);
    if (!userId || !userEmail) return { ok: true };

    try {
      const entitlementCheck = await fetch("/v1/billing/can_analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, user_email: userEmail, consume: false }),
      });

      if (!entitlementCheck.ok) {
        const ct = entitlementCheck.headers.get("content-type") || "";
        const data = ct.includes("application/json") ? await entitlementCheck.json() : await entitlementCheck.text();
        const msg = extractErrorMessage(data, "No remaining credits.");
        openUpgrade({ title: "No credits remaining", message: msg, ctaLabel: "Buy scans" });
        return { ok: false };
      }
      return { ok: true };
    } catch (e) {
      console.error("Entitlement check failed:", e);
      return { ok: true }; // Fail open on network error
    }
  }, [user, openUpgrade]);

  const handleFileSelect = (file, type) => {
    if (!file) return;
    const MAX_MB = 8;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Please upload images under ${MAX_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => type === "rgb" ? setRgbPreview(e.target.result) : setThermalPreview(e.target.result);
    reader.readAsDataURL(file);
    type === "rgb" ? setRgbImage(file) : setThermalImage(file);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rgbImage || !thermalImage) return setError("Please upload both RGB and thermal images");
    if (!city || !country || !facadeArea || !fuelPrice || !heatingBaseTemp) return setError("Please fill in all required fields");

    setLoading(true);
    setError(null);

    const gate = await checkEntitlementBeforeAnalyze();
    if (!gate.ok) {
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("rgb_image", rgbImage);
      formData.append("thermal_image", thermalImage);

      const { userId, userEmail } = getUserIdentity(user);
      if (userId) formData.append("user_id", userId);
      if (userEmail) formData.append("user_email", userEmail);

      const params = {
        city, country, facade_area_m2: facadeArea, fuel_price_eur_per_kwh: fuelPrice,
        heating_base_temp_c: heatingBaseTemp, t_inside: tInside, t_outside: tOutside,
        latitude, longitude, datetime_iso: datetimeIso, discount_rate: discountRate, inflation_rate: inflationRate,
        hotspot_area_m2_override: hotspotAreaOverride, building_type: buildingType, building_year: buildingYear,
        floor_area_m2: floorArea, envelope_area_m2: envelopeArea, num_stories: numStories, heating_system: heatingSystem,
        climate_zone: climateZone, hdd, outdoor_rh_percent: outdoorRh, wind_speed_mps: windSpeed,
        sky_conditions: skyConditions, address, important_note: importantNote,
        overlay_threshold_percentile: overlayThreshold, include_overlay_base64: includeOverlayBase64 ? "true" : "false",
        include_gamma_payload: includeGammaPayload ? "true" : "false",
        // Enforce returning all images
        include_thermal_base64: "true",
        include_boxed_base64: "true",
        include_rgb_base64: "true",
        // Restored Params
        u_current_wall: uCurrentWall, u_improved_wall: uImprovedWall,
        u_current_window: uCurrentWindow, u_improved_window: uImprovedWindow,
        u_current_door: uCurrentDoor, u_improved_door: uImprovedDoor,
        material_current_wall: materialCurrentWall, material_improved_wall: materialImprovedWall,
        material_current_window: materialCurrentWindow, material_improved_window: materialImprovedWindow,
        material_current_door: materialCurrentDoor, material_improved_door: materialImprovedDoor
      };

      Object.entries(params).forEach(([k, v]) => { if (v) formData.append(k, v); });

      const maps = buildMapsLink(address, googleMapsLink);
      if (maps) formData.append("google_maps_link", maps);

      const resp = await fetch(THERMAL_API_ANALYZE_URL, { method: "POST", body: formData });
      const contentType = resp.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await resp.json() : await resp.text();

      if (!resp.ok) {
        if (resp.status === 402) {
          const msg = extractErrorMessage(payload, "Credits exhausted.");
          openUpgrade({ title: "Credits exhausted", message: msg, ctaLabel: "Buy scans" });
          return;
        }
        throw new Error(extractErrorMessage(payload));
      }

      const safePayload = typeof payload === "object" ? payload : { raw: {}, report: {} };
      if (!safePayload.raw) safePayload.raw = {};
      if (!safePayload.raw.meta) safePayload.raw.meta = {};
      safePayload.raw.meta.api_base = "";

      navigate("/Results", { state: { result: safePayload } });

    } catch (err) {
      setError(err?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-10 px-4 md:px-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">New Analysis</h1>
            <p className="text-slate-500">Upload paired RGB & Thermal images for AI processing.</p>
          </div>
          <div className="flex items-center gap-4">
            <UsageBadge className="bg-white text-slate-600 border-slate-200" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* 1. UPLOAD SECTION */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { id: 'rgb', label: 'RGB Image', icon: ImageIcon, preview: rgbPreview, setFn: (f) => handleFileSelect(f, 'rgb'), type: 'file' },
              { id: 'thermal', label: 'Thermal Image', icon: Thermometer, preview: thermalPreview, setFn: (f) => handleFileSelect(f, 'thermal'), type: 'file' }
            ].map((field) => (
              <div key={field.id} className="bg-white border border-slate-100 shadow-sm rounded-xl p-6 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <field.icon className="w-5 h-5 text-emerald-600" /> {field.label}
                  </Label>
                  {field.preview && <span className="text-xs text-emerald-600 font-mono">READY</span>}
                </div>

                <div className="relative border-2 border-dashed border-slate-200 rounded-lg p-8 text-center transition-colors group-hover:border-emerald-200 bg-slate-50">
                  {field.preview ? (
                    <div className="relative group/preview">
                      <img src={field.preview} className="max-h-48 mx-auto rounded shadow-lg" alt="Preview" />
                      <div className="absolute inset-0 bg-white/80 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity rounded">
                        <p className="text-emerald-700 font-medium">Click to change</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                        <Upload className="w-8 h-8" />
                      </div>
                      <p className="text-sm text-slate-500">Click to upload or drag & drop</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => field.setFn(e.target.files?.[0])}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* IMPORTANT INFORMATION BOX */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 text-sm text-slate-700 space-y-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-blue-900 mb-2">Best results (especially if RGB & thermal don’t overlap perfectly)</h4>
                <p>Upload the <strong>original thermal export</strong> (not a screenshot) and prefer radiometric / grayscale thermal when available.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pl-8">
              <div>
                <h5 className="font-semibold text-blue-800 mb-2">Recommended thermal formats (Best → Acceptable)</h5>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li><strong>Radiometric thermal (BEST)</strong>: R-JPEG, "temperature data included". Improves reliability.</li>
                  <li><strong>Grayscale thermal (GOOD)</strong>: Single-channel thermal intensity.</li>
                  <li><strong>False-color (ACCEPTABLE)</strong>: Purple/orange or rainbow palettes. Alignment may be less reliable.</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold text-red-800 mb-2">Avoid if possible</h5>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>Screenshots with UI overlays (colorbars, legends).</li>
                  <li>Heavily compressed images (messenger apps).</li>
                  <li>Cropped thermal where RGB is not cropped equivalently.</li>
                </ul>
              </div>
            </div>
            <div className="pl-8 pt-2">
              <h5 className="font-semibold text-blue-800 mb-1">Capture tips for better overlap</h5>
              <p className="text-slate-600">Capture from same position/angle. Keep facade front-facing. Avoid capturing too close.</p>
            </div>
          </div>

          {/* 2. CORE PARAMETERS */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-8 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-amber-500" /> Core Parameters
              </h3>
              <p className="text-sm text-slate-500">Required for heat-loss estimates.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700">City *</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} required className="bg-white border-slate-200 text-slate-900" placeholder="e.g. London" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Country *</Label>
                <Input value={country} onChange={e => setCountry(e.target.value)} required className="bg-white border-slate-200 text-slate-900" placeholder="e.g. UK" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Facade Area (m²) *</Label>
                <Input type="number" step="0.1" value={facadeArea} onChange={e => setFacadeArea(e.target.value)} required className="bg-white border-slate-200 text-slate-900" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Energy Price (€/kWh) *</Label>
                <Input type="number" step="0.01" value={fuelPrice} onChange={e => setFuelPrice(e.target.value)} required className="bg-white border-slate-200 text-slate-900" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Indoor Temp (°C) *</Label>
                <Input type="number" step="0.5" value={tInside} onChange={e => setTInside(e.target.value)} required className="bg-white border-slate-200 text-slate-900" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Base Heating Temp (°C) *</Label>
                <Input type="number" step="0.5" value={heatingBaseTemp} onChange={e => setHeatingBaseTemp(e.target.value)} required className="bg-white border-slate-200 text-slate-900" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Outside Temp (°C) *</Label>
                <Input type="number" step="0.5" value={tOutside} onChange={e => setTOutside(e.target.value)} required className="bg-white border-slate-200 text-slate-900" />
              </div>
            </div>
          </div>

          {/* 3. ADVANCED (Accordion) */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-1 overflow-hidden">
            <Accordion type="single" collapsible className="w-full" defaultValue="advanced">
              <AccordionItem value="advanced" className="border-none px-6">
                <AccordionTrigger className="text-slate-600 hover:text-emerald-700 py-6">
                  <span className="flex items-center gap-2"><Settings2 className="w-4 h-4" /> Advanced Configuration (Materials, U-values, Environment)</span>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="grid md:grid-cols-2 gap-6 pt-2">
                    {/* Environment */}
                    <div className="md:col-span-2 pb-2 border-b border-slate-100 mb-4">
                      <h4 className="text-slate-800 font-semibold mb-1">Environment & Location</h4>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-600">Wind Speed (mps)</Label>
                      <Input type="number" step="0.1" value={windSpeed} onChange={e => setWindSpeed(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Humidity (%)</Label>
                      <Input type="number" step="1" value={outdoorRh} onChange={e => setOutdoorRh(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Emissivity / Sky</Label>
                      <Input value={skyConditions} onChange={e => setSkyConditions(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="cloudy / clear / city" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Latitude</Label>
                      <Input type="number" step="0.0001" value={latitude} onChange={e => setLatitude(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Longitude</Label>
                      <Input type="number" step="0.0001" value={longitude} onChange={e => setLongitude(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Date/Time (ISO)</Label>
                      <Input value={datetimeIso} onChange={e => setDatetimeIso(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="YYYY-MM-DDTHH:MM:SS" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-slate-600">Google Maps Link</Label>
                      <Input value={googleMapsLink} onChange={e => setGoogleMapsLink(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="https://maps.google.com/..." />
                    </div>


                    {/* Building Geometry & Props */}
                    <div className="md:col-span-2 pt-4 pb-2 border-b border-slate-100 mb-4">
                      <h4 className="text-slate-800 font-semibold mb-1">Building Geometry & Type</h4>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-600">Building Type</Label>
                      <Input value={buildingType} onChange={e => setBuildingType(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="e.g. Office" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Year Built</Label>
                      <Input type="number" value={buildingYear} onChange={e => setBuildingYear(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="e.g. 1990" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Floor Area (m²)</Label>
                      <Input type="number" value={floorArea} onChange={e => setFloorArea(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Envelope Area (m²)</Label>
                      <Input type="number" value={envelopeArea} onChange={e => setEnvelopeArea(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Num Stories</Label>
                      <Input type="number" value={numStories} onChange={e => setNumStories(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Hotspot Area Override (m²)</Label>
                      <Input type="number" step="0.1" value={hotspotAreaOverride} onChange={e => setHotspotAreaOverride(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Force hotspot size" />
                    </div>


                    {/* Economics & Rates */}
                    <div className="md:col-span-2 pt-4 pb-2 border-b border-slate-100 mb-4">
                      <h4 className="text-slate-300 font-semibold mb-1">Rates & HVAC</h4>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Discount Rate</Label>
                      <Input type="number" step="0.01" value={discountRate} onChange={e => setDiscountRate(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="0.03" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Inflation Rate</Label>
                      <Input type="number" step="0.01" value={inflationRate} onChange={e => setInflationRate(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="0.03" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Heating System</Label>
                      <Input value={heatingSystem} onChange={e => setHeatingSystem(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Climate Zone</Label>
                      <Input value={climateZone} onChange={e => setClimateZone(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Heating Degree Days (HDD)</Label>
                      <Input type="number" value={hdd} onChange={e => setHdd(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Optional" />
                    </div>


                    {/* Materials (Selectors) */}
                    <div className="md:col-span-2 pt-4 pb-2 border-t border-slate-100">
                      <h4 className="text-slate-300 font-semibold mb-3">Materials</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase">Current Wall</Label>
                          <Input value={materialCurrentWall} onChange={e => setMaterialCurrentWall(e.target.value)} className="bg-white border-slate-200 text-slate-900 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase">Improved Wall</Label>
                          <Input value={materialImprovedWall} onChange={e => setMaterialImprovedWall(e.target.value)} className="bg-white border-slate-200 text-slate-900 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase">Current Window</Label>
                          <Input value={materialCurrentWindow} onChange={e => setMaterialCurrentWindow(e.target.value)} className="bg-white border-slate-200 text-slate-900 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs uppercase">Improved Window</Label>
                          <Input value={materialImprovedWindow} onChange={e => setMaterialImprovedWindow(e.target.value)} className="bg-white border-slate-200 text-slate-900 text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* U-Value Overrides */}
                    <div className="md:col-span-2 pt-2 border-t border-slate-100">
                      <h4 className="text-slate-300 font-semibold mb-3">U-Value Overrides (Optional)</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs">U-Wall (Current)</Label>
                          <Input type="number" step="0.1" value={uCurrentWall} onChange={e => setUCurrentWall(e.target.value)} className="bg-white border-slate-200 text-slate-900 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs">U-Win (Current)</Label>
                          <Input type="number" step="0.1" value={uCurrentWindow} onChange={e => setUCurrentWindow(e.target.value)} className="bg-white border-slate-200 text-slate-900 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 text-xs">U-Door (Current)</Label>
                          <Input type="number" step="0.1" value={uCurrentDoor} onChange={e => setUCurrentDoor(e.target.value)} className="bg-white border-slate-200 text-slate-900 text-sm" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2 pt-4 border-t border-slate-100">
                      <Label className="text-slate-600">Address (for Report)</Label>
                      <Input value={address} onChange={e => setAddress(e.target.value)} className="bg-white border-slate-200 text-slate-900" placeholder="Full address..." />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* ACTION */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
              <AlertCircle className="w-5 h-5" /> {error}
            </div>
          )}

          <Button size="lg" disabled={loading} className="w-full h-14 text-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-xl shadow-lg shadow-emerald-600/20">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...
              </span>
            ) : (
              "Run Analysis"
            )}
          </Button>

        </form>

        {/* UPGRADE DIALOG */}
        <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 text-slate-900">
                <Zap className="w-5 h-5 text-amber-500" /> {upgradeTitle}
              </DialogTitle>
              <DialogDescription className="text-slate-500 pt-2">
                {upgradeMessage}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setShowUpgradeModal(false)} className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">Cancel</Button>
              <Button onClick={() => navigate('/PlanSelection?force=1')} className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold">
                {upgradeCtaLabel} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
