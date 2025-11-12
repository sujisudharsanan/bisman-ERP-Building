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
      return NextResponse.json({ members: [] });
    }

    const teamId = teams[0].id;

    // Get team members
    const membersResponse = await fetch(`${MM_BASE_URL}/api/v4/users?in_team=${teamId}&per_page=100`, {
      headers: {
        'Cookie': cookies,
        'Authorization': `Bearer ${MM_ADMIN_TOKEN}`
      }
    });

    if (!membersResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    const members = await membersResponse.json();

    return NextResponse.json({ members });
  } catch (error) {
    console.error('[API] /api/mattermost/team-members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
