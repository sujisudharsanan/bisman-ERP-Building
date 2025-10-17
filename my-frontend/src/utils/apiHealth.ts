// Lightweight browser-side API health check and request logging
// Runs when imported and enabled via NEXT_PUBLIC_API_HEALTH=1

function safeLog(...args: any[]) {
  try {
    // eslint-disable-next-line no-console
    console.log(...args);
  } catch {}
}

async function checkApiConnection() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_BASE_URL || '';
  safeLog('%c🔍 API Health Check', 'font-weight:bold');

  if (!baseUrl) {
    safeLog('❌ Missing NEXT_PUBLIC_API_URL. Using relative /api via rewrites.');
    safeLog('➡️ On Vercel, either rely on rewrites or set NEXT_PUBLIC_API_URL to your Render URL.');
  } else {
    safeLog(`🌐 Using API base URL: ${baseUrl}`);
  }

  const endpoints = ['/api/me', '/api/login'];
  for (const path of endpoints) {
    const url = path.startsWith('/api') && !baseUrl ? path : `${baseUrl}${path.replace(/^\/api/, '')}`;
    try {
      safeLog(`🧪 Testing ${url}`);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        safeLog(`❌ ${path} returned status ${res.status}`);
      } else {
        safeLog(`✅ ${path} OK (${res.status})`);
      }
    } catch (err: any) {
      safeLog(`🚫 Error reaching ${url}:`, err?.message || err);
    }
  }
}

declare global {
  interface Window {
    __api_health_ran?: boolean;
  }
}

export function runApiHealthCheckOnce() {
  if (typeof window === 'undefined') return;
  if (window.__api_health_ran) return;
  window.__api_health_ran = true;
  checkApiConnection();
}
