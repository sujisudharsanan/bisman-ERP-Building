// Centralized API base URL for frontend

/**
 * Determines the API base URL based on the environment.
 * It relies on the NEXT_PUBLIC_API_URL environment variable.
 * In local development, it can fall back to a default.
 */
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Runtime check to ensure the variable is not missed in production.
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  console.error('FATAL: NEXT_PUBLIC_API_URL is not defined in production environment.');
}

export const API_BASE = apiBase;

export default API_BASE;
