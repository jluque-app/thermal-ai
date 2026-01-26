import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// VIP allowlist - emails or domain patterns
const VIP_EMAILS = [
  // Add specific emails here, e.g., 'vip@example.com'
];

const VIP_DOMAINS = [
  // Add domain patterns here, e.g., '@enterprise-client.com'
];

function isVipEligible(email) {
  if (!email) return false;
  
  const lowerEmail = email.toLowerCase();
  
  // Check exact email matches
  if (VIP_EMAILS.some(vipEmail => vipEmail.toLowerCase() === lowerEmail)) {
    return true;
  }
  
  // Check domain matches
  if (VIP_DOMAINS.some(domain => lowerEmail.endsWith(domain.toLowerCase()))) {
    return true;
  }
  
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const userEmail = body.user_email || user.email;

    // Check if user is VIP eligible
    if (!isVipEligible(userEmail)) {
      return Response.json({ 
        vip_granted: false,
        message: 'Not eligible for VIP access'
      });
    }

    // Grant VIP access - update user metadata
    await base44.auth.updateMe({
      selected_plan: 'vip',
      vip_granted_at: new Date().toISOString(),
    });

    // Return success
    return Response.json({
      vip_granted: true,
      plan: 'vip',
      message: "You've been granted full access."
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      vip_granted: false
    }, { status: 500 });
  }
});