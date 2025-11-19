#!/usr/bin/env node
/**
 * Applies FK migration for routes.module_id & rbac_routes.module_id referencing modules(id).
 * Safe re-run: uses DO blocks with duplicate_object handling.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const statements = [
    "ALTER TABLE routes ADD COLUMN IF NOT EXISTS module_id INT",
    "UPDATE routes SET module_id = m.id FROM modules m WHERE routes.module = m.module_name AND routes.module IS NOT NULL AND routes.module_id IS NULL",
    "ALTER TABLE rbac_routes ADD COLUMN IF NOT EXISTS module_id INT",
    "UPDATE rbac_routes SET module_id = m.id FROM modules m WHERE rbac_routes.module = m.module_name AND rbac_routes.module IS NOT NULL AND rbac_routes.module_id IS NULL",
    "DO $$ BEGIN ALTER TABLE routes ADD CONSTRAINT routes_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN ALTER TABLE rbac_routes ADD CONSTRAINT rbac_routes_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "CREATE INDEX IF NOT EXISTS idx_routes_module_id ON routes(module_id)",
    "CREATE INDEX IF NOT EXISTS idx_rbac_routes_module_id ON rbac_routes(module_id)"
  ];
  for (const s of statements) {
    await prisma.$executeRawUnsafe(s);
  }
  const counts = await prisma.$queryRawUnsafe(`SELECT 'routes' AS table, COUNT(*) filter (WHERE module_id IS NOT NULL) AS linked FROM routes UNION ALL SELECT 'rbac_routes', COUNT(*) filter (WHERE module_id IS NOT NULL) FROM rbac_routes;`);
  console.log('FK migration applied. Link summary:');
  console.table(counts);
}

run().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); prisma.$disconnect().then(()=>process.exit(1));});
