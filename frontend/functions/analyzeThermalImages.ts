import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  console.log('🔵 analyzeThermalImages invoked');

  try {
    // No auth required for public app (keeps your Home/NewAnalysis public)
    createClientFromRequest(req);

    const formData = await req.formData();

    const rgbImage = formData.get('rgb_image');
    const thermalImage = formData.get('thermal_image');

    if (!rgbImage || !thermalImage) {
      return Response.json(
        { error: 'Both rgb_image and thermal_image are required' },
        { status: 400 }
      );
    }

    const apiUrl = Deno.env.get('THERMAL_API_BASE_URL');
    if (!apiUrl) {
      return Response.json(
        { error: 'THERMAL_API_BASE_URL not configured' },
        { status: 500 }
      );
    }

    // Forward ALL fields (files + any numeric/text params you add later)
    const apiFormData = new FormData();
    for (const [key, value] of formData.entries()) {
      apiFormData.append(key, value);
    }

    // Force small response by default (avoid Base44 quota issues)
    // These correspond to your FastAPI fields:
    // include_overlay_base64 (default false) and include_gamma_payload (default false)
    if (!apiFormData.has('include_overlay_base64')) {
      apiFormData.set('include_overlay_base64', 'false');
    }
    if (!apiFormData.has('include_gamma_payload')) {
      apiFormData.set('include_gamma_payload', 'false');
    }

    const endpoint = `${apiUrl.replace(/\/$/, '')}/analyze`;
    console.log(`🎯 Calling backend: ${endpoint}`);

    let response;

    // Attempt 1
    try {
      response = await fetch(endpoint, { method: 'POST', body: apiFormData });
    } catch (err) {
      console.log('❌ Attempt 1 failed:', err?.message || err);
      // Cold start retry
      await sleep(5000);
      response = await fetch(endpoint, { method: 'POST', body: apiFormData });
    }

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : { raw: await response.text() };

    if (!response.ok) {
      console.log(`❌ Backend returned ${response.status}`, payload);
      return Response.json(
        { error: 'Analysis failed', status: response.status, details: payload },
        { status: response.status }
      );
    }

    console.log('✅ Success');
    return Response.json(payload);
  } catch (error) {
    console.error('💥 Function error:', error);
    return Response.json(
      { error: error?.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});
