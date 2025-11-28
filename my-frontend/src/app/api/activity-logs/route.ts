import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function parseDate(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const actorId = searchParams.get('actorId')?.trim() || undefined;
  const severity = searchParams.get('severity')?.trim() || undefined; // info|warn|error|success
    const from = parseDate(searchParams.get('from') || undefined);
    const to = parseDate(searchParams.get('to') || undefined);
    const take = Math.min(parseInt(searchParams.get('take') || '20', 10) || 20, 100);
    const cursor = searchParams.get('cursor') || undefined;

    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (severity) where.severity = severity;
    if (from || to) where.createdAt = { gte: from, lte: to };
    if (q) where.OR = [
      { action: { contains: q, mode: 'insensitive' } },
      // target/details are inside meta JSON; skip JSON search for portability
    ];

    const logs = await (prisma as any).auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        createdAt: true,
        action: true,
        actorId: true,
        meta: true,
      },
    });

    // Enrich with actor names if available
  const actorIds = Array.from(new Set(logs.map((l: any) => l.actorId).filter(Boolean))) as string[];
  const users = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds as string[] } }, select: { id: true, name: true, email: true } }) : [];
    // Avoid implicit any: provide minimal typing for Prisma-selected fields
    const userMap = new Map(
      users.map((u: { id: string; name?: string | null; email?: string | null }) => [u.id, u])
    );

    const data = logs.map((l: any) => {
      const sev = l?.meta?.severity || l?.meta?.level || undefined;
      const target = l?.meta?.target || l?.meta?.resource || undefined;
      return {
        id: l.id,
        timestamp: l.createdAt,
        action: l.action,
        target,
        actorId: l.actorId,
        severity: sev,
        meta: l.meta,
        actor: l.actorId ? (userMap.get(l.actorId) || { id: l.actorId, name: 'Unknown' }) : { id: 'system', name: 'System' },
      };
    });

    const nextCursor = logs.length === take ? logs[logs.length - 1].id : null;
    return NextResponse.json({ ok: true, data, nextCursor });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'activity_logs_error' }, { status: 500 });
  }
}
