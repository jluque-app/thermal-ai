import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronRight, BarChart3, ShieldCheck, Zap, Image as ImageIcon, Target, Check } from "lucide-react";
import { LoginDialog } from "@/components/LoginDialog";

import { useAuth } from '@/lib/AuthContext';

export default function AppHome() {
    const navigate = useNavigate();
    const { user } = useAuth(); // Changed from isAuthenticated, navigateToLogin
    const [loginOpen, setLoginOpen] = useState(false);

    const handleLogin = () => {
        setLoginOpen(true);
    };

    return (
        <div className="relative isolate overflow-hidden bg-white"> {/* Changed main div class */}
            <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
            <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
                <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
                    <div className="mt-24 sm:mt-32 lg:mt-16">
                        <a href="#" className="inline-flex space-x-6">
                            <span className="rounded-full bg-emerald-600/10 px-3 py-1 text-sm font-semibold leading-6 text-emerald-600 ring-1 ring-inset ring-emerald-600/10">
                                Latest Update
                            </span>
                            <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-slate-600">
                                <span>New Analysis Engine v2.0</span>
                                <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
                            </span>
                        </a>
                    </div>
                    <h1 className="mt-10 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
                        Quantify Heat Losses.<br />
                        <span className="text-emerald-600">Scale Retrofits.</span>
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-slate-600">
                        ThermalAI transforms thermal inspections into actionable financial data.
                        Scale your retrofit projects with AI-powered analysis of heat loss, cost matching, and ROI projection.
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/ExpertPreview')}
                        className="h-14 px-8 text-lg border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-full font-bold transition-all"
                    >
                        Try ThermalAI Expert (Preview)
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/PlanSelection')}
                        className="h-14 px-8 text-lg text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-full font-medium transition-all"
                    >
                        View Pricing
                    </Button>
                </div>
            </div>


            {/* Features Grid */}
            <section className="py-16 bg-white border-y border-slate-100">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Fast Analysis</h3>
                            <p className="text-slate-600 text-sm">Get thermal analysis results in seconds with AI-powered processing</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
                                <ImageIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Image Processing</h3>
                            <p className="text-slate-600 text-sm">Upload RGB and thermal images for comprehensive heat loss detection</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Energy Insights</h3>
                            <p className="text-slate-600 text-sm">Estimate annual heat loss and cost impacts with detailed breakdowns</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
                                <Target className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Hotspot Detection</h3>
                            <p className="text-slate-600 text-sm">Identify thermal anomalies and areas requiring attention</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto text-center pb-16">
                    <h2 className="text-3xl font-bold text-slate-900">How It Works</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-9xl text-slate-900 leading-none -mt-4 -mr-4 group-hover:scale-110 transition-transform">1</div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Upload Images</h3>
                            <p className="text-slate-600">Upload both RGB and thermal images of your building facade</p>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-9xl text-slate-900 leading-none -mt-4 -mr-4 group-hover:scale-110 transition-transform">2</div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Enter Parameters</h3>
                            <p className="text-slate-600">Provide location, area, energy price, and temperature data</p>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-9xl text-slate-900 leading-none -mt-4 -mr-4 group-hover:scale-110 transition-transform">3</div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Get Results</h3>
                            <p className="text-slate-600">Review detailed thermal analysis with heat loss estimates and reports</p>
                        </div>
                    </div>
                </div>

                <div className="text-center mt-16">
                    <Button
                        onClick={() => navigate(user ? '/Dashboard' : '/PlanSelection')}
                        className="h-14 px-10 text-lg bg-emerald-600 text-white hover:bg-emerald-700 rounded-full font-bold shadow-lg hover:shadow-emerald-500/30 transition-all"
                    >
                        Get Started <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </section>
        </div >
    );
}
