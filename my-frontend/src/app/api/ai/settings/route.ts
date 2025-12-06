import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'data', 'ai');
const file = path.join(dir, 'settings.json');

async function readSettings() {
  try {
    const buf = await fs.readFile(file, 'utf8');
    return JSON.parse(buf);
  } catch {
    return {
      enabled: true,
      provider: 'api',
      model: process.env.AI_DEFAULT_MODEL || 'llama3:8b',
      temperature: 0.2,
      tools: ['query-data','export-csv','create-task','raise-ticket'],
      domains: { finance: true, hr: true, inventory: true, procurement: true, pump: true, compliance: true },
      rag: { sources: [], topK: 6, reRank: true },
      nlq: { maxWindowDays: 365, readOnly: true },
      forecasting: { horizonDays: 30, seasonality: 'auto' },
      anomalies: { sensitivity: 'medium', channels: ['in-app','email'] },
  security: { rls: true, redactPII: true, promptLogging: 'hashed', retentionDays: 180, modelAllow: ['llama3:8b'] },
  // If undefined or empty, treat as "all modules allowed" on the frontend
  allowedModules: []
    };
  }
}

async function writeSettings(s: any) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(s, null, 2), 'utf8');
}

export async function GET() {
  const s = await readSettings();
  return NextResponse.json({ ok: true, settings: s });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>({}));
  const cur = await readSettings();
  // Normalize allowedModules to string array if present
  let allowedModules = body.allowedModules;
  if (Array.isArray(allowedModules)) {
    allowedModules = allowedModules.map((x:any)=> String(x));
  }
  const next = { ...cur, ...body, ...(allowedModules? { allowedModules } : {}) };
  await writeSettings(next);
  return NextResponse.json({ ok: true, settings: next });
}
