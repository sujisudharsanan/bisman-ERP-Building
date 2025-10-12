// Centralized API base URL for frontend
// Prefer NEXT_PUBLIC_API_URL; fall back to existing NEXT_PUBLIC_API_BASE_URL; default to localhost
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  // Compatibility with alternate env naming
  (process.env as any).NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3001';

export default API_BASE;
