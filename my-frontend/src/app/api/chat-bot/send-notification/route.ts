/**
 * Chat Bot Send Notification API
 * Send notification to a user via Mattermost DM
 * POST /api/chat-bot/send-notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const MATTERMOST_URL = process.env.NEXT_PUBLIC_MATTERMOST_URL || 'https://bisman-erp-mattermost.up.railway.app';
const MATTERMOST_BOT_TOKEN = process.env.MATTERMOST_BOT_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authToken = cookieStore.get('authToken')?.value;

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { recipientUsername, message, type = 'info' } = body;

    if (!recipientUsername || !message) {
      return NextResponse.json(
        { success: false, error: 'recipientUsername and message are required' },
        { status: 400 }
      );
    }

    // Get Mattermost token (prefer bot token, fallback to user token)
    const mattermostToken = MATTERMOST_BOT_TOKEN || cookieStore.get('mattermostToken')?.value;

    if (!mattermostToken) {
      return NextResponse.json(
        { success: false, error: 'Mattermost not configured' },
        { status: 500 }
      );
    }

    // Get current user ID
    const meResponse = await fetch(`${MATTERMOST_URL}/api/v4/users/me`, {
      headers: { Authorization: `Bearer ${mattermostToken}` }
    });

    if (!meResponse.ok) {
      throw new Error('Failed to get current user');
    }

    const currentUser = await meResponse.json();

    // Get recipient user ID by username
    const userResponse = await fetch(`${MATTERMOST_URL}/api/v4/users/username/${recipientUsername}`, {
      headers: { Authorization: `Bearer ${mattermostToken}` }
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { success: false, error: `User ${recipientUsername} not found` },
        { status: 404 }
      );
    }

    const recipientUser = await userResponse.json();

    // Create DM channel
    const channelResponse = await fetch(`${MATTERMOST_URL}/api/v4/channels/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mattermostToken}`,
      },
      body: JSON.stringify([currentUser.id, recipientUser.id]),
    });

    if (!channelResponse.ok) {
      throw new Error('Failed to create DM channel');
    }

    const channel = await channelResponse.json();

    // Format message based on type
    let formattedMessage = message;
    if (type === 'approval') {
      formattedMessage = `🔔 **Approval Required**\n\n${message}`;
    } else if (type === 'payment') {
      formattedMessage = `💰 **Payment Notification**\n\n${message}`;
    } else if (type === 'task') {
      formattedMessage = `📋 **Task Update**\n\n${message}`;
    } else if (type === 'urgent') {
      formattedMessage = `🚨 **URGENT**\n\n${message}`;
    } else {
      formattedMessage = `ℹ️ ${message}`;
    }

    // Send message
    const messageResponse = await fetch(`${MATTERMOST_URL}/api/v4/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mattermostToken}`,
      },
      body: JSON.stringify({
        channel_id: channel.id,
        message: formattedMessage,
      }),
    });

    if (!messageResponse.ok) {
      throw new Error('Failed to send notification');
    }

    const sentMessage = await messageResponse.json();

    return NextResponse.json({
      success: true,
      data: {
        messageId: sentMessage.id,
        channelId: channel.id,
        recipient: recipientUser.username,
        sentAt: sentMessage.create_at,
      },
      message: 'Notification sent successfully',
    });

  } catch (error: any) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notification', details: error.message },
      { status: 500 }
    );
  }
}
