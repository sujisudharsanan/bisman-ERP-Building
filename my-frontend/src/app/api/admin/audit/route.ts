import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: query audit logs (basic pagination)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get('take') || 20), 100);
  const skip = Number(searchParams.get('skip') || 0);
  const orgId = searchParams.get('orgId') || undefined;
  const logs = await prisma.auditLog.findMany({
    where: { orgId: orgId || undefined },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });
  return NextResponse.json({ ok: true, data: logs, next: skip + logs.length });
}

// POST: append audit log
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ ok: false, error: 'action required' }, { status: 400 });
  const log = await prisma.auditLog.create({
    data: {
      action: body.action,
      actorId: body.actorId || null,
      orgId: body.orgId || null,
      meta: body.meta || null,
    },
  });
  return NextResponse.json({ ok: true, data: log }, { status: 201 });
}
