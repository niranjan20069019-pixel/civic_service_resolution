import { jsonResponse } from './_helpers.js';
export async function onRequest() {
  return jsonResponse({ success: true, message: 'Civic Issue API is running', data: { uptime: 1, env: 'production', timestamp: new Date().toISOString() }, errors: null });
}
