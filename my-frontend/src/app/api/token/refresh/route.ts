import { NextRequest, NextResponse } from 'next/server';

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
    const res = await fetch(`${BACKEND_BASE}/api/token/refresh`, {
      method: 'POST',
      headers: {
        cookie: req.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });

    const headers = new Headers();
    const setCookies = (res.headers as any).getSetCookie?.() || res.headers.get('set-cookie');
    if (Array.isArray(setCookies)) {
      for (const c of setCookies) headers.append('set-cookie', c);
    } else if (typeof setCookies === 'string') {
      headers.set('set-cookie', setCookies);
    }
    headers.set('content-type', res.headers.get('content-type') || 'application/json');

    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers });
  } catch (e: any) {
    return NextResponse.json({ error: 'Refresh proxy failed', detail: String(e?.message || e) }, { status: 502 });
  }
}
