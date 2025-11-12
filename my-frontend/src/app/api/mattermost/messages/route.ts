import { NextRequest, NextResponse } from 'next/server';

const MM_BASE_URL = process.env.MM_BASE_URL || process.env.NEXT_PUBLIC_MM_BASE_URL || 'http://localhost:8065';
const MM_ADMIN_TOKEN = process.env.MM_ADMIN_TOKEN;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    const cookies = request.headers.get('cookie') || '';

    // Fetch messages (posts) for the channel
    const response = await fetch(`${MM_BASE_URL}/api/v4/channels/${channelId}/posts?per_page=60`, {
      headers: {
        'Cookie': cookies,
        'Authorization': `Bearer ${MM_ADMIN_TOKEN}`
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    const data = await response.json();
    
    // Mattermost returns posts in a specific format
    // order: array of post IDs (newest first)
    // posts: object with post details
    const messages = data.order?.map((id: string) => {
      const post = data.posts[id];
      return {
        id: post.id,
        message: post.message,
        user_id: post.user_id,
        create_at: post.create_at,
        username: post.user_id // We'll fetch usernames separately if needed
      };
    }).reverse() || []; // Reverse to show oldest first

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('[API] /api/mattermost/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
