/**
 * Page Sync Audit Routes
 * 
 * API endpoints for filesystem-first page auditing
 * 
 * GET /api/page-sync/audit - Run full audit
 * GET /api/page-sync/fs-pages - List filesystem pages only
 * GET /api/page-sync/db-pages - List database pages only
 * POST /api/page-sync/fix - Fix issues (dry run by default)
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const FRONTEND_APP_DIR = path.join(__dirname, '../../../my-frontend/src/app');
const PAGE_REGISTRY_PATH = path.join(__dirname, '../../../my-frontend/src/common/config/page-registry.ts');

// Module placeholder IDs to exclude from page comparisons
const MODULE_PLACEHOLDERS = new Set([
  'admin', 'billing', 'budget-approval', 'common', 'compliance', 
  'enterprise-admin', 'finance', 'governance', 'hr', 'internal', 
  'operations', 'procurement', 'pump-management', 'qa', 'super-admin', 
  'system', 'subscriptions', 'ai', 'crm', 'chat', 'inventory', 'sales'
]);

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert filesystem path to route path (App Router rules)
 */
function filePathToRoute(filePath, appDir) {
  let relativePath = path.relative(appDir, filePath);
  relativePath = relativePath.replace(/\/page\.tsx$/, '');
  relativePath = relativePath.replace(/\([^)]+\)\//g, '');
  relativePath = relativePath.replace(/\([^)]+\)$/g, '');
  
  let route = '/' + relativePath;
  route = route.replace(/\/+/g, '/');
  if (route !== '/' && route.endsWith('/')) {
    route = route.slice(0, -1);
  }
  
  return route === '/' ? '/' : route;
}

/**
 * Normalize route for comparison
 */
function normalizeRoute(route) {
  if (!route) return '';
  let normalized = route.toLowerCase().trim();
  if (normalized !== '/' && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  return normalized;
}

/**
 * Recursively find all page.tsx files
 */
function findPageFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        findPageFiles(fullPath, files);
      }
    } else if (entry.name === 'page.tsx') {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract routes from PAGE_REGISTRY
 */
function extractRegistryRoutes(registryPath) {
  if (!fs.existsSync(registryPath)) return [];
  
  const content = fs.readFileSync(registryPath, 'utf8');
  const routes = [];
  const pathRegex = /path:\s*['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = pathRegex.exec(content)) !== null) {
    const route = match[1];
    if (!route.startsWith('http') && !route.includes('${')) {
      routes.push({
        route: normalizeRoute(route),
        original: route
      });
    }
  }
  
  return routes;
}

/**
 * Check if route is a module placeholder
 */
function isModulePlaceholder(route) {
  const parts = route.split('/').filter(Boolean);
  if (parts.length === 1) {
    return MODULE_PLACEHOLDERS.has(parts[0]);
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/page-sync/audit
 * Run full page audit
 */
router.get('/audit', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    
    // 1. Scan filesystem
    const pageFiles = findPageFiles(FRONTEND_APP_DIR);
    const fsPages = pageFiles.map(filePath => ({
      filePath: filePath.replace(FRONTEND_APP_DIR, 'src/app'),
      route: normalizeRoute(filePathToRoute(filePath, FRONTEND_APP_DIR)),
      originalRoute: filePathToRoute(filePath, FRONTEND_APP_DIR)
    }));
    const fsRouteSet = new Set(fsPages.map(p => p.route));
    
    // 2. Load database pages
    let dbPages = [];
    try {
      const rawPages = await prisma.$queryRaw`
        SELECT 
          page_code,
          route as route_path,
          display_name,
          is_active,
          show_in_sidebar
        FROM pages_master
        ORDER BY route
      `;
      dbPages = rawPages.map(p => ({
        page_code: p.page_code,
        route: normalizeRoute(p.route_path),
        original_route: p.route_path,
        display_name: p.display_name,
        is_active: p.is_active,
        show_in_sidebar: p.show_in_sidebar
      }));
    } catch (dbErr) {
      console.warn('Database query failed:', dbErr.message);
    }
    const dbRouteSet = new Set(dbPages.map(p => p.route));
    
    // 3. Load registry routes
    const registryRoutes = extractRegistryRoutes(PAGE_REGISTRY_PATH);
    const registryRouteSet = new Set(registryRoutes.map(r => r.route));
    
    // 4. Perform comparisons
    const results = {
      OK_MATCHED: [],
      FILE_ONLY: [],
      DB_ONLY: [],
      REGISTRY_ONLY: [],
      BROKEN_ROUTES: []
    };
    
    // A) OK_MATCHED
    for (const fsPage of fsPages) {
      if (isModulePlaceholder(fsPage.route)) continue;
      if (dbRouteSet.has(fsPage.route)) {
        const dbPage = dbPages.find(p => p.route === fsPage.route);
        results.OK_MATCHED.push({
          route: fsPage.originalRoute,
          page_code: dbPage?.page_code,
          display_name: dbPage?.display_name,
          is_active: dbPage?.is_active,
          show_in_sidebar: dbPage?.show_in_sidebar
        });
      }
    }
    
    // B) FILE_ONLY
    for (const fsPage of fsPages) {
      if (isModulePlaceholder(fsPage.route)) continue;
      if (!dbRouteSet.has(fsPage.route)) {
        results.FILE_ONLY.push({
          route: fsPage.originalRoute,
          filePath: fsPage.filePath,
          suggestion: 'Add to pages_master or mark as dev-only'
        });
      }
    }
    
    // C) DB_ONLY
    for (const dbPage of dbPages) {
      if (isModulePlaceholder(dbPage.route)) continue;
      if (!fsRouteSet.has(dbPage.route)) {
        results.DB_ONLY.push({
          route: dbPage.original_route,
          page_code: dbPage.page_code,
          display_name: dbPage.display_name,
          is_active: dbPage.is_active,
          suggestion: 'Mark inactive or fix route'
        });
      }
    }
    
    // D) REGISTRY_ONLY
    for (const regRoute of registryRoutes) {
      if (isModulePlaceholder(regRoute.route)) continue;
      if (!fsRouteSet.has(regRoute.route)) {
        results.REGISTRY_ONLY.push({
          route: regRoute.original,
          in_database: dbRouteSet.has(regRoute.route),
          suggestion: 'Remove from PAGE_REGISTRY or create page'
        });
      }
    }
    
    // E) BROKEN_ROUTES
    const brokenSet = new Set();
    for (const item of results.DB_ONLY) {
      if (!brokenSet.has(item.route)) {
        brokenSet.add(item.route);
        results.BROKEN_ROUTES.push({ route: item.route, source: 'database', page_code: item.page_code });
      }
    }
    for (const item of results.REGISTRY_ONLY) {
      if (!brokenSet.has(item.route)) {
        brokenSet.add(item.route);
        results.BROKEN_ROUTES.push({ route: item.route, source: 'registry' });
      }
    }
    
    // Build response
    const auditReport = {
      ok: true,
      timestamp: new Date().toISOString(),
      counts: {
        fs_real_pages: fsPages.filter(p => !isModulePlaceholder(p.route)).length,
        db_pages: dbPages.filter(p => !isModulePlaceholder(p.route)).length,
        registry_pages: registryRoutes.filter(r => !isModulePlaceholder(r.route)).length,
        ok_matched: results.OK_MATCHED.length,
        file_only: results.FILE_ONLY.length,
        db_only: results.DB_ONLY.length,
        registry_only: results.REGISTRY_ONLY.length,
        broken_routes: results.BROKEN_ROUTES.length
      },
      lists: {
        OK_MATCHED: results.OK_MATCHED.slice(0, 100),
        FILE_ONLY: results.FILE_ONLY.slice(0, 100),
        DB_ONLY: results.DB_ONLY.slice(0, 100),
        REGISTRY_ONLY: results.REGISTRY_ONLY.slice(0, 100),
        BROKEN_ROUTES: results.BROKEN_ROUTES.slice(0, 100)
      },
      full_lists_available: {
        ok_matched: results.OK_MATCHED.length,
        file_only: results.FILE_ONLY.length,
        db_only: results.DB_ONLY.length,
        registry_only: results.REGISTRY_ONLY.length,
        broken_routes: results.BROKEN_ROUTES.length
      }
    };
    
    res.json(auditReport);
  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/page-sync/fs-pages
 * List all filesystem pages
 */
router.get('/fs-pages', (req, res) => {
  try {
    const pageFiles = findPageFiles(FRONTEND_APP_DIR);
    const fsPages = pageFiles.map(filePath => ({
      filePath: filePath.replace(FRONTEND_APP_DIR, 'src/app'),
      route: filePathToRoute(filePath, FRONTEND_APP_DIR)
    }));
    
    res.json({
      ok: true,
      count: fsPages.length,
      pages: fsPages
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/page-sync/db-pages
 * List all database pages
 */
router.get('/db-pages', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    
    const pages = await prisma.$queryRaw`
      SELECT 
        page_code,
        route as route_path,
        display_name,
        module_code,
        is_active,
        show_in_sidebar
      FROM pages_master
      ORDER BY route
    `;
    
    res.json({
      ok: true,
      count: pages.length,
      pages: pages
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/page-sync/fix
 * Fix issues (dry run by default)
 * Body: { action: 'deactivate-orphans' | 'insert-missing', dryRun: true }
 */
router.post('/fix', async (req, res) => {
  try {
    const { action, dryRun = true } = req.body;
    const prisma = req.app.get('prisma');
    
    if (action === 'deactivate-orphans') {
      // Find orphan DB pages and deactivate them
      const pageFiles = findPageFiles(FRONTEND_APP_DIR);
      const fsRouteSet = new Set(pageFiles.map(f => normalizeRoute(filePathToRoute(f, FRONTEND_APP_DIR))));
      
      const dbPages = await prisma.$queryRaw`
        SELECT page_code, route FROM pages_master WHERE is_active = true
      `;
      
      const orphans = dbPages.filter(p => !fsRouteSet.has(normalizeRoute(p.route)));
      
      if (dryRun) {
        res.json({
          ok: true,
          dryRun: true,
          action: 'deactivate-orphans',
          would_deactivate: orphans.length,
          pages: orphans.slice(0, 50)
        });
      } else {
        // Actually deactivate
        for (const orphan of orphans) {
          await prisma.$executeRaw`
            UPDATE pages_master SET is_active = false WHERE page_code = ${orphan.page_code}
          `;
        }
        res.json({
          ok: true,
          dryRun: false,
          action: 'deactivate-orphans',
          deactivated: orphans.length
        });
      }
    } else {
      res.status(400).json({ ok: false, error: 'Unknown action. Use: deactivate-orphans' });
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
