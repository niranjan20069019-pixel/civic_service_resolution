import { jsonResponse, createAuthPayload } from '../_helpers.js';
export async function onRequest(context) {
  const body = await context.request.json();
  const { name, email, role = 'citizen' } = body || {};
  if (!name || !email) {
    return jsonResponse({ success: false, message: 'Name and email are required.' }, 422);
  }
  const user = { id: `user-${Math.floor(Math.random() * 10000)}`, name, email, role };
  return jsonResponse({ success: true, data: createAuthPayload(user) }, 201);
}
