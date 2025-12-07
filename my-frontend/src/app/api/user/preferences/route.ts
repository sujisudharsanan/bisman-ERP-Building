import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/user/preferences - Get user theme preferences
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', theme: 'default' },
        { status: 401 }
      );
    }

    // For now, return default theme - can be extended to fetch from database
    return NextResponse.json({
      theme: 'default',
      preferences: {}
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences', theme: 'default' },
      { status: 500 }
    );
  }
}

// POST /api/user/preferences - Save user theme preferences
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { theme } = body;

    // For now, just acknowledge the save - can be extended to save to database
    return NextResponse.json({
      success: true,
      theme: theme || 'default'
    });
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}
