import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/services/ai/railwayClient';

type Payload = { prompt?: string; model?: string };

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Payload;
    const prompt = String(body?.prompt || '').trim();
    const model = String(body?.model || process.env.AI_DEFAULT_MODEL || 'llama3');
    if (!prompt) return NextResponse.json({ error: 'missing_prompt' }, { status: 400 });

    const { answer } = await generateCompletion({ prompt, model, timeoutMs: 30_000 });
    return NextResponse.json({ answer });
  } catch (e: any) {
    const msg = e?.message || 'ai_error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, health: 'ai-relay-online' });
}
