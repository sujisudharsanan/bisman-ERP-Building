import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET() {
  const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ ok: true, data: roles });
}
