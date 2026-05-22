import { jsonResponse } from '../../_helpers.js';
export async function onRequest() {
  return jsonResponse({ success: true, data: [ { id: 'h1', action: 'created', timestamp: new Date().toISOString() } ] });
}
