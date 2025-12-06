import { NextResponse } from 'next/server';

const AI_BASE = (process.env.AI_BASE_URL || '').replace(/\/$/, '');

export async function GET() {
  // Only use AI_BASE_URL moving forward
  const targets = [AI_BASE && { base: AI_BASE, kind: 'ai' }].filter(Boolean) as Array<{ base: string; kind: 'ai' }>;
  if (!targets.length) return NextResponse.json({ ok: false, error: 'no_base_config', detail: 'Set AI_BASE_URL' });
  for (const t of targets) {
    try {
      // Prefer /api/tags; if 404 try a tiny /api/generate probe
      let res = await fetch(`${t.base}/api/tags`, { headers: { Accept: 'application/json' } });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${t.base}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ model: process.env.AI_DEFAULT_MODEL || 'llama3', prompt: 'ping', stream: false })
        });
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        continue;
      }
      const j = await res.json().catch(() => ({}));
  return NextResponse.json({ ok: true, base: t.base, via: t.kind, models: j?.models || j?.data || j || [] });
    } catch (e: any) {
      // Try next target
      continue;
    }
  }
  return NextResponse.json({ ok: false, error: 'unreachable', detail: 'AI_BASE_URL not reachable' }, { status: 200 });
}
