import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'data', 'ai');
const settingsFile = path.join(dir, 'settings.json');

export async function GET() {
  let settings: any = {};
  try {
    settings = JSON.parse(await fs.readFile(settingsFile, 'utf8'));
  } catch {
    settings = { provider: 'api', model: process.env.AI_DEFAULT_MODEL || 'llama3:8b' };
  }
  const models = [
    { id: 'default', name: settings.model || 'llama3:8b', provider: settings.provider || 'local', status: 'active', usage: 0, avgResponseTime: 1200, lastUsed: new Date().toISOString() }
  ];
  return NextResponse.json({ ok: true, models });
}
