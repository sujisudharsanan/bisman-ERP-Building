import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: list subscriptions
export async function GET() {
  const subs = await prisma.subscription.findMany({ include: { organization: true } });
  return NextResponse.json({ ok: true, data: subs });
}

// POST: placeholder webhook handler for billing events
export async function POST(req: Request) {
  // TODO: verify signature (Stripe/other). This is a placeholder only.
  const body = await req.json().catch(() => null);
  // Minimal validation
  if (!body?.type) return NextResponse.json({ ok: false, error: 'event type required' }, { status: 400 });
  // TODO: process event types: subscription.updated, invoice.paid, etc.
  return NextResponse.json({ ok: true });
}
