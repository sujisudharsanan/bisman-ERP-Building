#!/usr/bin/env node
/**
 * Drift check: compares DB modules to registry/modules.json
 * - Warns on differences but doesn't fail for extra modules in DB
 * - Only fails if modules in registry are missing from DB
 * - Never writes to DB
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const reg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'registry', 'modules.json'), 'utf-8'));
  const regMap = new Map(reg.map(m => [m.module_name, m]));
  const db = await prisma.module.findMany({ orderBy: { module_name: 'asc' } });

  const missingInDb = [];
  for (const m of reg) {
    if (!db.find(x => x.module_name === m.module_name)) missingInDb.push(m.module_name);
  }
  const extraInDb = [];
  for (const d of db) {
    if (!regMap.has(d.module_name)) extraInDb.push(d.module_name);
  }

  let ok = true;
  if (missingInDb.length) { ok = false; console.error('Missing in DB:', missingInDb.join(', ')); }
  if (extraInDb.length) { console.warn('Extra in DB (not in registry - OK):', extraInDb.join(', ')); }

  // Field mismatches for those present in both - warn only, don't fail
  const mismatches = [];
  for (const d of db) {
    const r = regMap.get(d.module_name);
    if (!r) continue;
    const fields = ['display_name','route','icon','productType','is_active'];
    for (const f of fields) {
      if (typeof r[f] !== 'undefined' && String(d[f]) !== String(r[f])) {
        mismatches.push({ module: d.module_name, field: f, db: d[f], reg: r[f] });
      }
    }
  }
  if (mismatches.length) { 
    console.warn('Field mismatches (warning only):', JSON.stringify(mismatches, null, 2)); 
  }

  await prisma.$disconnect();
  if (!ok) process.exit(1);
  console.log('Drift check passed.');
}

main().catch(e => { console.error(e); prisma.$disconnect().then(()=>process.exit(1)); });
