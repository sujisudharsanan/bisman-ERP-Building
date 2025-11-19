/**
 * Environment variable validation and access
 * Centralizes env var usage with runtime validation
 */

// Server-side only environment variables
export const serverEnv = {
  MM_BASE_URL: process.env.MM_BASE_URL || 'http://localhost:8065',
  MM_ADMIN_TOKEN: process.env.MM_ADMIN_TOKEN || '',
  BACKEND_API_URL: process.env.BACKEND_API_URL || process.env.API_URL || 'http://localhost:3001',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Client-side safe environment variables
export const clientEnv = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  NEXT_PUBLIC_MM_TEAM_SLUG: process.env.NEXT_PUBLIC_MM_TEAM_SLUG || 'erp',
  NEXT_PUBLIC_MM_DEMO_PASSWORD: process.env.NEXT_PUBLIC_MM_DEMO_PASSWORD || 'Welcome@2025',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Validate critical environment variables in production
export function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd && typeof window === 'undefined') {
    // Server-side validation
    const missing: string[] = [];
    
    if (!process.env.MM_BASE_URL) {
      console.warn('⚠️  MM_BASE_URL not set, using default: http://localhost:8065');
    }
    
    if (!process.env.MM_ADMIN_TOKEN) {
      missing.push('MM_ADMIN_TOKEN');
    }
    
    if (missing.length > 0) {
      console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
      console.error('   Chat functionality may not work properly in production.');
    }
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
