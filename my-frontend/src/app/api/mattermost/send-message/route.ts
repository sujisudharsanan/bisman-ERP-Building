import { NextRequest, NextResponse } from 'next/server';

const MM_BASE_URL = process.env.MM_BASE_URL || process.env.NEXT_PUBLIC_MM_BASE_URL || 'http://localhost:8065';
const MM_ADMIN_TOKEN = process.env.MM_ADMIN_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, message } = body;

    if (!channelId || !message) {
      return NextResponse.json({ error: 'Channel ID and message required' }, { status: 400 });
    }

    const cookies = request.headers.get('cookie') || '';

    // Send message to Mattermost
    const response = await fetch(`${MM_BASE_URL}/api/v4/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'Authorization': `Bearer ${MM_ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        channel_id: channelId,
        message: message
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[API] Failed to send message:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, post: data });
  } catch (error) {
    console.error('[API] /api/mattermost/send-message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
