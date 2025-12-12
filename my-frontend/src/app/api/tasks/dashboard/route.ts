/**
 * Tasks Dashboard API Route
 * Proxies dashboard task requests to the backend API
 * GET /api/tasks/dashboard - Fetch tasks grouped by status for Kanban
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCookie } from '@/lib/apiGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * GET /api/tasks/dashboard
 * Fetch workflow tasks grouped by status for the Kanban dashboard
 * Supports viewMode query parameter: 'all' | 'my-work' | 'my-requests'
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies
    const authToken = await requireAuthCookie(['authToken', 'token', 'access_token']);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get viewMode from query params
    const { searchParams } = new URL(request.url);
    const viewMode = searchParams.get('viewMode') || 'all';

    // Fetch dashboard tasks from backend with viewMode
    const backendUrl = `${BACKEND_URL}/api/tasks/dashboard?viewMode=${viewMode}`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Backend error:', response.status, errorText);
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
    
    // The backend returns { success: true, data: { ASSIGNED: [], IN_PROGRESS: [], EDITING: [], DONE: [] } }
    // Return just the data part for the frontend
    if (data.success && data.data) {
      return NextResponse.json(data.data);
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] Error fetching dashboard tasks:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard tasks',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
