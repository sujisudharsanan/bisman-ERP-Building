import { NextRequest, NextResponse } from 'next/server';

// Proxy to backend /api/me and forward cookies bidirectionally
// Priority: BACKEND_URL (runtime server-side) > NEXT_PUBLIC_* (build-time) > fallback
const BACKEND_BASE =
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3001';

export async function GET(req: NextRequest) {
  try {
  const res = await fetch(`${BACKEND_BASE}/api/me`, {
      method: 'GET',
      headers: {
    // Forward incoming cookies so backend can authenticate
    cookie: req.headers.get('cookie') || '',
      },
      cache: 'no-store'
    });

    const headers = new Headers();
    const setCookies = (res.headers as any).getSetCookie?.() || res.headers.get('set-cookie');
    if (Array.isArray(setCookies)) {
      for (let c of setCookies) {
        if (!c.includes('HttpOnly')) c += '; HttpOnly';
        if (process.env.NODE_ENV === 'production' && !c.includes('Secure')) c += '; Secure';
        if (!c.includes('SameSite')) c += '; SameSite=Lax';
        headers.append('set-cookie', c);
      }
    } else if (typeof setCookies === 'string') {
      let c = setCookies;
      if (!c.includes('HttpOnly')) c += '; HttpOnly';
      if (process.env.NODE_ENV === 'production' && !c.includes('Secure')) c += '; Secure';
      if (!c.includes('SameSite')) c += '; SameSite=Lax';
      headers.set('set-cookie', c);
    }
    headers.set('content-type', res.headers.get('content-type') || 'application/json');

    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers });
  } catch (e: any) {
    return NextResponse.json({ error: 'ME proxy failed', detail: String(e?.message || e) }, { status: 502 });
  }
}
