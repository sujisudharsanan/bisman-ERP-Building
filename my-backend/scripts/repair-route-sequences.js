#!/usr/bin/env node
/**
 * Repairs missing sequence defaults for routes.id and rbac_routes.id.
 * - Creates sequence if absent
 * - Sets DEFAULT nextval
 * - Verifies post-fix
 * Safe & idempotent.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ensureSequence(table) {
  const seqName = `${table}_id_seq`; // conventional name
  // Check if sequence exists
  const exists = await prisma.$queryRawUnsafe(`SELECT 1 FROM pg_class WHERE relname='${seqName}' LIMIT 1`);
  if (exists.length === 0) {
    await prisma.$executeRawUnsafe(`CREATE SEQUENCE ${seqName} START 1 OWNED BY ${table}.id`);
    console.log(`Created sequence ${seqName}`);
  }
  // Set default if missing
  const col = await prisma.$queryRawUnsafe(`SELECT column_default FROM information_schema.columns WHERE table_name='${table}' AND column_name='id' LIMIT 1`);
  const def = col[0]?.column_default || '';
  if (!/nextval\(/i.test(def)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT nextval('${seqName}')`);
    console.log(`Set DEFAULT nextval for ${table}.id`);
  }
  // Align sequence to max(id)
  const maxRows = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX(id),0) AS max_id FROM ${table}`);
  const maxId = maxRows[0].max_id;
  await prisma.$executeRawUnsafe(`SELECT setval('${seqName}', ${maxId}+1, false)`);
  console.log(`Sequence ${seqName} aligned to ${maxId}+1`);
}

async function main() {
  for (const t of ['routes','rbac_routes']) {
    await ensureSequence(t);
  }
  // Post verification
  const verify = await prisma.$queryRawUnsafe(`SELECT table_name, column_default FROM information_schema.columns WHERE table_name IN ('routes','rbac_routes') AND column_name='id'`);
  console.log('Post-fix defaults:');
  for (const r of verify) console.log(` - ${r.table_name}: ${r.column_default}`);
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error('Repair failed:', e); prisma.$disconnect().then(()=>process.exit(1));});
