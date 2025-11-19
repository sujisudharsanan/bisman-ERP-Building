/**
 * API Route: /api/health/database
 *
 * Purpose: Provide a stable DB health endpoint for the UI. It will:
 * 1) Proxy to backend health endpoints in this order:
 *    - /api/health/database
 *    - /api/health/db
 *    - /api/health
 * 2) Normalize the response to: { success, data: { connected, response_time?, active_connections?, reason? } }
 * 3) Return a safe fallback when backend URL isn't configured.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

type Reason = 'NOT_CONFIGURED' | 'ERROR' | 'FORBIDDEN' | 'UNAUTHORIZED' | 'UNKNOWN';

function getBackendBase(): string | undefined {
  return (
    process.env.BACKEND_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    undefined
  );
}

async function tryFetch(url: string, cookie?: string) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });
    return res;
  } catch (e) {
    return undefined;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const start = Date.now();
  const backend = getBackendBase();

  // If no backend configured, provide a clear, non-error fallback
  if (!backend) {
    return res.status(200).json({
      success: true,
      data: {
        connected: false,
        response_time: Date.now() - start,
        reason: 'NOT_CONFIGURED' as Reason,
      },
    });
  }

  const cookie = req.headers.cookie;
  const candidates = [
    `${backend}/api/health/database`,
    `${backend}/api/health/db`,
    `${backend}/api/health`,
  ];

  for (const url of candidates) {
    const r = await tryFetch(url, cookie);
    if (!r) continue; // network error, try next

    // Auth/permission: forward status so UI can show proper reason
    if (r.status === 401 || r.status === 403) {
      let body: any = undefined;
      try { body = await r.json(); } catch {}
      return res.status(r.status).json(body || { success: false });
    }

    if (r.ok) {
      let json: any = undefined;
      try { json = await r.json(); } catch { json = {}; }

      // Normalize various backend shapes
      let connected: boolean | undefined;
      let activeConnections: number | undefined;

      if (typeof json?.ok === 'boolean' && json?.data === undefined) {
        // Nest variant: { ok: boolean }
        connected = Boolean(json.ok);
      } else if (typeof json?.data?.connected === 'boolean') {
        connected = Boolean(json.data.connected);
        if (typeof json?.data?.active_connections === 'number') {
          activeConnections = json.data.active_connections;
        }
      } else if (typeof json?.status === 'string') {
        // Generic health: { status: 'ok' | 'error', ... }
        connected = json.status.toLowerCase() === 'ok';
      } else if (json?.info?.db?.status || json?.details?.db?.status) {
        const s = json?.info?.db?.status || json?.details?.db?.status;
        connected = String(s).toLowerCase() === 'up';
      }

      const latency = Date.now() - start;
      return res.status(200).json({
        success: true,
        data: {
          connected: Boolean(connected),
          response_time: latency,
          ...(activeConnections !== undefined ? { active_connections: activeConnections } : {}),
        },
      });
    }
    // else non-ok and not auth; try next candidate
  }

  // All attempts failed (network/5xx/404, etc.)
  return res.status(200).json({
    success: true,
    data: {
      connected: false,
      response_time: Date.now() - start,
      reason: 'ERROR' as Reason,
    },
  });
}
