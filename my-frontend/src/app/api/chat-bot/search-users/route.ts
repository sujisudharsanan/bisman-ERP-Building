/**
 * Chat Bot User Search API
 * Search for users in the system (for @mentions, collaboration)
 * GET /api/chat-bot/search-users?q=john
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCookie } from '@/lib/apiGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
  const authToken = requireAuthCookie(['authToken', 'token']);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Please enter at least 2 characters to search',
      });
    }

    // Search users via backend (if you have user search endpoint)
    // For now, we'll use Mattermost team members as the source
    const response = await fetch(`${process.env.NEXT_PUBLIC_MATTERMOST_URL}/api/v4/users/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
  'Authorization': `Bearer ${requireAuthCookie(['mattermostToken']) || ''}`,
      },
      body: JSON.stringify({
        term: query,
        allow_inactive: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to search users');
    }

    const users = await response.json();

    // Filter and format results
    const results = users
      .filter((user: any) => !user.delete_at && user.username !== 'admin')
      .slice(0, 10)
      .map((user: any) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
        role: user.roles || 'user',
        position: user.position || '',
      }));

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });

  } catch (error: any) {
    console.error('User search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search users', details: error.message },
      { status: 500 }
    );
  }
}
