// Functions/expertChat.js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BACKEND_BASE_URL = Deno.env.get("THERMALAI_BACKEND_URL") || ""; 
// Example: https://YOUR-RENDER-SERVICE.onrender.com
// Must NOT end with a trailing slash (either is ok, but keep consistent)

Deno.serve(async (req) => {
  try {
    // Keep Base44 client creation (optional, useful later)
    // For PUBLIC chat we do NOT require authentication.
    createClientFromRequest(req);

    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    if (!BACKEND_BASE_URL) {
      return Response.json(
        { error: "THERMALAI_BACKEND_URL env var not set in Base44 Functions." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.message) {
      return Response.json({ error: "Missing 'message' in body." }, { status: 400 });
    }

    // Proxy request to your FastAPI backend
    const upstream = await fetch(`${BACKEND_BASE_URL}/v1/expert/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message,
        mode: body.mode || "Explain",
        session_id: body.session_id || null,
        metadata: body.metadata || {},
      }),
    });

    const text = await upstream.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    return Response.json(json, { status: upstream.status });
  } catch (error) {
    console.error("expertChat error:", error);
    return Response.json(
      { error: error?.message || "Failed to process request" },
      { status: 500 }
    );
  }
});
