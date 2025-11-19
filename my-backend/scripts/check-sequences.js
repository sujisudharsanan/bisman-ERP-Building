#!/usr/bin/env node
/**
 * Verifies that autoincrement id columns have proper DEFAULT nextval sequence.
 * Reports any missing defaults for listed tables.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TABLES = ['routes','rbac_routes','modules','permissions','module_assignments'];

async function main() {
  const results = [];
  for (const t of TABLES) {
    const row = await prisma.$queryRawUnsafe(`SELECT column_default FROM information_schema.columns WHERE table_name='${t}' AND column_name='id' LIMIT 1`);
    const defaultVal = row[0]?.column_default || null;
    results.push({ table: t, default: defaultVal });
  }
  console.log('Sequence default check:');
  for (const r of results) {
    if (!r.default || !/nextval\(/i.test(r.default)) {
      console.log(` - ${r.table}: MISSING nextval default`);
    } else {
      console.log(` - ${r.table}: OK (${r.default})`);
    }
  }
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); prisma.$disconnect(); process.exit(1);});
