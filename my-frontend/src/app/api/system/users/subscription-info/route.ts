import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 
                    process.env.BACKEND_URL || 
                    'https://bisman-erp-backend-production.up.railway.app';

/**
 * GET /api/system/users/subscription-info
 * Proxy to backend subscription-info endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value || cookieStore.get('token')?.value || cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({
        success: true,
        data: {
          has_subscription: false,
          can_create_user: true,
          can_activate_user: true,
          message: 'No auth token - allowing access'
        }
      });
    }

    const backendUrl = `${BACKEND_URL}/api/system/users/subscription-info`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('[subscription-info proxy] Backend returned:', response.status);
      // Return safe fallback on backend error
      return NextResponse.json({
        success: true,
        data: {
          has_subscription: true,
          can_create_user: true,
          can_activate_user: true,
          max_users: 999,
          current_user_count: 0,
          plan_name: 'Loading...',
          message: 'Backend temporarily unavailable'
        }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[subscription-info proxy] Error:', error);
    // Return safe fallback on error
    return NextResponse.json({
      success: true,
      data: {
        has_subscription: true,
        can_create_user: true,
        can_activate_user: true,
        max_users: 999,
        current_user_count: 0,
        plan_name: 'Error',
        message: 'Error loading subscription info'
      }
    });
  }
}
