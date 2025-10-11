import axios from 'axios';

// Use localhost for consistent domain with frontend to allow cookie sharing
const base =
  (process.env.NEXT_PUBLIC_API_BASE_URL as string) || 'http://localhost:3001';

const api = axios.create({ baseURL: base, withCredentials: true });

// Helper to call refresh endpoint
export async function tryRefresh() {
  try {
    const r = await api.post('/api/token/refresh');
    return r.status === 200 || r.status === 204 || (r.data && r.data.ok)
  } catch (e) {
    return false
  }
}

// Intercept 401 responses and attempt a single refresh+retry
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response && err.response.status === 401 && !original._retry) {
      original._retry = true;
      const ok = await tryRefresh();
      if (ok) return api(original);
    }
    return Promise.reject(err);
  }
);

export default api;
