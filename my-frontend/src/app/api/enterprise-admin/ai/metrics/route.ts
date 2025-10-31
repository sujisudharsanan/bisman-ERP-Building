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
  // Derive success as presence of output and not an error flag
  const successCount = usage.filter((u: any) => u && u.output && !u.output.error).length;
  const successRate = totalRequests ? (successCount / totalRequests) * 100 : 0;
  const latencies = usage.map((u: any) => Number(u.latencyMs || u.output?.latencyMs || 0)).filter((n: number) => !isNaN(n) && n > 0);
  const avgResponseTime = latencies.length ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) : 0;
  // Active models approximated from output.model or settings model usage
  const models = new Set<string>();
  for (const u of usage) {
    const m = u.output?.model || u.input?.model;
    if (m) models.add(String(m));
  }
  const activeModels = models.size;
  const costThisMonth = 0; // Local/dev cost not tracked
  return NextResponse.json({ ok: true, metrics: { totalRequests, successRate, avgResponseTime, activeModels, costThisMonth } });
}
