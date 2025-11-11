import { NextResponse } from 'next/server';
import { mmLogin } from '@/lib/mattermostClient';
import { withRateLimit, getRateLimitHeaders } from '@/lib/rateLimit';

/**
 * Mattermost login proxy.
 * Enhancements:
 *  - Rate limiting to prevent brute force attacks
 *  - Returns detailed diagnostics (status, text snippet) when login fails in development
 *  - Preserves multiple Set-Cookie headers (Mattermost may send two: Token + CSRF).
 *  - Normalizes cookie Path to '/' so embedded /chat iframe + API calls work.
 *  - Environment-aware cookie security (SameSite=None;Secure in production)
 */
export async function POST(req: Request) {
  const started = Date.now();
  const body = await req.json().catch(()=>({}));
  const { email, password } = body || {};
  
  if (!email || !password) {
    return NextResponse.json({ ok:false, error:'email_password_required' }, { status: 400 });
  }
  
  // Rate limiting: 5 login attempts per minute per email
  const rateLimit = withRateLimit(`login:${email}`, { limit: 5, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    const resp = NextResponse.json({ 
      ok: false, 
      error: 'rate_limit_exceeded',
      message: 'Too many login attempts. Please try again later.',
      resetAt: new Date(rateLimit.resetAt).toISOString()
    }, { status: 429 });
    
    Object.entries(getRateLimitHeaders(rateLimit)).forEach(([key, value]) => {
      resp.headers.set(key, value);
    });
    
    return resp;
  }

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
    const isProd = process.env.NODE_ENV === 'production';
    const isHTTPS = process.env.VERCEL || process.env.RAILWAY || isProd;
    
    // Mattermost typically separates cookies with a comma but may include commas in Expires
    const parts = raw.match(/([^,]+?Expires=[^,]+GMT)/g) || raw.split(/,(?=[^;]+?=)/g) || [raw];
    const patched = parts.map(c => {
      let p = c
        .replace(/Path=\/[a-zA-Z0-9\-_/]*/g, 'Path=/')          // Normalize path to root
        .replace(/Domain=[^;]*/gi, '');                          // Remove domain (default to current origin)
      
      // Production: Use SameSite=None with Secure for cross-origin iframe embedding
      // Development: Use SameSite=Lax without Secure for localhost
      if (isHTTPS) {
        p = p.replace(/SameSite=[^;]*/gi, 'SameSite=None');
        if (!/;\s*Secure/i.test(p)) p += '; Secure';
      } else {
        // Local dev (HTTP): Remove SameSite and Secure to allow cookies
        p = p.replace(/SameSite=[^;]*/gi, '').replace(/;\s*Secure/gi, '');
      }
      
      return p.trim().replace(/;\s*;/g, ';');                   // Clean up double semicolons
    });
    // Set multiple headers
    patched.forEach((c,i) => resp.headers.append('Set-Cookie', c));
  }
  return resp;
}
