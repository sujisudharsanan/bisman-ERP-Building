import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/services/ai/railwayClient';

export async function POST(req: NextRequest) {
  try {
  const body = await req.json().catch(() => ({}));
  const { prompt = '', model } = body || {};
  const chosenModel = String(model || process.env.AI_DEFAULT_MODEL || 'llama3');
  if (!prompt) return NextResponse.json({ error: 'missing_prompt' }, { status: 400 });

  const { answer } = await generateCompletion({ prompt: String(prompt), model: chosenModel, timeoutMs: 30_000 });
  return NextResponse.json({ answer });
  } catch (e: any) {
  return NextResponse.json({ error: "AI is sleeping 😴… trying again!" }, { status: 500 });
  }
}
