// Pages/PlanSelection.jsx
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
// import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { LoginDialog } from "@/components/LoginDialog";

export default function PlanSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const nextPath = searchParams.get("next") || "/Dashboard";

  // New Pricing Data
  const PLANS = [
    {
      id: "community",
      name: "Community",
      price: "Free",
      desc: "Perfect for testing the platform",
      features: ["Up to 3 building analyses", "Basic heat-loss overview", "Key metrics and visual reports"],
      cta: "Start Free",
      variant: "outline",
      popular: false
    },
    {
      id: "project",
      name: "Project",
      price: "€9",
      unit: "/ scan",
      desc: "For professionals needing client-ready documentation",
      features: ["Volume packs available", "Full heat-loss quantification", "Professional PDF reports", "ThermalAI Expert access included"],
      cta: "Choose Project",
      variant: "default",
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      desc: "For large portfolios and city-wide programs",
      features: ["Custom pricing for portfolios", "Dedicated support", "API access", "Team collaboration tools"],
      cta: "Contact Sales",
      variant: "outline",
      popular: false
    }
  ];
  const handleSelect = async (planId) => {
    try {
      const userId = user?.id;
      const userEmail = user?.email;

      // REQUIRE AUTH for ALL plans, including Community
      if (!userId || !userEmail) {
        setLoginOpen(true);
        return;
      }

      if (planId === 'community') {
        navigate(nextPath);
        return;
      }

      if (planId === 'project') {
        window.location.href = 'https://buy.stripe.com/aFa00j7Eb0Mg1hL7xT0kE00';
        return;
      }

      if (planId === 'enterprise') {
        window.location.href = 'mailto:sales@thermalai.eu?subject=Enterprise%20Plan%20Inquiry';
        return;
      }

    } catch (e) {
      console.error("Selection failed", e);
      alert("Error: " + e.message);
    }
  };

  // Handle Skip with Auth Check
  const handleSkip = () => {
    if (!user) {
      setLoginOpen(true);
    } else {
      navigate(nextPath);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-10 px-4 md:px-6">
      <div className="max-w-7xl mx-auto space-y-12 text-center">
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Pricing & Plans</h2>
          <p className="text-lg text-slate-600">Choose the plan that fits your workflow</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`bg-white p-8 rounded-3xl border shadow-sm transition-all ${plan.popular ? 'border-emerald-500 border-2 shadow-xl transform md:-translate-y-4 relative' : 'border-slate-200 hover:shadow-md'}`}>
              {plan.popular && <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded">POPULAR</div>}
              <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {plan.price} {plan.unit && <span className="text-lg font-normal text-slate-500">{plan.unit}</span>}
              </div>
              <p className="text-slate-500 text-sm mb-6 min-h-[40px]">{plan.desc}</p>
              <ul className="space-y-3 mb-8 text-left min-h-[120px]">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> {feature}
                  </li>
                ))}
              </ul>
              <Button 
                variant={plan.variant} 
                className={`w-full ${plan.popular ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                onClick={() => handleSelect(plan.id)}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
