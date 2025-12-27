import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const strict = process.env.CSP_STRICT === '1';
  const nonce = strict ? (crypto.randomUUID?.() || Math.random().toString(36).slice(2)) : undefined;

  // Skip static assets & API
  const staticOrApi = pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/static') ||
    pathname.endsWith('.ico') || pathname.endsWith('.svg') || pathname.endsWith('.png') || pathname.endsWith('.jpg');
  if (staticOrApi) return NextResponse.next();

  // Auth exemptions - public pages that don't require login
  if (pathname === '/debug-auth' || pathname.startsWith('/auth') || pathname === '/landing' || pathname.startsWith('/landing') || pathname === '/signup' || pathname === '/get-started' || pathname.startsWith('/onboarding') || pathname === '/terms' || pathname === '/privacy' || pathname === '/pricing') {
    // Create response with request headers containing pathname
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-pathname', pathname);
    const res = NextResponse.next({
      request: { headers: requestHeaders }
    });
    return attachSecurityHeaders(res, nonce);
  }

  const accessToken = req.cookies.get('access_token')?.value || req.cookies.get('token')?.value;
  const refreshToken = req.cookies.get('refresh_token')?.value;
  
  // Debug logging for authentication (only if DEBUG_AUTH env is set)
  if (process.env.DEBUG_AUTH === '1') {
    console.log(`🔐 [MIDDLEWARE] Path: ${pathname}`);
    console.log(`🔐 [MIDDLEWARE] Access token: ${accessToken ? '✅ Found' : '❌ Missing'}`);
    console.log(`🔐 [MIDDLEWARE] Refresh token: ${refreshToken ? '✅ Found' : '❌ Missing'}`);
    console.log(`🔐 [MIDDLEWARE] All cookies:`, req.cookies.getAll().map(c => c.name));
  }
  
  if (!accessToken && !refreshToken) {
    if (process.env.DEBUG_AUTH === '1') {
      console.log(`🔐 [MIDDLEWARE] No auth tokens found, redirecting to login from ${pathname}`);
    }
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Create response with request headers containing pathname
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);
  const res = NextResponse.next({
    request: { headers: requestHeaders }
  });
  return attachSecurityHeaders(res, nonce);
}

function attachSecurityHeaders(res: NextResponse, nonce?: string) {
  const jitsi = 'meet.jit.si';
  const jitsiWildcard = '*.jitsi.net';
  const cspDirectives = [
    "default-src 'self'",
    nonce ? `script-src 'self' 'nonce-${nonce}' https://${jitsi} https://${jitsiWildcard}` : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://${jitsi} https://${jitsiWildcard}`,
    nonce ? `style-src 'self' 'nonce-${nonce}'` : "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: https://${jitsi} https://${jitsiWildcard}`,
    "font-src 'self' data:",
    `connect-src 'self' https: wss: wss://${jitsi} https://${jitsi} wss://${jitsiWildcard} https://${jitsiWildcard}`,
    "object-src 'none'",
    `frame-src 'self' https://${jitsi} https://${jitsiWildcard}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    `media-src 'self' https://${jitsi} https://${jitsiWildcard} blob:`
  ];
  res.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', `camera=(self "https://${jitsi}"), microphone=(self "https://${jitsi}"), geolocation=(), fullscreen=(self "https://${jitsi}")`);
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  if (nonce) res.headers.set('X-CSP-Nonce', nonce);
  return res;
}

export const config = { matcher: ['/', '/((?!api|_next|static).*)'] };
