/**
 * Chat Conversation Save API Route
 * Proxies conversation save requests to the backend
 * POST /api/chat/conversation/save - Save a conversation
 */

import { NextRequest, NextResponse } from 'next/server';

// Priority: BACKEND_URL (runtime) > API_URL (runtime) > NEXT_PUBLIC_API_URL (build-time) > Railway default
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://bisman-erp-backend-production.up.railway.app';

/**
 * POST /api/chat/conversation/save
 * Save a chat conversation to the database
 */
export async function POST(request: NextRequest) {
  try {
    // Get all cookies to forward to backend (for authentication)
    const cookieHeader = request.headers.get('cookie') || '';
    
    const body = await request.json();
    const { conversationId, messages, contextType } = body;

    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/chat/conversation/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({
        conversationId,
        messages,
        contextType,
      }),
    });

    // Get response from backend
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[Chat Save API] Backend error:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to save conversation' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Chat Save API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
