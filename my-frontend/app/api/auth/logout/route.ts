import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const header = req.headers.get('x-csrf-token')
  const cookieToken = req.cookies.get('csrf_token')?.value
  if (!header || !cookieToken || header !== cookieToken) {
    return NextResponse.json({ message: 'CSRF token missing or invalid' }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('access_token', '', { httpOnly: true, path: '/', maxAge: 0 })
  res.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
