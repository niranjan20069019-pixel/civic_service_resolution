import { jsonResponse } from '../_helpers.js';
export async function onRequest() {
  return jsonResponse({ success: true, data: null });
}
