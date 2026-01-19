#!/usr/bin/env node
/*
 * BISMAN ERP - Permanent Page Sync Script
 * 
 * This script scans Next.js filesystem and syncs with pages_master.
 * 
 * Usage:
 *   node scripts/sync-pages-master.js           - Normal sync
 *   node scripts/sync-pages-master.js --dry-run - Preview only
 *   node scripts/sync-pages-master.js --ci      - CI mode (fail on new pages)
 *   node scripts/sync-pages-master.js --report  - Generate markdown report
 * 
 * Date: 2025-01-19
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const glob = require('glob');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Frontend app directory
  appDir: path.resolve(__dirname, '../my-frontend/src/app'),
  
  // Database connection (use environment variable or local)
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/BISMAN',
  
  // Route exclusions (never sync these)
  excludedPatterns: [
    /^\/(api)\//,           // API routes
    /^\/(_[^/]+)/,          // Next.js internal routes like _app, _document
    /\/loading$/,           // loading.tsx
    /\/error$/,             // error.tsx
    /\/not-found$/,         // not-found.tsx
    /\/layout$/,            // layout.tsx (not pages)
  ],
  
  // Routes that are non-governed (no RBAC, not in sidebar)
  nonGovernedPrefixes: [
    '/auth/',
    '/(public)/',
    '/login',
    '/signup',
    '/unauthorized',
    '/access-denied',
    '/status',
    '/privacy',
    '/support',
    '/contact-sales',
    '/docs/',
    '/get-started',
    '/onboarding/',
    '/welcome',
  ],
  
  // Module detection mapping (route prefix → module code)
  moduleMapping: {
    '/super-admin/subscriptions': 'SUBSCRIPTIONS',
    '/super-admin': 'SUPER_ADMIN',
    '/enterprise-admin': 'ENTERPRISE_ADMIN',
    '/admin': 'ADMIN',
    '/finance': 'FINANCE',
    '/procurement': 'PROCUREMENT',
    '/operations': 'OPERATIONS',
    '/compliance': 'COMPLIANCE',
    '/hr': 'HR',
    '/billing': 'BILLING',
    '/reports': 'REPORTS',
    '/governance': 'GOVERNANCE',
    '/internal': 'INTERNAL',
    '/qa': 'QA',
    '/system': 'SYSTEM',
    '/dashboard': 'DASHBOARD',
    '/analytics': 'COMMON',  // Analytics is common/free
    '/settings': 'COMMON',
    '/common': 'COMMON',
    '/approvals': 'COMMON',
    '/tasks': 'COMMON',
    '/calendar': 'COMMON',
    '/assistant': 'COMMON',
    '/ai-training': 'COMMON',
    '/trace': 'COMMON',
    '/chat': 'COMMON',
    '/reconciliation': 'FINANCE',
    '/settlements': 'FINANCE',
    '/pump-management': 'OPERATIONS',
    '/store-incharge': 'OPERATIONS',
    '/auth': 'AUTH',
    '/(public)': 'PUBLIC',
    '/onboarding': 'ONBOARDING',
    '/welcome': 'ONBOARDING',
    '/get-started': 'ONBOARDING',
  },
  
  // Default module for unmatched routes
  defaultModule: 'COMMON',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert filesystem path to route path
 * Examples:
 *   /app/admin/users/page.tsx → /admin/users
 *   /app/(dashboard)/inventory/[id]/page.tsx → /inventory/:id
 */
function filesystemToRoute(filePath) {
  // Get relative path from app directory
  let relativePath = path.relative(CONFIG.appDir, filePath);
  
  // Remove page.tsx suffix
  relativePath = relativePath.replace(/\/page\.tsx$/, '');
  
  // Handle root page
  if (relativePath === 'page.tsx' || relativePath === '') {
    return '/';
  }
  
  // Convert to route
  let route = '/' + relativePath;
  
  // Keep route groups in route for matching, but also store without them
  // Note: route_pattern will have groups removed
  
  // Replace Windows backslashes
  route = route.replace(/\\/g, '/');
  
  return route;
}

/**
 * Create normalized route pattern (for matching)
 * Removes route groups and normalizes dynamic segments
 */
function createRoutePattern(route) {
  let pattern = route;
  
  // Remove route groups like (dashboard), (public)
  pattern = pattern.replace(/\/\([^)]+\)/g, '');
  
  // Normalize empty to root
  if (pattern === '' || pattern === '/') {
    pattern = '/';
  }
  
  // Ensure starts with /
  if (!pattern.startsWith('/')) {
    pattern = '/' + pattern;
  }
  
  // Replace [param] with :param for easier matching
  pattern = pattern.replace(/\[([^\]]+)\]/g, ':$1');
  
  return pattern;
}

/**
 * Check if route is dynamic (contains parameters)
 */
function isDynamicRoute(route) {
  return route.includes('[') || route.includes(':');
}

/**
 * Check if route should be governed (requires RBAC)
 */
function isGovernedRoute(route) {
  const pattern = createRoutePattern(route);
  
  for (const prefix of CONFIG.nonGovernedPrefixes) {
    if (pattern.startsWith(prefix) || route.includes(prefix)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Detect module code from route
 */
function detectModuleCode(route) {
  const pattern = createRoutePattern(route);
  
  // Check longest prefixes first (more specific matches)
  const sortedMappings = Object.entries(CONFIG.moduleMapping)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [prefix, moduleCode] of sortedMappings) {
    if (pattern.startsWith(prefix) || route.includes(prefix)) {
      return moduleCode;
    }
  }
  
  return CONFIG.defaultModule;
}

/**
 * Generate page_code from route
 */
function generatePageCode(route) {
  const pattern = createRoutePattern(route);
  
  // Convert /admin/users/[id] to ADMIN_USERS_DETAIL
  let code = pattern
    .replace(/^\//, '')           // Remove leading slash
    .replace(/\//g, '_')          // Replace slashes with underscores
    .replace(/:/g, '')            // Remove colons from params
    .replace(/\[/g, '')           // Remove brackets
    .replace(/\]/g, '')           // Remove brackets
    .replace(/-/g, '_')           // Replace hyphens
    .toUpperCase();
  
  // Handle root
  if (code === '' || code === '_') {
    code = 'ROOT_DASHBOARD';
  }
  
  // Append DETAIL for dynamic routes
  if (isDynamicRoute(route)) {
    if (!code.endsWith('_DETAIL') && !code.endsWith('_ID')) {
      code = code.replace(/_[A-Z]+$/, '_DETAIL');
    }
  }
  
  return code;
}

/**
 * Generate display name from route
 */
function generateDisplayName(route) {
  const pattern = createRoutePattern(route);
  
  // Get the last meaningful segment
  const segments = pattern.split('/').filter(s => s && !s.startsWith(':'));
  const lastSegment = segments[segments.length - 1] || 'Dashboard';
  
  // Convert kebab-case to Title Case
  return lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if route should be excluded from sync
 */
function shouldExclude(route) {
  for (const pattern of CONFIG.excludedPatterns) {
    if (pattern.test(route)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function getPool() {
  return new Pool({
    connectionString: CONFIG.databaseUrl,
    max: 5,
  });
}

async function getModulesMap(pool) {
  const result = await pool.query('SELECT id, module_code FROM modules_master');
  const map = {};
  for (const row of result.rows) {
    map[row.module_code] = row.id;
  }
  return map;
}

async function getExistingPages(pool) {
  const result = await pool.query(`
    SELECT id, page_code, route, route_pattern, filesystem_path, module_id, is_active, sync_status
    FROM pages_master
  `);
  
  const byRoute = {};
  const byCode = {};
  
  for (const row of result.rows) {
    if (row.route) {
      byRoute[row.route] = row;
    }
    if (row.page_code) {
      byCode[row.page_code] = row;
    }
  }
  
  return { byRoute, byCode, rows: result.rows };
}

async function upsertPage(pool, page, modulesMap) {
  const moduleId = modulesMap[page.moduleCode] || null;
  
  // Check if page exists by route first, then by page_code
  const existingByRoute = await pool.query(
    'SELECT id FROM pages_master WHERE route = $1',
    [page.route]
  );
  
  if (existingByRoute.rows.length > 0) {
    // Update existing
    await pool.query(`
      UPDATE pages_master SET
        route_pattern = $1,
        filesystem_path = $2,
        is_dynamic = $3,
        is_governed = $4,
        module_id = COALESCE(module_id, $5),
        last_synced_at = NOW(),
        sync_status = 'ACTIVE',
        is_active = TRUE,
        updated_at = NOW()
      WHERE route = $6
    `, [
      page.routePattern,
      page.filesystemPath,
      page.isDynamic,
      page.isGoverned,
      moduleId,
      page.route
    ]);
    return 'updated';
  }
  
  // Check by page_code
  const existingByCode = await pool.query(
    'SELECT id FROM pages_master WHERE page_code = $1',
    [page.pageCode]
  );
  
  if (existingByCode.rows.length > 0) {
    // Update existing with new route
    await pool.query(`
      UPDATE pages_master SET
        route = $1,
        route_pattern = $2,
        filesystem_path = $3,
        is_dynamic = $4,
        is_governed = $5,
        module_id = COALESCE(module_id, $6),
        last_synced_at = NOW(),
        sync_status = 'ACTIVE',
        is_active = TRUE,
        updated_at = NOW()
      WHERE page_code = $7
    `, [
      page.route,
      page.routePattern,
      page.filesystemPath,
      page.isDynamic,
      page.isGoverned,
      moduleId,
      page.pageCode
    ]);
    return 'updated';
  }
  
  // Insert new page
  await pool.query(`
    INSERT INTO pages_master (
      page_code, display_name, description, route, route_pattern,
      module_id, icon, sort_order, is_active, show_in_sidebar,
      is_governed, is_dynamic, filesystem_path, last_synced_at, sync_status
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, TRUE, $9,
      $10, $11, $12, NOW(), 'ACTIVE'
    )
  `, [
    page.pageCode,
    page.displayName,
    `Auto-generated from ${page.filesystemPath}`,
    page.route,
    page.routePattern,
    moduleId,
    'Circle',  // Default icon
    100,       // Default sort order
    page.isGoverned && !page.isDynamic,  // Only show in sidebar if governed and not dynamic
    page.isGoverned,
    page.isDynamic,
    page.filesystemPath
  ]);
  
  return 'inserted';
}

async function markOrphanedPages(pool, scannedRoutes) {
  // Get all active pages that weren't found in filesystem
  const result = await pool.query(`
    UPDATE pages_master 
    SET sync_status = 'ORPHANED', last_synced_at = NOW()
    WHERE is_active = TRUE 
      AND sync_status = 'ACTIVE'
      AND route NOT IN (SELECT UNNEST($1::text[]))
      AND route NOT LIKE '/api/%'
      AND route IS NOT NULL
    RETURNING route
  `, [scannedRoutes]);
  
  return result.rows.map(r => r.route);
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

async function syncPages(options = {}) {
  const { dryRun = false, ciMode = false, reportMode = false } = options;
  
  console.log('============================================================');
  console.log('BISMAN ERP - Page Sync Script');
  console.log('============================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : ciMode ? 'CI' : 'SYNC'}`);
  console.log(`App Directory: ${CONFIG.appDir}`);
  console.log(`Database: ${CONFIG.databaseUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log('------------------------------------------------------------\n');
  
  // Check app directory exists
  if (!fs.existsSync(CONFIG.appDir)) {
    console.error(`ERROR: App directory not found: ${CONFIG.appDir}`);
    process.exit(1);
  }
  
  // Find all page.tsx files
  const pattern = path.join(CONFIG.appDir, '**/page.tsx');
  const files = glob.sync(pattern.replace(/\\/g, '/'));
  
  console.log(`Found ${files.length} page.tsx files\n`);
  
  // Process each file
  const pages = [];
  const excluded = [];
  
  for (const file of files) {
    const route = filesystemToRoute(file);
    
    if (shouldExclude(route)) {
      excluded.push({ route, reason: 'Excluded by pattern' });
      continue;
    }
    
    const routePattern = createRoutePattern(route);
    const moduleCode = detectModuleCode(route);
    const isGoverned = isGovernedRoute(route);
    
    pages.push({
      filesystemPath: path.relative(CONFIG.appDir, file),
      route,
      routePattern,
      pageCode: generatePageCode(route),
      displayName: generateDisplayName(route),
      moduleCode,
      isDynamic: isDynamicRoute(route),
      isGoverned,
    });
  }
  
  console.log(`Processed: ${pages.length} pages`);
  console.log(`Excluded: ${excluded.length} files\n`);
  
  // Connect to database
  const pool = await getPool();
  
  try {
    // Get module mapping
    const modulesMap = await getModulesMap(pool);
    console.log(`Loaded ${Object.keys(modulesMap).length} modules from DB\n`);
    
    // Get existing pages
    const existing = await getExistingPages(pool);
    console.log(`Existing pages in DB: ${existing.rows.length}\n`);
    
    // Track changes
    const inserted = [];
    const updated = [];
    const orphaned = [];
    const newGovernedPages = [];
    
    // Process each scanned page
    for (const page of pages) {
      if (dryRun) {
        const existsInDB = existing.byRoute[page.route] || existing.byCode[page.pageCode];
        if (!existsInDB) {
          inserted.push(page);
          if (page.isGoverned) {
            newGovernedPages.push(page);
          }
        } else {
          updated.push(page);
        }
      } else {
        const result = await upsertPage(pool, page, modulesMap);
        if (result === 'inserted') {
          inserted.push(page);
          if (page.isGoverned) {
            newGovernedPages.push(page);
          }
        } else {
          updated.push(page);
        }
      }
    }
    
    // Mark orphaned pages (only in non-dry-run mode)
    const scannedRoutes = pages.map(p => p.route);
    if (!dryRun) {
      const orphanedRoutes = await markOrphanedPages(pool, scannedRoutes);
      orphaned.push(...orphanedRoutes);
    } else {
      // In dry run, calculate what would be orphaned
      for (const row of existing.rows) {
        if (row.is_active && row.sync_status === 'ACTIVE' && !scannedRoutes.includes(row.route)) {
          orphaned.push(row.route);
        }
      }
    }
    
    // Print summary
    console.log('============================================================');
    console.log('SYNC SUMMARY');
    console.log('============================================================');
    console.log(`Total Scanned:    ${pages.length}`);
    console.log(`Inserted:         ${inserted.length}`);
    console.log(`Updated:          ${updated.length}`);
    console.log(`Orphaned (DB only): ${orphaned.length}`);
    console.log(`Excluded:         ${excluded.length}`);
    console.log('------------------------------------------------------------\n');
    
    // Print new governed pages (important for RBAC)
    if (newGovernedPages.length > 0) {
      console.log('⚠️  NEW GOVERNED PAGES (Need RBAC assignment):');
      for (const page of newGovernedPages) {
        console.log(`   ${page.route} → ${page.moduleCode}`);
      }
      console.log('');
    }
    
    // Print orphaned pages
    if (orphaned.length > 0) {
      console.log('⚠️  ORPHANED PAGES (In DB but not filesystem):');
      for (const route of orphaned) {
        console.log(`   ${route}`);
      }
      console.log('');
    }
    
    // Print inserted pages
    if (inserted.length > 0) {
      console.log('✅ INSERTED PAGES:');
      for (const page of inserted.slice(0, 20)) {
        console.log(`   ${page.route} → ${page.moduleCode}`);
      }
      if (inserted.length > 20) {
        console.log(`   ... and ${inserted.length - 20} more`);
      }
      console.log('');
    }
    
    // Generate report if requested
    if (reportMode) {
      const report = generateReport(pages, existing.rows, inserted, updated, orphaned, excluded);
      const reportPath = path.resolve(__dirname, '../docs/PAGE_SYNC_REPORT.md');
      fs.writeFileSync(reportPath, report);
      console.log(`📄 Report generated: ${reportPath}\n`);
    }
    
    // CI mode: fail if new governed pages exist
    if (ciMode && newGovernedPages.length > 0) {
      console.error('\n❌ CI FAILURE: New governed pages require RBAC setup before deployment.');
      console.error('   Run the sync script locally and configure role_page_access for:');
      for (const page of newGovernedPages) {
        console.error(`   - ${page.route}`);
      }
      process.exit(1);
    }
    
    console.log('✅ Sync complete!\n');
    
  } finally {
    await pool.end();
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReport(scanned, existing, inserted, updated, orphaned, excluded) {
  const now = new Date().toISOString();
  
  return `# Page Sync Report

**Generated:** ${now}
**Script:** sync-pages-master.js

## Summary

| Metric | Count |
|--------|-------|
| Scanned (filesystem) | ${scanned.length} |
| Existing (database) | ${existing.length} |
| Inserted | ${inserted.length} |
| Updated | ${updated.length} |
| Orphaned | ${orphaned.length} |
| Excluded | ${excluded.length} |

## By Module

${generateModuleBreakdown(scanned)}

## Inserted Pages

${inserted.length === 0 ? 'None\n' : inserted.map(p => `- \`${p.route}\` → ${p.moduleCode}`).join('\n')}

## Orphaned Pages

${orphaned.length === 0 ? 'None\n' : orphaned.map(r => `- \`${r}\``).join('\n')}

## Excluded Files

${excluded.length === 0 ? 'None\n' : excluded.map(e => `- \`${e.route}\` (${e.reason})`).join('\n')}
`;
}

function generateModuleBreakdown(pages) {
  const byModule = {};
  for (const page of pages) {
    if (!byModule[page.moduleCode]) {
      byModule[page.moduleCode] = [];
    }
    byModule[page.moduleCode].push(page);
  }
  
  return Object.entries(byModule)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mod, pages]) => `| ${mod} | ${pages.length} |`)
    .join('\n');
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  ciMode: args.includes('--ci'),
  reportMode: args.includes('--report'),
};

if (args.includes('--help')) {
  console.log(`
Usage: node sync-pages-master.js [options]

Options:
  --dry-run    Preview changes without modifying database
  --ci         CI mode: fail if new governed pages need RBAC setup
  --report     Generate markdown report
  --help       Show this help message
`);
  process.exit(0);
}

syncPages(options).catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
