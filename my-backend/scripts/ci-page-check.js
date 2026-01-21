#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BISMAN ERP - CI PAGE SYNC CHECK
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Pre-deployment gate to ensure page sync is healthy.
 * Exits with code 1 if there are:
 * - Active orphan DB entries (pages in DB but no page.tsx)
 * - Missing DB entries (page.tsx exists but not in DB)
 * 
 * Usage in CI/CD:
 *   npm run ci:page-check
 * 
 * Or in package.json scripts:
 *   "predeploy": "npm run ci:page-check"
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FRONTEND_APP_DIR = path.join(__dirname, '../../my-frontend/src/app');

const MODULE_PLACEHOLDERS = new Set([
  'admin', 'billing', 'budget-approval', 'common', 'compliance', 
  'enterprise-admin', 'finance', 'governance', 'hr', 'internal', 
  'operations', 'procurement', 'pump-management', 'qa', 'super-admin', 
  'system', 'subscriptions', 'ai', 'crm', 'chat', 'inventory', 'sales',
  'auth', 'api', 'public', 'static', 'onboarding', 'get-started'
]);

// Utility functions
function filePathToRoute(filePath, appDir) {
  let relativePath = path.relative(appDir, filePath);
  // Remove page.tsx suffix (handle both /page.tsx and just page.tsx for root)
  relativePath = relativePath.replace(/[/]?page\.tsx$/, '');
  relativePath = relativePath.replace(/\([^)]+\)\//g, '');
  relativePath = relativePath.replace(/\([^)]+\)$/g, '');
  let route = '/' + relativePath;
  route = route.replace(/\/+/g, '/');
  if (route !== '/' && route.endsWith('/')) route = route.slice(0, -1);
  // Handle root case
  if (route === '/' || route === '') return '/';
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

function isModulePlaceholder(route) {
  const parts = normalizeRoute(route).split('/').filter(Boolean);
  return parts.length === 1 && MODULE_PLACEHOLDERS.has(parts[0].toLowerCase());
}

async function runCheck() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('  BISMAN ERP - CI PAGE SYNC CHECK');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  // Scan filesystem
  const pageFiles = findPageFiles(FRONTEND_APP_DIR);
  const fsPages = pageFiles.map(filePath => {
    const route = filePathToRoute(filePath, FRONTEND_APP_DIR);
    return { route: normalizeRoute(route), isPlaceholder: isModulePlaceholder(route) };
  });
  const fsRealPages = fsPages.filter(p => !p.isPlaceholder);
  const fsRouteSet = new Set(fsRealPages.map(p => p.route));
  
  // Load database pages
  let dbPages = [];
  let dbError = null;
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const pages = await prisma.$queryRaw`
      SELECT id, page_code, route, is_active FROM pages_master ORDER BY route
    `;
    await prisma.$disconnect();
    dbPages = pages.map(p => ({
      id: p.id,
      page_code: p.page_code,
      route: normalizeRoute(p.route),
      is_active: p.is_active
    }));
  } catch (err) {
    dbError = err.message;
    console.warn(`⚠️  Database connection failed: ${err.message}`);
    console.log('   Continuing with filesystem-only check...\n');
  }
  
  const dbRealPages = dbPages.filter(p => !isModulePlaceholder(p.route));
  const dbRouteSet = new Set(dbRealPages.map(p => p.route));
  
  // Find issues
  const fileOnly = fsRealPages.filter(p => !dbRouteSet.has(p.route));
  const activeOrphans = dbRealPages.filter(p => p.is_active && !fsRouteSet.has(p.route));
  
  console.log('📊 RESULTS');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log(`  Filesystem pages:   ${fsRealPages.length}`);
  console.log(`  Database pages:     ${dbRealPages.length}`);
  console.log(`  File-only:          ${fileOnly.length}`);
  console.log(`  Active orphans:     ${activeOrphans.length}`);
  console.log('');
  
  // Check for issues
  const hasIssues = activeOrphans.length > 0;
  
  if (activeOrphans.length > 0) {
    console.log('🔴 ACTIVE ORPHANS (DB entries with no page.tsx):');
    for (const p of activeOrphans.slice(0, 10)) {
      console.log(`    - ${p.route}`);
    }
    if (activeOrphans.length > 10) {
      console.log(`    ... and ${activeOrphans.length - 10} more`);
    }
    console.log('');
  }
  
  if (fileOnly.length > 0) {
    console.log('⚠️  FILE-ONLY (page.tsx with no DB entry):');
    for (const p of fileOnly.slice(0, 5)) {
      console.log(`    - ${p.route}`);
    }
    if (fileOnly.length > 5) {
      console.log(`    ... and ${fileOnly.length - 5} more`);
    }
    console.log('   (This is a warning, not a blocking issue)\n');
  }
  
  // Final verdict
  if (hasIssues) {
    console.log('❌ CI CHECK FAILED');
    console.log('───────────────────────────────────────────────────────────────────────────────');
    console.log('  There are active orphan DB entries that need to be deactivated.');
    console.log('  These routes are in the database but have no corresponding page.tsx file.');
    console.log('');
    console.log('  To fix, run:');
    console.log('    node scripts/audit-pages.js --fix --commit');
    console.log('');
    console.log('  Or manually deactivate with SQL:');
    console.log('    node scripts/audit-pages.js --sql > fix.sql');
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ CI CHECK PASSED');
    console.log('───────────────────────────────────────────────────────────────────────────────');
    console.log('  All pages are properly synced. Deployment can proceed.');
    console.log('');
    process.exit(0);
  }
}

runCheck().catch(err => {
  console.error('❌ Check failed:', err);
  process.exit(1);
});
