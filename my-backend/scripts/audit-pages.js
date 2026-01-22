#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BISMAN ERP - PAGE SYNC CLI
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * CLI tool for page audit and reconciliation.
 * 
 * Usage:
 *   npm run audit:pages              # Run audit (default)
 *   npm run audit:pages -- --json    # Output as JSON
 *   npm run audit:pages -- --sql     # Generate SQL statements
 *   npm run audit:pages -- --ci      # CI mode (exit 1 if issues)
 *   npm run audit:pages -- --fix     # Apply fixes (dry run)
 *   npm run audit:pages -- --fix --commit  # Apply fixes for real
 * 
 * Or directly:
 *   node scripts/audit-pages.js
 *   node scripts/audit-pages.js --ci
 *   node scripts/audit-pages.js --fix --commit
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const FRONTEND_APP_DIR = path.join(__dirname, '../../my-frontend/src/app');
const PAGE_REGISTRY_PATH = path.join(__dirname, '../../my-frontend/src/common/config/page-registry.ts');

const MODULE_PLACEHOLDERS = new Set([
  'admin', 'billing', 'budget-approval', 'common', 'compliance', 
  'enterprise-admin', 'finance', 'governance', 'hr', 'internal', 
  'operations', 'procurement', 'pump-management', 'qa', 'super-admin', 
  'system', 'subscriptions', 'ai', 'crm', 'chat', 'inventory', 'sales',
  'auth', 'api', 'public', 'static', 'onboarding', 'get-started'
]);

const PUBLIC_ROUTES = new Set([
  '/', '/auth/login', '/auth/admin-login', '/auth/forgot-password',
  '/auth/reset-password', '/auth/register', '/get-started',
  '/onboarding/trial', '/onboarding/trial/quick', '/onboarding/trial/resume'
]);

const MODULE_DEFAULTS = {
  'super-admin': { module_code: 'SUPER_ADMIN', layout_group: 'super-admin' },
  'enterprise-admin': { module_code: 'ENTERPRISE_ADMIN', layout_group: 'enterprise-admin' },
  'admin': { module_code: 'ADMIN', layout_group: 'admin' },
  'finance': { module_code: 'FINANCE', layout_group: 'common' },
  'hr': { module_code: 'HR', layout_group: 'common' },
  'operations': { module_code: 'OPERATIONS', layout_group: 'common' },
  'procurement': { module_code: 'PROCUREMENT', layout_group: 'common' },
  'inventory': { module_code: 'INVENTORY', layout_group: 'common' },
  'sales': { module_code: 'SALES', layout_group: 'common' },
  'crm': { module_code: 'CRM', layout_group: 'common' },
  'common': { module_code: 'COMMON', layout_group: 'common' },
  'system': { module_code: 'SYSTEM', layout_group: 'common' },
  'chat': { module_code: 'CHAT', layout_group: 'common' },
  'ai': { module_code: 'AI', layout_group: 'common' },
  'root': { module_code: 'SYSTEM', layout_group: 'common' }
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function filePathToRoute(filePath, appDir) {
  let relativePath = path.relative(appDir, filePath);
  
  // Remove page.tsx suffix (handle both /page.tsx and just page.tsx for root)
  relativePath = relativePath.replace(/[/]?page\.tsx$/, '');
  
  // Handle route groups (folders starting with parentheses)
  relativePath = relativePath.replace(/\([^)]+\)\//g, '');
  relativePath = relativePath.replace(/\([^)]+\)$/g, '');
  
  // Build route
  let route = '/' + relativePath;
  route = route.replace(/\/+/g, '/');
  if (route !== '/' && route.endsWith('/')) {
    route = route.slice(0, -1);
  }
  
  // Handle root case (empty string becomes /)
  if (route === '/' || route === '') {
    return '/';
  }
  
  return route;
}

function normalizeRoute(route) {
  if (!route) return '';
  let normalized = route.toLowerCase().trim();
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  if (normalized !== '/' && normalized.endsWith('/')) normalized = normalized.slice(0, -1);
  return normalized;
}

function findPageFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.next') {
        findPageFiles(fullPath, files);
      }
    } else if (entry.name === 'page.tsx') {
      files.push(fullPath);
    }
  }
  return files;
}

function extractRegistryRoutes(registryPath) {
  if (!fs.existsSync(registryPath)) return [];
  
  const content = fs.readFileSync(registryPath, 'utf8');
  const routes = [];
  const pathRegex = /path:\s*['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = pathRegex.exec(content)) !== null) {
    const route = match[1];
    if (!route.startsWith('http') && !route.includes('${') && !route.startsWith('/api/')) {
      routes.push({ route: normalizeRoute(route), original: route });
    }
  }
  
  const seen = new Set();
  return routes.filter(r => {
    if (seen.has(r.route)) return false;
    seen.add(r.route);
    return true;
  });
}

function isModulePlaceholder(route) {
  const parts = normalizeRoute(route).split('/').filter(Boolean);
  return parts.length === 1 && MODULE_PLACEHOLDERS.has(parts[0].toLowerCase());
}

function getModuleFromRoute(route) {
  const parts = normalizeRoute(route).split('/').filter(Boolean);
  return parts[0] || 'root';
}

function generatePageCode(route) {
  return route.replace(/^\//, '').replace(/\//g, '_').replace(/\[(\w+)\]/g, '$1').replace(/-/g, '_').toUpperCase() || 'ROOT';
}

function generateDisplayName(route) {
  const parts = route.split('/').filter(Boolean);
  const lastPart = parts[parts.length - 1] || 'Home';
  return lastPart.replace(/\[(\w+)\]/g, '$1 Detail').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function isPublicRoute(route) {
  const normalized = normalizeRoute(route);
  if (PUBLIC_ROUTES.has(normalized)) return true;
  if (normalized.startsWith('/auth/')) return true;
  if (normalized.startsWith('/onboarding/')) return true;
  if (normalized === '/get-started' || normalized === '/') return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function getDatabasePages() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const pages = await prisma.$queryRaw`
      SELECT id, page_code, route, display_name, is_active, show_in_sidebar, is_public
      FROM pages_master ORDER BY route
    `;
    
    await prisma.$disconnect();
    
    return pages.map(p => ({
      id: p.id,
      page_code: p.page_code,
      route: normalizeRoute(p.route),
      original_route: p.route,
      display_name: p.display_name,
      is_active: p.is_active,
      show_in_sidebar: p.show_in_sidebar,
      is_public: p.is_public
    }));
  } catch (error) {
    console.warn(`⚠️  Database connection failed: ${error.message}`);
    return [];
  }
}

async function applyFixes(changes, dryRun = true) {
  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes will be applied\n');
    return { inserted: 0, deactivated: 0 };
  }
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    let inserted = 0;
    let deactivated = 0;
    
    // Insert FILE_ONLY pages
    for (const page of changes.toInsert) {
      try {
        await prisma.$executeRaw`
          INSERT INTO pages_master (page_code, display_name, route, is_active, show_in_sidebar, is_public, layout_group, created_at, updated_at)
          VALUES (${page.page_code}, ${page.display_name}, ${page.route}, true, false, ${page.is_public}, ${page.layout_group}, NOW(), NOW())
          ON CONFLICT (page_code) DO NOTHING
        `;
        inserted++;
        console.log(`  ✅ Inserted: ${page.route}`);
      } catch (err) {
        console.warn(`  ❌ Failed to insert ${page.route}: ${err.message}`);
      }
    }
    
    // Deactivate DB_ONLY pages
    for (const page of changes.toDeactivate) {
      try {
        await prisma.$executeRaw`
          UPDATE pages_master SET is_active = false, show_in_sidebar = false, updated_at = NOW()
          WHERE id = ${page.id}
        `;
        deactivated++;
        console.log(`  ✅ Deactivated: ${page.route}`);
      } catch (err) {
        console.warn(`  ❌ Failed to deactivate ${page.route}: ${err.message}`);
      }
    }
    
    await prisma.$disconnect();
    return { inserted, deactivated };
  } catch (error) {
    console.error(`❌ Fix application failed: ${error.message}`);
    return { inserted: 0, deactivated: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AUDIT FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

async function runAudit(options = {}) {
  const { json = false, ci = false, sql = false, fix = false, commit = false } = options;
  
  // 1. Scan filesystem
  const pageFiles = findPageFiles(FRONTEND_APP_DIR);
  const fsPages = pageFiles.map(filePath => {
    const route = filePathToRoute(filePath, FRONTEND_APP_DIR);
    return {
      filePath: filePath.replace(FRONTEND_APP_DIR, 'src/app'),
      route: normalizeRoute(route),
      originalRoute: route,
      module: getModuleFromRoute(route),
      isPlaceholder: isModulePlaceholder(route),
      isPublic: isPublicRoute(route)
    };
  });
  
  const fsRealPages = fsPages.filter(p => !p.isPlaceholder);
  const fsRouteSet = new Set(fsRealPages.map(p => p.route));
  
  // 2. Load database pages
  const dbPages = await getDatabasePages();
  const dbRealPages = dbPages.filter(p => !isModulePlaceholder(p.route));
  const dbRouteSet = new Set(dbRealPages.map(p => p.route));
  
  // 3. Load registry routes
  const registryRoutes = extractRegistryRoutes(PAGE_REGISTRY_PATH);
  const registryRealRoutes = registryRoutes.filter(r => !isModulePlaceholder(r.route));
  
  // 4. Perform comparisons
  const results = {
    OK_MATCHED: [],
    FILE_ONLY: [],
    DB_ONLY: [],
    REGISTRY_ONLY: [],
    BROKEN_ROUTES: []
  };
  
  // OK_MATCHED
  for (const fsPage of fsRealPages) {
    if (dbRouteSet.has(fsPage.route)) {
      const dbPage = dbPages.find(p => p.route === fsPage.route);
      results.OK_MATCHED.push({
        route: fsPage.originalRoute,
        filePath: fsPage.filePath,
        page_code: dbPage?.page_code,
        is_active: dbPage?.is_active,
        show_in_sidebar: dbPage?.show_in_sidebar
      });
    }
  }
  
  // FILE_ONLY
  for (const fsPage of fsRealPages) {
    if (!dbRouteSet.has(fsPage.route)) {
      const moduleDefaults = MODULE_DEFAULTS[fsPage.module] || { module_code: 'COMMON', layout_group: 'common' };
      results.FILE_ONLY.push({
        route: fsPage.originalRoute,
        filePath: fsPage.filePath,
        module: fsPage.module,
        is_public: fsPage.isPublic,
        page_code: generatePageCode(fsPage.originalRoute),
        display_name: generateDisplayName(fsPage.originalRoute),
        module_code: moduleDefaults.module_code,
        layout_group: moduleDefaults.layout_group
      });
    }
  }
  
  // DB_ONLY
  for (const dbPage of dbRealPages) {
    if (!fsRouteSet.has(dbPage.route)) {
      results.DB_ONLY.push({
        id: dbPage.id,
        route: dbPage.original_route,
        page_code: dbPage.page_code,
        display_name: dbPage.display_name,
        is_active: dbPage.is_active,
        show_in_sidebar: dbPage.show_in_sidebar
      });
    }
  }
  
  // REGISTRY_ONLY
  for (const regRoute of registryRealRoutes) {
    if (!fsRouteSet.has(regRoute.route)) {
      results.REGISTRY_ONLY.push({
        route: regRoute.original,
        in_database: dbRouteSet.has(regRoute.route)
      });
    }
  }
  
  // BROKEN_ROUTES
  const brokenSet = new Set();
  for (const item of results.DB_ONLY) {
    const key = normalizeRoute(item.route);
    if (!brokenSet.has(key)) {
      brokenSet.add(key);
      results.BROKEN_ROUTES.push({ route: item.route, source: 'database', is_active: item.is_active, id: item.id });
    }
  }
  for (const item of results.REGISTRY_ONLY) {
    const key = normalizeRoute(item.route);
    if (!brokenSet.has(key)) {
      brokenSet.add(key);
      results.BROKEN_ROUTES.push({ route: item.route, source: 'registry', in_database: item.in_database });
    }
  }
  
  // Calculate health
  const activeOrphans = results.DB_ONLY.filter(p => p.is_active);
  const isHealthy = activeOrphans.length === 0 && results.FILE_ONLY.length === 0;
  const healthScore = fsRealPages.length > 0 
    ? Math.round((results.OK_MATCHED.length / fsRealPages.length) * 100)
    : 100;
  
  const report = {
    timestamp: new Date().toISOString(),
    counts: {
      fs_real_pages: fsRealPages.length,
      db_pages: dbRealPages.length,
      registry_pages: registryRealRoutes.length,
      ok_matched: results.OK_MATCHED.length,
      file_only: results.FILE_ONLY.length,
      db_only: results.DB_ONLY.length,
      registry_only: results.REGISTRY_ONLY.length,
      broken_routes: results.BROKEN_ROUTES.length,
      active_orphans: activeOrphans.length
    },
    health_score: healthScore,
    is_healthy: isHealthy,
    results
  };
  
  // ─────────────────────────────────────────────────────────────────────────────
  // OUTPUT MODES
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return process.exit(isHealthy ? 0 : 1);
  }
  
  if (sql) {
    console.log('-- ═══════════════════════════════════════════════════════════════════════════════');
    console.log('-- PAGE SYNC RECONCILIATION SQL');
    console.log(`-- Generated: ${new Date().toISOString()}`);
    console.log('-- ═══════════════════════════════════════════════════════════════════════════════\n');
    
    if (activeOrphans.length > 0) {
      console.log('-- STEP 1: DEACTIVATE ORPHAN DB ENTRIES\n');
      for (const page of activeOrphans) {
        console.log(`-- Route: ${page.route}`);
        console.log(`UPDATE pages_master SET is_active = false, show_in_sidebar = false, updated_at = NOW() WHERE id = ${page.id};\n`);
      }
    }
    
    if (results.FILE_ONLY.length > 0) {
      console.log('-- STEP 2: INSERT MISSING PAGES\n');
      for (const page of results.FILE_ONLY) {
        console.log(`-- File: ${page.filePath}`);
        console.log(`INSERT INTO pages_master (page_code, display_name, route, is_active, show_in_sidebar, is_public, layout_group, created_at, updated_at)`);
        console.log(`VALUES ('${page.page_code}', '${page.display_name}', '${page.route}', true, false, ${page.is_public}, '${page.layout_group}', NOW(), NOW())`);
        console.log(`ON CONFLICT (page_code) DO NOTHING;\n`);
      }
    }
    
    return process.exit(0);
  }
  
  if (fix) {
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('  PAGE SYNC - FIX MODE');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    const changes = {
      toInsert: results.FILE_ONLY.map(p => ({
        route: p.route,
        page_code: p.page_code,
        display_name: p.display_name,
        is_public: p.is_public,
        layout_group: p.layout_group
      })),
      toDeactivate: activeOrphans.map(p => ({
        id: p.id,
        route: p.route,
        page_code: p.page_code
      }))
    };
    
    console.log(`📝 Pages to INSERT: ${changes.toInsert.length}`);
    for (const p of changes.toInsert) {
      console.log(`   - ${p.route}`);
    }
    
    console.log(`\n🔴 Pages to DEACTIVATE: ${changes.toDeactivate.length}`);
    for (const p of changes.toDeactivate) {
      console.log(`   - ${p.route} (id: ${p.id})`);
    }
    
    const dryRun = !commit;
    const result = await applyFixes(changes, dryRun);
    
    if (commit) {
      console.log(`\n✅ Applied: ${result.inserted} inserts, ${result.deactivated} deactivations`);
    } else {
      console.log('\n⚠️  DRY RUN - Use --commit to apply changes');
    }
    
    return process.exit(0);
  }
  
  // Default: Human-readable output
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('  BISMAN ERP - PAGE SYNC AUDIT');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  console.log('📊 SUMMARY');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log(`  Filesystem Pages (Real):     ${fsRealPages.length}`);
  console.log(`  Database Pages:              ${dbRealPages.length}`);
  console.log(`  Registry Routes:             ${registryRealRoutes.length}`);
  console.log(`  Health Score:                ${healthScore}%`);
  console.log('');
  
  console.log('📋 COMPARISON RESULTS');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log(`  ✅ OK (FS + DB matched):     ${results.OK_MATCHED.length}`);
  console.log(`  ⚠️  FILE_ONLY (no DB):        ${results.FILE_ONLY.length}`);
  console.log(`  ⚠️  DB_ONLY (orphan):         ${results.DB_ONLY.length}`);
  console.log(`  🔴 Active Orphans:           ${activeOrphans.length}`);
  console.log(`  📋 REGISTRY_ONLY:            ${results.REGISTRY_ONLY.length}`);
  console.log(`  🔴 BROKEN_ROUTES:            ${results.BROKEN_ROUTES.length}`);
  console.log('');
  
  if (results.FILE_ONLY.length > 0) {
    console.log('⚠️  FILE_ONLY (page.tsx exists but no DB entry):');
    for (const p of results.FILE_ONLY.slice(0, 10)) {
      console.log(`    - ${p.route}`);
    }
    if (results.FILE_ONLY.length > 10) {
      console.log(`    ... and ${results.FILE_ONLY.length - 10} more`);
    }
    console.log('');
  }
  
  if (activeOrphans.length > 0) {
    console.log('🔴 ACTIVE ORPHANS (DB entry but no page.tsx - NEEDS DEACTIVATION):');
    for (const p of activeOrphans) {
      console.log(`    - ${p.route} (id: ${p.id})`);
    }
    console.log('');
  }
  
  if (results.REGISTRY_ONLY.length > 0) {
    console.log('📋 REGISTRY_ONLY (in PAGE_REGISTRY but no page.tsx):');
    for (const p of results.REGISTRY_ONLY.slice(0, 10)) {
      console.log(`    - ${p.route}`);
    }
    if (results.REGISTRY_ONLY.length > 10) {
      console.log(`    ... and ${results.REGISTRY_ONLY.length - 10} more`);
    }
    console.log('');
  }
  
  console.log('💡 RECOMMENDATIONS');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  if (isHealthy) {
    console.log('  ✅ System is healthy - all pages synced correctly!');
  } else {
    if (activeOrphans.length > 0) {
      console.log(`  🔴 Run: node scripts/audit-pages.js --fix --commit`);
      console.log(`     This will deactivate ${activeOrphans.length} orphan DB entries`);
    }
    if (results.FILE_ONLY.length > 0) {
      console.log(`  📝 Run: node scripts/audit-pages.js --sql > fix.sql`);
      console.log(`     This will generate SQL to insert ${results.FILE_ONLY.length} missing pages`);
    }
  }
  console.log('');
  
  // CI mode - exit with error if issues
  if (ci && !isHealthy) {
    console.log('❌ CI CHECK FAILED - Page sync issues detected');
    process.exit(1);
  }
  
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const options = {
  json: args.includes('--json'),
  ci: args.includes('--ci'),
  sql: args.includes('--sql'),
  fix: args.includes('--fix'),
  commit: args.includes('--commit')
};

runAudit(options).catch(err => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
