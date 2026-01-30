import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from '@/lib/AuthContext';
import { getUserIdentity } from "@/components/userIdentity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  // ...
  // ...

  // ...
  async function run() {
    try {
      // const currentUser = await base44.auth.me(); 
      // const currentUser = await base44.auth.me(); 
      const currentUser = user; // Use local context user

      // Safe check for identity
      const { userId, userEmail } = getUserIdentity(currentUser || {});

      if (!userId || !userEmail) {
        navigate("/NewAnalysis");
        return;
      }

      setStatus("Payment received ✅");
      setDetails("Finalizing your access (this can take a few seconds)…");

      // Poll entitlements until access flips true (webhook delay)
      const start = Date.now();
      const timeoutMs = 15000;

      async function checkOnce() {
        return await fetchBillingMe(userId, userEmail);
      }

      // immediate attempt
      let ent = await checkOnce();

      intervalId = setInterval(async () => {
        if (cancelled) return;

        if (Date.now() - start > timeoutMs) {
          clearInterval(intervalId);
          setStatus("Access is still processing…");
          setDetails("Stripe confirmation may take a bit. You can continue; downloads should unlock shortly.");
          goNext();
          return;
        }

        ent = await checkOnce();
        const allowed =
          !!(ent?.downloads_allowed || ent?.is_download_allowed || ent?.isDownloadAllowed);

        if (
          allowed ||
          ent?.plan === "vip" ||
          ent?.plan === "enterprise" ||
          ent?.plan === "project" ||
          ent?.plan === "project_monthly"
        ) {
          clearInterval(intervalId);
          setStatus("Access unlocked ✅");
          setDetails("Redirecting…");
          goNext();
        }
      }, 1000);

      function goNext() {
        // If returning to /Results, try to restore last payload from sessionStorage
        if (String(next).toLowerCase().includes("results")) {
          let saved = null;
          try {
            const raw = sessionStorage.getItem("thermalai_last_result_payload");
            if (raw) saved = JSON.parse(raw);
          } catch (e) { }

          if (saved) {
            navigate("/Results", { state: { result: saved } });
            return;
          }
        }

        navigate(next);
      }
    } catch (e) {
      console.error(e);
      setStatus("Something went wrong");
      setDetails("Please go back and try again.");
    }
  }

  run();

  return () => {
    cancelled = true;
    if (intervalId) clearInterval(intervalId);
  };
}, [navigate, next]);

return (
  <div className="min-h-screen bg-white p-6">
    <div className="max-w-xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Billing Success</CardTitle>
          <CardDescription>{status}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-slate-700">{details}</div>
          <div className="flex gap-2">
            <Button onClick={() => navigate(next)} className="bg-[#2D9B87] text-white">
              Continue
            </Button>
            <Button variant="outline" onClick={() => navigate("/Results")}>
              Go to Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);
}
