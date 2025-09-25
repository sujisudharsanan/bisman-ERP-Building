import { NextResponse } from 'next/server'

export async function GET() {
  const token = Math.random().toString(36).slice(2)
  const res = NextResponse.json({ ok: true, csrf: token })
  // Note: csrf cookie is intentionally NOT httpOnly so client JS can read and send it in a header (double-submit)
  const secure = process.env.NODE_ENV === 'production'
  res.cookies.set('csrf_token', token, { httpOnly: false, sameSite: 'lax', path: '/', secure, maxAge: 60 * 60 })
  return res
}
