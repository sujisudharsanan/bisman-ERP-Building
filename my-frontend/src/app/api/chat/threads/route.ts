/**
 * Chat Threads API Route
 * Proxies thread requests to the backend
 * GET /api/chat/threads - List all chat threads
 * POST /api/chat/threads - Create a new thread
 */

import { NextRequest, NextResponse } from 'next/server';

// Priority: BACKEND_URL (runtime) > API_URL (runtime) > NEXT_PUBLIC_API_URL (build-time) > Railway default
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://bisman-erp-backend-production.up.railway.app';

/**
 * GET /api/chat/threads
 * Get all chat threads for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    
    const response = await fetch(`${BACKEND_URL}/api/chat/threads`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    const data = await response.json().catch(() => ({ threads: [] }));

    if (!response.ok) {
      console.error('[Chat Threads API] Backend error:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch threads', threads: [] },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Chat Threads API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', threads: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/threads
 * Create a new chat thread
 */
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/chat/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[Chat Threads API] Backend error:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to create thread' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Chat Threads API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
