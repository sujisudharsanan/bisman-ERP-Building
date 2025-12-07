/**
 * QA API Proxy Route
 * Proxies all /api/qa/* requests to the backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path?.join('/') || '';
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}/api/qa/${path}${queryString}`;
    
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
  } catch (error: any) {
    console.error('[QA Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error.message },
      { status: 503 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path?.join('/') || '';
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}/api/qa/${path}${queryString}`;
    
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
  } catch (error: any) {
    console.error('[QA Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error.message },
      { status: 503 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path?.join('/') || '';
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}/api/qa/${path}${queryString}`;
    
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
  } catch (error: any) {
    console.error('[QA Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error.message },
      { status: 503 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path?.join('/') || '';
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}/api/qa/${path}${queryString}`;
    
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
  } catch (error: any) {
    console.error('[QA Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error.message },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path?.join('/') || '';
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}/api/qa/${path}${queryString}`;
    
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
  } catch (error: any) {
    console.error('[QA Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error.message },
      { status: 503 }
    );
  }
}
