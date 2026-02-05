/**
 * Task Transition API Route
 * Proxies maker-checker state transition requests to the backend
 * POST /api/v2/tasks/:id/transition - Transition task status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCookie } from '@/lib/apiGuard';

// Priority: BACKEND_URL (runtime) > API_URL (runtime) > NEXT_PUBLIC_API_URL (build-time) > Railway default
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://bisman-erp-backend-production.up.railway.app';

/**
 * POST /api/v2/tasks/:id/transition
 * Transition task using maker-checker workflow
 * Body: { action: 'START_WORK' | 'SUBMIT_FOR_REVIEW' | 'APPROVE' | 'REJECT' | 'RESUBMIT', reason?: string, expectedVersion?: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get auth token from cookies
    const authToken = await requireAuthCookie(['authToken', 'token', 'access_token']);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();

    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/v2/tasks/${id}/transition`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('[API] Transition error:', response.status, errorData);
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.error || `Backend error: ${response.statusText}`,
          ...errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] Task transition error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to transition task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
