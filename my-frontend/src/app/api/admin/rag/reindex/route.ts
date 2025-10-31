import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { prisma } from '@/lib/prisma';
import { getEmbedding } from '@/lib/ollama';

function chunkText(text: string, size = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const slice = text.slice(i, i + size);
    chunks.push(slice);
    i += size - overlap;
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=>({}));
    const { sourceId } = body || {};
    if (!sourceId) return NextResponse.json({ ok: false, error: 'sourceId_required' }, { status: 400 });
    const src = await (prisma as any).ragSource.findUnique({ where: { id: sourceId } });
    if (!src) return NextResponse.json({ ok: false, error: 'source_not_found' }, { status: 404 });
    const buf = await fs.readFile(src.path);
    const text = buf.toString('utf8');
    const chunks = chunkText(text);
  await (prisma as any).embedding.deleteMany({ where: { sourceId } });
    let idx = 0;
    for (const c of chunks) {
      const vec = await getEmbedding(c);
  await (prisma as any).embedding.create({ data: { sourceId, chunkIndex: idx, vector: vec as any } });
      idx++;
    }
    await (prisma as any).ragSource.update({ where: { id: sourceId }, data: { embeddingStatus: 'indexed' } });
    return NextResponse.json({ ok: true, chunks: idx });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'reindex_error' }, { status: 500 });
  }
}
