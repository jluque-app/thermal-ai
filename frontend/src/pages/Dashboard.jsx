import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, MessageSquareText, Download, Building, Search, Map as MapIcon, Power, ArrowRight, TrendingUp, Zap, CloudFog, Coins } from 'lucide-react';
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

// Prototype Data: German Neighborhood (Example: Prenzlauer Berg, Berlin)
const DEMO_BUILDINGS = [
    { id: 'real_demo', lat: 52.5200, lng: 13.4050, addr: "Berlin Property (Real Analysis)", type: "Residential Block", rating: "poor", loss: "Critical", savings: "€1,740/yr" },
    { id: 1, lat: 52.5414, lng: 13.4132, addr: "Danziger Str. 55", type: "Apartment Block", rating: "poor", loss: "High", savings: "€4,200/yr" },
    { id: 2, lat: 52.5420, lng: 13.4145, addr: "Danziger Str. 62", type: "Office", rating: "medium", loss: "Moderate", savings: "€1,800/yr" },
    { id: 3, lat: 52.5408, lng: 13.4110, addr: "Lychener Str. 12", type: "Historical", rating: "good", loss: "Low", savings: "€450/yr" },
    { id: 4, lat: 52.5425, lng: 13.4150, addr: "Pappelallee 22", type: "Retail", rating: "poor", loss: "Critical", savings: "€6,100/yr" },
    { id: 5, lat: 52.5410, lng: 13.4125, addr: "Raumerstr. 8", type: "Mixed Use", rating: "medium", loss: "Moderate", savings: "€2,100/yr" },
];

function ChangeView({ center }) {
    const map = useMap();
    map.setView(center, 15);
    return null;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoadingAuth } = useAuth();
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [showResultModal, setShowResultModal] = useState(false);

    // Default Center (Győr, Hungary)
    const defaultCenter = [47.6825, 17.6044];

    // Mock Data for Map
    const DEMO_BUILDINGS = [
        { id: 'gyor_1', lat: 47.6825, lng: 17.6044, status: 'Completed', rating: 'poor', addr: '9025 Gyor, Esze Tamas utca 13', type: 'Residential (Brick)', sqft: '192 m²' },
        { id: '1', lat: 52.5200, lng: 13.4050, status: 'Completed', rating: 'good', addr: 'Alexanderplatz 1, Berlin', type: 'Commercial Office', sqft: '12,500' },
        { id: '2', lat: 52.5220, lng: 13.4000, status: 'In Progress', rating: 'medium', addr: 'Karl-Liebknecht-Str. 14', type: 'Mixed Use', sqft: '8,200' },
        { id: 'real_demo', lat: 52.5418, lng: 13.4135, status: 'Completed', rating: 'poor', addr: 'Berlin Property (Real Analysis)', type: 'Residential Block', sqft: '1,680 m²' },
    ];

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
                                className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${selectedBuilding?.id === b.id ? 'ring-2 ring-emerald-500' : ''} ${b.rating === 'good' ? 'border-l-emerald-500' : b.rating === 'medium' ? 'border-l-amber-500' : 'border-l-red-500'}`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-slate-800">{b.addr}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.rating === 'good' ? 'bg-emerald-100 text-emerald-800' : b.rating === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                            {b.loss} Loss
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">{b.type}</p>
                                    <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block">
                                        <Power className="w-3 h-3" /> Potential Savings: <strong>{b.savings}</strong>
                                    </div>
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
                    <MapContainer center={defaultCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ChangeView center={selectedBuilding ? [selectedBuilding.lat, selectedBuilding.lng] : defaultCenter} />

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
                                                if (b.id === 'real_demo' || b.id === 'gyor_1') {
                                                    setShowResultModal(true);
                                                } else {
                                                    navigate('/Results');
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
                            {(() => {
                                const isGyor = selectedBuilding?.id === 'gyor_1';
                                const data = isGyor ? {
                                    title: "Analysis Report: Győr Residential",
                                    addr: "9025 Győr, Esze Tamás utca 13",
                                    loss: "12,100", cost: "€1,450", co2: "2,400", target: "Uninsulated Roof/Facade",
                                    rgb: "/gyor_pilot/building_1/rgb.jpg", thermal: "/gyor_pilot/building_1/thermal.jpg"
                                } : {
                                    title: "Analysis Report: Berlin Property",
                                    addr: "Berlin Property (Real Analysis)",
                                    loss: "14,500", cost: "€1,740", co2: "2,900", target: "Uninsulated Façade",
                                    rgb: "/demo_rgb.jpg", thermal: "/demo_thermal.jpg"
                                };

                                return (
                                    <>
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                                <TrendingUp className="w-6 h-6 text-emerald-600" /> {data.title}
                                            </DialogTitle>
                                            <DialogDescription>
                                                Full thermal analysis results for {data.addr}
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="grid md:grid-cols-4 gap-4 mt-4">
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Annual Loss</p>
                                                <span className="text-xl font-bold text-slate-900">{data.loss}</span> <span className="text-xs text-slate-500">kWh</span>
                                                <Zap className="w-6 h-6 text-emerald-100 absolute right-2 top-2" />
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Cost</p>
                                                <span className="text-xl font-bold text-slate-900">{data.cost}</span> <span className="text-xs text-slate-500">/yr</span>
                                                <Coins className="w-6 h-6 text-amber-100 absolute right-2 top-2" />
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Emissions</p>
                                                <span className="text-xl font-bold text-slate-900">{data.co2}</span> <span className="text-xs text-slate-500">kg</span>
                                                <CloudFog className="w-6 h-6 text-blue-100 absolute right-2 top-2" />
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Target</p>
                                                <span className="text-sm font-bold text-emerald-600">{data.target}</span>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">Original RGB</p>
                                                <div className="aspect-[4/3] bg-slate-200 rounded-lg overflow-hidden border border-slate-300">
                                                    <img src={data.rgb} className="w-full h-full object-cover" alt="RGB" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">Thermal Scan</p>
                                                <div className="aspect-[4/3] bg-slate-900 rounded-lg overflow-hidden border border-slate-300">
                                                    <img src={data.thermal} className="w-full h-full object-contain" alt="Thermal" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex justify-end gap-2">
                                            <Button variant="outline" onClick={() => setShowResultModal(false)}>Close</Button>
                                            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                                                const payload = {
                                                    report: {
                                                        meta: { city: isGyor ? "Győr, Hungary" : "Berlin, Germany", address: data.addr },
                                                        headline: {
                                                            estimated_annual_heat_loss_kwh: parseInt(data.loss.replace(',', '')),
                                                            estimated_annual_cost_eur: parseInt(data.cost.replace('€', '').replace(',', '')),
                                                            estimated_co2_emissions_kg: parseInt(data.co2.replace(',', '')),
                                                            present_value_eur: parseInt(data.cost.replace('€', '').replace(',', '')) * 15, // rough calc
                                                            key_driver: data.target
                                                        },
                                                        images: {
                                                            rgb_png_base64: data.rgb,
                                                            thermal_png_base64: data.thermal,
                                                            overlay_png_base64: data.rgb,
                                                            boxed_rgb_png_base64: data.rgb
                                                        }
                                                    },
                                                    raw: { artifacts: { rgb_image_base64_png: data.rgb, thermal_image_base64_png: data.thermal } }
                                                };
                                                navigate('/Results', { state: { result: payload } });
                                            }}>
                                                Full Report & Export
                                            </Button>
                                        </div>
                                    </>
                                );
                            })()}
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
