/**
 * Chat Bot User Search API
 * Search for users in the system (for @mentions, collaboration)
 * GET /api/chat-bot/search-users?q=john
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    // Search users via backend
    const response = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${accessToken}`,
      },
    });

    if (!response.ok) {
      // If backend doesn't have search endpoint, return empty results gracefully
      if (response.status === 404) {
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          message: 'User search not available'
        });
      }
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    
    // Format results
    const users = Array.isArray(data) ? data : (data.users || data.data || []);
    const results = users.slice(0, 20).map((user: any) => ({
      id: user.id,
      username: user.username || user.email?.split('@')[0] || '',
      email: user.email,
      firstName: user.first_name || user.firstName || '',
      lastName: user.last_name || user.lastName || '',
      fullName: user.full_name || `${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''}`.trim() || user.username || user.email,
      role: user.role || 'user',
      roleName: user.roleName || user.role || 'USER',
      position: user.position || '',
      profile_pic_url: user.profilePic || user.profile_pic_url || null,
    }));

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });

  } catch (error: any) {
    console.error('[Chat] User search error:', error.message);
    // Return empty results instead of error for better UX
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
      message: 'User search unavailable'
    });
  }
}
