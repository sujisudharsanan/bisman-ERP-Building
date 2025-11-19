import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, createdAt: true } });
  return NextResponse.json({ ok: true, data: users });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email) return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 });
  const user = await prisma.user.create({ data: { email: body.email, name: body.name || null } });
  return NextResponse.json({ ok: true, data: user }, { status: 201 });
}
