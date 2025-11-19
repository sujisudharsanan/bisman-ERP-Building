import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const roleId = params.id;
  const list = await (prisma as any).allowedModule.findMany({ where: { roleId } });
  return NextResponse.json({ ok: true, data: list });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const roleId = params.id;
  const body = await req.json().catch(()=>({}));
  const { moduleKey } = body || {};
  if (!moduleKey) return NextResponse.json({ ok: false, error: 'moduleKey_required' }, { status: 400 });
  await (prisma as any).allowedModule.upsert({
    where: { roleId_moduleKey: { roleId, moduleKey } },
    update: {},
    create: { roleId, moduleKey },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const roleId = params.id;
  const { searchParams } = new URL(req.url);
  const moduleKey = searchParams.get('moduleKey');
  if (!moduleKey) return NextResponse.json({ ok: false, error: 'moduleKey_required' }, { status: 400 });
  await (prisma as any).allowedModule.deleteMany({ where: { roleId, moduleKey } });
  return NextResponse.json({ ok: true });
}
