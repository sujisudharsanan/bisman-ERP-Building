/**
 * Chat Greeting API Route
 * Proxies greeting requests to the backend
 * GET/POST /api/chat/greeting - Get personalized greeting from AI
 */

import { NextRequest, NextResponse } from 'next/server';

// Priority: BACKEND_URL (runtime) > API_URL (runtime) > NEXT_PUBLIC_API_URL (build-time) > Railway default
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://bisman-erp-backend-production.up.railway.app';

/**
 * GET /api/chat/greeting
 * Get a greeting message from the AI assistant
 */
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    
    const response = await fetch(`${BACKEND_URL}/api/chat/greeting`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    const data = await response.json().catch(() => ({
      greeting: "Hi there! 👋 I'm Bey, your AI assistant. How can I help you today?"
    }));

    if (!response.ok) {
      // Return default greeting on error
      return NextResponse.json({
        success: true,
        greeting: "Hello! 👋 I'm Bey, your AI assistant. How can I help you today?",
        persona: { name: 'Bey' }
      });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Chat Greeting API] Error:', error);
    return NextResponse.json({
      success: true,
      greeting: "Hi! 👋 I'm Bey, your helpful assistant. What can I do for you?",
      persona: { name: 'Bey' }
    });
  }
}

/**
 * POST /api/chat/greeting
 * Get a personalized greeting from the AI assistant
 */
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${BACKEND_URL}/api/chat/greeting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({
      greeting: "Hi there! 👋 I'm Bey, your AI assistant. How can I help you today?"
    }));

    if (!response.ok) {
      // Return default greeting on error
      return NextResponse.json({
        success: true,
        greeting: "Hello! 👋 I'm Bey, your AI assistant. How can I help you today?",
        persona: { name: 'Bey' }
      });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Chat Greeting API] Error:', error);
    return NextResponse.json({
      success: true,
      greeting: "Hi! 👋 I'm Bey, your helpful assistant. What can I do for you?",
      persona: { name: 'Bey' }
    });
  }
}
