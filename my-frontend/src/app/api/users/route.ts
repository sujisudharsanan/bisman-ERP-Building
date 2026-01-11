import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 
                    process.env.BACKEND_URL || 
                    'https://bisman-erp-backend-production.up.railway.app';

/**
 * GET /api/users
 * Proxy to backend - list users (used by system-flow page)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value || cookieStore.get('token')?.value || cookieStore.get('auth_token')?.value;

    const url = new URL(request.url);
    const backendUrl = `${BACKEND_URL}/api/users${url.search}`;
    
    console.log('[api/users GET proxy] Fetching users from:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('[api/users GET proxy] Backend error:', response.status);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[api/users GET proxy] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Proxy to backend - create user
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value || cookieStore.get('token')?.value || cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'No authentication token found. Please log in again.' 
      }, { status: 401 });
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/users`;
    
    console.log('[api/users POST proxy] Creating user, forwarding to:', backendUrl);

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

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[api/users POST proxy] Backend error:', response.status, data);
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[api/users POST proxy] Error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
