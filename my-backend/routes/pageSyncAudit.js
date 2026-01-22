/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PAGE SYNC ENGINE - PERMANENT PAGE GAP ELIMINATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SINGLE SOURCE OF TRUTH RULES:
 * - FILESYSTEM (page.tsx) = truth for page EXISTENCE
 * - DATABASE (pages_master) = truth for RBAC + sidebar visibility
 * - REGISTRY (PAGE_REGISTRY) = UI metadata only (icons/labels)
 * 
 * RECONCILIATION RULES:
 * - FILE_ONLY → Auto-insert into DB (show_in_sidebar=false, is_active=true)
 * - DB_ONLY → Set is_active=false, show_in_sidebar=false (never delete)
 * - REGISTRY_ONLY → Flag as registry_broken (needs manual cleanup)
 * 
 * ENDPOINTS:
 * - GET  /api/page-sync/audit       → Full audit report
 * - GET  /api/page-sync/stats       → Quick statistics
 * - GET  /api/page-sync/fs-pages    → List filesystem pages
 * - GET  /api/page-sync/db-pages    → List database pages
 * - GET  /api/page-sync/broken      → List broken routes only
 * - POST /api/page-sync/reconcile   → Apply fixes (dryRun default)
 * - GET  /api/page-sync/health      → CI/CD health check (pass/fail)
 * - GET  /api/page-sync/sql         → Generate SQL for manual review
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const FRONTEND_APP_DIR = path.join(__dirname, '../../my-frontend/src/app');
const PAGE_REGISTRY_PATH = path.join(__dirname, '../../my-frontend/src/common/config/page-registry.ts');

// Module placeholders - folders that are module roots, not actual pages
const MODULE_PLACEHOLDERS = new Set([
  'admin', 'billing', 'budget-approval', 'common', 'compliance', 
  'enterprise-admin', 'finance', 'governance', 'hr', 'internal', 
  'operations', 'procurement', 'pump-management', 'qa', 'super-admin', 
  'system', 'subscriptions', 'ai', 'crm', 'chat', 'inventory', 'sales',
  'auth', 'api', 'public', 'static', 'onboarding', 'get-started'
]);

// Routes that should be marked as public (no RBAC)
const PUBLIC_ROUTES = new Set([
  '/',
  '/auth/login',
  '/auth/admin-login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/register',
  '/get-started',
  '/onboarding/trial',
  '/onboarding/trial/quick',
  '/onboarding/trial/resume'
]);

// Default module assignments for auto-insert
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
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

// Admin-only middleware for sensitive operations
const adminOnly = [
  authenticate,
  (req, res, next) => {
    const role = req.user?.role || req.user?.roleName || '';
    if (!['SUPER_ADMIN', 'ENTERPRISE_ADMIN'].includes(role.toUpperCase())) {
      return res.status(403).json({ ok: false, error: 'Admin access required' });
    }
    next();
  }
];

// Super Admin only for reconciliation
const superAdminOnly = [
  authenticate,
  (req, res, next) => {
    const role = req.user?.role || req.user?.roleName || '';
    if (role.toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({ ok: false, error: 'Super Admin access required' });
    }
    next();
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert filesystem path to route path using Next.js App Router rules
 */
function filePathToRoute(filePath, appDir) {
  let relativePath = path.relative(appDir, filePath);
  
  // Remove /page.tsx suffix
  relativePath = relativePath.replace(/[/\\]page\.tsx$/, '');
  
  // Handle route groups: (groupName)/... → ...
  relativePath = relativePath.replace(/\([^)]+\)[/\\]?/g, '');
  
  // Convert backslashes to forward slashes
  relativePath = relativePath.replace(/\\/g, '/');
  
  // Build route
  let route = '/' + relativePath;
  
  // Clean up multiple slashes
  route = route.replace(/\/+/g, '/');
  
  // Remove trailing slash unless root
  if (route !== '/' && route.endsWith('/')) {
    route = route.slice(0, -1);
  }
  
  // Handle root page
  if (route === '/' || route === '') {
    return '/';
  }
  
  return route;
}

/**
 * Normalize route for consistent comparison
 */
function normalizeRoute(route) {
  if (!route) return '';
  let normalized = String(route).toLowerCase().trim();
  
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  
  if (normalized !== '/' && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  
  return normalized;
}

/**
 * Recursively find all page.tsx files in directory
 */
function findPageFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    console.warn(`[PageSync] Directory not found: ${dir}`);
    return files;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && 
            !entry.name.startsWith('_') && 
            entry.name !== 'node_modules' &&
            entry.name !== '.next') {
          findPageFiles(fullPath, files);
        }
      } else if (entry.name === 'page.tsx') {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.warn(`[PageSync] Error reading directory ${dir}:`, err.message);
  }
  
  return files;
}

/**
 * Extract routes from PAGE_REGISTRY TypeScript file
 */
function extractRegistryRoutes(registryPath) {
  if (!fs.existsSync(registryPath)) {
    console.warn(`[PageSync] Registry file not found: ${registryPath}`);
    return [];
  }
  
  try {
    const content = fs.readFileSync(registryPath, 'utf8');
    const routes = [];
    
    const pathRegex = /path:\s*['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = pathRegex.exec(content)) !== null) {
      const route = match[1];
      if (!route.startsWith('http') && 
          !route.includes('${') && 
          !route.startsWith('/api/')) {
        routes.push({
          route: normalizeRoute(route),
          original: route
        });
      }
    }
    
    const seen = new Set();
    return routes.filter(r => {
      if (seen.has(r.route)) return false;
      seen.add(r.route);
      return true;
    });
  } catch (err) {
    console.warn(`[PageSync] Error reading registry:`, err.message);
    return [];
  }
}

/**
 * Check if a route represents a module placeholder
 */
function isModulePlaceholder(route) {
  const normalized = normalizeRoute(route);
  const parts = normalized.split('/').filter(Boolean);
  
  if (parts.length === 1) {
    return MODULE_PLACEHOLDERS.has(parts[0].toLowerCase());
  }
  
  return false;
}

/**
 * Determine module from route
 */
function getModuleFromRoute(route) {
  const normalized = normalizeRoute(route);
  const parts = normalized.split('/').filter(Boolean);
  return parts[0] || 'root';
}

/**
 * Generate page_code from route
 */
function generatePageCode(route) {
  return route
    .replace(/^\//, '')
    .replace(/\//g, '_')
    .replace(/\[(\w+)\]/g, '$1')
    .replace(/-/g, '_')
    .toUpperCase() || 'ROOT';
}

/**
 * Generate display name from route
 */
function generateDisplayName(route) {
  const parts = route.split('/').filter(Boolean);
  const lastPart = parts[parts.length - 1] || 'Home';
  return lastPart
    .replace(/\[(\w+)\]/g, '$1 Detail')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Check if route is a public/auth route
 */
function isPublicRoute(route) {
  const normalized = normalizeRoute(route);
  
  if (PUBLIC_ROUTES.has(normalized)) return true;
  if (normalized.startsWith('/auth/')) return true;
  if (normalized.startsWith('/onboarding/')) return true;
  if (normalized === '/get-started') return true;
  if (normalized === '/') return true;
  
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE AUDIT FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

async function runPageAudit(prisma) {
  const startTime = Date.now();
  
  // 1. SCAN FILESYSTEM
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
  
  // 2. LOAD DATABASE PAGES
  let dbPages = [];
  try {
    const rawPages = await prisma.$queryRaw`
      SELECT 
        id,
        page_code,
        route,
        display_name,
        module_id,
        icon,
        is_active,
        show_in_sidebar,
        is_public,
        layout_group,
        created_at
      FROM pages_master
      ORDER BY route
    `;
    
    dbPages = rawPages.map(p => ({
      id: p.id,
      page_code: p.page_code,
      route: normalizeRoute(p.route),
      original_route: p.route,
      display_name: p.display_name,
      module_id: p.module_id,
      icon: p.icon,
      is_active: p.is_active,
      show_in_sidebar: p.show_in_sidebar,
      is_public: p.is_public,
      layout_group: p.layout_group
    }));
  } catch (dbErr) {
    console.warn('[PageSync] Database query failed:', dbErr.message);
  }
  
  const dbRealPages = dbPages.filter(p => !isModulePlaceholder(p.route));
  const dbRouteSet = new Set(dbRealPages.map(p => p.route));
  
  // 3. LOAD REGISTRY ROUTES
  const registryRoutes = extractRegistryRoutes(PAGE_REGISTRY_PATH);
  const registryRealRoutes = registryRoutes.filter(r => !isModulePlaceholder(r.route));
  const registryRouteSet = new Set(registryRealRoutes.map(r => r.route));
  
  // 4. PERFORM COMPARISONS
  const results = {
    OK_MATCHED: [],
    FILE_ONLY: [],
    DB_ONLY: [],
    REGISTRY_ONLY: [],
    BROKEN_ROUTES: []
  };
  
  // A) OK_MATCHED
  for (const fsPage of fsRealPages) {
    if (dbRouteSet.has(fsPage.route)) {
      const dbPage = dbPages.find(p => p.route === fsPage.route);
      results.OK_MATCHED.push({
        route: fsPage.originalRoute,
        filePath: fsPage.filePath,
        page_code: dbPage?.page_code,
        display_name: dbPage?.display_name,
        module: fsPage.module,
        is_active: dbPage?.is_active,
        show_in_sidebar: dbPage?.show_in_sidebar,
        in_registry: registryRouteSet.has(fsPage.route),
        status: '✅ OK'
      });
    }
  }
  
  // B) FILE_ONLY
  for (const fsPage of fsRealPages) {
    if (!dbRouteSet.has(fsPage.route)) {
      const moduleDefaults = MODULE_DEFAULTS[fsPage.module] || { module_code: 'COMMON', layout_group: 'common' };
      results.FILE_ONLY.push({
        route: fsPage.originalRoute,
        filePath: fsPage.filePath,
        module: fsPage.module,
        is_public: fsPage.isPublic,
        in_registry: registryRouteSet.has(fsPage.route),
        suggested_page_code: generatePageCode(fsPage.originalRoute),
        suggested_display_name: generateDisplayName(fsPage.originalRoute),
        suggested_module_code: moduleDefaults.module_code,
        suggested_layout_group: moduleDefaults.layout_group,
        status: '⚠️ NEEDS_DB_INSERT',
        action: 'INSERT into pages_master with show_in_sidebar=false, is_active=true'
      });
    }
  }
  
  // C) DB_ONLY
  for (const dbPage of dbRealPages) {
    if (!fsRouteSet.has(dbPage.route)) {
      results.DB_ONLY.push({
        id: dbPage.id,
        route: dbPage.original_route,
        page_code: dbPage.page_code,
        display_name: dbPage.display_name,
        is_active: dbPage.is_active,
        show_in_sidebar: dbPage.show_in_sidebar,
        status: dbPage.is_active ? '🔴 ACTIVE_ORPHAN' : '⚠️ INACTIVE_ORPHAN',
        action: dbPage.is_active 
          ? 'SET is_active=false, show_in_sidebar=false'
          : 'Already inactive (can be cleaned up later)'
      });
    }
  }
  
  // D) REGISTRY_ONLY
  for (const regRoute of registryRealRoutes) {
    if (!fsRouteSet.has(regRoute.route)) {
      const inDb = dbRouteSet.has(regRoute.route);
      results.REGISTRY_ONLY.push({
        route: regRoute.original,
        in_database: inDb,
        registry_broken: true,
        status: '⚠️ REGISTRY_ORPHAN',
        action: 'Remove from PAGE_REGISTRY or create page.tsx file'
      });
    }
  }
  
  // E) BROKEN_ROUTES (union of DB_ONLY + REGISTRY_ONLY)
  const brokenSet = new Set();
  for (const item of results.DB_ONLY) {
    const key = normalizeRoute(item.route);
    if (!brokenSet.has(key)) {
      brokenSet.add(key);
      results.BROKEN_ROUTES.push({
        route: item.route,
        source: 'database',
        page_code: item.page_code,
        display_name: item.display_name,
        is_active: item.is_active,
        id: item.id
      });
    }
  }
  for (const item of results.REGISTRY_ONLY) {
    const key = normalizeRoute(item.route);
    if (!brokenSet.has(key)) {
      brokenSet.add(key);
      results.BROKEN_ROUTES.push({
        route: item.route,
        source: 'registry',
        in_database: item.in_database
      });
    }
  }
  
  const elapsedMs = Date.now() - startTime;
  
  return {
    timestamp: new Date().toISOString(),
    elapsed_ms: elapsedMs,
    counts: {
      fs_real_pages: fsRealPages.length,
      db_pages: dbRealPages.length,
      registry_pages: registryRealRoutes.length,
      ok_matched: results.OK_MATCHED.length,
      file_only: results.FILE_ONLY.length,
      db_only: results.DB_ONLY.length,
      registry_only: results.REGISTRY_ONLY.length,
      broken_routes: results.BROKEN_ROUTES.length
    },
    health_score: fsRealPages.length > 0 
      ? Math.round((results.OK_MATCHED.length / fsRealPages.length) * 100)
      : 100,
    is_healthy: results.DB_ONLY.filter(p => p.is_active).length === 0 && 
                results.FILE_ONLY.length === 0,
    results
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/page-sync/audit
 */
router.get('/audit', ...adminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const audit = await runPageAudit(prisma);
    
    res.json({
      ok: true,
      ...audit,
      lists: {
        OK_MATCHED: audit.results.OK_MATCHED.slice(0, 100),
        FILE_ONLY: audit.results.FILE_ONLY,
        DB_ONLY: audit.results.DB_ONLY,
        REGISTRY_ONLY: audit.results.REGISTRY_ONLY.slice(0, 50),
        BROKEN_ROUTES: audit.results.BROKEN_ROUTES
      },
      recommendations: [
        audit.counts.broken_routes > 0 
          ? `🔴 FIX FIRST: ${audit.counts.broken_routes} broken routes need attention`
          : null,
        audit.results.DB_ONLY.filter(p => p.is_active).length > 0
          ? `⚠️ DEACTIVATE: ${audit.results.DB_ONLY.filter(p => p.is_active).length} active DB entries have no page file`
          : null,
        audit.counts.file_only > 0
          ? `📝 ADD TO DB: ${audit.counts.file_only} page files missing from pages_master`
          : null,
        audit.counts.registry_only > 0
          ? `📋 CLEANUP: ${audit.counts.registry_only} registry entries need removal`
          : null,
        audit.is_healthy
          ? '✅ System is healthy - all pages synced'
          : null
      ].filter(Boolean)
    });
    
  } catch (error) {
    console.error('[PageSync] Audit error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/page-sync/health
 * CI/CD health check - returns pass/fail status
 */
router.get('/health', async (req, res) => {
  try {
    const prisma = getPrisma();
    const audit = await runPageAudit(prisma);
    
    const activeOrphans = audit.results.DB_ONLY.filter(p => p.is_active);
    const hasIssues = activeOrphans.length > 0 || audit.counts.file_only > 0;
    
    if (hasIssues) {
      res.status(400).json({
        ok: false,
        status: 'FAIL',
        message: 'Page sync issues detected',
        issues: {
          active_orphans: activeOrphans.length,
          file_only: audit.counts.file_only,
          broken_routes: audit.counts.broken_routes
        },
        details: {
          active_orphan_routes: activeOrphans.map(p => p.route),
          file_only_routes: audit.results.FILE_ONLY.map(p => p.route).slice(0, 10)
        },
        action: 'Run POST /api/page-sync/reconcile to fix issues before deploying'
      });
    } else {
      res.json({
        ok: true,
        status: 'PASS',
        message: 'All pages synced correctly',
        health_score: audit.health_score,
        counts: {
          matched: audit.counts.ok_matched,
          total_fs: audit.counts.fs_real_pages,
          total_db: audit.counts.db_pages
        }
      });
    }
  } catch (error) {
    res.status(500).json({ ok: false, status: 'ERROR', error: error.message });
  }
});

/**
 * GET /api/page-sync/broken
 */
router.get('/broken', ...adminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const audit = await runPageAudit(prisma);
    
    res.json({
      ok: true,
      count: audit.counts.broken_routes,
      active_orphans: audit.results.DB_ONLY.filter(p => p.is_active).length,
      routes: audit.results.BROKEN_ROUTES
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/page-sync/fs-pages
 */
router.get('/fs-pages', ...adminOnly, (req, res) => {
  try {
    const pageFiles = findPageFiles(FRONTEND_APP_DIR);
    const fsPages = pageFiles.map(filePath => {
      const route = filePathToRoute(filePath, FRONTEND_APP_DIR);
      return {
        filePath: filePath.replace(FRONTEND_APP_DIR, 'src/app'),
        route: route,
        module: getModuleFromRoute(route),
        isPlaceholder: isModulePlaceholder(route),
        isPublic: isPublicRoute(route)
      };
    });
    
    res.json({
      ok: true,
      count: fsPages.length,
      real_pages: fsPages.filter(p => !p.isPlaceholder).length,
      pages: fsPages
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/page-sync/db-pages
 */
router.get('/db-pages', ...adminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    const pages = await prisma.$queryRaw`
      SELECT 
        id,
        page_code,
        route,
        display_name,
        module_id,
        is_active,
        show_in_sidebar,
        is_public,
        created_at
      FROM pages_master
      ORDER BY route
    `;
    
    res.json({
      ok: true,
      count: pages.length,
      active: pages.filter(p => p.is_active).length,
      in_sidebar: pages.filter(p => p.show_in_sidebar).length,
      pages: pages
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/page-sync/stats
 */
router.get('/stats', ...adminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    const pageFiles = findPageFiles(FRONTEND_APP_DIR);
    const fsCount = pageFiles.filter(f => {
      const route = normalizeRoute(filePathToRoute(f, FRONTEND_APP_DIR));
      return !isModulePlaceholder(route);
    }).length;
    
    const dbResult = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE show_in_sidebar = true) as in_sidebar
      FROM pages_master
    `;
    
    res.json({
      ok: true,
      filesystem_pages: fsCount,
      database_pages_total: Number(dbResult[0]?.total || 0),
      database_pages_active: Number(dbResult[0]?.active || 0),
      database_pages_in_sidebar: Number(dbResult[0]?.in_sidebar || 0),
      note: 'Run /api/page-sync/audit for full comparison'
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/page-sync/reconcile
 * Apply fixes to sync filesystem and database
 */
router.post('/reconcile', ...superAdminOnly, async (req, res) => {
  try {
    const { 
      dryRun = true, 
      applyDbOnly = true, 
      applyFileOnly = true,
      generateSql = false 
    } = req.body;
    
    const prisma = getPrisma();
    const audit = await runPageAudit(prisma);
    const changes = {
      deactivated: [],
      inserted: [],
      sql_statements: []
    };
    
    // RULE A: FILE_ONLY → Insert into DB
    if (applyFileOnly && audit.results.FILE_ONLY.length > 0) {
      for (const page of audit.results.FILE_ONLY) {
        const sql = `INSERT INTO pages_master (page_code, display_name, route, is_active, show_in_sidebar, is_public, layout_group, created_at, updated_at)
VALUES ('${page.suggested_page_code}', '${page.suggested_display_name}', '${page.route}', true, false, ${page.is_public}, '${page.suggested_layout_group}', NOW(), NOW())
ON CONFLICT (page_code) DO NOTHING;`;
        
        changes.sql_statements.push(sql);
        
        if (!dryRun && !generateSql) {
          try {
            await prisma.$executeRaw`
              INSERT INTO pages_master (page_code, display_name, route, is_active, show_in_sidebar, is_public, layout_group, created_at, updated_at)
              VALUES (${page.suggested_page_code}, ${page.suggested_display_name}, ${page.route}, true, false, ${page.is_public}, ${page.suggested_layout_group}, NOW(), NOW())
              ON CONFLICT (page_code) DO NOTHING
            `;
            changes.inserted.push({
              page_code: page.suggested_page_code,
              route: page.route
            });
          } catch (insertErr) {
            console.warn(`[PageSync] Insert failed for ${page.route}:`, insertErr.message);
          }
        } else {
          changes.inserted.push({
            page_code: page.suggested_page_code,
            route: page.route,
            would_insert: true
          });
        }
      }
    }
    
    // RULE B: DB_ONLY → Deactivate (never delete)
    if (applyDbOnly && audit.results.DB_ONLY.length > 0) {
      const activeOrphans = audit.results.DB_ONLY.filter(p => p.is_active);
      
      for (const page of activeOrphans) {
        const sql = `UPDATE pages_master 
SET is_active = false, show_in_sidebar = false, updated_at = NOW()
WHERE id = ${page.id};
-- Route: ${page.route}`;
        
        changes.sql_statements.push(sql);
        
        if (!dryRun && !generateSql) {
          try {
            await prisma.$executeRaw`
              UPDATE pages_master 
              SET is_active = false, show_in_sidebar = false, updated_at = NOW()
              WHERE id = ${page.id}
            `;
            changes.deactivated.push({
              id: page.id,
              page_code: page.page_code,
              route: page.route
            });
          } catch (updateErr) {
            console.warn(`[PageSync] Deactivate failed for ${page.route}:`, updateErr.message);
          }
        } else {
          changes.deactivated.push({
            id: page.id,
            page_code: page.page_code,
            route: page.route,
            would_deactivate: true
          });
        }
      }
    }
    
    const response = {
      ok: true,
      dryRun,
      generateSql,
      timestamp: new Date().toISOString(),
      summary: {
        file_only_count: audit.counts.file_only,
        db_only_count: audit.counts.db_only,
        active_orphans: audit.results.DB_ONLY.filter(p => p.is_active).length,
        would_insert: changes.inserted.length,
        would_deactivate: changes.deactivated.length
      },
      changes
    };
    
    if (generateSql) {
      response.sql = changes.sql_statements.join('\n\n');
    }
    
    if (!dryRun) {
      response.message = `Applied ${changes.inserted.length} inserts and ${changes.deactivated.length} deactivations`;
      console.log(`[PageSync] Reconciliation applied by ${req.user?.email || 'unknown'}:`, {
        inserted: changes.inserted.length,
        deactivated: changes.deactivated.length
      });
    } else {
      response.message = 'Dry run complete - no changes applied. Set dryRun=false to apply.';
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('[PageSync] Reconcile error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/page-sync/sql
 * Generate SQL statements for manual review/execution
 */
router.get('/sql', ...adminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const audit = await runPageAudit(prisma);
    
    const statements = [];
    
    statements.push('-- ═══════════════════════════════════════════════════════════════════════════════');
    statements.push('-- PAGE SYNC RECONCILIATION SQL');
    statements.push(`-- Generated: ${new Date().toISOString()}`);
    statements.push('-- ═══════════════════════════════════════════════════════════════════════════════');
    statements.push('');
    
    // RULE B: Deactivate orphans
    const activeOrphans = audit.results.DB_ONLY.filter(p => p.is_active);
    if (activeOrphans.length > 0) {
      statements.push('-- STEP 1: DEACTIVATE ORPHAN DB ENTRIES (no page.tsx file exists)');
      statements.push('');
      
      for (const page of activeOrphans) {
        statements.push(`-- Route: ${page.route}`);
        statements.push(`UPDATE pages_master SET is_active = false, show_in_sidebar = false, updated_at = NOW() WHERE id = ${page.id};`);
        statements.push('');
      }
    }
    
    // RULE A: Insert FILE_ONLY
    if (audit.results.FILE_ONLY.length > 0) {
      statements.push('-- STEP 2: INSERT MISSING PAGES (page.tsx exists but no DB entry)');
      statements.push('');
      
      for (const page of audit.results.FILE_ONLY) {
        statements.push(`-- File: ${page.filePath}`);
        statements.push(`INSERT INTO pages_master (page_code, display_name, route, is_active, show_in_sidebar, is_public, layout_group, created_at, updated_at)`);
        statements.push(`VALUES ('${page.suggested_page_code}', '${page.suggested_display_name}', '${page.route}', true, false, ${page.is_public}, '${page.suggested_layout_group}', NOW(), NOW())`);
        statements.push(`ON CONFLICT (page_code) DO NOTHING;`);
        statements.push('');
      }
    }
    
    // Registry cleanup
    if (audit.results.REGISTRY_ONLY.length > 0) {
      statements.push('-- STEP 3: REGISTRY CLEANUP (manual - edit page-registry.ts)');
      statements.push('-- The following routes are in PAGE_REGISTRY but have no page.tsx file:');
      for (const route of audit.results.REGISTRY_ONLY) {
        statements.push(`-- - ${route.route}`);
      }
      statements.push('-- Action: Remove these from my-frontend/src/common/config/page-registry.ts');
      statements.push('');
    }
    
    // Rollback
    statements.push('-- ROLLBACK (if needed)');
    if (activeOrphans.length > 0) {
      statements.push('-- To revert deactivations:');
      for (const page of activeOrphans) {
        statements.push(`-- UPDATE pages_master SET is_active = true WHERE id = ${page.id}; -- ${page.route}`);
      }
    }
    statements.push('');
    
    res.type('text/plain').send(statements.join('\n'));
    
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REAL PAGES REPORT - Classification of pages into meaningful categories
// ─────────────────────────────────────────────────────────────────────────────

// Technical route prefixes (not counted as "real ERP pages")
const TECHNICAL_PREFIXES = [
  '/auth', '/onboarding', '/get-started', '/access-denied', '/error',
  '/unauthorized', '/health', '/api', '/status', '/signup', '/pricing',
  '/terms', '/privacy', '/support', '/trust-security', '/welcome', '/upgrade-required'
];

// Placeholder patterns to detect in file content
const PLACEHOLDER_PATTERNS = [
  /coming\s*soon/i,
  /under\s*construction/i,
  /not\s*implemented/i,
  /placeholder/i
];

function isTechnicalRoute(route) {
  const normalized = normalizeRoute(route);
  return TECHNICAL_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

function isPlaceholderPage(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8').slice(0, 2000);
    return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(content));
  } catch {
    return false;
  }
}

function isDynamicRoute(route) {
  return route.includes('[') && route.includes(']');
}

/**
 * GET /api/page-sync/real-pages-report
 * Classifies pages into meaningful categories
 */
router.get('/real-pages-report', ...adminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    
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
    
    const realFsPages = fsPages.filter(p => !p.isPlaceholder);
    
    // 2. Load database pages
    const dbPages = await prisma.$queryRaw`
      SELECT 
        pm.id, pm.page_code, pm.route, pm.display_name,
        pm.is_active, pm.show_in_sidebar,
        mm.module_code, mm.display_name as module_name
      FROM pages_master pm
      LEFT JOIN modules_master mm ON pm.module_id = mm.id
      ORDER BY pm.route
    `;
    
    const dbRouteMap = new Map(dbPages.map(p => [normalizeRoute(p.route), p]));
    
    // 3. Classify pages
    const results = {
      REAL_ERP_PAGES: [],
      HIDDEN_PAGES: [],
      TECHNICAL_PAGES: [],
      PLACEHOLDER_PAGES: [],
      DYNAMIC_DETAIL_PAGES: [],
      INACTIVE_DB_PAGES: []
    };
    
    for (const fsPage of realFsPages) {
      const dbPage = dbRouteMap.get(fsPage.route);
      
      if (fsPage.isTechnical) {
        results.TECHNICAL_PAGES.push({
          route: fsPage.originalRoute,
          module: fsPage.module,
          display_name: dbPage?.display_name || fsPage.module,
          in_db: !!dbPage
        });
        continue;
      }
      
      if (fsPage.hasPlaceholderContent) {
        results.PLACEHOLDER_PAGES.push({
          route: fsPage.originalRoute,
          module: fsPage.module,
          display_name: dbPage?.display_name || 'Placeholder',
          in_db: !!dbPage
        });
        continue;
      }
      
      if (fsPage.isDynamic) {
        results.DYNAMIC_DETAIL_PAGES.push({
          route: fsPage.originalRoute,
          module: fsPage.module,
          display_name: dbPage?.display_name || 'Detail Page',
          in_db: !!dbPage,
          show_in_sidebar: dbPage?.show_in_sidebar ?? false
        });
        continue;
      }
      
      if (dbPage) {
        if (dbPage.is_active && dbPage.show_in_sidebar) {
          results.REAL_ERP_PAGES.push({
            route: fsPage.originalRoute,
            page_code: dbPage.page_code,
            display_name: dbPage.display_name,
            module: dbPage.module_code || fsPage.module
          });
        } else {
          results.HIDDEN_PAGES.push({
            route: fsPage.originalRoute,
            page_code: dbPage.page_code,
            display_name: dbPage.display_name,
            module: dbPage.module_code || fsPage.module,
            reason: !dbPage.is_active ? 'is_active=false' : 'show_in_sidebar=false'
          });
        }
      } else {
        results.HIDDEN_PAGES.push({
          route: fsPage.originalRoute,
          page_code: null,
          display_name: 'Unregistered',
          module: fsPage.module,
          reason: 'no DB entry'
        });
      }
    }
    
    // Inactive DB pages
    for (const dbPage of dbPages) {
      if (!dbPage.is_active) {
        results.INACTIVE_DB_PAGES.push({
          route: dbPage.route,
          page_code: dbPage.page_code,
          display_name: dbPage.display_name,
          module: dbPage.module_code
        });
      }
    }
    
    // 4. Module breakdown
    const moduleBreakdown = {};
    for (const page of results.REAL_ERP_PAGES) {
      const mod = page.module || 'UNKNOWN';
      if (!moduleBreakdown[mod]) moduleBreakdown[mod] = { real: 0, hidden: 0, dynamic: 0 };
      moduleBreakdown[mod].real++;
    }
    for (const page of results.HIDDEN_PAGES) {
      const mod = page.module || 'UNKNOWN';
      if (!moduleBreakdown[mod]) moduleBreakdown[mod] = { real: 0, hidden: 0, dynamic: 0 };
      moduleBreakdown[mod].hidden++;
    }
    for (const page of results.DYNAMIC_DETAIL_PAGES) {
      const mod = page.module || 'UNKNOWN';
      if (!moduleBreakdown[mod]) moduleBreakdown[mod] = { real: 0, hidden: 0, dynamic: 0 };
      moduleBreakdown[mod].dynamic++;
    }
    
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_filesystem_pages: realFsPages.length,
        total_db_pages: dbPages.length,
        db_pages_active: dbPages.filter(p => p.is_active).length,
        real_erp_pages: results.REAL_ERP_PAGES.length,
        hidden_pages: results.HIDDEN_PAGES.length,
        technical_pages: results.TECHNICAL_PAGES.length,
        placeholder_pages: results.PLACEHOLDER_PAGES.length,
        dynamic_detail_pages: results.DYNAMIC_DETAIL_PAGES.length,
        inactive_db_pages: results.INACTIVE_DB_PAGES.length,
        breakdown: {
          'User-facing ERP pages (sidebar)': results.REAL_ERP_PAGES.length,
          'Hidden pages (detail views, modals)': results.HIDDEN_PAGES.length,
          'Dynamic [id] pages': results.DYNAMIC_DETAIL_PAGES.length,
          'Technical/Auth pages': results.TECHNICAL_PAGES.length,
          'Placeholder pages': results.PLACEHOLDER_PAGES.length
        }
      },
      module_breakdown: moduleBreakdown,
      lists: {
        REAL_ERP_PAGES: results.REAL_ERP_PAGES.slice(0, 50),
        HIDDEN_PAGES: results.HIDDEN_PAGES.slice(0, 30),
        TECHNICAL_PAGES: results.TECHNICAL_PAGES.slice(0, 30),
        PLACEHOLDER_PAGES: results.PLACEHOLDER_PAGES,
        DYNAMIC_DETAIL_PAGES: results.DYNAMIC_DETAIL_PAGES.slice(0, 30),
        INACTIVE_DB_PAGES: results.INACTIVE_DB_PAGES
      },
      explanation: `Your ${realFsPages.length} filesystem pages break down as: ${results.REAL_ERP_PAGES.length} real ERP pages, ${results.HIDDEN_PAGES.length} hidden pages, ${results.DYNAMIC_DETAIL_PAGES.length} dynamic detail pages, ${results.TECHNICAL_PAGES.length} technical pages, and ${results.PLACEHOLDER_PAGES.length} placeholder pages.`
    });
    
  } catch (error) {
    console.error('[PageSync] Real pages report error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
