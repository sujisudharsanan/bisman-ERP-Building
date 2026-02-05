/**
 * Chat Feedback API Route
 * Proxies feedback requests to the backend
 * POST /api/chat/feedback - Submit feedback for a chat message
 */

import { NextRequest, NextResponse } from 'next/server';

// Priority: BACKEND_URL (runtime) > API_URL (runtime) > NEXT_PUBLIC_API_URL (build-time) > Railway default
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://bisman-erp-backend-production.up.railway.app';

/**
 * POST /api/chat/feedback
 * Submit feedback for a chat message (helpful/not helpful)
 */
export async function POST(request: NextRequest) {
  try {
    // Get all cookies to forward to backend (for authentication)
    const cookieHeader = request.headers.get('cookie') || '';
    
    const body = await request.json();
    const { messageId, helpful } = body;

    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/chat/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({
        messageId,
        helpful,
      }),
    });

    // Get response from backend
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[Chat Feedback API] Backend error:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to submit feedback' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Chat Feedback API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
