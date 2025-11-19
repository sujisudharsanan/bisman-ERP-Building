import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const settingsPath = path.join(process.cwd(), 'data', 'ai', 'settings.json');

export async function GET() {
  let allowedModules: string[] = [];
  try {
    const buf = await fs.readFile(settingsPath, 'utf8');
    const s = JSON.parse(buf);
    if (Array.isArray(s?.allowedModules)) allowedModules = s.allowedModules.map((x: any) => String(x));
  } catch {}

  // Dev-friendly mock session
  const user = {
    id: 'dev-user-1',
    name: 'Dev User',
    email: 'dev@local',
    role: 'ENTERPRISE_ADMIN',
    allowedModules,
  };

  return NextResponse.json({ ok: true, user });
}
