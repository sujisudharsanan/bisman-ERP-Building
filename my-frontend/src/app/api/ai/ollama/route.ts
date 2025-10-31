import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const op = body?.op as 'generate' | 'embed';
    const model = body?.model || process.env.OLLAMA_MODEL || process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama3:8b';

    if (op === 'generate') {
      const prompt: string = body?.prompt || '';
      const r = await fetch(`${OLLAMA_URL.replace(/\/$/, '')}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false })
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        return NextResponse.json({ ok: false, error: `ollama_${r.status}`, detail: t.slice(0, 500) }, { status: 502 });
      }
      const j = await r.json().catch(() => ({}));
      return NextResponse.json({ ok: true, response: j?.response || '' });
    }

    if (op === 'embed') {
      const text: string = body?.text || '';
      const r = await fetch(`${OLLAMA_URL.replace(/\/$/, '')}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text })
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        return NextResponse.json({ ok: false, error: `ollama_${r.status}`, detail: t.slice(0, 500) }, { status: 502 });
      }
      const j = await r.json().catch(() => ({}));
      return NextResponse.json({ ok: true, embedding: j?.embeddings?.[0] || j?.embedding || [] });
    }

    return NextResponse.json({ ok: false, error: 'unsupported_op' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'relay_failed', detail: e?.message }, { status: 500 });
  }
}
