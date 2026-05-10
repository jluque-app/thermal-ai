import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, MessageSquareText, Download, Building, Search, Map as MapIcon, Power, ArrowRight, TrendingUp, Zap, CloudFog, Coins, Trash2 } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons for Heat Loss (Green = Good, Red = Bad, Orange = Medium)
const createIcon = (color) => new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
});

const icons = {
    good: createIcon('#10b981'),   // Emerald-500
    medium: createIcon('#f59e0b'), // Amber-500
    poor: createIcon('#ef4444'),   // Red-500
};



function ChangeView({ center, zoom }) {
    const map = useMap();
    map.setView(center, zoom);
    return null;
}

// Helper for image src (Consolidated from Results.jsx)
function b64img(b64) {
    if (!b64) return null;
    if (b64.startsWith('/') || b64.startsWith('http')) return b64;
    return b64.startsWith("data:image") ? b64 : `data:image/png;base64,${b64}`;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, isLoadingAuth } = useAuth();
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [showResultModal, setShowResultModal] = useState(false);

    // Determine City from Navigation State (Default to Gyor if none)
    const selectedCity = location.state?.selectedCity || 'gyor';

    // City Configurations
    const cityConfigs = {

        gyor: {
            center: [47.688, 17.615], // Adjusted center to fit both
            zoom: 13,
            buildings: [

                // Pilot buildings removed as per request
            ]
        }
    };

    const handleDelete = async (e, building) => {
        e.stopPropagation(); // Prevent card click
        if (!confirm("Are you sure you want to delete this analysis?")) return;

        try {
            const userEmail = user?.email || "guest";
            const storageKey = `thermal_scans_${userEmail}`;
            const localData = JSON.parse(localStorage.getItem(storageKey) || "[]");
            const newLocalData = localData.filter(b => b.id !== building.id);
            localStorage.setItem(storageKey, JSON.stringify(newLocalData));
            
            setUserBuildings(newLocalData);
            if (selectedBuilding?.id === building.id) setSelectedBuilding(null);
        } catch (err) {
            console.error(err);
            alert("Failed to delete.");
        }
    };


    const activeConfig = cityConfigs[selectedCity] || cityConfigs.gyor;
    const [userBuildings, setUserBuildings] = useState([]);

    // Fetch User Buildings from LocalStorage
    useEffect(() => {
        const userEmail = user?.email || "guest";
        const storageKey = `thermal_scans_${userEmail}`;
        try {
            const localData = JSON.parse(localStorage.getItem(storageKey) || "[]");
            if (Array.isArray(localData)) {
                setUserBuildings(localData);
            }
        } catch (err) {
            console.error("Failed to load dashboard from local storage:", err);
        }
    }, [user]);

    // Auto-select building from navigation state (e.g. newly added)
    useEffect(() => {
        if (location.state?.highlightBuildingId && userBuildings.length > 0) {
            const found = userBuildings.find(b => b.id === location.state.highlightBuildingId);
            if (found) {
                setSelectedBuilding(found);
            }
        }
    }, [userBuildings, location.state]);

    const DEMO_BUILDINGS = [...activeConfig.buildings, ...userBuildings];

    // Protect Route
    useEffect(() => {
        if (!isLoadingAuth && !isAuthenticated) {
            navigate('/');
        }
    }, [isLoadingAuth, isAuthenticated, navigate]);

    if (isLoadingAuth) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="flex flex-col h-screen bg-slate-50">

            {/* Top Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Building className="w-6 h-6 text-emerald-600" />
                        Property Portfolio
                    </h1>
                    <p className="text-sm text-slate-500">Welcome, {user?.email || 'User'}</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate('/ExpertChat')} className="gap-2">
                        <MessageSquareText className="w-4 h-4" /> Expert AI
                    </Button>
                    <Button onClick={() => navigate('/NewAnalysis')} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                        <Plus className="w-4 h-4" /> New Analysis
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">

                {/* Sidebar List */}
                <div className="w-96 bg-white border-r border-slate-200 flex flex-col z-0 shadow-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                            <MapIcon className="w-4 h-4" /> Analyzed Buildings
                        </h2>
                        <div className="mt-2 relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Search address..."
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {DEMO_BUILDINGS.map(b => (
                            <Card
                                key={b.id}
                                onClick={() => setSelectedBuilding(b)}
                                className={`cursor-pointer transition-all hover:shadow-md border-l-4 relative ${selectedBuilding?.id === b.id ? 'ring-2 ring-emerald-500' : ''} ${b.rating === 'good' ? 'border-l-emerald-500' : b.rating === 'medium' ? 'border-l-amber-500' : 'border-l-red-500'}`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-slate-800">{b.addr}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.rating === 'good' ? 'bg-emerald-100 text-emerald-800' : b.rating === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                            {b.loss || 'N/A'} Loss
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">{b.type}</p>
                                    <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block">
                                        <Power className="w-3 h-3" /> Potential Savings: <strong>{b.savings || 'Pending'}</strong>
                                    </div>
                                    {/* Show delete only if it's not a hardcoded system demo (simple check: if it's in userBuildings) */}
                                    {userBuildings.some(ub => ub.id === b.id) && (
                                        <button
                                            onClick={(e) => handleDelete(e, b)}
                                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors"
                                            title="Delete Analysis"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}

                        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                            <p className="text-sm text-slate-500 mb-3">Want to analyze another building?</p>
                            <Button variant="outline" size="sm" onClick={() => navigate('/NewAnalysis')}>
                                Add Property
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 relative bg-slate-100">
                    {/* Map Interface - key forces re-render on city change */}
                    <MapContainer key={selectedCity} center={activeConfig.center} zoom={activeConfig.zoom} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />
                        <ChangeView center={selectedBuilding ? [selectedBuilding.lat, selectedBuilding.lng] : activeConfig.center} zoom={activeConfig.zoom} />

                        {DEMO_BUILDINGS.map(b => (
                            <Marker
                                key={b.id}
                                position={[b.lat, b.lng]}
                                icon={icons[b.rating || 'medium']}
                                eventHandlers={{
                                    click: () => setSelectedBuilding(b),
                                }}
                            >
                                <Popup>
                                    <div className="p-1">
                                        <h3 className="font-bold text-md mb-1">{b.addr}</h3>
                                        <p className="text-sm text-slate-600 mb-2">{b.type}</p>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="h-7 text-xs bg-emerald-600" onClick={() => {
                                                if (b.reportData) {
                                                    setShowResultModal(true);
                                                } else {
                                                    navigate('/Results'); // Fallback or dedicated page
                                                }
                                            }}>
                                                View Report
                                            </Button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* MINI-RESULTS POPUP (Modal) */}
                    <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50">
                            {selectedBuilding && selectedBuilding.reportData ? (() => {
                                // Handle nesting: payload might be { report: {...} } or just the report object
                                const rawData = selectedBuilding.reportData;
                                const data = rawData.report || rawData;
                                const isGyor = selectedCity === 'gyor';

                                return (
                                    <>
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                                <TrendingUp className="w-6 h-6 text-emerald-600" /> Analysis Report: {selectedBuilding.type}
                                            </DialogTitle>
                                            <DialogDescription>
                                                Full thermal analysis results for {selectedBuilding.addr}
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="grid md:grid-cols-4 gap-4 mt-4">
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Annual Loss</p>
                                                <span className="text-xl font-bold text-slate-900">{data.headline?.estimated_annual_heat_loss_kwh || data.headline?.loss || data.loss}</span> <span className="text-xs text-slate-500">kWh</span>
                                                <Zap className="w-6 h-6 text-emerald-100 absolute right-2 top-2" />
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Cost</p>
                                                <span className="text-xl font-bold text-slate-900">€{data.headline?.estimated_annual_cost_eur || data.headline?.cost || data.cost}</span> <span className="text-xs text-slate-500">/yr</span>
                                                <Coins className="w-6 h-6 text-amber-100 absolute right-2 top-2" />
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Emissions</p>
                                                <span className="text-xl font-bold text-slate-900">{data.headline?.estimated_co2_emissions_kg || data.headline?.co2 || data.co2}</span> <span className="text-xs text-slate-500">kg</span>
                                                <CloudFog className="w-6 h-6 text-blue-100 absolute right-2 top-2" />
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Target</p>
                                                <span className="text-sm font-bold text-emerald-600">{data.headline?.key_driver || data.headline?.target || data.target}</span>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">Original RGB</p>
                                                <div className="aspect-[4/3] bg-slate-200 rounded-lg overflow-hidden border border-slate-300">
                                                    <img src={b64img(data.images?.rgb_png_base64 || data.images?.rgb)} className="w-full h-full object-cover" alt="RGB" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">Thermal with AI Boxes</p>
                                                <div className="aspect-[4/3] bg-slate-900 rounded-lg overflow-hidden border border-slate-300 relative group">
                                                    {/* Toggle between thermal and overlay on hover/click could be cool, for now show Overlay if available */}
                                                    <img src={b64img(data.images?.thermal_boxed_png_base64 || data.images?.overlay_png_base64 || data.images?.overlay)} className="w-full h-full object-contain" alt="Thermal Boxed" />
                                                    {/* Hover to compare */}
                                                    <img src={b64img(data.images?.thermal_png_base64 || data.images?.thermal)} className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300" alt="Raw Thermal" />
                                                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Hovering Raw Thermal
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex justify-end gap-2">
                                            <Button variant="outline" onClick={() => setShowResultModal(false)}>Close</Button>
                                            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                                                // Fix: Pass the FULL stored payload to Results.jsx so PDF/Export works correctly
                                                // The stored object should contain 'raw', 'meta', 'report', etc.
                                                navigate('/Results', { state: { result: rawData } });
                                            }}>
                                                Full Report & Export
                                            </Button>
                                        </div>
                                    </>
                                );
                            })() : (
                                <div className="p-8 text-center text-slate-500">
                                    No detailed report data available for this building.
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Floating Legend */}
                    <div className="absolute bottom-6 right-6 bg-white p-4 rounded-lg shadow-lg z-[1000] border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Heat Loss Intensity</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-sm"></div>
                                <span>Low Loss (Efficient)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-sm"></div>
                                <span>Moderate Loss</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm"></div>
                                <span>Critical Loss (Retrofit Priority)</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
