import { jsonResponse } from '../_helpers.js';
export async function onRequest() {
  return jsonResponse({ success: true, data: { totalIssues: 2, open: 1, in_progress: 1, resolved: 0, closed: 0 } });
}
