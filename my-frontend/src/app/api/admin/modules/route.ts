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
  const rel = await prisma.orgsEnabled.upsert({
    where: { orgId_moduleId: { orgId: body.orgId, moduleId: mod.id } },
    update: { enabled: body.enabled },
    create: { orgId: body.orgId, moduleId: mod.id, enabled: body.enabled },
  });
  // TODO: append audit log
  return NextResponse.json({ ok: true, data: rel });
}
