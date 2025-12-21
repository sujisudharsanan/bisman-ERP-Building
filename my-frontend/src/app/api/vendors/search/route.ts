/**
 * Vendor Search API Route
 * Proxies vendor search requests to the backend API
 * GET /api/vendors/search - Search vendors for autocomplete
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCookie } from '@/lib/apiGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * GET /api/vendors/search
 * Search vendors for payment request autocomplete
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
      ? `${BACKEND_URL}/api/vendors/search?${queryString}`
      : `${BACKEND_URL}/api/vendors/search`;

    // Fetch from backend
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
          vendors: [],
          count: 0
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] Error searching vendors:', error);
    return NextResponse.json(
      { 
        success: true, 
        vendors: [],
        count: 0,
        message: 'Vendor search unavailable'
      },
      { status: 200 }
    );
  }
}
