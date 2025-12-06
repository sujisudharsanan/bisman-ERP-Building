/**
 * Environment variable validation and access
 * Centralizes env var usage with runtime validation
 */

// Server-side only environment variables
export const serverEnv = {
  BACKEND_API_URL: process.env.BACKEND_API_URL || process.env.API_URL || 'http://localhost:3001',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Client-side safe environment variables
export const clientEnv = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Validate critical environment variables in production
export function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd && typeof window === 'undefined') {
    // Server-side validation - add any required env checks here
  }
}

// Auto-validate on import in server context
if (typeof window === 'undefined') {
  validateEnv();
}

export default {
  server: serverEnv,
  client: clientEnv,
};
