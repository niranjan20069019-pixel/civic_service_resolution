import { jsonResponse, createAuthPayload, DEFAULT_USER } from '../_helpers.js';
export async function onRequest(context) {
  const body = await context.request.json();
  const { email } = body || {};
  if (!email) {
    return jsonResponse({ success: false, message: 'Email and password are required.' }, 422);
  }
  const user = { ...DEFAULT_USER, email, name: 'User', role: 'citizen' };
  return jsonResponse({ success: true, data: createAuthPayload(user) });
}
