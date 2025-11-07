import { NextResponse } from 'next/server';

// Simple health check: ping Mattermost API and return concise status
export async function GET() {
  const base = (process.env.MM_BASE_URL || 'http://localhost:8065').replace(/\/$/, '');
  const teamSlug = process.env.NEXT_PUBLIC_MM_TEAM_SLUG || process.env.MM_TEAM_SLUG || 'erp';

  const out: Record<string, unknown> = {
    status: 'down',
    team_slug: teamSlug,
  };

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`${base}/api/v4/system/ping`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    clearTimeout(t);

    if (!r.ok) {
      out.error = `upstream_status_${r.status}`;
      return NextResponse.json(out, { status: 502 });
    }

    // Ping can be JSON or text; normalize to 'ok'
    let pingVal: any = null;
    const text = await r.text();
    try { pingVal = JSON.parse(text); } catch { pingVal = text; }
    const normalized = typeof pingVal === 'string' ? pingVal.toLowerCase() : (pingVal?.status || 'ok').toLowerCase();

    out.status = normalized === 'ok' ? 'ok' : 'unknown';
    out.ping = normalized;
    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    out.error = err?.message || String(err);
    return NextResponse.json(out, { status: 503 });
  }
}
