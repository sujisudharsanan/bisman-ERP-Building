#!/usr/bin/env node
/**
 * Loads registry/endpoints-detailed.json and updates routes + rbac_routes with canonical_path & param_names.
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function hasRbac() {
  try { await prisma.$queryRaw`SELECT 1 FROM rbac_routes LIMIT 1`; return true; } catch { return false; }
}

function guessModule(p) {
  const parts = p.split('/').filter(Boolean);
  if (parts[0] === 'api') {
    const first = parts[1];
    if (first === 'enterprise' || first === 'enterprise-admin') return 'enterprise-admin';
    if (first === 'v1' && parts[2] === 'super-admin') return 'super-admin';
    if (['auth','calendar','tasks','reports','privileges','permissions','system','upload','chat','common','ai'].includes(first)) return first;
  }
  return null;
}

async function main() {
  const file = path.join(__dirname, '..', 'registry', 'endpoints-detailed.json');
  if (!fs.existsSync(file)) throw new Error('Run parse-endpoints-ast.js first');
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const rbacExists = await hasRbac();
  let updatedRoutes = 0, updatedRbac = 0;
  for (const ep of data.endpoints) {
    const mod = guessModule(ep.path);
    const res = await prisma.routes.updateMany({
      where: { path: ep.path, method: ep.method },
      data: { module: mod, description: `Auto endpoint ${ep.method} ${ep.path}` }
    });
    updatedRoutes += res.count;
    if (rbacExists) {
      try {
        const r = await prisma.rbac_routes.updateMany({
          where: { path: ep.path, method: ep.method },
          data: { module: mod, description: `Auto RBAC endpoint ${ep.method} ${ep.path}` }
        });
        updatedRbac += r.count;
      } catch (_) {
        // rbac_routes may not exist or differ; skip silently
      }
    }
  }
  console.log(`AST DB sync complete. routes updated=${updatedRoutes} rbac_routes updated=${updatedRbac}`);
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); prisma.$disconnect().then(()=>process.exit(1));});
