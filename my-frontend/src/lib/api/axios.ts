import axios from 'axios';
import { API_BASE } from '@/config/api';

const api = axios.create({ 
  baseURL: API_BASE, 
  withCredentials: true,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Track if we're currently refreshing to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: boolean) => void)[] = [];

function subscribeTokenRefresh(cb: (token: boolean) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(success: boolean) {
  refreshSubscribers.forEach(cb => cb(success));
  refreshSubscribers = [];
}

// Helper to call refresh endpoint
export async function tryRefresh(): Promise<boolean> {
  if (isRefreshing) {
    // Wait for the existing refresh to complete
    return new Promise((resolve) => {
      subscribeTokenRefresh((success) => {
        resolve(success);
      });
    });
  }

  isRefreshing = true;
  
  try {
    console.log('🔄 Attempting token refresh...');
    const r = await api.post('/api/token/refresh', {}, {
      _retry: true, // Mark to prevent interceptor loop
    } as any);
    
    const success = r.status === 200 || r.status === 204 || (r.data && r.data.ok);
    console.log(success ? '✅ Token refresh successful' : '❌ Token refresh failed');
    
    onTokenRefreshed(success);
    return success;
  } catch (e) {
    console.error('❌ Token refresh error:', e);
    onTokenRefreshed(false);
    return false;
  } finally {
    isRefreshing = false;
  }
}

// Request interceptor to log requests in development
if (process.env.NODE_ENV !== 'production') {
  api.interceptors.request.use(
    config => {
      console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    error => {
      console.error('📤 API Request Error:', error);
      return Promise.reject(error);
    }
  );
}

// Intercept 401 responses and attempt a single refresh+retry
api.interceptors.response.use(
  res => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📥 API Response: ${res.config.method?.toUpperCase()} ${res.config.url} - ${res.status}`);
    }
    return res;
  },
  async err => {
    const original = err.config;
    
    // Don't retry if:
    // 1. Already retried
    // 2. Not a 401 error
    // 3. It's the refresh endpoint itself
    // 4. Request was explicitly marked as _retry
    if (
      original._retry || 
      !err.response || 
      err.response.status !== 401 || 
      original.url?.includes('/refresh') ||
      original.url?.includes('/login')
    ) {
      console.error(`❌ API Error: ${original?.method?.toUpperCase()} ${original?.url} - ${err.response?.status || 'Network Error'}`);
      return Promise.reject(err);
    }
    
    console.log('⚠️ Received 401, attempting token refresh...');
    original._retry = true;
    
    const ok = await tryRefresh();
    
    if (ok) {
      console.log('✅ Retrying original request after token refresh');
      return api(original);
    } else {
      console.error('❌ Token refresh failed, redirecting to login');
      // Redirect to login if we're in the browser
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      return Promise.reject(err);
    }
  }
);

export default api;
