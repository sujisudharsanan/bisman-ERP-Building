#!/usr/bin/env ts-node
// @ts-nocheck
/**
 * RAG ingestion script
 * Usage: ts-node scripts/rag-ingest.ts --file ./uploads/doc.txt --modules BILLING,REPORTS --user dev-user-1
 */
import fs from 'fs';
import path from 'path';
// Lazy import prisma to avoid TS evaluating client types in CI
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require('../src/lib/prisma');
import { getEmbedding } from '@/lib/aiClient';

type Args = { file: string; modules: string[]; user: string };

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const args: any = {};
  for (let i = 0; i < a.length; i += 2) {
    const k = a[i]; const v = a[i+1];
    if (!k || !v) break;
    if (k === '--file') args.file = v;
    if (k === '--modules') args.modules = v.split(',').map((x)=>x.trim());
    if (k === '--user') args.user = v;
  }
  if (!args.file) throw new Error('Missing --file');
  args.modules = Array.isArray(args.modules)? args.modules: [];
  args.user = args.user || 'dev-user-1';
  return args as Args;
}

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

async function main() {
  const { file, modules, user } = parseArgs();
  const abs = path.resolve(file);
  const buf = fs.readFileSync(abs);
  let text = buf.toString('utf8');
  // Minimal PDF detection fallback; real impl would use pdf-parse
  if (abs.toLowerCase().endsWith('.pdf')) {
    text = text || '[pdf-content-not-parseable-in-this-scaffold]';
  }

  // Create or find source
  const base = path.basename(abs);
  const source = await (prisma as any).ragSource.create({ data: {
    fileName: base,
    path: abs,
    tags: modules,
    uploadedBy: user,
    embeddingStatus: 'pending'
  }});

  try {
    // Remove prior embeddings if re-ingesting
  await (prisma as any).embedding.deleteMany({ where: { sourceId: source.id } });
    const chunks = chunkText(text);
    let idx = 0;
    for (const c of chunks) {
      const vec = await getEmbedding(c);
  await (prisma as any).embedding.create({ data: { sourceId: source.id, chunkIndex: idx, vector: vec as any } });
      idx++;
    }
    await (prisma as any).ragSource.update({ where: { id: source.id }, data: { embeddingStatus: 'indexed' } });
    console.log(`Indexed ${idx} chunks for ${base}`);
  } catch (e: any) {
    await (prisma as any).ragSource.update({ where: { id: source.id }, data: { embeddingStatus: 'error' } });
    console.error('Ingestion error:', e?.message || e);
    process.exit(1);
  }
}

main().then(()=>process.exit(0));
