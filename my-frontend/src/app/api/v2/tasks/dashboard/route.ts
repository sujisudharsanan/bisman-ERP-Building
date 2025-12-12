import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

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
