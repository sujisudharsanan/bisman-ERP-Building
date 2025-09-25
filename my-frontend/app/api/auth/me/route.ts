import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 })

  // Demo: return a static user
  return NextResponse.json({ authenticated: true, user: { id: 1, name: 'Admin', username: 'admin' } })
}
