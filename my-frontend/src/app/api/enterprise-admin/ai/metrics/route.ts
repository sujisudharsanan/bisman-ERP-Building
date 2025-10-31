import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'data', 'ai');
const usageFile = path.join(dir, 'usage.json');

export async function GET() {
  let usage: any[] = [];
  try {
    usage = JSON.parse(await fs.readFile(usageFile, 'utf8'));
  } catch {}
  const totalRequests = usage.length;
  const successRate = 100; // placeholder: no error tracking yet
  const avgResponseTime = 1200; // placeholder
  const activeModels = 1;
  const costThisMonth = 0; // local model is free
  return NextResponse.json({ ok: true, metrics: { totalRequests, successRate, avgResponseTime, activeModels, costThisMonth } });
}
