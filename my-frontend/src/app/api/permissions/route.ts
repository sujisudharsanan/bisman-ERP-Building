// Next.js API Route - Proxy to backend permissions endpoint
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { message: 'User ID required', code: 'MISSING_USER_ID' } },
        { status: 400 }
      );
    }

    // Get backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Forward request to backend
    const backendResponse = await fetch(`${backendUrl}/api/permissions?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
    });

    const data = await backendResponse.json();

    return NextResponse.json(data, {
      status: backendResponse.status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });

  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch permissions',
          code: 'PROXY_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
