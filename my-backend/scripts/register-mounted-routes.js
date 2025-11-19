#!/usr/bin/env node
/**
 * Registers mounted base routes found in app.js into the `routes` table.
 * - Parses app.use('/api/...', ...) lines
 * - Inserts if missing (path+method unique), method default GET
 * - Sets module column when the URL prefix maps clearly
 * - Never deletes; safe to run repeatedly
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function extractMounts(appJs) {
  const regex = /app\.use\(\s*['\"](\/api[^'\"]*)['\"]/g;
  const mounts = new Set();
  let m;
  while ((m = regex.exec(appJs))) {
    mounts.add(m[1].replace(/\/$/, ''));
  }
  return Array.from(mounts);
}

function guessModuleFromPath(p) {
  // e.g., /api/enterprise-admin/users -> enterprise-admin
  const parts = p.split('/').filter(Boolean);
  if (parts[0] !== 'api') return null;
  const first = parts[1] || '';
  if (first === 'enterprise') return 'enterprise-admin';
  if (first === 'enterprise-admin') return 'enterprise-admin';
  if (first === 'v1' && parts[2] === 'super-admin') return 'super-admin';
  if (first === 'auth') return 'auth';
  if (first === 'calendar') return 'calendar';
  if (first === 'tasks') return 'tasks';
  if (first === 'reports') return 'reports';
  if (first === 'privileges') return 'privileges';
  if (first === 'permissions') return 'permissions';
  if (first === 'system') return 'system';
  if (first === 'upload') return 'upload';
  if (first === 'langchain') return 'ai';
  if (first === 'copilate') return 'ai';
  if (first === 'chat') return 'chat';
  if (first === 'common') return 'common';
  return null;
}

async function main() {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
  const mounts = extractMounts(appJs);
  let created = 0, skipped = 0;
  for (const p of mounts) {
    const name = p.replace('/api/', '').replace(/\//g, ' ').trim() || 'api-root';
    const mod = guessModuleFromPath(p);
    try {
      await prisma.routes.create({ data: {
        path: p,
        name: name,
        description: `Auto-registered mounted base path ${p}`,
        method: 'GET',
        module: mod || null,
        is_protected: true,
      }});
      created++;
    } catch (e) {
      if (String(e.message).includes('Unique constraint')) {
        skipped++;
      } else {
        console.warn('Route insert warning:', e.message);
      }
    }
  }
  console.log(`Mounted base routes registered. created=${created}, skipped=${skipped}`);
  const count = await prisma.routes.count();
  console.log(`routes total: ${count}`);
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); prisma.$disconnect().then(()=>process.exit(1));});
