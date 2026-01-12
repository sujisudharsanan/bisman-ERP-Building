import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 
                    process.env.BACKEND_URL || 
                    'http://localhost:5000';

/**
 * GET /api/roles
 * Proxy to backend - list roles
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value || 
                  cookieStore.get('token')?.value || 
                  cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ roles: [], error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const backendUrl = `${BACKEND_URL}/api/roles${url.search}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[roles GET proxy] Error:', error);
    return NextResponse.json({ roles: [], error: 'Failed to fetch roles' }, { status: 500 });
  }
}
