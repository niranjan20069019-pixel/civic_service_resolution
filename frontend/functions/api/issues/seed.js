import { jsonResponse, SAMPLE_ISSUES } from '../_helpers.js';
export async function onRequest() {
  return jsonResponse({ success: true, data: SAMPLE_ISSUES });
}
