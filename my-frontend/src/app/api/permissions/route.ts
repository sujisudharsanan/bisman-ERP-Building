import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// Resolve backend base URL from environment
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

// GET /api/permissions
// - By user:    /api/permissions?userId=123 -> { success, data: { userId, allowedPages } }
// - By role:    /api/permissions?roleId=1&moduleName=system -> { success, data: { roleId, moduleName, allowedPages } }
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '';
    const roleId = searchParams.get('roleId') || '';
    const moduleName = searchParams.get('moduleName') || '';
    const base = getBackendBase();

    if (base) {
      // Build backend URL with whichever identifiers are provided
      const qs = new URLSearchParams();
      if (userId) qs.set('userId', userId);
      if (roleId) qs.set('roleId', roleId);
      if (moduleName) qs.set('moduleName', moduleName);
      const url = `${base.replace(/\/$/, '')}/api/permissions?${qs.toString()}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: forwardHeaders(req),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    // Safe fallback (no backend configured)
    if (userId) {
      return NextResponse.json({ success: true, data: { userId, allowedPages: [] as string[] } });
    }
    if (roleId) {
      return NextResponse.json({ success: true, data: { roleId, moduleName, allowedPages: [] as string[] } });
    }
    return NextResponse.json({ success: true, data: { allowedPages: [] as string[] } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to load permissions' }, { status: 500 });
  }
}

// POST /api/permissions  body: { roleId, moduleName, allowedPages }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const base = getBackendBase();

    if (base) {
      const url = `${base.replace(/\/$/, '')}/api/permissions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: forwardHeaders(req),
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    // Safe fallback echo
    return NextResponse.json({
      success: true,
      message: 'Saved (mock, no backend configured)',
      data: body,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save permissions' }, { status: 500 });
  }
}
// Removed duplicate import and GET proxy to avoid redeclarations. Single GET/POST above.
