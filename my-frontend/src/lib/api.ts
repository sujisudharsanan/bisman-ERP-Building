import api from '@/lib/api/axios';

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;
}

export default api;
