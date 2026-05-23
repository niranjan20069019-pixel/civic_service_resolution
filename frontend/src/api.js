// ─── Token storage ────────────────────────────────────────────────────────────
const store = {
  get: (k) => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, v),
  del: (k) => localStorage.removeItem(k),
};

// ─── Base fetch with auth + auto-refresh ─────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = store.get('accessToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Try token refresh on 401
  if (res.status === 401 && store.get('refreshToken')) {
    const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: store.get('refreshToken') }),
    });
    if (refreshed.ok) {
      const { data } = await refreshed.json();
      store.set('accessToken', data.accessToken);
      store.set('refreshToken', data.refreshToken);
      headers['Authorization'] = `Bearer ${data.accessToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } else {
      // Refresh failed — clear tokens
      store.del('accessToken');
      store.del('refreshToken');
      store.del('user');
      window.location.reload();
      return;
    }
  }

  return res.json();
}

// ─── API methods ──────────────────────────────────────────────────────────────
export const api = {
  // Auth
  login: async (email, password) => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success) {
      store.set('accessToken', res.data.accessToken);
      store.set('refreshToken', res.data.refreshToken);
      store.set('user', JSON.stringify(res.data.user));
    }
    return res;
  },

  register: async (name, email, password, role) => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    if (res.success) {
      // Auto-login after register
      const loginRes = await api.login(email, password);
      if (!loginRes.success) return loginRes;
      return loginRes;
    }
    return res;
  },

  logout: async () => {
    const refreshToken = store.get('refreshToken');
    if (refreshToken) {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    store.del('accessToken');
    store.del('refreshToken');
    store.del('user');
  },

  getStoredUser: () => {
    try {
      const raw = store.get('user');
      if (!raw || !store.get('accessToken')) {
        store.del('user'); store.del('accessToken'); store.del('refreshToken');
        return null;
      }
      const user = JSON.parse(raw);
      // If token is expired, clear all and force re-login
      try {
        const payload = JSON.parse(atob(store.get('accessToken').split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          store.del('user'); store.del('accessToken'); store.del('refreshToken');
          return null;
        }
      } catch {
        store.del('user'); store.del('accessToken'); store.del('refreshToken');
        return null;
      }
      return user;
    } catch {
      store.del('user'); store.del('accessToken'); store.del('refreshToken');
      return null;
    }
  },

  // Issues
  getIssues: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== '' && v != null) params.set(k, v); });
    const qs = params.toString();
    return request(`/issues${qs ? `?${qs}` : ''}`);
  },

  getIssue: (id) => request(`/issues/${id}`),

  createIssue: (data) =>
    request('/issues', { method: 'POST', body: JSON.stringify(data) }),

  updateStatus: (id, status, note) =>
    request(`/issues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),

  assignIssue: (id, officialId, note) =>
    request(`/issues/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ officialId, note }),
    }),

  getHistory: (id) => request(`/issues/${id}/history`),

  getIssueSLA: (id) => request(`/issues/${id}/sla`),

  // Media upload
  uploadImage: async (file) => {
    const token = store.get('accessToken');
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    return res.json();
  },

  // Seed demo data (supervisor only)
  seedData: () => request('/issues/seed', { method: 'POST' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),

  // Email existence check (no auth needed)
  checkEmail: (email) => request('/auth/check-email', { method: 'POST', body: JSON.stringify({ email }) }),

  // Analytics (public)
  getAnalytics: async () => {
    let summary, byCategory, byStatus;
    try {
      [summary, byCategory, byStatus] = await Promise.all([
        request('/analytics/summary'),
        request('/analytics/by-category'),
        request('/analytics/by-status'),
      ]);
    } catch (err) {
      return { success: false, message: "Analytics server unreachable" };
    }
    if (!summary?.success) return summary || { success: false, message: "Analytics unavailable" };
    return {
      success: true,
      data: {
        ...(summary.data || {}),
        by_category: Array.isArray(byCategory?.data) ? byCategory.data : [],
        by_status: Array.isArray(byStatus?.data) ? byStatus.data : [],
      },
    };
  },
};
