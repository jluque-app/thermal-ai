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

      // Map planId directly to lookup_key for paid plans
      const lookupKey = planId;

      const baseUrl = appParams.appBaseUrl || "";
      const resp = await fetch(`${baseUrl}/v1/billing/checkout`, {
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
        {/* ... */}
        {/* ... (existing JSX) ... */}

        <div className="text-center">
          <Button variant="link" onClick={handleSkip} className="text-slate-400 hover:text-slate-600 text-xs">
            Skip for now
          </Button>
        </div>

      </div>
    </div>
  );
}
