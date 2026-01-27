import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Zap, FileText, Users, Building } from 'lucide-react';

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="bg-slate-50 min-h-screen font-sans text-slate-900">

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-slate-50 z-0" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl mx-auto text-center space-y-6">
                        <p className="text-sm font-bold tracking-widest text-emerald-600 uppercase">BY ALLRETECH</p>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900">
                            Thermal<span className="text-emerald-600">AI</span>
                        </h1>
                        <h2 className="text-2xl md:text-3xl font-medium text-slate-700">
                            AI Building-Physics Expertise for Real Estate
                        </h2>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            From thermal images to structured heat-loss insights. ThermalAI combines specialized AI interpretation with deterministic analysis—designed for professionals who need correctness, transparency, and regulatory awareness.
                        </p>

                        <div className="pt-8 flex flex-col md:flex-row gap-4 justify-center">
                            <Button onClick={() => {
                                if (window.location.hostname.includes('localhost')) {
                                    navigate('/AppHome');
                                } else {
                                    window.location.href = 'https://app.thermalai.eu';
                                }
                            }} className="h-14 px-8 text-lg bg-emerald-600 text-white hover:bg-emerald-700 rounded-full font-bold shadow-lg hover:shadow-emerald-500/30 transition-all">
                                Run ThermalAI App <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/ExpertPreview')} className="h-14 px-8 text-lg border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-full font-bold transition-all">
                                Chat ThermalAI Expert
                            </Button>
                        </div>
                        <p className="text-sm text-slate-500 pt-4">
                            Preview is limited to 3 questions. For quantitative heat-loss estimates and reporting, use the ThermalAI App.
                        </p>
                    </div>
                </div>
            </section>

            {/* What Is / Is Not */}
            <section className="py-20 bg-white border-y border-slate-100">
                <div className="container mx-auto px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">What ThermalAI Is — and Isn't</h2>
                            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                                ThermalAI is a professional screening and decision-support tool designed to accelerate early-stage building assessment. It provides directional heat-loss insights for portfolio prioritization, due diligence, and audit planning—not regulatory certification.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12">
                            <div className="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100">
                                <h3 className="text-2xl font-bold text-emerald-800 mb-6 flex items-center gap-2">
                                    <Check className="w-6 h-6" /> ThermalAI Provides:
                                </h3>
                                <ul className="space-y-4">
                                    {[
                                        "Rapid thermal screening for portfolio prioritization",
                                        "AI-assisted anomaly detection and interpretation",
                                        "Screening-level heat-loss estimates for planning",
                                        "Professional documentation for stakeholder communication",
                                        "Decision support for retrofit investment"
                                    ].map(item => (
                                        <li key={item} className="flex items-start gap-3 text-emerald-900">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-rose-50/50 p-8 rounded-3xl border border-rose-100">
                                <h3 className="text-2xl font-bold text-rose-800 mb-6 flex items-center gap-2">
                                    ThermalAI Is Not:
                                </h3>
                                <ul className="space-y-4">
                                    {[
                                        "A certified Energy Performance Certificate (EPC)",
                                        "A replacement for on-site energy audits",
                                        "A guarantee of retrofit performance outcomes",
                                        "A regulatory compliance tool",
                                        "A substitute for detailed engineering analysis"
                                    ].map(item => (
                                        <li key={item} className="flex items-start gap-3 text-rose-900">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2.5 flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="mt-12 text-center text-slate-600 bg-slate-50 p-6 rounded-xl border border-slate-200">
                            Use ThermalAI to identify priorities, support investment decisions, and plan detailed assessments—then engage qualified professionals for regulatory certification and implementation.
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-24 bg-slate-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Pricing & Plans</h2>
                        <p className="text-lg text-slate-600">Choose the plan that fits your workflow</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Community */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Community</h3>
                            <div className="text-4xl font-bold text-emerald-600 mb-2">Free</div>
                            <p className="text-slate-500 text-sm mb-6">Perfect for testing the platform</p>
                            <ul className="space-y-3 mb-8">
                                {["Up to 3 building analyses", "Basic heat-loss overview", "Key metrics and visual reports"].map(i => (
                                    <li key={i} className="flex items-center gap-3 text-slate-600 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {i}</li>
                                ))}
                            </ul>
                            <Button variant="outline" className="w-full" onClick={() => navigate('/PlanSelection')}>Start Free</Button>
                        </div>

                        {/* Project */}
                        <div className="bg-white p-8 rounded-3xl border-2 border-emerald-500 shadow-xl relative transform md:-translate-y-4">
                            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded">POPULAR</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Project</h3>
                            <div className="text-4xl font-bold text-slate-900 mb-2">€99 <span className="text-lg font-normal text-slate-500">/ scan</span></div>
                            <p className="text-slate-500 text-sm mb-6">For professionals needing client-ready documentation</p>
                            <ul className="space-y-3 mb-8">
                                {["Volume packs available", "Full heat-loss quantification", "Professional PDF reports", "ThermalAI Expert access included"].map(i => (
                                    <li key={i} className="flex items-center gap-3 text-slate-700 font-medium text-sm"><Check className="w-4 h-4 text-emerald-500" /> {i}</li>
                                ))}
                            </ul>
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => navigate('/PlanSelection')}>Choose Project</Button>
                        </div>

                        {/* Enterprise */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Enterprise</h3>
                            <div className="text-4xl font-bold text-slate-900 mb-2">Custom</div>
                            <p className="text-slate-500 text-sm mb-6">For large portfolios and city-wide programs</p>
                            <ul className="space-y-3 mb-8">
                                {["Custom pricing for portfolios", "Dedicated support", "API access", "Team collaboration tools"].map(i => (
                                    <li key={i} className="flex items-center gap-3 text-slate-600 text-sm"><Check className="w-4 h-4 text-emerald-500" /> {i}</li>
                                ))}
                            </ul>
                            <Button variant="outline" className="w-full" onClick={() => navigate('/PlanSelection')}>Contact Sales</Button>
                        </div>
                    </div>
                    <div className="text-center mt-8 text-slate-500 text-sm">
                        Not sure which plan fits your needs? Start with the free Community tier and upgrade anytime.
                    </div>
                </div>
            </section>

            {/* Why User Expertise */}
            <section className="py-20 bg-white border-y border-slate-100">
                <div className="container mx-auto px-6 max-w-5xl">
                    <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Why Thermal Imaging Requires Expertise</h2>

                    <div className="grid md:grid-cols-2 gap-12">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4">The Interpretation Challenge</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Thermal images capture surface temperatures, not heat loss directly. Correct interpretation requires understanding emissivity variations, reflections from surrounding objects, weather conditions during capture, camera resolution limits, and thermal lag in building materials. Misreading these factors leads to incorrect conclusions about building performance.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4">The AI Risk</h3>
                            <ul className="space-y-3 text-slate-600">
                                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2" /> General AI chatbots lack domain grounding</li>
                                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2" /> May hallucinate technical explanations</li>
                                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2" /> Overstate certainty without uncertainty quantification</li>
                                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2" /> Risk of incorrect screening insights</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Platform Architecture */}
            <section id="solutions" className="py-24 bg-slate-900 text-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-white mb-4">The ThermalAI Platform: Two-Layer Architecture</h2>
                        <p className="text-lg text-slate-400 max-w-3xl mx-auto">
                            Separating AI interpretation from deterministic analysis increases trust and reliability. Expert provides context and uncertainty; App provides reproducible quantification.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
                            <h3 className="text-2xl font-bold text-emerald-400 mb-4">ThermalAI Expert</h3>
                            <p className="text-slate-300 leading-relaxed text-sm">
                                Specialized AI assistant for interpretation and reasoning. Grounded in scientific literature, standards guidance, and thermal imaging best practices. Explains anomalies, assesses limitations, and provides decision support—without fabricating numbers.
                            </p>
                            <div className="mt-8">
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => navigate('/ExpertPreview')}>Try Expert Chat</Button>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
                            <h3 className="text-2xl font-bold text-blue-400 mb-4">ThermalAI App</h3>
                            <p className="text-slate-300 leading-relaxed text-sm">
                                Deterministic heat-loss estimation engine. Processes thermal and RGB images to detect hotspots, calculate heat-loss proxies, generate annualized estimates, and produce structured professional reports.
                            </p>
                            <div className="mt-8">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/AppHome')}>Go to App</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it Works / Workflow */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-6 max-w-6xl">
                    <h2 className="text-3xl font-bold text-slate-900 mb-16 text-center">How ThermalAI Works</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-emerald-700 font-bold text-xl">1</div>
                            <h3 className="text-xl font-bold text-slate-900">Ask ThermalAI Expert</h3>
                            <p className="text-slate-600 text-sm">Consult the AI assistant to understand thermal anomalies, assess measurement limitations, and interpret building physics.</p>
                        </div>
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto text-blue-700 font-bold text-xl">2</div>
                            <h3 className="text-xl font-bold text-slate-900">Run ThermalAI App</h3>
                            <p className="text-slate-600 text-sm">Upload thermal and RGB images. AI detects façade elements, then deterministic calculations estimate heat losses.</p>
                        </div>
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto text-purple-700 font-bold text-xl">3</div>
                            <h3 className="text-xl font-bold text-slate-900">Download Reports</h3>
                            <p className="text-slate-600 text-sm">Export structured professional reports with visual documentation, technical metadata, and quantified analysis.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer CTA */}
            <section className="bg-slate-900 py-16 text-center">
                <div className="container mx-auto px-6">
                    <p className="text-emerald-500 font-bold tracking-widest uppercase mb-4">THERMALAI BY ALLRETECH</p>
                    <h2 className="text-3xl font-bold text-white mb-8">Ready to quantify heat losses in your building?</h2>
                    <Button size="lg" onClick={() => navigate('/PlanSelection')} className="h-14 px-10 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-full">
                        Explore Plans
                    </Button>
                </div>
            </section>
        </div>
    );
}
