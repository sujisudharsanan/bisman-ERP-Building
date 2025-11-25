/**
 * Tasks API Route
 * Proxies task requests to the backend API
 * GET /api/tasks - Fetch all tasks
 * POST /api/tasks - Create a new task
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCookie } from '@/lib/apiGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * GET /api/tasks
 * Fetch all workflow tasks for the authenticated user
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString 
      ? `${BACKEND_URL}/api/tasks?${queryString}`
      : `${BACKEND_URL}/api/tasks`;

    // Fetch tasks from backend
    const response = await fetch(url, {
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
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] Error fetching tasks:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tasks',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new workflow task
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookies
    const authToken = await requireAuthCookie(['authToken', 'token', 'access_token']);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check content type to determine how to handle the request
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${authToken}`,
    };

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (file uploads)
      const formData = await request.formData();
      body = formData;
      // Don't set Content-Type for FormData - let fetch set it with boundary
    } else {
      // Handle JSON
      body = JSON.stringify(await request.json());
      requestHeaders['Content-Type'] = 'application/json';
    }

    // Create task in backend
    const response = await fetch(`${BACKEND_URL}/api/tasks`, {
      method: 'POST',
      headers: requestHeaders,
      body: body,
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
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] Error creating task:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create task',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
