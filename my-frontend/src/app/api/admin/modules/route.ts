import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: list modules with org enablement counts (basic)
export async function GET() {
  const modules = await prisma.module.findMany({
    include: { enabled: true },
    orderBy: { key: 'asc' },
  });
  return NextResponse.json({ ok: true, data: modules });
}

// POST: toggle enablement for an org
// body: { orgId: string; moduleKey: string; enabled: boolean }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.orgId || !body?.moduleKey || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'orgId, moduleKey, enabled required' }, { status: 400 });
  }
  const mod = await prisma.module.findUnique({ where: { key: body.moduleKey } });
  if (!mod) return NextResponse.json({ ok: false, error: 'module not found' }, { status: 404 });
  // No composite unique in schema; do a findFirst then update or create
  const existing = await prisma.orgsEnabled.findFirst({
    where: { orgId: body.orgId, moduleId: mod.id },
  });
  const rel = existing
    ? await prisma.orgsEnabled.update({
        where: { id: existing.id },
        data: { enabled: body.enabled },
      })
    : await prisma.orgsEnabled.create({
        data: { orgId: body.orgId, moduleId: mod.id, enabled: body.enabled },
      });
  // TODO: append audit log
  return NextResponse.json({ ok: true, data: rel });
}
