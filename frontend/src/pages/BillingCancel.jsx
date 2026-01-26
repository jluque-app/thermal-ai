import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function BillingCancel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/NewAnalysis";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-slate-600" />
          </div>
          <CardTitle className="text-2xl text-[#2D4057]">Checkout Cancelled</CardTitle>
          <CardDescription className="text-base pt-2">No charges were made to your account.</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <p className="text-sm text-slate-600">You can return to pricing to select a plan whenever you're ready.</p>

          <Button
            onClick={() => navigate(`/PlanSelection?next=${encodeURIComponent(next)}&force=1`)}
            className="w-full bg-[#2D9B87] hover:bg-[#268577] text-white"
          >
            Back to Plans
          </Button>

          <Button onClick={() => navigate("/Home")} variant="outline" className="w-full">
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
