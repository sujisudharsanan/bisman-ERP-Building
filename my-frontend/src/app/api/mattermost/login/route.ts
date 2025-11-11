import { NextResponse } from 'next/server';
import { mmLogin } from '@/lib/mattermostClient';

/**
 * Mattermost login proxy.
 * Enhancements:
 *  - Returns detailed diagnostics (status, text snippet) when login fails.
 *  - Preserves multiple Set-Cookie headers (Mattermost may send two: Token + CSRF).
 *  - Normalizes cookie Path to '/' so embedded /chat iframe + API calls work.
 */
export async function POST(req: Request) {
  const started = Date.now();
  const body = await req.json().catch(()=>({}));
  const { email, password } = body || {};
  if (!email || !password) return NextResponse.json({ ok:false, error:'email_password_required' }, { status: 400 });

  let upstream;
  try {
    upstream = await mmLogin(email, password);
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:'mm_login_request_failed', detail: e?.message }, { status: 502 });
  }

  const acceptable = upstream.ok || upstream.status === 307 || upstream.status === 200;
  if (!acceptable) {
    let snippet = '';
    try { snippet = (await upstream.text()).slice(0, 400); } catch {}
    return NextResponse.json({
      ok: false,
      error: `mm_login_${upstream.status}`,
      status: upstream.status,
      snippet,
      took_ms: Date.now() - started,
    }, { status: upstream.status === 401 ? 401 : 502 });
  }

  const resp = NextResponse.json({ ok:true, took_ms: Date.now() - started });

  // Collect ALL set-cookie headers (not just first) — Node fetch combines; attempt split heuristically.
  const raw = upstream.headers.get('set-cookie');
  if (raw) {
    // Mattermost typically separates cookies with a comma but may include commas in Expires
    const parts = raw.match(/([^,]+?Expires=[^,]+GMT)/g) || raw.split(/,(?=[^;]+?=)/g) || [raw];
    const isProd = process.env.NODE_ENV === 'production';
    const patched = parts.map(c => {
      let p = c
        .replace(/Path=\/[a-zA-Z0-9\-_/]*/g, 'Path=/')
        .replace(/SameSite=[^;]*/g, 'SameSite=Lax')
        .replace(/Domain=[^;]*/gi, '')
        .replace(/; Secure/g, '');
      if (isProd && !/; Secure/i.test(p)) p += '; Secure';
      return p;
    });
    // Set multiple headers
    patched.forEach((c,i) => resp.headers.append('Set-Cookie', c));
  }
  return resp;
}
