import { NextRequest, NextResponse } from 'next/server';

// Proxy to backend /api/auth/login and forward cookies bidirectionally
// Priority: BACKEND_URL (runtime server-side) > NEXT_PUBLIC_* (build-time) > fallback
const BACKEND_BASE =
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    console.log('🔐 [PROXY] /api/auth/login - Forwarding to backend:', `${BACKEND_BASE}/api/auth/login`);
    
    const body = await req.text();
    const res = await fetch(`${BACKEND_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': req.headers.get('content-type') || 'application/json',
        // Forward incoming cookies to backend for consistency
        cookie: req.headers.get('cookie') || '',
      },
      body,
      cache: 'no-store',
    });

    console.log('🔐 [PROXY] Backend response status:', res.status);

    const headers = new Headers();
    
    // Forward Set-Cookie headers back to the browser with enhanced security
    const setCookies = (res.headers as any).getSetCookie?.() || res.headers.get('set-cookie');
    console.log('🔐 [PROXY] Set-Cookie headers from backend:', setCookies);
    
    if (Array.isArray(setCookies)) {
      for (const c of setCookies) {
        let secureCookie = c;
        if (!secureCookie.includes('HttpOnly')) secureCookie += '; HttpOnly';
        if (!secureCookie.includes('Secure') && process.env.NODE_ENV === 'production') {
          secureCookie += '; Secure';
        }
        if (!secureCookie.includes('SameSite')) secureCookie += '; SameSite=Lax';
        console.log('🔐 [PROXY] Forwarding cookie:', secureCookie);
        headers.append('set-cookie', secureCookie);
      }
    } else if (typeof setCookies === 'string') {
      let secureCookie = setCookies;
      if (!secureCookie.includes('HttpOnly')) secureCookie += '; HttpOnly';
      if (!secureCookie.includes('Secure') && process.env.NODE_ENV === 'production') {
        secureCookie += '; Secure';
      }
      if (!secureCookie.includes('SameSite')) secureCookie += '; SameSite=Lax';
      console.log('🔐 [PROXY] Forwarding cookie:', secureCookie);
      headers.set('set-cookie', secureCookie);
    }
    
    headers.set('content-type', res.headers.get('content-type') || 'application/json');

    const text = await res.text();
    console.log('🔐 [PROXY] Response body preview:', text.substring(0, 200));
    
    return new NextResponse(text, { status: res.status, headers });
  } catch (e: any) {
    console.error('🔐 [PROXY] Login proxy failed:', e);
    return NextResponse.json(
      { error: 'Login proxy failed', detail: String(e?.message || e) },
      { status: 502 }
    );
  }
}
