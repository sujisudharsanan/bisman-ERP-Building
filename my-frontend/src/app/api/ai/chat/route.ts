import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

type Mode = 'erp' | 'casual' | 'business' | 'calm' | 'playful';

function systemPrompt(mode: Mode, allowed: string[]) {
  const persona = {
    erp: 'You are Spark, an ERP expert. Be concise, practical, use Markdown, and end with a proactive follow-up.',
    casual: 'You are Spark. Friendly and brief. Use Markdown, end with a follow-up.',
    business: 'You are Spark, a business analyst. Structured and direct. Use lists/tables when helpful. End with a follow-up.',
    calm: 'You are Spark. Calm and reassuring. Short answers, then a gentle follow-up.',
    playful: 'You are Spark. Light and playful, but still helpful. Use Markdown and end with a follow-up.',
  }[mode] || 'You are Spark.';

  const guard = `Guardrail: Only discuss modules within: ${allowed.join(', ') || 'ALL'}. If a user asks about a module outside allowedModules, respond exactly: "Sorry, that module is not available for your role."`;
  return `${persona}\n\n${guard}`;
}

async function getSessionUser() {
  // Dev session: pull from /data/ai/settings.json allowedModules and return a mock user
  const settingsPath = path.join(process.cwd(), 'data', 'ai', 'settings.json');
  let allowedModules: string[] = [];
  try {
    const buf = await fs.readFile(settingsPath, 'utf8');
    const s = JSON.parse(buf);
    if (Array.isArray(s?.allowedModules)) allowedModules = s.allowedModules.map((x: any) => String(x));
  } catch {}
  return { id: 'dev-user-1', role: 'ENTERPRISE_ADMIN', allowedModules };
}

async function filterRagByAllowed(tags: string[], allowed: string[]) {
  if (!allowed?.length) return tags; // allow all if no explicit allowlist
  return tags.filter((t) => allowed.includes(t));
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt = '', mode = 'erp' as Mode } = body || {};
    const user = await getSessionUser();

    // Simple module detection from prompt (by tag key)
    const mentionedModule = (user.allowedModules || []).find((m) => prompt.toLowerCase().includes(m.toLowerCase())) || null;
    const authorized = !mentionedModule || (user.allowedModules?.includes(mentionedModule));

    // Compose system prompt with guardrail
    const sys = systemPrompt(mode, user.allowedModules || []);

    // Retrieve any tagged RAG hints (placeholder)
    const ragTags = await filterRagByAllowed([], user.allowedModules || []);

    // Call local Ollama via internal proxy
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/ollama/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: sys },
          // Optionally include RAG context as a system/narrative message
          ...(ragTags.length ? [{ role: 'system', content: `Relevant tags: ${ragTags.join(', ')}` }] : []),
          { role: 'user', content: prompt },
        ],
        stream: false,
      }),
    });
    const j = await res.json().catch(() => ({}));
    const content = j?.message?.content || 'AI is offline. Ensure Ollama is running.';

    const latency = Date.now() - start;
    // Log usage
  await (prisma as any).aiUsageLog.create({ data: {
      userId: user.id,
      role: user.role,
      moduleRequested: mentionedModule,
      prompt,
      responseLen: content.length,
      mode,
      latencyMs: latency,
      authorized: !!authorized,
    }});

    // If unauthorized by guardrail, return the exact refusal
    if (!authorized) {
      return NextResponse.json({ ok: true, message: { role: 'assistant', content: 'Sorry, that module is not available for your role.' } });
    }

    return NextResponse.json({ ok: true, message: { role: 'assistant', content } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'chat_error' }, { status: 500 });
  }
}
