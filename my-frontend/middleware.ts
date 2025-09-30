import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next()
  }
  // Accept either cookie name the client or server might set (access_token or token)
  const token = req.cookies.get('access_token')?.value || req.cookies.get('token')?.value
  if (!token && pathname !== '/login') {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/', '/((?!api|_next|static).*)'] }
