import { jsonResponse } from '../../_helpers.js';
export async function onRequest(context) {
  const body = await context.request.json();
  return jsonResponse({ success: true, data: { id: context.params.id, status: body?.status || 'open', note: body?.note || null } });
}
