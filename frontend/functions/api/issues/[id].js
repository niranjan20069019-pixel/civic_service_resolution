import { jsonResponse, SAMPLE_ISSUES } from '../_helpers.js';
export async function onRequest(context) {
  const { id } = context.params;
  const issue = SAMPLE_ISSUES.find((item) => item.id === id);
  return issue ? jsonResponse({ success: true, data: issue }) : jsonResponse({ success: false, message: 'Issue not found.' }, 404);
}
