/**
 * Chat Message API Route
 * Proxies chat message requests to the backend unified chat engine
 * POST /api/chat/message - Send a message to the AI assistant (Bey)
 */

import { NextRequest, NextResponse } from 'next/server';

// Priority: BACKEND_URL (runtime) > API_URL (runtime) > NEXT_PUBLIC_API_URL (build-time) > Railway default
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://bisman-erp-backend-production.up.railway.app';

/**
 * POST /api/chat/message
 * Send a message to the AI chat assistant
 */
export async function POST(request: NextRequest) {
  try {
    // Get all cookies to forward to backend (for authentication)
    const cookieHeader = request.headers.get('cookie') || '';
    
    const body = await request.json();
    const { message, conversationId, userId, taskContext, userContext, chatHistory, context } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Forward to backend chat API
    const response = await fetch(`${BACKEND_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({
        message: message.trim(),
        conversationId,
        userId,
        taskContext,
        userContext,
        chatHistory,
        context,
      }),
    });

    // Get response from backend
    const data = await response.json();

    if (!response.ok) {
      console.error('[Chat API] Backend error:', data);
      return NextResponse.json(
        { 
          success: false, 
          error: data.error || 'Failed to process message',
          reply: data.reply || "I'm having trouble processing your message. Please try again."
        },
        { status: response.status }
      );
    }

    // Return successful response
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        reply: "I'm experiencing technical difficulties. Please try again in a moment."
      },
      { status: 500 }
    );
  }
}
