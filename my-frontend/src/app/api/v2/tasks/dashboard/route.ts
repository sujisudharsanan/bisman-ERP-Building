import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Priority: BACKEND_URL (runtime) > API_URL (runtime) > NEXT_PUBLIC_API_URL (build-time) > Railway default
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://bisman-erp-backend-production.up.railway.app';

/**
 * GET /api/v2/tasks/dashboard
 * Proxy to backend for dashboard/kanban tasks with viewMode support
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Get viewMode from query params
    const { searchParams } = new URL(request.url);
    const viewMode = searchParams.get('viewMode') || 'all';
    
    const backendUrl = `${BACKEND_URL}/api/v2/tasks/dashboard?viewMode=${viewMode}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch dashboard tasks' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy] Dashboard tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard tasks' },
      { status: 500 }
    );
  }
}
