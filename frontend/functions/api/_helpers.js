const DEFAULT_USER = { id: 'user-1', name: 'Alice', email: 'alice@city.gov', role: 'citizen' };
const SAMPLE_ISSUES = [
  { id: '1', title: 'Pothole in Main Street', description: 'Large pothole near the intersection.', status: 'open', category: 'roads', createdAt: '2026-05-22T10:00:00Z', assignedTo: null },
  { id: '2', title: 'Streetlight not working', description: 'Streetlight near park is off.', status: 'in_progress', category: 'safety', createdAt: '2026-05-21T14:12:00Z', assignedTo: 'bob@city.gov' },
];

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const createToken = (user, type = 'access') => {
  const payload = { type, user, iat: Date.now() };
  return btoa(JSON.stringify(payload));
};

const createAuthPayload = (user) => ({
  accessToken: createToken(user, 'access'),
  refreshToken: createToken(user, 'refresh'),
  user,
});

const parseBody = async (request) => {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await request.json();
  }
  if (contentType.includes('multipart/form-data')) {
    return await request.formData();
  }
  return null;
};

const requireAuth = (request) => {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ');
};

export { DEFAULT_USER, SAMPLE_ISSUES, jsonResponse, createAuthPayload, parseBody, requireAuth };
