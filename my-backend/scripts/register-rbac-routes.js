#!/usr/bin/env node
/**
 * Register RBAC routes by scanning routes-manifest and app.js mounts.
 * - Non-destructive upsert into rbac_routes (if table exists) else no-op.
 * - Links module slug when guessable.
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function guessModuleFromPath(p) {
  const parts = p.split('/').filter(Boolean);
  if (parts[0] !== 'api') return null;
  const first = parts[1] || '';
  if (first === 'enterprise' || first === 'enterprise-admin') return 'enterprise-admin';
  if (first === 'v1' && parts[2] === 'super-admin') return 'super-admin';
  if (['auth','calendar','tasks','reports','privileges','permissions','system','upload','langchain','chat','common'].includes(first)) return first === 'langchain' ? 'ai' : first;
  return null;
}

async function ensureTable() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM rbac_routes LIMIT 1`;
    return true;
  } catch (e) {
    console.log('rbac_routes not present; skipping RBAC registration.');
    return false;
  }
}

async function main() {
  const exists = await ensureTable();
  if (!exists) { await prisma.$disconnect(); return; }

  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
  const mountRegex = /app\.use\(\s*['\"](\/api[^'\"]*)['\"]/g;
  const mounts = new Set();
  let m;
  while ((m = mountRegex.exec(appJs))) mounts.add(m[1].replace(/\/$/, ''));

  // Create coarse RBAC routes per mount path
  let created = 0, skipped = 0;
  for (const p of mounts) {
    const modSlug = guessModuleFromPath(p);
    try {
      await prisma.rbac_routes.create({ data: {
        path: p,
        name: p.replace('/api/','').replace(/\//g,' '),
        description: `Auto-registered RBAC base path ${p}`,
        method: 'ANY',
        module: modSlug || null,
        is_protected: true,
        display_name: modSlug ? `${modSlug} base` : 'api base',
        is_active: true,
        is_menu_item: false,
        icon: null,
        sort_order: 0,
      }});
      created++;
    } catch (e) {
      if (String(e.message).toLowerCase().includes('unique')) skipped++; else console.warn('rbac insert warn:', e.message);
    }
  }
  console.log(`RBAC routes registered. created=${created}, skipped=${skipped}`);
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); prisma.$disconnect().then(()=>process.exit(1));});
