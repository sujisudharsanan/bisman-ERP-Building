import { NextRequest, NextResponse } from 'next/server';

const MM_BASE_URL = process.env.MM_BASE_URL || process.env.NEXT_PUBLIC_MM_BASE_URL || 'http://localhost:8065';
const MM_ADMIN_TOKEN = process.env.MM_ADMIN_TOKEN;

export async function GET(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie') || '';
    
    // Get user's teams first
    const teamsResponse = await fetch(`${MM_BASE_URL}/api/v4/users/me/teams`, {
      headers: {
        'Cookie': cookies,
        'Authorization': `Bearer ${MM_ADMIN_TOKEN}`
      }
    });

    if (!teamsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    const teams = await teamsResponse.json();
    if (!teams || teams.length === 0) {
      return NextResponse.json({ channels: [] });
    }

    const teamId = teams[0].id;

    // Get channels for the team
    const channelsResponse = await fetch(`${MM_BASE_URL}/api/v4/users/me/teams/${teamId}/channels`, {
      headers: {
        'Cookie': cookies,
        'Authorization': `Bearer ${MM_ADMIN_TOKEN}`
      }
    });

    if (!channelsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
    }

    const channels = await channelsResponse.json();

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('[API] /api/mattermost/channels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
