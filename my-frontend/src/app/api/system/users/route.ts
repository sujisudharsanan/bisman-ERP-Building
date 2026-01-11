import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 
                    process.env.BACKEND_URL || 
                    'https://bisman-erp-backend-production.up.railway.app';

/**
 * GET /api/system/users
 * Proxy to backend - list users
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value || cookieStore.get('token')?.value || cookieStore.get('auth_token')?.value;

    const url = new URL(request.url);
    const backendUrl = `${BACKEND_URL}/api/system/users${url.search}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[system/users GET proxy] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * POST /api/system/users
 * Proxy to backend - create user
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const token = accessToken || cookieStore.get('token')?.value || cookieStore.get('auth_token')?.value;

    console.log('[system/users POST proxy] Cookies found:', {
      access_token: accessToken ? 'present' : 'missing',
      token: cookieStore.get('token')?.value ? 'present' : 'missing',
      auth_token: cookieStore.get('auth_token')?.value ? 'present' : 'missing'
    });

    if (!token) {
      console.error('[system/users POST proxy] No auth token found in cookies');
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'No authentication token found. Please log in again.',
        code: 'NO_TOKEN'
      }, { status: 401 });
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/system/users`;
    
    console.log('[system/users POST proxy] Creating user, forwarding to:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { error: 'Invalid JSON from backend' };
    }
    
    if (!response.ok) {
      console.error('[system/users POST proxy] Backend error:', response.status, data);
      // Bubble up backend status with details
      return NextResponse.json(
        {
          error: 'User creation failed',
          backendStatus: response.status,
          details: data,
        },
        { status: response.status }
      );
    }
    
    // Add cache-control headers to prevent caching
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('Pragma', 'no-cache');
    
    return NextResponse.json(data, { status: response.status, headers });
  } catch (error) {
    console.error('[system/users POST proxy] Error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
