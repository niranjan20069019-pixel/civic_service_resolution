import { jsonResponse } from '../_helpers.js';
export async function onRequest() {
  return jsonResponse({ success: true, data: [ { key: 'open', value: 1 }, { key: 'in_progress', value: 1 } ] });
}
