import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Building2, MapPin, ArrowRight } from "lucide-react";

const CitySelection = () => {
    const navigate = useNavigate();

    const handleSelectCity = (city) => {
        // Navigate to Dashboard with city state
        navigate('/Dashboard', { state: { selectedCity: city } });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Select Your Pilot City</h1>
                    <p className="text-slate-500">Choose a location to view the thermal digital twin and analyzed properties.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Berlin Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => handleSelectCity('berlin')}>
                        <div className="h-48 bg-slate-800 relative">
                            {/* Placeholder for Berlin Image */}
                            <div className="absolute inset-0 flex items-center justify-center text-slate-600 bg-slate-200">
                                <span className="font-bold text-2xl opacity-20">BERLIN</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                            <div className="absolute bottom-4 left-4 text-white">
                                <h2 className="text-2xl font-bold flex items-center gap-2">Berlin <span className="text-sm font-normal bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">DE</span></h2>
                                <p className="text-slate-300 text-sm">Demo Portfolio</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 mb-4">Original demo dataset featuring residential and commercial properties in the city center.</p>
                            <Button className="w-full group-hover:bg-emerald-600 transition-colors" variant="outline">
                                View Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>

                    {/* Gyor Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => handleSelectCity('gyor')}>
                        <div className="h-48 bg-emerald-900 relative">
                            {/* Placeholder for Gyor Image */}
                            <div className="absolute inset-0 flex items-center justify-center text-emerald-800 bg-emerald-100">
                                <span className="font-bold text-2xl opacity-20">GYŐR</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/80 to-transparent"></div>
                            <div className="absolute bottom-4 left-4 text-white">
                                <h2 className="text-2xl font-bold flex items-center gap-2">Győr <span className="text-sm font-normal bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">HU</span></h2>
                                <p className="text-emerald-100 text-sm">Pilot Project</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 mb-4">New pilot site featuring detailed thermal analysis of the University district and residential zones.</p>
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white group-hover:bg-emerald-700 transition-colors">
                                View Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Button variant="ghost" onClick={() => navigate('/Dashboard')} className="text-slate-400 hover:text-slate-600">
                        Skip to Default Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CitySelection;
