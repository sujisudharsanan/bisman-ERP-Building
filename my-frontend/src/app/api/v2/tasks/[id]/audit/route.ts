/**
 * Task Audit Trail API Route
 * Proxies audit trail requests to the backend
 * GET /api/v2/tasks/:id/audit - Get task audit history
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCookie } from '@/lib/apiGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * GET /api/v2/tasks/:id/audit
 * Get task audit trail for compliance tracking
 */
export async function GET(
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

    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/v2/tasks/${id}/audit`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('[API] Audit trail error:', response.status, errorData);
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.error || `Backend error: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return the data array
    if (data.success && data.data) {
      return NextResponse.json(data.data);
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] Task audit trail error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get task audit trail',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
