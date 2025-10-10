import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  // Accept either cookie name the client or server might set (access_token or token)
  const token =
    req.cookies.get('access_token')?.value || req.cookies.get('token')?.value || req.cookies.get('refresh_token')?.value;

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
  return NextResponse.next();
}

export const config = { matcher: ['/', '/((?!api|_next|static).*)'] };
