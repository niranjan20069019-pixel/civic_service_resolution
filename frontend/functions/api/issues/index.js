import { jsonResponse, SAMPLE_ISSUES } from '../_helpers.js';
export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'GET') {
    return jsonResponse({ success: true, data: SAMPLE_ISSUES });
  }
  if (method === 'POST') {
    const body = await context.request.json();
    const issue = { id: `${Date.now()}`, ...body, status: 'open', createdAt: new Date().toISOString() };
    return jsonResponse({ success: true, data: { issue } }, 201);
  }
  return jsonResponse({ success: false, message: 'Method not allowed' }, 405);
}
