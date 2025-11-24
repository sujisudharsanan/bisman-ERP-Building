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

  // Auth exemptions
  if (pathname === '/debug-auth' || pathname.startsWith('/auth')) {
    const res = NextResponse.next();
    return attachSecurityHeaders(res, nonce);
  }

  const accessToken = req.cookies.get('access_token')?.value || req.cookies.get('token')?.value;
  const refreshToken = req.cookies.get('refresh_token')?.value;
  if (!accessToken && !refreshToken) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  return attachSecurityHeaders(res, nonce);
}

function attachSecurityHeaders(res: NextResponse, nonce?: string) {
  const cspDirectives = [
    "default-src 'self'",
    nonce ? `script-src 'self' 'nonce-${nonce}'` : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    nonce ? `style-src 'self' 'nonce-${nonce}'` : "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'"
  ];
  res.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  if (nonce) res.headers.set('X-CSP-Nonce', nonce);
  return res;
}

export const config = { matcher: ['/', '/((?!api|_next|static).*)'] };
