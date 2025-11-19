// Centralized API base URL for frontend

/**
 * NEW APPROACH: Use Next.js API routes as proxy (eliminates CORS)
 * 
 * Instead of calling backend directly from browser (CORS issues),
 * we use Next.js API routes which proxy to backend server-side.
 * 
 * - Browser → Next.js API routes (/api/*) → Express backend
 * - This makes all requests same-origin, no CORS needed!
 */
function getApiBaseUrl(): string {
  // 1. Check if we need direct backend access (for SSR or special cases)
  const directBackend = process.env.NEXT_PUBLIC_DIRECT_BACKEND === 'true';
  
  if (directBackend && process.env.NEXT_PUBLIC_API_URL) {
    console.log('🔧 Direct backend mode:', process.env.NEXT_PUBLIC_API_URL);
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. Use same-origin (Next.js API routes will proxy to backend)
  if (typeof window !== 'undefined') {
    const sameOrigin = `${window.location.protocol}//${window.location.host}`;
    console.log('🔄 Using Next.js API proxy (same-origin):', sameOrigin);
    return sameOrigin;
  }

  // 3. Server-side: use localhost (Next.js internal)
  const ssrUrl = 'http://localhost:3000';
  console.log('�️  SSR mode, using:', ssrUrl);
  return ssrUrl;
}

const apiBase = getApiBaseUrl();

// Runtime validation and logging
if (typeof window !== 'undefined') {
  console.log('✅ API Base URL:', apiBase);
  
  // Test backend connectivity
  fetch(`${apiBase}/api/health`, {
    method: 'GET',
    credentials: 'include',
  })
    .then(r => {
      if (r.ok) {
        console.log('✅ Backend reachable:', apiBase);
      } else {
        console.error('❌ Backend returned status:', r.status, apiBase);
      }
    })
    .catch(err => {
      console.error('❌ Backend unreachable:', apiBase, err.message);
    });
}

export const API_BASE = apiBase;

export default API_BASE;
