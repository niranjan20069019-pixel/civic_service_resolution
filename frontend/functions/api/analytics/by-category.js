import { jsonResponse } from '../_helpers.js';
export async function onRequest() {
  return jsonResponse({ success: true, data: [ { key: 'roads', value: 1 }, { key: 'safety', value: 1 } ] });
}
