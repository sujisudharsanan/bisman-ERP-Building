/**
 * Chat Thread Messages API Route
 * Proxies thread message requests to the backend
 * GET /api/chat/threads/[id]/messages - Get messages in a thread
 * POST /api/chat/threads/[id]/messages - Send a message to a thread
 */

import { NextRequest, NextResponse } from 'next/server';

// Priority: BACKEND_URL (runtime) > API_URL (runtime) > NEXT_PUBLIC_API_URL (build-time) > Railway default
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://bisman-erp-backend-production.up.railway.app';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chat/threads/[id]/messages
 * Get all messages in a specific thread
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const cookieHeader = request.headers.get('cookie') || '';
    
    const response = await fetch(`${BACKEND_URL}/api/chat/threads/${id}/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    const data = await response.json().catch(() => ({ messages: [] }));

    if (!response.ok) {
      console.error('[Chat Thread Messages API] Backend error:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch messages', messages: [] },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Chat Thread Messages API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', messages: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/threads/[id]/messages
 * Send a message to a specific thread
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const cookieHeader = request.headers.get('cookie') || '';
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/chat/threads/${id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[Chat Thread Messages API] Backend error:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to send message' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Chat Thread Messages API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
