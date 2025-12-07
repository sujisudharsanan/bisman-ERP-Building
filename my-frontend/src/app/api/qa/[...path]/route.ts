/**
 * QA API Proxy Route
 * Proxies all /api/qa/* requests to the backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { path } = await context.params;
    const pathStr = path?.join('/') || '';
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}/api/qa/${pathStr}${queryString}`;
    
    // Forward cookies for authentication
    const cookies = request.headers.get('cookie') || '';
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[QA Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: errorMessage },
      { status: 503 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { path } = await context.params;
    const pathStr = path?.join('/') || '';
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}/api/qa/${pathStr}${queryString}`;
    
    const cookies = request.headers.get('cookie') || '';
    const body = await request.json().catch(() => ({}));
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[QA Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: errorMessage },
      { status: 503 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { path } = await context.params;
    const pathStr = path?.join('/') || '';
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}/api/qa/${pathStr}${queryString}`;
    
    const cookies = request.headers.get('cookie') || '';
    const body = await request.json().catch(() => ({}));
    
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[QA Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: errorMessage },
      { status: 503 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { path } = await context.params;
    const pathStr = path?.join('/') || '';
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}/api/qa/${pathStr}${queryString}`;
    
    const cookies = request.headers.get('cookie') || '';
    const body = await request.json().catch(() => ({}));
    
    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[QA Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: errorMessage },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { path } = await context.params;
    const pathStr = path?.join('/') || '';
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}/api/qa/${pathStr}${queryString}`;
    
    const cookies = request.headers.get('cookie') || '';
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[QA Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: errorMessage },
      { status: 503 }
    );
  }
}
