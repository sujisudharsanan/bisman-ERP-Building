#!/usr/bin/env node
/**
 * Scans route files in routes/ directory to register individual endpoints.
 * - Parses app.use('/api/...') mounts already handled; here we inspect router definitions.
 * - Supports express Router() patterns: router.get('/path', ...), router.post(...), etc.
 * - Inserts into routes & rbac_routes if not present (path+method uniqueness).
 * - Associates module via prefix guess.
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ROUTE_DIR = path.join(__dirname, '..', 'routes');
const METHODS = ['get','post','put','delete','patch'];
const nowIso = () => new Date().toISOString();

function guessModule(fullPath) {
  const parts = fullPath.split('/').filter(Boolean);
  if (parts[0] === 'api') {
    const first = parts[1];
    if (first === 'enterprise' || first === 'enterprise-admin') return 'enterprise-admin';
    if (first === 'v1' && parts[2] === 'super-admin') return 'super-admin';
    if (['auth','calendar','tasks','reports','privileges','permissions','system','upload','chat','common','ai'].includes(first)) return first === 'ai' ? 'ai' : first;
  }
  return null;
}

function extractEndpoints(fileContent, mountBase) {
  const endpoints = [];
  const routerMethodRegex = new RegExp(`router\\.(?:${METHODS.join('|')})\\(\\s*(['\"])(.*?)\\1`, 'g');
  let m;
  while ((m = routerMethodRegex.exec(fileContent))) {
    const methodMatch = /router\.(get|post|put|delete|patch)\(/.exec(m[0]);
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
    const subPath = m[2].replace(/\/$/, '');
    const hasParams = /:[A-Za-z0-9_]+/.test(subPath);
    const fullPath = path.posix.join(mountBase, subPath).replace(/\\+/g,'/');
    // Count handlers (number of commas until closing ) naive approach
    const sliceEnd = fileContent.indexOf(')', routerMethodRegex.lastIndex - 1);
    const snippet = fileContent.substring(routerMethodRegex.lastIndex, sliceEnd);
    const handlerCount = (snippet.match(/=>|function\s*\(/g) || []).length + 1; // plus main handler
    const middlewareCount = handlerCount - 1;
    endpoints.push({ method, path: fullPath, hasParams, handlerCount, middlewareCount });
  }
  return endpoints;
}

function loadMounts(appJs) {
  const directRegex = /app\.use\(\s*['\"](\/api[^'\"]*)['\"][^)]*require\(['\"]\.\/routes\/([^'\"]+)['\"]\)/g;
  const mounts = [];
  let m;
  while ((m = directRegex.exec(appJs))) {
    mounts.push({ base: m[1].replace(/\/$/, ''), file: m[2] });
  }
  // Variable-based mounts: const x = require('./routes/file'); app.use('/api/path', x)
  const varPattern = /const\s+(\w+)\s*=\s*require\(['\"]\.\/routes\/([^'\"]+)['\"]\);?/g;
  const varMap = {};
  while ((m = varPattern.exec(appJs))) { varMap[m[1]] = m[2]; }
  const useVarPattern = /app\.use\(\s*['\"](\/api[^'\"]*)['\"]\s*,\s*(\w+)\s*\)/g;
  while ((m = useVarPattern.exec(appJs))) {
    const file = varMap[m[2]];
    if (file) mounts.push({ base: m[1].replace(/\/$/, ''), file });
  }
  return mounts;
}

async function ensureRbacTable() {
  try { await prisma.$queryRaw`SELECT 1 FROM rbac_routes LIMIT 1`; return true; } catch { return false; }
}

async function main() {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
  const mounts = loadMounts(appJs);
  const filesOnDisk = new Set(fs.readdirSync(ROUTE_DIR));
  const rbacExists = await ensureRbacTable();
  let createdRoutes = 0, skippedRoutes = 0, createdRbac = 0, skippedRbac = 0;

  for (const mount of mounts) {
    if (!filesOnDisk.has(mount.file)) continue;
    const content = fs.readFileSync(path.join(ROUTE_DIR, mount.file), 'utf-8');
    const endpoints = extractEndpoints(content, mount.base);
    for (const ep of endpoints) {
      const mod = guessModule(ep.path);
      const dataCommon = {
        source_file: mount.file,
        handler_count: ep.handlerCount,
        middleware_count: ep.middlewareCount,
        has_params: ep.hasParams,
        last_scanned_at: new Date(),
      };
      try {
        await prisma.routes.create({ data: {
          path: ep.path,
          method: ep.method,
          name: ep.path.replace('/api/','').replace(/\//g,' '),
          description: `Auto endpoint ${ep.method} ${ep.path}`,
          module: mod,
          is_protected: true,
          ...dataCommon,
        }});
        createdRoutes++;
      } catch (e) {
        if (/unique/i.test(e.message)) {
          skippedRoutes++;
          // Update metadata if exists
          await prisma.routes.updateMany({ where: { path: ep.path, method: ep.method }, data: dataCommon });
        } else console.warn('routes warn:', e.message);
      }
      if (rbacExists) {
        try {
          await prisma.rbac_routes.create({ data: {
            path: ep.path,
            method: ep.method,
            name: ep.path.replace('/api/','').replace(/\//g,' '),
            description: `Auto RBAC endpoint ${ep.method} ${ep.path}`,
            module: mod,
            is_protected: true,
            display_name: `${ep.method} ${ep.path}`,
            is_menu_item: false,
            is_active: true,
            sort_order: 0,
            ...dataCommon,
          }});
          createdRbac++;
        } catch (e) {
          if (/unique/i.test(e.message)) {
            skippedRbac++;
            await prisma.rbac_routes.updateMany({ where: { path: ep.path, method: ep.method }, data: dataCommon });
          } else console.warn('rbac warn:', e.message);
        }
      }
    }
  }
  console.log(`Endpoint registration complete. routes: +${createdRoutes} (${skippedRoutes} skipped) rbac: +${createdRbac} (${skippedRbac} skipped)`);
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); prisma.$disconnect().then(()=>process.exit(1));});
