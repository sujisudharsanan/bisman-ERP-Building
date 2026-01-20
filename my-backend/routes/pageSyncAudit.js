/**
 * Page Sync Audit Routes
 * Generates audit report comparing DB, Registry, and Filesystem pages
 * 
 * Categories:
 * - DB_ONLY: exists in DB but not in registry
 * - REGISTRY_ONLY: exists in registry but not in DB
 * - FS_ONLY: exists in filesystem but not in DB
 * - OK_MATCHED: exists in both DB and registry
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Only enterprise admins and super admins can access
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

/**
 * GET /api/page-sync/audit
 * Generate comprehensive page sync audit report
 */
router.get('/audit', ...adminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    // 1. Get all pages from DB
    const dbPages = await prisma.$queryRaw`
      SELECT 
        id,
        page_code,
        page_name,
        page_path,
        module_id,
        show_in_sidebar,
        status,
        created_at,
        updated_at
      FROM pages_master
      ORDER BY page_code
    `;
    
    const dbPageCodes = new Set(dbPages.map(p => p.page_code));
    // eslint-disable-next-line no-unused-vars
    const dbPagePaths = new Set(dbPages.map(p => p.page_path).filter(Boolean));
    
    // 2. Get registry pages (from pagesRoutes.js SYSTEM_PAGES)
    let registryPages = [];
    try {
      const pagesRoutes = require('./pagesRoutes');
      // Access SYSTEM_PAGES if exported, otherwise use API
      if (pagesRoutes.SYSTEM_PAGES) {
        registryPages = pagesRoutes.SYSTEM_PAGES;
      }
    } catch {
      // Fallback: read from file
      const pagesRoutesPath = path.join(__dirname, 'pagesRoutes.js');
      const content = fs.readFileSync(pagesRoutesPath, 'utf8');
      const matches = content.matchAll(/\{\s*key:\s*'([^']+)',\s*name:\s*'([^']+)',\s*module:\s*'([^']+)'\s*\}/g);
      for (const match of matches) {
        registryPages.push({ key: match[1], name: match[2], module: match[3] });
      }
    }
    
    const registryCodes = new Set(registryPages.map(p => p.key));
    
    // 3. Scan filesystem for page.tsx files
    const frontendAppDir = path.join(__dirname, '../../my-frontend/src/app');
    const fsPages = [];
    
    function scanDir(dir, prefix = '') {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.isDirectory() && !item.name.startsWith('_') && !item.name.startsWith('.')) {
            const subPath = path.join(dir, item.name);
            const routePath = prefix + '/' + item.name;
            
            // Check if page.tsx exists
            if (fs.existsSync(path.join(subPath, 'page.tsx'))) {
              // Convert path to page code: /admin/dashboard -> admin-dashboard
              const pageCode = routePath.replace(/^\//, '').replace(/\//g, '-');
              fsPages.push({
                code: pageCode,
                path: routePath,
                file: path.join(subPath, 'page.tsx')
              });
            }
            
            // Recurse into subdirectories
            scanDir(subPath, routePath);
          }
        }
      } catch {
        // Ignore errors for inaccessible directories
      }
    }
    
    scanDir(frontendAppDir);
    // eslint-disable-next-line no-unused-vars
    const fsCodes = new Set(fsPages.map(p => p.code));
    
    // 4. Categorize pages
    const categories = {
      DB_ONLY: [],      // In DB but not in registry
      REGISTRY_ONLY: [], // In registry but not in DB
      FS_ONLY: [],      // In filesystem but not in DB
      OK_MATCHED: [],   // In both DB and registry
      ORPHAN_FS: []     // In filesystem but not in registry or DB
    };
    
    // Check DB pages
    for (const dbPage of dbPages) {
      if (registryCodes.has(dbPage.page_code)) {
        categories.OK_MATCHED.push({
          code: dbPage.page_code,
          name: dbPage.page_name,
          path: dbPage.page_path,
          source: 'DB+REGISTRY',
          status: dbPage.status,
          show_in_sidebar: dbPage.show_in_sidebar
        });
      } else {
        categories.DB_ONLY.push({
          code: dbPage.page_code,
          name: dbPage.page_name,
          path: dbPage.page_path,
          source: 'DB',
          status: dbPage.status,
          recommendation: 'Mark inactive or add to registry'
        });
      }
    }
    
    // Check registry pages not in DB
    for (const regPage of registryPages) {
      if (!dbPageCodes.has(regPage.key)) {
        categories.REGISTRY_ONLY.push({
          code: regPage.key,
          name: regPage.name,
          module: regPage.module,
          source: 'REGISTRY',
          recommendation: 'Add to pages_master'
        });
      }
    }
    
    // Check filesystem pages
    for (const fsPage of fsPages) {
      if (!dbPageCodes.has(fsPage.code) && !registryCodes.has(fsPage.code)) {
        categories.ORPHAN_FS.push({
          code: fsPage.code,
          path: fsPage.path,
          source: 'FILESYSTEM',
          recommendation: 'Add to registry and DB, or delete'
        });
      } else if (!dbPageCodes.has(fsPage.code)) {
        categories.FS_ONLY.push({
          code: fsPage.code,
          path: fsPage.path,
          source: 'FILESYSTEM',
          recommendation: 'Add to pages_master'
        });
      }
    }
    
    // 5. Generate summary
    const summary = {
      total_db: dbPages.length,
      total_registry: registryPages.length,
      total_filesystem: fsPages.length,
      matched: categories.OK_MATCHED.length,
      db_only: categories.DB_ONLY.length,
      registry_only: categories.REGISTRY_ONLY.length,
      fs_only: categories.FS_ONLY.length,
      orphan_fs: categories.ORPHAN_FS.length,
      sync_score: Math.round((categories.OK_MATCHED.length / Math.max(dbPages.length, registryPages.length)) * 100)
    };
    
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      summary,
      categories,
      recommendations: [
        summary.registry_only > 0 ? `Add ${summary.registry_only} registry pages to DB` : null,
        summary.db_only > 0 ? `Review ${summary.db_only} DB-only pages (mark inactive or sync)` : null,
        summary.orphan_fs > 0 ? `${summary.orphan_fs} filesystem pages have no registry/DB entry` : null,
        summary.sync_score < 90 ? `Sync score is ${summary.sync_score}% - needs improvement` : null
      ].filter(Boolean)
    });
    
  } catch (error) {
    console.error('[PageSyncAudit] Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/page-sync/sync-registry-to-db
 * Sync missing registry pages to database
 */
router.post('/sync-registry-to-db', ...adminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { dryRun = true } = req.body;
    
    // Get current DB pages
    const dbPages = await prisma.$queryRaw`
      SELECT page_code FROM pages_master
    `;
    const dbPageCodes = new Set(dbPages.map(p => p.page_code));
    
    // Get registry pages
    const pagesRoutesPath = path.join(__dirname, 'pagesRoutes.js');
    const content = fs.readFileSync(pagesRoutesPath, 'utf8');
    const registryPages = [];
    const matches = content.matchAll(/\{\s*key:\s*'([^']+)',\s*name:\s*'([^']+)',\s*module:\s*'([^']+)'\s*\}/g);
    for (const match of matches) {
      registryPages.push({ key: match[1], name: match[2], module: match[3] });
    }
    
    // Find missing pages
    const toInsert = registryPages.filter(p => !dbPageCodes.has(p.key));
    
    if (dryRun) {
      return res.json({
        ok: true,
        dryRun: true,
        toInsert: toInsert.length,
        pages: toInsert,
        message: 'Set dryRun=false to execute'
      });
    }
    
    // Insert missing pages
    let inserted = 0;
    for (const page of toInsert) {
      try {
        await prisma.$executeRaw`
          INSERT INTO pages_master (page_code, page_name, page_path, module_id, show_in_sidebar, status, created_at, updated_at)
          VALUES (
            ${page.key},
            ${page.name},
            ${'/' + page.key.replace(/-/g, '/')},
            (SELECT id FROM modules_master WHERE module_name = ${page.module} LIMIT 1),
            true,
            'active',
            NOW(),
            NOW()
          )
          ON CONFLICT (page_code) DO NOTHING
        `;
        inserted++;
      } catch (e) {
        console.error(`Failed to insert ${page.key}:`, e.message);
      }
    }
    
    res.json({
      ok: true,
      inserted,
      total: toInsert.length,
      message: `Synced ${inserted} pages from registry to DB`
    });
    
  } catch (error) {
    console.error('[PageSyncAudit] Sync error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/page-sync/mark-orphans-inactive
 * Mark DB-only pages as inactive (safe cleanup)
 */
router.post('/mark-orphans-inactive', ...adminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { dryRun = true, pageIds = [] } = req.body;
    
    if (pageIds.length === 0) {
      return res.status(400).json({ ok: false, error: 'No pageIds provided' });
    }
    
    if (dryRun) {
      const pages = await prisma.$queryRaw`
        SELECT id, page_code, page_name, status
        FROM pages_master
        WHERE id = ANY(${pageIds}::int[])
      `;
      return res.json({
        ok: true,
        dryRun: true,
        toMarkInactive: pages,
        message: 'Set dryRun=false to execute'
      });
    }
    
    const result = await prisma.$executeRaw`
      UPDATE pages_master
      SET status = 'inactive', updated_at = NOW()
      WHERE id = ANY(${pageIds}::int[])
      AND status = 'active'
    `;
    
    res.json({
      ok: true,
      updated: result,
      message: `Marked ${result} pages as inactive`
    });
    
  } catch (error) {
    console.error('[PageSyncAudit] Mark inactive error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
