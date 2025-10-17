// Lightweight browser-side API health check and request logging
// Runs when imported and enabled via NEXT_PUBLIC_API_HEALTH=1

function safeLog(...args: any[]) {
  try {
    // eslint-disable-next-line no-console
    console.log(...args);
  } catch {}
}

async function checkApiConnection() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'server';
  
  safeLog('%c🔍 API Health Check', 'font-weight:bold; color: #4CAF50; font-size: 14px;');
  safeLog(`📍 Frontend running on: ${hostname}`);
  safeLog(`🌐 API Base URL: ${baseUrl}`);

  // Test critical health endpoint first
  const healthUrl = `${baseUrl}/api/health`;
  try {
    safeLog(`🧪 Testing connection to ${healthUrl}`);
    const res = await fetch(healthUrl, { 
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      safeLog(`✅ Backend is reachable! Status: ${res.status}`, data);
    } else {
      safeLog(`⚠️  Backend responded with status ${res.status}`);
    }
  } catch (err: any) {
    safeLog('%c❌ BACKEND IS UNREACHABLE', 'font-weight:bold; color: #f44336; font-size: 14px;');
    safeLog(`🚫 Error: ${err?.message || err}`);
    safeLog('💡 Troubleshooting:');
    safeLog('   1. Check if backend is running on', baseUrl);
    safeLog('   2. Verify CORS is configured to allow', hostname);
    safeLog('   3. Check network/firewall settings');
    return;
  }

  // Test auth endpoints
  const endpoints = ['/api/me', '/api/login'];
  for (const path of endpoints) {
    const url = `${baseUrl}${path}`;
    try {
      const res = await fetch(url, { 
        credentials: 'include',
        mode: 'cors',
        method: path === '/api/login' ? 'OPTIONS' : 'GET'
      });
      safeLog(`${res.ok ? '✅' : '⚠️'} ${path}: ${res.status}`);
    } catch (err: any) {
      safeLog(`❌ ${path}: ${err?.message || 'Failed'}`);
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
