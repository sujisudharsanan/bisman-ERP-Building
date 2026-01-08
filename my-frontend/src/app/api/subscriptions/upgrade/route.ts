import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    // Forward cookies for authentication
    const cookieHeader = request.headers.get('cookie') || '';
    const body = await request.json().catch(() => ({}));
    
    const response = await fetch(`${BACKEND_URL}/api/subscriptions/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] Error upgrading subscription:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}
