import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET() {
  const roles = await prisma.rbac_roles.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ ok: true, data: roles });
}
