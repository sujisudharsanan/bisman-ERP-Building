import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const users = await prisma.users_enhanced.findMany({ select: { id: true, email: true, username: true, created_at: true } });
  return NextResponse.json({ ok: true, data: users });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email) return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 });
  // Note: User creation should go through UserService on backend, this is just for compatibility
  const user = await prisma.users_enhanced.create({ data: { email: body.email, username: body.name || body.email.split('@')[0] } });
  return NextResponse.json({ ok: true, data: user }, { status: 201 });
}
