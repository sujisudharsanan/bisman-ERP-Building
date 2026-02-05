/**
 * Tasks Quick View API Route
 * GET /api/tasks/[id]/quick-view - Get task details with messages for quick view panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tasks/[id]/quick-view
 * Fetch task details with messages for the quick view panel
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

    const backendUrl = `${BACKEND_URL}/api/tasks/${id}/quick-view`;

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
      console.error('[API Proxy] Backend quick-view error:', response.status, data);
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch task' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy] Error fetching task quick-view:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
