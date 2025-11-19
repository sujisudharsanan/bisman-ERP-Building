import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const orgs = await prisma.organization.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ ok: true, data: orgs });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.slug) return NextResponse.json({ ok: false, error: 'name, slug required' }, { status: 400 });
  const org = await prisma.organization.create({ data: { name: body.name, slug: body.slug, description: body.description || null } });
  return NextResponse.json({ ok: true, data: org }, { status: 201 });
}
