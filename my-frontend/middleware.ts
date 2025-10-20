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
  const token =
    req.cookies.get('access_token')?.value || 
    req.cookies.get('token')?.value || 
    req.cookies.get('refresh_token')?.value;

  // Allow access to debug page for troubleshooting
  if (pathname === '/debug-auth') {
    return NextResponse.next();
  }

  // Treat any /auth/* routes as public (login pages, callbacks, etc.)
  if (pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // Require an auth token for all other pages (except the allowed public ones above)
  if (!token) {
    const url = req.nextUrl.clone();
    // Redirect to the actual login route used by the app
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Token exists - add validation if needed
  // Note: Full JWT validation would require jose or jsonwebtoken
  // For now, we trust the backend API to validate tokens on each request
  try {
    // Basic token format check (should be JWT format: xxx.yyy.zzz)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
  } catch (error) {
    // Invalid token format - redirect to login
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    const response = NextResponse.redirect(url);
    
    // Clear invalid cookies with secure flags
    response.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = { matcher: ['/', '/((?!api|_next|static).*)'] };
