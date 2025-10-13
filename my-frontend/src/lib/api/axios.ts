import axios from 'axios';
import { API_BASE } from '@/config/api';

const api = axios.create({ baseURL: API_BASE, withCredentials: true });

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
