import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // CSRF check (double submit): header must match cookie
    const header = req.headers.get('x-csrf-token')
    const cookieToken = req.cookies.get('csrf_token')?.value
    if (!header || !cookieToken || header !== cookieToken) {
      return NextResponse.json({ message: 'CSRF token missing or invalid' }, { status: 403 })
    }
    const body = await req.json()
    const { username, password } = body || {}

    // Very small demo auth: replace with real validation against a DB or upstream API
    if (username === 'admin' && password === 'password') {
      const accessToken = Math.random().toString(36).slice(2)
      const refreshToken = Math.random().toString(36).slice(2)
      const user = { id: 1, name: 'Admin', username: 'admin' }

      const res = NextResponse.json({ user })
      const secure = process.env.NODE_ENV === 'production'
      res.cookies.set('access_token', accessToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure,
        maxAge: 60 * 15 // 15 minutes
      })
      res.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure,
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })

      return res
    }

    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  } catch (err) {
    return NextResponse.json({ message: 'Bad request' }, { status: 400 })
  }
}
