/**
 * Tasks Quick View API Route
 * GET /api/tasks/[id]/quick-view - Get task details with messages for quick view panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCookie } from '@/lib/apiGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * GET /api/tasks/[id]/quick-view
 * Fetch task details with messages for the quick view panel
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authToken = await requireAuthCookie(['authToken', 'token', 'access_token']);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const response = await fetch(`${BACKEND_URL}/api/tasks/${id}/quick-view`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Backend quick-view error:', response.status, errorText);
      return NextResponse.json(
        { 
          success: false, 
          error: `Backend error: ${response.statusText}`,
          details: errorText 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] Error fetching task quick-view:', error);
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
