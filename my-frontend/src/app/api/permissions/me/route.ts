/**
 * Frontend API route: /api/permissions/me
 * Security fix PM-01: Proxy to backend /api/permissions/me
 * Ensures frontend always fetches permissions from authoritative backend
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getBackendBase(): string | null {
  return (
    process.env.BACKEND_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    null
  );
}

function forwardHeaders(req: NextRequest): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const cookie = req.headers.get('cookie');
  if (cookie) headers['cookie'] = cookie;
  const auth = req.headers.get('authorization');
  if (auth) headers['authorization'] = auth;
  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const base = getBackendBase();

    if (!base) {
      // SECURITY: Fail closed - no permissions if backend not configured
      console.error('[/api/permissions/me] No backend URL configured');
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Backend not configured', code: 'NO_BACKEND' },
          data: null,
        },
        { status: 503 }
      );
    }

    const url = `${base.replace(/\/$/, '')}/api/permissions/me`;
    const res = await fetch(url, {
      method: 'GET',
      headers: forwardHeaders(req),
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({
      success: false,
      error: { message: 'Invalid backend response', code: 'PARSE_ERROR' },
    }));

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[/api/permissions/me] Proxy error:', error);
    // SECURITY: Fail closed
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Failed to fetch permissions', code: 'PROXY_ERROR' },
        data: null,
      },
      { status: 500 }
    );
  }
}
