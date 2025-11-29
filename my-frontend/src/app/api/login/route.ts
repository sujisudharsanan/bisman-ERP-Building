import { NextRequest, NextResponse } from 'next/server';

// Priority: BACKEND_URL (runtime server-side) > NEXT_PUBLIC_* (build-time) > fallback
const BACKEND_BASE =
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  process.env.RENDER_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
  const res = await fetch(`${BACKEND_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': req.headers.get('content-type') || 'application/json',
        // Forward incoming cookies to backend for consistency
  cookie: req.headers.get('cookie') || '',
      },
      body,
      // Do not cache auth calls
      cache: 'no-store',
    });

    const headers = new Headers();
    
    // Forward Set-Cookie headers back to the browser with enhanced security
    const setCookies = (res.headers as any).getSetCookie?.() || res.headers.get('set-cookie');
    if (Array.isArray(setCookies)) {
      for (const c of setCookies) {
        // Ensure cookies have security flags
        let secureCookie = c;
        if (!secureCookie.includes('HttpOnly')) secureCookie += '; HttpOnly';
        if (!secureCookie.includes('Secure') && process.env.NODE_ENV === 'production') {
          secureCookie += '; Secure';
        }
        if (!secureCookie.includes('SameSite')) secureCookie += '; SameSite=Lax';
        headers.append('set-cookie', secureCookie);
      }
    } else if (typeof setCookies === 'string') {
      let secureCookie = setCookies;
      if (!secureCookie.includes('HttpOnly')) secureCookie += '; HttpOnly';
      if (!secureCookie.includes('Secure') && process.env.NODE_ENV === 'production') {
        secureCookie += '; Secure';
      }
      if (!secureCookie.includes('SameSite')) secureCookie += '; SameSite=Lax';
      headers.set('set-cookie', secureCookie);
    }
    
    headers.set('content-type', res.headers.get('content-type') || 'application/json');

    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers });
  } catch (e: any) {
    return NextResponse.json({ error: 'Login proxy failed', detail: String(e?.message || e) }, { status: 502 });
  }
}
