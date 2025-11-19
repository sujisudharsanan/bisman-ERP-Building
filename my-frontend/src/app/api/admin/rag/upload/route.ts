import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const modules = String(formData.get('modules') || '').split(',').map((x)=>x.trim()).filter(Boolean);
    const userId = String(formData.get('userId') || 'dev-user-1');
    if (!file) return NextResponse.json({ ok: false, error: 'file_required' }, { status: 400 });

    // Save to uploads/
    const uploads = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploads, { recursive: true });
    const arrayBuf = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const dest = path.join(uploads, file.name);
    await fs.writeFile(dest, buf);

    const row = await (prisma as any).ragSource.create({ data: {
      fileName: file.name,
      path: dest,
      tags: modules,
      uploadedBy: userId,
      embeddingStatus: 'pending',
    }});
    return NextResponse.json({ ok: true, source: row });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'upload_error' }, { status: 500 });
  }
}
