import axios from '@/lib/api/axios';

export async function fetcher(url: string) {
  const res = await axios.get(url);
  return res.data;
}

export default axios;
