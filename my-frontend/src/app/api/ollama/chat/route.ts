import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type OllamaMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const aiDir = path.join(process.cwd(), 'data', 'ai');
const settingsFile = path.join(aiDir, 'settings.json');

async function readSettings() {
  try {
    const buf = await fs.readFile(settingsFile, 'utf8');
    return JSON.parse(buf);
  } catch {
    return {
      provider: 'local',
      model: process.env.OLLAMA_MODEL || 'llama3:8b',
      temperature: 0.2,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { messages = [], stream = false } = body || {} as { messages?: OllamaMessage[]; stream?: boolean };

    const settings = await readSettings();
    const model = settings?.model || process.env.OLLAMA_MODEL || 'llama3:8b';
    const temperature = typeof settings?.temperature === 'number' ? settings.temperature : 0.2;

  const host = process.env.OLLAMA_HOST || process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
  const addNgrok = /ngrok(-free)?\.(dev|io)/i.test(host) || String(process.env.NGROK_BYPASS || '').toLowerCase() === 'true';
    const res = await fetch(`${host.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(addNgrok ? { 'ngrok-skip-browser-warning': 'true', 'Accept': 'application/json' } : { 'Accept': 'application/json' })
      },
      body: JSON.stringify({ model, messages, stream, options: { temperature } }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ ok: false, error: `ollama_${res.status}`, detail: text }, { status: 502 });
    }

    // Non-streaming path: aggregate and return message content
    if (!stream) {
      const data = await res.json().catch(() => ({} as any));
      // Some ollama builds return { message: { role, content }, done: true }
      const content = data?.message?.content || data?.content || '';
      return NextResponse.json({ ok: true, model, message: { role: 'assistant', content } });
    }

    // Fallback: If streaming requested in future, just proxy bytes
    const streamResp = new Response(res.body as any, {
      headers: { 'Content-Type': 'application/x-ndjson' },
      status: 200,
    });
    // @ts-ignore - NextResponse.from is not typed but available
    return NextResponse.from(streamResp);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'ollama_unreachable', detail: e?.message }, { status: 500 });
  }
}
