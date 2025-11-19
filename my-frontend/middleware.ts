import { NextResponse, type NextRequest } from 'next/server';

// Basic Content Security Policy (adjust domains as backend/CDN evolve)
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // replace inline/eval as you harden
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join('; ');

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Skip middleware for static assets and API routes
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg')
  ) {
    return NextResponse.next();
  }

  // Accept either cookie name the client or server might set (access_token or token)
  const accessToken = req.cookies.get('access_token')?.value || req.cookies.get('token')?.value;
  const refreshToken = req.cookies.get('refresh_token')?.value;

  // Allow access to debug page for troubleshooting
  if (pathname === '/debug-auth') {
    return NextResponse.next();
  }

  // Treat any /auth/* routes as public (login pages, callbacks, etc.)
  if (pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // Require an auth token for all other pages (except the allowed public ones above)
  if (!accessToken && !refreshToken) {
    const url = req.nextUrl.clone();
    // Redirect to the actual login route used by the app
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }
  // Do not perform structural validation in middleware; backend will validate
  
  return NextResponse.next();
}

export const config = { matcher: ['/', '/((?!api|_next|static).*)'] };
