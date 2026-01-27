// Pages/PlanSelection.jsx
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function PlanSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const nextPath = searchParams.get("next") || "/Dashboard";

  // New Pricing Data
  const PLANS = [
    {
      id: "community",
      name: "Community",
      price: "Free",
      desc: "Perfect for testing the platform.",
      features: ["3 Building Analyses / mo", "Basic Reports", "Web-only Access"],
      cta: "Continue Free",
      variant: "outline",
      popular: false
    },
    {
      id: "project_scan_1",
      name: "Single Scan",
      price: "€99",
      unit: "/ scan",
      desc: "One-time access to a full building analysis.",
      features: ["Detailed Heat-Loss Breakdown", "Monetary Cost Estimates", "CO₂ Emissions Analysis", "Downloadable PPT/PDF"],
      cta: "Buy Now",
      variant: "default",
      popular: false
    },
    {
      id: "project_pack_10",
      name: "Bundle of 10",
      price: "€790",
      unit: " total",
      desc: "Save ~20%. Valid for a limited period.",
      features: ["10 Full Analyses", "All 'Single Scan' features", "Component-level breakdown", "Shareable Reports"],
      cta: "Get Bundle",
      variant: "default",
      popular: true
    },
    {
      id: "project_pack_50",
      name: "Bundle of 50",
      price: "€2,900",
      unit: " total",
      desc: "For short-term projects or pilot programs.",
      features: ["50 Full Analyses", "Bulk Processing", "Priority Support", "All Pro features"],
      cta: "Get Bundle",
      variant: "outline",
      popular: false
    },
    {
      id: "project_monthly",
      name: "Subscription",
      price: "€1,990",
      unit: "/ month",
      desc: "For high-volume continuous usage.",
      features: ["50 Analyses / month", "Full Reports & exports", "CO₂ & Cost Analysis", "Ongoing Access"],
      cta: "Subscribe",
      variant: "outline",
      popular: false
    }
  ];

  const handleSelect = async (planId) => {
    try {
      if (planId === 'community') {
        navigate(nextPath);
        return;
      }

      const userId = user?.id;
      const userEmail = user?.email;

      if (!userId || !userEmail) {
        alert("Please sign in first to purchase a plan.");
        return;
      }

      // Map planId directly to lookup_key for paid plans
      const lookupKey = planId;

      const resp = await fetch("/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookup_key: lookupKey,
          user_id: userId,
          user_email: userEmail,
          success_url: window.location.origin + "/BillingSuccess?session_id={CHECKOUT_SESSION_ID}&next=" + encodeURIComponent(nextPath),
          cancel_url: window.location.origin + "/PlanSelection?canceled=true",
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Checkout failed");
      }

      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to start checkout.");
      }

    } catch (e) {
      console.error("Checkout failed", e);
      alert("Payment Error: " + e.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-10 px-4 md:px-6">
      <div className="max-w-7xl mx-auto space-y-12 text-center">

        <div className="space-y-4 relative">
          <Button variant="ghost" className="md:absolute md:left-0 md:top-0 text-slate-500 hover:text-slate-900 md:hover:bg-slate-100" onClick={() => navigate('/Home')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight pt-12 md:pt-0">Simple, Transparent Pricing</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">Choose the plan that fits your workflow. From single scans to enterprise solutions.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 text-left items-start">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`bg-white p-6 rounded-3xl flex flex-col relative overflow-hidden transition-all ${plan.popular ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 scale-105 z-10' : 'border border-slate-200 hover:shadow-lg'}`}>

              {plan.popular && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
              )}
              {plan.popular && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Popular</div>
              )}

              <h3 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className={`font-bold tracking-tight ${plan.popular ? 'text-emerald-600 text-3xl' : 'text-slate-900 text-2xl'}`}>{plan.price}</span>
                {plan.unit && <span className="text-slate-500 text-sm">{plan.unit}</span>}
              </div>

              <p className="text-slate-500 text-xs mb-6 min-h-[40px]">{plan.desc}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-600 text-xs">
                    <Check className={`w-3 h-3 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="leading-tight">{feat}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.variant === 'outline' ? 'outline' : 'default'}
                className={`w-full ${plan.variant === 'default' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                onClick={() => handleSelect(plan.id)}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center pt-8">
          <p className="text-slate-400 text-sm mb-4">Need a custom enterprise solution?</p>
          <Button variant="link" onClick={() => window.location.href = "mailto:sales@thermalai.eu"} className="text-emerald-600 hover:text-emerald-700">
            Contact Sales <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="text-center">
          <Button variant="link" onClick={() => navigate(nextPath)} className="text-slate-400 hover:text-slate-600 text-xs">
            Skip for now
          </Button>
        </div>

      </div>
    </div>
  );
}
