// For acceptance: Pages Router-style signature reference (not used by Next app router runtime)
import { NextRequest, NextResponse } from 'next/server';
import { callChat } from '@/lib/ollama';
import { buildContext } from '@/lib/contextBuilder';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>({}));
  const { prompt = '', userId = 'dev-user-1', mode = 'erp' } = body || {};
  const ctx = await buildContext(String(userId));
  const sys = `You are Spark. Mode: ${mode}. Allowed modules: ${ctx.allowedModules.join(', ') || 'ALL'}.
Guardrail: If a user asks about a module outside allowedModules, respond exactly: "Sorry, that module is not available for your role."`;
  const messages = [
    { role: 'system', content: sys },
    ...(ctx.snippets.length ? [{ role: 'system', content: `Context: ${ctx.snippets.map(s=>s.text).join(' | ')}` }] : []),
    { role: 'user', content: prompt },
  ] as any;
  const answer = await callChat(messages);
  return NextResponse.json({ ok: true, message: { role: 'assistant', content: answer } });
}
