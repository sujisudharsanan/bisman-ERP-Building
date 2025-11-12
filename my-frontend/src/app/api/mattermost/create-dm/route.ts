import { NextRequest, NextResponse } from 'next/server';

const MM_BASE_URL = process.env.MM_BASE_URL || process.env.NEXT_PUBLIC_MM_BASE_URL || 'http://localhost:8065';
const MM_ADMIN_TOKEN = process.env.MM_ADMIN_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const cookies = request.headers.get('cookie') || '';

    // Get current user info
    const meResponse = await fetch(`${MM_BASE_URL}/api/v4/users/me`, {
      headers: {
        'Cookie': cookies,
        'Authorization': `Bearer ${MM_ADMIN_TOKEN}`
      }
    });

    if (!meResponse.ok) {
      return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 });
    }

    const currentUser = await meResponse.json();

    // Get the other user by username
    const otherUserResponse = await fetch(`${MM_BASE_URL}/api/v4/users/username/${username}`, {
      headers: {
        'Cookie': cookies,
        'Authorization': `Bearer ${MM_ADMIN_TOKEN}`
      }
    });

    if (!otherUserResponse.ok) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const otherUser = await otherUserResponse.json();

    // Create or get DM channel
    const dmResponse = await fetch(`${MM_BASE_URL}/api/v4/channels/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'Authorization': `Bearer ${MM_ADMIN_TOKEN}`
      },
      body: JSON.stringify([currentUser.id, otherUser.id])
    });

    if (!dmResponse.ok) {
      const error = await dmResponse.text();
      console.error('[API] Failed to create DM:', error);
      return NextResponse.json({ error: 'Failed to create DM channel' }, { status: 500 });
    }

    const channel = await dmResponse.json();

    return NextResponse.json({ 
      success: true, 
      channel: {
        ...channel,
        display_name: otherUser.first_name && otherUser.last_name 
          ? `${otherUser.first_name} ${otherUser.last_name}`
          : otherUser.username
      }
    });
  } catch (error) {
    console.error('[API] /api/mattermost/create-dm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
