import { jsonResponse } from './_helpers.js';
export async function onRequest() {
  return jsonResponse({ success: true, data: { url: 'https://via.placeholder.com/600x400.png?text=Uploaded+Image' } });
}
