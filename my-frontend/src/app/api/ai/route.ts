import { NextRequest, NextResponse } from 'next/server';
import { engine } from '@/ai/aiEngine';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action, userId, query, page, formJson, text, keywords } = body || {};
  try {
    switch (action) {
      case 'askAI':
        return NextResponse.json({ ok: true, data: await engine.askAI({ userId, query }) });
      case 'explainPage':
        return NextResponse.json({ ok: true, data: await engine.explainPage({ userId, page }) });
      case 'suggestFormValues':
        return NextResponse.json({ ok: true, data: await engine.suggestFormValues({ userId, formJson }) });
      case 'generateTaskFromText':
        return NextResponse.json({ ok: true, data: await engine.generateTaskFromText({ userId, text }) });
      case 'runSmartSearch':
        return NextResponse.json({ ok: true, data: await engine.runSmartSearch({ userId, keywords }) });
      default:
        return NextResponse.json({ ok: false, error: 'unknown_action' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'ai_error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, health: 'ai-api-online' });
}
