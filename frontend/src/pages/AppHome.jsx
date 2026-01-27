import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Image as ImageIcon, BarChart3, Target, Check } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';

export default function AppHome() {
    const navigate = useNavigate();
    const { isAuthenticated, navigateToLogin } = useAuth();

    return (
        <div className="bg-slate-50 min-h-screen font-sans text-slate-900 pb-20">
            {/* Hero Section */}
            <section className="pt-12 pb-20 px-6">
                <div className="max-w-5xl mx-auto text-center space-y-8">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900">
                        Thermal<span className="text-emerald-600">AI</span> <span className="text-slate-400">—</span> Quantify Heat Losses from Thermal Images
                    </h1>
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                        AI-powered thermal analysis to identify heat losses in buildings, estimate energy waste, CO₂ emissions, and monetary costs, and support retrofit decisions.
                    </p>

                    <div className="flex flex-col md:flex-row gap-4 justify-center pt-8">
                        {!isAuthenticated ? (
                            <Button
                                onClick={navigateToLogin}
                                className="h-14 px-8 text-lg bg-emerald-600 text-white hover:bg-emerald-700 rounded-full font-bold shadow-lg hover:shadow-emerald-500/30 transition-all"
                            >
                                Log In / Sign Up
                            </Button>
                        ) : (
                            <Button
                                onClick={() => navigate('/Dashboard')}
                                className="h-14 px-8 text-lg bg-emerald-600 text-white hover:bg-emerald-700 rounded-full font-bold shadow-lg hover:shadow-emerald-500/30 transition-all"
                            >
                                Go to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        )}

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
            </section>

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
                        onClick={() => navigate(isAuthenticated ? '/Dashboard' : '/PlanSelection')}
                        className="h-14 px-10 text-lg bg-emerald-600 text-white hover:bg-emerald-700 rounded-full font-bold shadow-lg hover:shadow-emerald-500/30 transition-all"
                    >
                        Get Started <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </section>
        </div>
    );
}
