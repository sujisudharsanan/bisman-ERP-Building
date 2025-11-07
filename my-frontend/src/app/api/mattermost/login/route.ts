import { NextResponse } from 'next/server';
import { mmLogin } from '@/lib/mattermostClient';

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({}));
  const { email, password } = body || {};
  if (!email || !password) return NextResponse.json({ ok:false, error:'email_password_required' }, { status: 400 });
  const r = await mmLogin(email, password);
  if (!r.ok && r.status !== 307 && r.status !== 200) {
    return NextResponse.json({ ok:false, error:`mm_login_${r.status}` }, { status: 401 });
  }
  const resp = NextResponse.json({ ok:true });
  // Copy Set-Cookie headers from Mattermost to our domain, scoped to /chat
  const setCookie = r.headers.get('set-cookie');
  if (setCookie) {
    const isProd = process.env.NODE_ENV === 'production';
    // Scope to root so MM webapp can access /api/v4 and /static
    let patched = setCookie
      .replace(/Path=\/[a-zA-Z0-9\-_/]*/g, 'Path=/')
      .replace(/SameSite=[^;]*/g, 'SameSite=Lax')
      .replace(/; Secure/g, '');
    if (isProd) patched = `${patched}; Secure`;
    resp.headers.set('Set-Cookie', patched);
  }
  return resp;
}
