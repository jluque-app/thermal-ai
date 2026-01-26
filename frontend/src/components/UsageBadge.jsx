import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getUserIdentity } from "@/components/userIdentity";
import { Badge } from "@/components/ui/badge";

export default function UsageBadge() {
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntitlements();
  }, []);

  const fetchEntitlements = async () => {
    try {
      const user = await base44.auth.me();
      const { userId, userEmail } = getUserIdentity(user);

      const response = await fetch(`http://localhost:8000/v1/billing/me?user_id=${encodeURIComponent(userId)}&user_email=${encodeURIComponent(userEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setEntitlements(data);
      }
    } catch (error) {
      console.error('Failed to fetch entitlements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !entitlements) return null;

  const { plan, scan_credits_remaining, monthly_used, monthly_quota } = entitlements;

  let badgeText = '';

  if (plan === 'vip' || plan === 'enterprise') {
    badgeText = '✨ VIP Access - Unlimited';
  } else if (plan === 'community') {
    badgeText = 'Free plan: 3 analyses total';
  } else if (plan === 'project' && typeof scan_credits_remaining === 'number') {
    badgeText = `Credits: ${scan_credits_remaining} analyses remaining`;
  } else if (plan === 'project' && typeof monthly_used === 'number' && typeof monthly_quota === 'number') {
    badgeText = `This month: ${monthly_used} / ${monthly_quota} analyses`;
  }

  if (!badgeText) return null;

  return (
    <Badge variant="secondary" className="text-xs">
      {badgeText}
    </Badge>
  );
}