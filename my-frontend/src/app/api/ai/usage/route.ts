import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'data', 'ai');
const file = path.join(dir, 'usage.json');

async function readAll() {
  try {
    const buf = await fs.readFile(file, 'utf8');
    return JSON.parse(buf);
  } catch {
    return [] as any[];
  }
}

async function writeAll(arr: any[]) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(arr, null, 2), 'utf8');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const entry = {
    ...body,
    timestamp: new Date().toISOString(),
  };
  const all = await readAll();
  all.push(entry);
  // keep last 10k
  const trimmed = all.slice(-10000);
  await writeAll(trimmed);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const limit = Number(searchParams.get('limit') || '50');
  const action = searchParams.get('action');
  const all = await readAll();
  let list = all;
  if (userId) list = list.filter((x: any) => String(x.userId) === String(userId));
  if (action) list = list.filter((x: any) => String(x.action) === String(action));
  list = list.slice(-limit).reverse();
  return NextResponse.json({ ok: true, data: list });
}
