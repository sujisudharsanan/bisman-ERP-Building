#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BISMAN ERP - REAL ERP PAGES REPORT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Classifies pages into meaningful categories to understand actual ERP usage.
 * 
 * Categories:
 * - REAL_ERP_PAGES:    Sidebar-visible, active pages users actually use
 * - HIDDEN_PAGES:      Active but not in sidebar (detail pages, modals, etc.)
 * - TECHNICAL_PAGES:   Auth, onboarding, system utilities
 * - PLACEHOLDER_PAGES: "Coming Soon" or empty pages
 * - INACTIVE_DB_PAGES: Deactivated DB records (history)
 * 
 * Usage:
 *   node scripts/real-pages-report.js
 *   node scripts/real-pages-report.js --json
 *   node scripts/real-pages-report.js --module finance
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const FRONTEND_APP_DIR = path.join(__dirname, '../../my-frontend/src/app');

// Technical route prefixes (not counted as "real ERP pages")
const TECHNICAL_PREFIXES = [
  '/auth',
  '/onboarding',
  '/get-started',
  '/access-denied',
  '/error',
  '/unauthorized',
  '/health',
  '/api',
  '/status',
  '/signup',
  '/pricing',
  '/terms',
  '/privacy',
  '/support',
  '/trust-security',
  '/welcome',
  '/upgrade-required'
];

// Placeholder patterns to detect in file content
const PLACEHOLDER_PATTERNS = [
  /coming\s*soon/i,
  /under\s*construction/i,
  /not\s*implemented/i,
  /placeholder/i,
  /return\s*null\s*;?\s*$/m,
  /return\s*<>\s*<\/>\s*;?/m
];

// Module placeholders (not actual pages)
const MODULE_ROOTS = new Set([
  'admin', 'billing', 'budget-approval', 'common', 'compliance', 
  'enterprise-admin', 'finance', 'governance', 'hr', 'internal', 
  'operations', 'procurement', 'pump-management', 'qa', 'super-admin', 
  'system', 'subscriptions', 'ai', 'crm', 'chat', 'inventory', 'sales',
  'auth', 'api', 'public', 'static', 'onboarding', 'get-started'
]);

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function filePathToRoute(filePath, appDir) {
  let relativePath = path.relative(appDir, filePath);
  relativePath = relativePath.replace(/[/]?page\.tsx$/, '');
  relativePath = relativePath.replace(/\([^)]+\)\//g, '');
  relativePath = relativePath.replace(/\([^)]+\)$/g, '');
  let route = '/' + relativePath;
  route = route.replace(/\/+/g, '/');
  if (route !== '/' && route.endsWith('/')) route = route.slice(0, -1);
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

function getModuleFromRoute(route) {
  const parts = normalizeRoute(route).split('/').filter(Boolean);
  return parts[0] || 'root';
}

function isModulePlaceholder(route) {
  const parts = normalizeRoute(route).split('/').filter(Boolean);
  return parts.length === 1 && MODULE_ROOTS.has(parts[0].toLowerCase());
}

function isTechnicalRoute(route) {
  const normalized = normalizeRoute(route);
  return TECHNICAL_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

function isPlaceholderPage(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Check first 2000 chars for placeholder patterns
    const snippet = content.slice(0, 2000);
    return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(snippet));
  } catch (err) {
    return false;
  }
}

function isDynamicRoute(route) {
  return route.includes('[') && route.includes(']');
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function getDatabasePages() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const pages = await prisma.$queryRaw`
      SELECT 
        pm.id,
        pm.page_code,
        pm.route,
        pm.display_name,
        pm.is_active,
        pm.show_in_sidebar,
        mm.module_code,
        mm.display_name as module_name
      FROM pages_master pm
      LEFT JOIN modules_master mm ON pm.module_id = mm.id
      ORDER BY pm.route
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
      module_code: p.module_code,
      module_name: p.module_name
    }));
  } catch (error) {
    console.warn(`⚠️  Database connection failed: ${error.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CLASSIFICATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

async function generateRealPagesReport(options = {}) {
  const { json = false, module: filterModule = null } = options;
  
  // 1. Scan filesystem
  const pageFiles = findPageFiles(FRONTEND_APP_DIR);
  const fsPages = pageFiles.map(filePath => {
    const route = filePathToRoute(filePath, FRONTEND_APP_DIR);
    return {
      filePath,
      relativePath: filePath.replace(FRONTEND_APP_DIR, 'src/app'),
      route: normalizeRoute(route),
      originalRoute: route,
      module: getModuleFromRoute(route),
      isPlaceholder: isModulePlaceholder(route),
      isTechnical: isTechnicalRoute(route),
      isDynamic: isDynamicRoute(route),
      hasPlaceholderContent: isPlaceholderPage(filePath)
    };
  });
  
  // Filter out module placeholders
  const realFsPages = fsPages.filter(p => !p.isPlaceholder);
  
  // 2. Load database pages
  const dbPages = await getDatabasePages();
  const dbRouteMap = new Map(dbPages.map(p => [p.route, p]));
  
  // 3. Classify pages
  const results = {
    REAL_ERP_PAGES: [],      // Sidebar-visible, active, real pages
    HIDDEN_PAGES: [],         // Active but show_in_sidebar=false
    TECHNICAL_PAGES: [],      // Auth/onboarding/system
    PLACEHOLDER_PAGES: [],    // Coming soon / empty
    DYNAMIC_DETAIL_PAGES: [], // [id] pages for detail views
    INACTIVE_DB_PAGES: []     // DB only, is_active=false
  };
  
  for (const fsPage of realFsPages) {
    const dbPage = dbRouteMap.get(fsPage.route);
    
    // Technical pages (auth, onboarding, etc.)
    if (fsPage.isTechnical) {
      results.TECHNICAL_PAGES.push({
        route: fsPage.originalRoute,
        module: fsPage.module,
        display_name: dbPage?.display_name || fsPage.module,
        in_db: !!dbPage,
        is_active: dbPage?.is_active ?? null
      });
      continue;
    }
    
    // Placeholder pages (coming soon content)
    if (fsPage.hasPlaceholderContent) {
      results.PLACEHOLDER_PAGES.push({
        route: fsPage.originalRoute,
        module: fsPage.module,
        display_name: dbPage?.display_name || 'Placeholder',
        in_db: !!dbPage
      });
      continue;
    }
    
    // Dynamic detail pages [id]
    if (fsPage.isDynamic) {
      results.DYNAMIC_DETAIL_PAGES.push({
        route: fsPage.originalRoute,
        module: fsPage.module,
        display_name: dbPage?.display_name || 'Detail Page',
        in_db: !!dbPage,
        is_active: dbPage?.is_active ?? null,
        show_in_sidebar: dbPage?.show_in_sidebar ?? false
      });
      continue;
    }
    
    // Has DB entry?
    if (dbPage) {
      if (dbPage.is_active && dbPage.show_in_sidebar) {
        // REAL ERP PAGE
        results.REAL_ERP_PAGES.push({
          route: fsPage.originalRoute,
          page_code: dbPage.page_code,
          display_name: dbPage.display_name,
          module: dbPage.module_code || fsPage.module,
          module_name: dbPage.module_name
        });
      } else if (dbPage.is_active && !dbPage.show_in_sidebar) {
        // HIDDEN PAGE
        results.HIDDEN_PAGES.push({
          route: fsPage.originalRoute,
          page_code: dbPage.page_code,
          display_name: dbPage.display_name,
          module: dbPage.module_code || fsPage.module,
          reason: 'show_in_sidebar=false'
        });
      } else {
        // Inactive but has file - edge case
        results.HIDDEN_PAGES.push({
          route: fsPage.originalRoute,
          page_code: dbPage.page_code,
          display_name: dbPage.display_name,
          module: dbPage.module_code || fsPage.module,
          reason: 'is_active=false'
        });
      }
    } else {
      // No DB entry - treat as hidden/unregistered
      results.HIDDEN_PAGES.push({
        route: fsPage.originalRoute,
        page_code: null,
        display_name: 'Unregistered',
        module: fsPage.module,
        reason: 'no DB entry'
      });
    }
  }
  
  // 4. Get inactive DB pages (orphans)
  for (const dbPage of dbPages) {
    if (!dbPage.is_active) {
      results.INACTIVE_DB_PAGES.push({
        route: dbPage.original_route,
        page_code: dbPage.page_code,
        display_name: dbPage.display_name,
        module: dbPage.module_code
      });
    }
  }
  
  // 5. Calculate module breakdown
  const moduleBreakdown = {};
  for (const page of results.REAL_ERP_PAGES) {
    const mod = page.module || 'UNKNOWN';
    if (!moduleBreakdown[mod]) {
      moduleBreakdown[mod] = { real: 0, hidden: 0, dynamic: 0 };
    }
    moduleBreakdown[mod].real++;
  }
  for (const page of results.HIDDEN_PAGES) {
    const mod = page.module || 'UNKNOWN';
    if (!moduleBreakdown[mod]) {
      moduleBreakdown[mod] = { real: 0, hidden: 0, dynamic: 0 };
    }
    moduleBreakdown[mod].hidden++;
  }
  for (const page of results.DYNAMIC_DETAIL_PAGES) {
    const mod = page.module || 'UNKNOWN';
    if (!moduleBreakdown[mod]) {
      moduleBreakdown[mod] = { real: 0, hidden: 0, dynamic: 0 };
    }
    moduleBreakdown[mod].dynamic++;
  }
  
  // 6. Build report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_filesystem_pages: realFsPages.length,
      total_db_pages: dbPages.length,
      db_pages_active: dbPages.filter(p => p.is_active).length,
      
      // Main categories
      real_erp_pages: results.REAL_ERP_PAGES.length,
      hidden_pages: results.HIDDEN_PAGES.length,
      technical_pages: results.TECHNICAL_PAGES.length,
      placeholder_pages: results.PLACEHOLDER_PAGES.length,
      dynamic_detail_pages: results.DYNAMIC_DETAIL_PAGES.length,
      inactive_db_pages: results.INACTIVE_DB_PAGES.length,
      
      // Why count is high explanation
      breakdown: {
        'User-facing ERP pages (sidebar)': results.REAL_ERP_PAGES.length,
        'Hidden pages (detail views, modals)': results.HIDDEN_PAGES.length,
        'Dynamic [id] pages': results.DYNAMIC_DETAIL_PAGES.length,
        'Technical/Auth pages': results.TECHNICAL_PAGES.length,
        'Placeholder pages': results.PLACEHOLDER_PAGES.length
      }
    },
    module_breakdown: moduleBreakdown,
    results
  };
  
  return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function printReport(report) {
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('  BISMAN ERP - REAL PAGES REPORT');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  console.log('📊 WHY YOUR PAGE COUNT LOOKS HIGH');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log(`  Total Filesystem Pages:      ${report.summary.total_filesystem_pages}`);
  console.log('');
  console.log('  This breaks down as:');
  for (const [category, count] of Object.entries(report.summary.breakdown)) {
    const pct = Math.round((count / report.summary.total_filesystem_pages) * 100);
    console.log(`    • ${category}: ${count} (${pct}%)`);
  }
  console.log('');
  
  console.log('📊 SUMMARY TABLE');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log('  Category                  Count   Meaning');
  console.log('  ────────────────────────  ─────   ─────────────────────────────────────');
  console.log(`  Filesystem Pages          ${String(report.summary.total_filesystem_pages).padStart(5)}   All page.tsx files`);
  console.log(`  DB Pages (Active)         ${String(report.summary.db_pages_active).padStart(5)}   is_active=true`);
  console.log(`  ✅ REAL_ERP_PAGES         ${String(report.summary.real_erp_pages).padStart(5)}   Sidebar-visible real pages`);
  console.log(`  🔒 HIDDEN_PAGES           ${String(report.summary.hidden_pages).padStart(5)}   Active but not in sidebar`);
  console.log(`  🔗 DYNAMIC_DETAIL_PAGES   ${String(report.summary.dynamic_detail_pages).padStart(5)}   [id] detail view pages`);
  console.log(`  ⚙️  TECHNICAL_PAGES        ${String(report.summary.technical_pages).padStart(5)}   Auth/onboarding/system`);
  console.log(`  🚧 PLACEHOLDER_PAGES      ${String(report.summary.placeholder_pages).padStart(5)}   Coming soon / empty`);
  console.log(`  ⚪ INACTIVE_DB_PAGES      ${String(report.summary.inactive_db_pages).padStart(5)}   Deactivated DB records`);
  console.log('');
  
  console.log('📦 MODULE BREAKDOWN (Real ERP Pages)');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log('  Module               Real  Hidden  Dynamic');
  console.log('  ───────────────────  ────  ──────  ───────');
  
  const sortedModules = Object.entries(report.module_breakdown)
    .sort((a, b) => b[1].real - a[1].real);
  
  for (const [mod, counts] of sortedModules) {
    if (counts.real > 0 || counts.hidden > 0) {
      const modName = mod.padEnd(19);
      console.log(`  ${modName}  ${String(counts.real).padStart(4)}  ${String(counts.hidden).padStart(6)}  ${String(counts.dynamic).padStart(7)}`);
    }
  }
  console.log('');
  
  console.log('✅ REAL ERP PAGES (Top 20)');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  for (const page of report.results.REAL_ERP_PAGES.slice(0, 20)) {
    console.log(`  ${page.route.padEnd(45)} [${page.module}]`);
  }
  if (report.results.REAL_ERP_PAGES.length > 20) {
    console.log(`  ... and ${report.results.REAL_ERP_PAGES.length - 20} more`);
  }
  console.log('');
  
  console.log('🔒 HIDDEN PAGES (Top 20)');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  for (const page of report.results.HIDDEN_PAGES.slice(0, 20)) {
    console.log(`  ${page.route.padEnd(45)} [${page.reason}]`);
  }
  if (report.results.HIDDEN_PAGES.length > 20) {
    console.log(`  ... and ${report.results.HIDDEN_PAGES.length - 20} more`);
  }
  console.log('');
  
  console.log('⚙️  TECHNICAL PAGES (Top 20)');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  for (const page of report.results.TECHNICAL_PAGES.slice(0, 20)) {
    console.log(`  ${page.route}`);
  }
  if (report.results.TECHNICAL_PAGES.length > 20) {
    console.log(`  ... and ${report.results.TECHNICAL_PAGES.length - 20} more`);
  }
  console.log('');
  
  if (report.results.PLACEHOLDER_PAGES.length > 0) {
    console.log('🚧 PLACEHOLDER PAGES');
    console.log('───────────────────────────────────────────────────────────────────────────────');
    for (const page of report.results.PLACEHOLDER_PAGES.slice(0, 10)) {
      console.log(`  ${page.route}`);
    }
    console.log('');
  }
  
  console.log('💡 INTERPRETATION');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log(`  Your actual user-facing ERP pages: ${report.summary.real_erp_pages}`);
  console.log(`  The remaining ${report.summary.total_filesystem_pages - report.summary.real_erp_pages} pages are:`);
  console.log(`    - Detail pages for viewing specific records ([id] routes)`);
  console.log(`    - Hidden pages (modals, create forms, settings subpages)`);
  console.log(`    - Technical pages (auth, onboarding, error pages)`);
  console.log(`    - Placeholder/coming soon pages`);
  console.log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const options = {
  json: args.includes('--json'),
  module: args.find(a => a.startsWith('--module='))?.split('=')[1] || null
};

generateRealPagesReport(options)
  .then(report => {
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }
  })
  .catch(err => {
    console.error('❌ Report failed:', err);
    process.exit(1);
  });
