import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const header = req.headers.get('x-csrf-token')
  const cookieToken = req.cookies.get('csrf_token')?.value
  if (!header || !cookieToken || header !== cookieToken) {
    return NextResponse.json({ message: 'CSRF token missing or invalid' }, { status: 403 })
  }
  const refresh = req.cookies.get('refresh_token')?.value
  if (!refresh) return NextResponse.json({ message: 'No refresh' }, { status: 401 })

  // Demo: accept any refresh_token and return a new access token
  const newAccess = Math.random().toString(36).slice(2)
  const res = NextResponse.json({ ok: true })
  const secure = process.env.NODE_ENV === 'production'
  res.cookies.set('access_token', newAccess, { httpOnly: true, sameSite: 'lax', path: '/', secure, maxAge: 60 * 15 })
  return res
}
