import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.AI_API_BASE_URL || 'https://api.openai.com/v1';
const KEY = process.env.AI_API_KEY;
const CHAT_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const EMBED_MODEL = process.env.AI_EMBED_MODEL || 'text-embedding-3-small';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const op = body?.op as 'chat' | 'embed';

    if (!KEY) return NextResponse.json({ error: 'missing_api_key' }, { status: 400 });

    if (op === 'chat') {
      const prompt = body?.prompt || '';
      const res = await fetch(`${BASE.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${KEY}`
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful ERP assistant. Be concise and accurate.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        })
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        return NextResponse.json({ error: `api_${res.status}`, detail: t.slice(0, 500) }, { status: 502 });
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';
      return NextResponse.json({ ok: true, content });
    }

    if (op === 'embed') {
      const text = body?.text || '';
      const res = await fetch(`${BASE.replace(/\/$/, '')}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${KEY}`
        },
        body: JSON.stringify({ model: EMBED_MODEL, input: text })
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        return NextResponse.json({ error: `api_${res.status}`, detail: t.slice(0, 500) }, { status: 502 });
      }
      const data = await res.json();
      const embedding = data?.data?.[0]?.embedding || [];
      return NextResponse.json({ ok: true, embedding });
    }

    return NextResponse.json({ error: 'unsupported_op' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: 'relay_failed', detail: e?.message }, { status: 500 });
  }
}
