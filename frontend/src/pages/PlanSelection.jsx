// Pages/PlanSelection.jsx
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, ArrowRight } from "lucide-react";

export default function PlanSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next") || "/NewAnalysis";

  // Placeholder functionality for UI demo
  const handleSelect = async (plan) => {
    try {
      if (plan === 'community') {
        navigate(nextPath);
        return;
      }

      // Placeholder Price IDs - in production these come from environment or API
      const PRICE_IDS = {
        project: 'price_project_scan_1',
        enterprise: 'price_enterprise_contact'
      };

      if (plan === 'enterprise') {
        window.location.href = "mailto:sales@thermalai.eu";
        return;
      }

      // Trigger Stripe Checkout
      // Note: Using a mock function here if base44.checkout isn't fully configured in this scratch env
      // In real app: await base44.billing.checkout({ priceId: PRICE_IDS[plan], successUrl: window.location.origin + nextPath });

      console.log(`Checkout initiated for ${plan}`);
      alert(`Redirecting to payment for ${plan}... (Simulation)`);
      // Simulate success
      setTimeout(() => navigate(nextPath), 1000);

    } catch (e) {
      console.error("Checkout failed", e);
      alert("Checkout failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-10 px-4 md:px-6">
      <div className="max-w-6xl mx-auto space-y-12 text-center">

        <div className="space-y-4">
          <Button variant="ghost" className="md:absolute md:left-10 md:top-10 text-slate-500 hover:text-slate-900 md:hover:bg-slate-100" onClick={() => navigate('/Home')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Simple, Transparent Pricing</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">Choose the plan that fits your workflow. No hidden fees.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-left">
          {/* Free */}
          <div className="bg-white p-8 rounded-3xl flex flex-col relative overflow-hidden group hover:shadow-lg border border-slate-200 transition-all">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Community</h3>
            <div className="text-4xl font-bold text-emerald-600 mb-6">Free</div>
            <p className="text-slate-500 text-sm mb-8 min-h-[40px]">Perfect for testing the platform with a few scans.</p>

            <ul className="space-y-4 mb-8 flex-1">
              {[
                "3 Building Analyses",
                "Basic Reports",
                "Web-only Access"
              ].map(i => (
                <li key={i} className="flex items-center gap-3 text-slate-600 text-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Check className="w-3 h-3" /></div>
                  {i}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => handleSelect('community')}>
              Continue Free
            </Button>
          </div>

          {/* Pro */}
          <div className="bg-white p-8 rounded-3xl flex flex-col relative overflow-hidden border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 transform md:-translate-y-4">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded uppercase">Most Popular</div>

            <h3 className="text-2xl font-bold text-slate-900 mb-2">Project</h3>
            <div className="text-4xl font-bold text-slate-900 mb-6">€99 <span className="text-lg font-normal text-slate-500">/ scan</span></div>
            <p className="text-slate-500 text-sm mb-8 min-h-[40px]">For professionals needing client-ready documentation.</p>

            <ul className="space-y-4 mb-8 flex-1">
              {[
                "Full Heat-Loss Quantification",
                "PDF & PPT Reports",
                "ThermalAI Expert Access",
                "Cost Estimates (ROI)"
              ].map(i => (
                <li key={i} className="flex items-center gap-3 text-slate-700 text-sm font-medium">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white"><Check className="w-3 h-3 stroke-[3px]" /></div>
                  {i}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold h-12" onClick={() => handleSelect('project')}>
              Get Started
            </Button>
          </div>

          {/* Enterprise */}
          <div className="bg-white p-8 rounded-3xl flex flex-col relative overflow-hidden hover:shadow-lg border border-slate-200 transition-all">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
            <div className="text-4xl font-bold text-slate-900 mb-6">Custom</div>
            <p className="text-slate-500 text-sm mb-8 min-h-[40px]">For large portfolios and city-wide programs.</p>

            <ul className="space-y-4 mb-8 flex-1">
              {[
                "Volume Discounts",
                "API Access",
                "Dedicated Support",
                "Team Management"
              ].map(i => (
                <li key={i} className="flex items-center gap-3 text-slate-600 text-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Check className="w-3 h-3" /></div>
                  {i}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => handleSelect('enterprise')}>
              Contact Sales
            </Button>
          </div>
        </div>

        <div className="text-center pt-8">
          <Button variant="link" onClick={() => navigate(nextPath)} className="text-slate-500 hover:text-slate-900">
            Skip for now <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

      </div>
    </div>
  );
}
