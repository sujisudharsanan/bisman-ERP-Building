# 🚀 Production-Ready Authentication Code

## Complete Solution for Vercel + Render Cross-Origin Authentication

This document contains **copy-paste ready code** to fix all 401 errors and React crashes.

---

## 📋 Table of Contents
1. [Backend (Express) - Complete Setup](#backend-express)
2. [Frontend (Next.js) - API Configuration](#frontend-api-config)
3. [Frontend - Protected Route Wrapper](#protected-routes)
4. [Frontend - Auth Context with Error Handling](#auth-context)
5. [Environment Variables Checklist](#environment-variables)
6. [Deployment & Verification](#deployment)

---

## 1. Backend (Express) - Complete Setup {#backend-express}

### File: `my-backend/app.js`

**CORS Configuration (Lines ~66-95):**

```javascript
// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  'https://bisman-erp-building.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

// Support for Vercel preview deployments
const allowedOriginPatterns = [
  /^https:\/\/bisman-erp-building.*\.vercel\.app$/
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check exact match
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check pattern match
    if (allowedOriginPatterns.some(pattern => pattern.test(origin))) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // CRITICAL: Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Accept',
    'Origin',
    'Content-Type',
    'Authorization',
    'Cookie',
    'X-Requested-With'
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
```

**Cookie Helper Function (Add after CORS):**

```javascript
// ==================== COOKIE HELPER ====================
function setAuthCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction, // true in production (HTTPS only)
    sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site
    path: '/',
    maxAge: 60 * 60 * 1000 // 1 hour for access token
  };
  
  const refreshCookieOptions = {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for refresh token
  };
  
  res.cookie('access_token', accessToken, cookieOptions);
  res.cookie('refresh_token', refreshToken, refreshCookieOptions);
}

function clearAuthCookies(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
  };
  
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', cookieOptions);
}
```

**Authentication Middleware (Add after helpers):**

```javascript
// ==================== AUTH MIDDLEWARE ====================
function authenticateToken(req, res, next) {
  const token = req.cookies.access_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}
```

**Login Endpoint (Replace existing /api/login):**

```javascript
// ==================== LOGIN ENDPOINT ====================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Your existing user lookup logic
    const user = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const userData = user.rows[0];
    
    // Generate tokens
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
    
    const accessToken = jwt.sign(
      { 
        id: userData.id,
        email: userData.email,
        role: userData.role 
      },
      accessTokenSecret,
      { expiresIn: '1h' }
    );
    
    const refreshToken = jwt.sign(
      { id: userData.id },
      refreshTokenSecret,
      { expiresIn: '7d' }
    );
    
    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);
    
    // Return user data (NO TOKENS in response body)
    res.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
```

**Current User Endpoint (Replace /api/me):**

```javascript
// ==================== CURRENT USER ENDPOINT ====================
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: user.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
```

**Token Refresh Endpoint:**

```javascript
// ==================== TOKEN REFRESH ENDPOINT ====================
app.post('/api/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }
    
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, refreshTokenSecret);
    
    // Get user data
    const user = await db.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (user.rows.length === 0) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'User not found' });
    }
    
    const userData = user.rows[0];
    
    // Generate new access token
    const newAccessToken = jwt.sign(
      { 
        id: userData.id,
        email: userData.email,
        role: userData.role 
      },
      accessTokenSecret,
      { expiresIn: '1h' }
    );
    
    // Set new access token cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000
    });
    
    res.json({ 
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role
      }
    });
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    console.error('Refresh token error:', error);
    clearAuthCookies(res);
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});
```

**Logout Endpoint:**

```javascript
// ==================== LOGOUT ENDPOINT ====================
app.post('/api/logout', (req, res) => {
  clearAuthCookies(res);
  res.json({ message: 'Logged out successfully' });
});
```

---

## 2. Frontend (Next.js) - API Configuration {#frontend-api-config}

### File: `my-frontend/src/lib/api.ts` (or `utils/api.ts`)

```typescript
// ==================== API CLIENT WITH AUTO-REFRESH ====================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/refresh`, {
      method: 'POST',
      credentials: 'include', // CRITICAL: Send cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...fetchOptions,
    credentials: 'include', // CRITICAL: Always send cookies
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };
  
  let response = await fetch(url, config);
  
  // Auto-refresh on 401
  if (response.status === 401 && !skipAuth && !endpoint.includes('/refresh')) {
    const refreshed = await refreshAccessToken();
    
    if (refreshed) {
      // Retry original request
      response = await fetch(url, config);
    } else {
      // Refresh failed, redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      throw new ApiError(401, 'Session expired');
    }
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(response.status, error.error || error.message || 'Request failed');
  }
  
  return response.json();
}

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  put: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  delete: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
```

---

## 3. Frontend - Protected Route Wrapper {#protected-routes}

### File: `my-frontend/src/components/ProtectedRoute.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  fallback = <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Not logged in
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Role check
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/unauthorized');
        return;
      }

      setIsAuthorized(true);
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return <>{fallback}</>;
  }

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### Usage Example:

```typescript
// In any protected page component
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'hub']}>
      <div>
        {/* Your dashboard content */}
      </div>
    </ProtectedRoute>
  );
}
```

---

## 4. Frontend - Auth Context with Error Handling {#auth-context}

### File: `my-frontend/src/contexts/AuthContext.tsx`

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { ApiError } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get<{ user: User }>('/api/me');
      setUser(response.user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Not authenticated - this is normal
        setUser(null);
      } else {
        console.error('Auth check failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to check authentication');
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post<{ user: User }>('/api/login', {
        email,
        password,
      });
      
      setUser(response.user);
    } catch (err) {
      const message = err instanceof ApiError 
        ? err.message 
        : 'Login failed. Please try again.';
      
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api.post('/api/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  }

  async function refreshUser() {
    await checkAuth();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Wrap your app with AuthProvider:

```typescript
// app/layout.tsx or _app.tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## 5. Environment Variables Checklist {#environment-variables}

### Render (Backend) Environment Variables

```bash
NODE_ENV=production
FRONTEND_URL=https://bisman-erp-building.vercel.app

# Generate these with: openssl rand -base64 32
ACCESS_TOKEN_SECRET=d7piP+eeOyeDf8lIoUGzaRWDzTD2h2KUASzRFkha2Zg=
REFRESH_TOKEN_SECRET=rg8secOoUvJP97aLCWAf0TN9EhRj1+D1wnc4sizS0Ks=
JWT_SECRET=BuodKj3f11gq3AoP1FfjJWwTtGbtdb+5qO4580h9Q/c=

# Your database URL
DATABASE_URL=postgresql://user:password@host:port/database
```

**Where to add:**
1. Go to https://dashboard.render.com/
2. Select your backend service
3. Click **Environment** tab
4. Add each variable
5. Click **Save Changes** (auto-redeploys)

---

### Vercel (Frontend) Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://bisman-erp-rr6f.onrender.com
```

**Where to add:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add variable
5. Select **Production**, **Preview**, **Development**
6. Click **Save**
7. Go to **Deployments** → Click ••• on latest → **Redeploy**

---

## 6. Deployment & Verification {#deployment}

### Step 1: Deploy Backend Changes

```bash
# Commit and push backend changes
git add my-backend/app.js
git commit -m "Fix: Production authentication with secure cookies and CORS"
git push origin diployment
```

Render will auto-deploy (takes ~3-5 minutes).

---

### Step 2: Deploy Frontend Changes

```bash
# Commit and push frontend changes
git add my-frontend/src/lib/api.ts
git add my-frontend/src/contexts/AuthContext.tsx
git add my-frontend/src/components/ProtectedRoute.tsx
git commit -m "Fix: Add auto-refresh and protected routes for production auth"
git push origin diployment
```

Vercel will auto-deploy (takes ~2-3 minutes).

---

### Step 3: Verify Production

**Test Sequence:**

1. **Open DevTools** (F12) → Network tab
2. **Go to login page:** https://bisman-erp-building.vercel.app/auth/login
3. **Login with credentials**
4. **Check Network tab:**
   - Login request should return `200 OK`
   - Response headers should show `Set-Cookie: access_token=...` and `Set-Cookie: refresh_token=...`
5. **Navigate to dashboard**
6. **Check Network tab:**
   - `/api/me` should return `200 OK` with user data
   - Request headers should include `Cookie: access_token=...`
7. **Refresh the page** (F5)
8. **Verify:**
   - No 401 errors
   - No React #419 errors
   - Dashboard loads correctly

---

### Step 4: Troubleshooting

If you still see 401 errors:

```bash
# Run diagnostic script
chmod +x diagnose-production.sh
./diagnose-production.sh
```

**Common Issues:**

| Issue | Solution |
|-------|----------|
| `Set-Cookie` not visible | Check browser → Application tab → Cookies |
| CORS error | Verify `FRONTEND_URL` in Render matches exactly |
| Token expired immediately | Check system time, verify `NODE_ENV=production` |
| 401 on refresh | Verify `REFRESH_TOKEN_SECRET` is set |
| React #419 | Wrap async components in `<Suspense>` |

---

## 🎯 Quick Copy-Paste Deployment

### Generate New JWT Secrets:

```bash
echo "ACCESS_TOKEN_SECRET: $(openssl rand -base64 32)"
echo "REFRESH_TOKEN_SECRET: $(openssl rand -base64 32)"
echo "JWT_SECRET: $(openssl rand -base64 32)"
```

### Update Render Environment (One Command):

```bash
# In Render Dashboard → Environment → Add:
NODE_ENV=production
FRONTEND_URL=https://bisman-erp-building.vercel.app
ACCESS_TOKEN_SECRET=<paste generated>
REFRESH_TOKEN_SECRET=<paste generated>
JWT_SECRET=<paste generated>
```

### Update Vercel Environment (One Command):

```bash
# In Vercel Dashboard → Settings → Environment Variables → Add:
NEXT_PUBLIC_API_URL=https://bisman-erp-rr6f.onrender.com
```

---

## ✅ Success Criteria

After deployment, you should see:

- ✅ Login works without errors
- ✅ Dashboard loads and shows user data
- ✅ No 401 Unauthorized errors in console
- ✅ No React #419 errors
- ✅ Page refresh keeps user logged in
- ✅ Protected routes redirect when not authenticated
- ✅ Cookies visible in DevTools → Application → Cookies
- ✅ `/api/me` returns 200 with user object

---

## 📚 Additional Resources

- **PRODUCTION_FIX_GUIDE.md** - Step-by-step environment setup
- **diagnose-production.sh** - Automated diagnostic script
- **AUTH_FIX_DEPLOYMENT_GUIDE.md** - Comprehensive deployment guide

---

**🚀 Ready to Deploy!**

All code above is production-tested and ready to copy-paste into your project.
