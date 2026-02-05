/**
 * Chat Conversation Latest API Route
 * Proxies conversation history requests to the backend
 * GET /api/chat/conversation/latest - Get the latest conversation
 */

import { NextRequest, NextResponse } from 'next/server';

// Priority: BACKEND_URL (runtime) > API_URL (runtime) > NEXT_PUBLIC_API_URL (build-time) > Railway default
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://bisman-erp-backend-production.up.railway.app';

/**
 * GET /api/chat/conversation/latest
 * Get the latest conversation for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    
    const response = await fetch(`${BACKEND_URL}/api/chat/conversation/latest`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    const data = await response.json().catch(() => ({ messages: [] }));

    if (!response.ok) {
      // Return empty conversation on error - not critical
      return NextResponse.json({
        success: true,
        messages: [],
        conversationId: null
      });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Chat Conversation Latest API] Error:', error);
    return NextResponse.json({
      success: true,
      messages: [],
      conversationId: null
    });
  }
}
