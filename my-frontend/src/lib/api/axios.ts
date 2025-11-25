import axios from 'axios';
import { API_BASE } from '@/config/api';
import { isAPIError, getErrorMessage, getErrorType, type APIErrorResponse } from '@/lib/errorCodes';
import { showGlobalError } from '@/lib/globalErrorHandler';

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

// ============================================================================
// Response Interceptor - Global Error Handling
// ============================================================================
api.interceptors.response.use(
  res => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📥 API Response: ${res.config.method?.toUpperCase()} ${res.config.url} - ${res.status}`);
    }
    return res;
  },
  async err => {
    const original = err.config;
    
    // -------------------------------------------------------------------------
    // Handle Network Errors (no response from server)
    // -------------------------------------------------------------------------
    if (!err.response) {
      console.error('❌ Network Error:', err.message);
      
      // Show global error notification
      if (!original?.skipGlobalError) {
        showGlobalError({
          success: false,
          errorCode: 'NETWORK_ERROR',
          message: 'Network connection failed. Please check your internet connection.',
          httpStatus: 0,
        });
      }
      
      return Promise.reject(err);
    }
    
    // -------------------------------------------------------------------------
    // Extract error response
    // -------------------------------------------------------------------------
    const errorResponse = err.response.data;
    const status = err.response.status;
    
    // Log error
    console.error(`❌ API Error: ${original?.method?.toUpperCase()} ${original?.url} - ${status}`);
    if (errorResponse) {
      console.error('Error Details:', errorResponse);
    }
    
    // -------------------------------------------------------------------------
    // Handle 401 Unauthorized - Token Refresh Logic
    // -------------------------------------------------------------------------
    if (status === 401) {
      // Don't retry if:
      // 1. Already retried
      // 2. It's the refresh endpoint itself
      // 3. It's the login endpoint
      // 4. Request was explicitly marked as _retry
      if (
        original._retry || 
        original.url?.includes('/refresh') ||
        original.url?.includes('/login')
      ) {
        // Show session expired error
        if (isAPIError(errorResponse)) {
          if (!original?.skipGlobalError) {
            showGlobalError(errorResponse);
          }
        }
        
        // Redirect to login
        if (typeof window !== 'undefined' && !original.url?.includes('/login')) {
          setTimeout(() => {
            window.location.href = '/auth/login';
          }, 1500);
        }
        
        return Promise.reject(err);
      }
      
      // Try token refresh
      console.log('⚠️ Received 401, attempting token refresh...');
      original._retry = true;
      
      const ok = await tryRefresh();
      
      if (ok) {
        console.log('✅ Retrying original request after token refresh');
        return api(original);
      } else {
        console.error('❌ Token refresh failed, redirecting to login');
        
        // Show error
        if (!original?.skipGlobalError) {
          showGlobalError({
            success: false,
            errorCode: 'SESSION_EXPIRED',
            message: 'Your session has expired. Please login again.',
            httpStatus: 401,
          });
        }
        
        // Redirect to login
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/auth/login';
          }, 1500);
        }
        
        return Promise.reject(err);
      }
    }
    
    // -------------------------------------------------------------------------
    // Handle Other Errors - Show Global Error Notification
    // -------------------------------------------------------------------------
    if (isAPIError(errorResponse)) {
      // Structured error from backend
      if (!original?.skipGlobalError) {
        showGlobalError(errorResponse);
      }
    } else {
      // Unstructured error - create a standard error
      const standardError: APIErrorResponse = {
        success: false,
        errorCode: 'SERVER_ERROR',
        message: errorResponse?.message || err.message || 'An unexpected error occurred',
        httpStatus: status,
      };
      
      if (!original?.skipGlobalError) {
        showGlobalError(standardError);
      }
    }
    
    return Promise.reject(err);
  }
);

export default api;
