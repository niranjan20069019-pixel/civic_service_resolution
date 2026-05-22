import { jsonResponse, createAuthPayload, DEFAULT_USER } from '../_helpers.js';
export async function onRequest() {
  return jsonResponse({ success: true, data: createAuthPayload(DEFAULT_USER) });
}
