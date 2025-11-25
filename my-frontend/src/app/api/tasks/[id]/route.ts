/**
 * Tasks API Route - Dynamic ID
 * Handles operations on specific tasks by ID
 * DELETE /api/tasks/[id] - Delete a task
 * GET /api/tasks/[id] - Get a specific task
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCookie } from '@/lib/apiGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * GET /api/tasks/[id]
 * Fetch a specific task by ID
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

    const response = await fetch(`${BACKEND_URL}/api/tasks/${id}`, {
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
    console.error('[API] Error fetching task:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch task',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task by ID
 */
export async function DELETE(
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

    const response = await fetch(`${BACKEND_URL}/api/tasks/${id}`, {
      method: 'DELETE',
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
    console.error('[API] Error deleting task:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete task',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[id]
 * Update a task by ID
 */
export async function PATCH(
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

    const body = await request.json();

    const { id } = await params;

    const response = await fetch(`${BACKEND_URL}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    console.error('[API] Error updating task:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update task',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
