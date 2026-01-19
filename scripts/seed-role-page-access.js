#!/usr/bin/env node
/*
 * BISMAN ERP - RBAC Auto-Seeder Script
 * 
 * Purpose: Auto-seed role_page_access for governed pages with safe defaults.
 * 
 * Usage:
 *   node scripts/seed-role-page-access.js --dry-run   # Preview changes
 *   node scripts/seed-role-page-access.js --apply     # Insert into DB
 *   node scripts/seed-role-page-access.js --ci        # CI mode (fail if missing)
 *   node scripts/seed-role-page-access.js --report    # Generate markdown report
 * 
 * Date: 2025-01-19
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Database connection
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/BISMAN',
  
  // Super roles that get access to ALL governed pages
  superRoles: ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'SYSTEM_ADMIN'],
  
  // Module-specific role mappings
  // Key = module_code, Value = roles that get access to that module's pages
  moduleRoleMappings: {
    'SUPER_ADMIN': ['SUPER_ADMIN'],
    'ENTERPRISE_ADMIN': ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'],
    'ADMIN': ['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN'],
    'SYSTEM': ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'SYSTEM_ADMIN', 'IT_ADMIN'],
    'FINANCE': ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTANT', 'ACCOUNTS', 'SUPER_ADMIN'],
    'PROCUREMENT': ['PROCUREMENT_OFFICER', 'MANAGER', 'SUPER_ADMIN'],
    'OPERATIONS': ['OPERATIONS_MANAGER', 'HUB_INCHARGE', 'STORE_INCHARGE', 'SUPER_ADMIN'],
    'COMPLIANCE': ['COMPLIANCE', 'LEGAL', 'AUDITOR', 'SUPER_ADMIN'],
    'HR': ['HR', 'HR_MANAGER', 'SUPER_ADMIN'],
    'BILLING': ['BISMAN_BILLING', 'BISMAN_FINANCE', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN'],
    'REPORTS': ['CFO', 'CEO', 'COO', 'MANAGER', 'SUPER_ADMIN'],
    'GOVERNANCE': ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'AUDITOR'],
    'INTERNAL': ['BISMAN_SUPPORT', 'BISMAN_CUSTOMER_CARE', 'BISMAN_ENGINEERING', 'ENTERPRISE_ADMIN'],
    'QA': ['QA', 'BISMAN_ENGINEERING', 'SUPER_ADMIN'],
    'COMMON': [], // Common pages: will be handled separately
    'DASHBOARD': [], // Dashboard pages: will be handled separately
    'SUBSCRIPTIONS': ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BISMAN_BILLING'],
    'ONBOARDING': [], // Public onboarding - no RBAC needed
    'PUBLIC': [], // Public pages - no RBAC needed
    'AUTH': [], // Auth pages - no RBAC needed
  },
  
  // Roles that get access to all COMMON pages
  commonPageRoles: [
    'SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN', 'SYSTEM_ADMIN',
    'CEO', 'CFO', 'COO', 'CTO',
    'MANAGER', 'SUPERVISOR',
    'HUB_INCHARGE', 'HUB_INCHARGE_SR', 'BRANCH_INCHARGE',
    'FINANCE_CONTROLLER', 'ACCOUNTANT',
    'HR_MANAGER', 'HR',
    'OPERATIONS_MANAGER',
    'STAFF', 'DATA_ENTRY', 'INTERN',
  ],
  
  // Roles that get access to DASHBOARD pages
  dashboardPageRoles: [
    'SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN', 'SYSTEM_ADMIN',
    'CEO', 'CFO', 'COO', 'CTO',
    'MANAGER', 'SUPERVISOR',
    'HUB_INCHARGE', 'HUB_INCHARGE_SR', 'BRANCH_INCHARGE',
    'FINANCE_CONTROLLER', 'ACCOUNTANT',
    'HR_MANAGER', 'HR',
    'OPERATIONS_MANAGER',
    'STAFF', 'DATA_ENTRY',
  ],
  
  // Minimum permissions for auto-seeded roles
  defaultPermissions: {
    can_view: true,
    can_edit: false,
    can_delete: false,
    can_export: false,
  },
  
  // Full permissions for super roles
  superPermissions: {
    can_view: true,
    can_edit: true,
    can_delete: true,
    can_export: true,
  },
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function getPool() {
  return new Pool({
    connectionString: CONFIG.databaseUrl,
    max: 5,
  });
}

/**
 * Get all governed pages that are active
 */
async function getGovernedPages(pool) {
  const result = await pool.query(`
    SELECT 
      p.id,
      p.page_code,
      p.display_name,
      p.route,
      p.module_id,
      m.module_code
    FROM pages_master p
    LEFT JOIN modules_master m ON m.id = p.module_id
    WHERE p.is_active = TRUE
      AND p.is_governed = TRUE
    ORDER BY m.module_code, p.route
  `);
  return result.rows;
}

/**
 * Get existing RBAC mappings
 */
async function getExistingMappings(pool) {
  const result = await pool.query(`
    SELECT page_id, role_name, can_view
    FROM role_page_access
    WHERE can_view = TRUE
  `);
  
  // Build a Set for fast lookup: "pageId:roleName"
  const mappingSet = new Set();
  for (const row of result.rows) {
    mappingSet.add(`${row.page_id}:${row.role_name}`);
  }
  return mappingSet;
}

/**
 * Get pages missing any RBAC mapping
 */
async function getPagesMissingRbac(pool) {
  const result = await pool.query(`
    SELECT 
      p.id,
      p.page_code,
      p.display_name,
      p.route,
      m.module_code
    FROM pages_master p
    LEFT JOIN modules_master m ON m.id = p.module_id
    LEFT JOIN role_page_access rpa ON rpa.page_id = p.id AND rpa.can_view = TRUE
    WHERE p.is_active = TRUE
      AND p.is_governed = TRUE
      AND rpa.id IS NULL
    ORDER BY m.module_code, p.route
  `);
  return result.rows;
}

/**
 * Determine which roles should have access to a page
 */
function getRolesForPage(page) {
  const moduleCode = page.module_code || 'COMMON';
  const roles = new Set();
  
  // Super roles always get access
  for (const role of CONFIG.superRoles) {
    roles.add(role);
  }
  
  // Module-specific roles
  const moduleRoles = CONFIG.moduleRoleMappings[moduleCode] || [];
  for (const role of moduleRoles) {
    roles.add(role);
  }
  
  // COMMON pages get broader access
  if (moduleCode === 'COMMON') {
    for (const role of CONFIG.commonPageRoles) {
      roles.add(role);
    }
  }
  
  // DASHBOARD pages get broader access
  if (moduleCode === 'DASHBOARD') {
    for (const role of CONFIG.dashboardPageRoles) {
      roles.add(role);
    }
  }
  
  return Array.from(roles);
}

/**
 * Get permissions for a role
 */
function getPermissionsForRole(roleName) {
  if (CONFIG.superRoles.includes(roleName)) {
    return CONFIG.superPermissions;
  }
  return CONFIG.defaultPermissions;
}

/**
 * Insert RBAC mappings
 */
async function insertMappings(pool, mappings) {
  if (mappings.length === 0) return 0;
  
  const client = await pool.connect();
  let inserted = 0;
  
  try {
    await client.query('BEGIN');
    
    for (const mapping of mappings) {
      try {
        await client.query(`
          INSERT INTO role_page_access 
          (page_id, role_name, can_view, can_edit, can_delete, can_export, auto_seeded, notes)
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, 'Auto-seeded by seed-role-page-access.js')
          ON CONFLICT (role_name, page_id) 
          DO UPDATE SET 
            can_view = EXCLUDED.can_view,
            auto_seeded = TRUE,
            notes = 'Updated by seed-role-page-access.js'
        `, [
          mapping.pageId,
          mapping.roleName,
          mapping.permissions.can_view,
          mapping.permissions.can_edit,
          mapping.permissions.can_delete,
          mapping.permissions.can_export,
        ]);
        inserted++;
      } catch (err) {
        console.error(`  Failed to insert mapping for page ${mapping.pageId}, role ${mapping.roleName}:`, err.message);
      }
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  
  return inserted;
}

// ============================================================================
// MAIN SEEDER FUNCTION
// ============================================================================

async function seedRbac(options = {}) {
  const { dryRun = false, ciMode = false, reportMode = false, apply = false } = options;
  
  console.log('============================================================');
  console.log('BISMAN ERP - RBAC Auto-Seeder');
  console.log('============================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : ciMode ? 'CI CHECK' : apply ? 'APPLY' : 'PREVIEW'}`);
  console.log(`Database: ${CONFIG.databaseUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log('------------------------------------------------------------\n');
  
  const pool = await getPool();
  
  try {
    // Get governed pages
    const governedPages = await getGovernedPages(pool);
    console.log(`Total governed pages: ${governedPages.length}`);
    
    // Get existing mappings
    const existingMappings = await getExistingMappings(pool);
    console.log(`Existing RBAC mappings: ${existingMappings.size}`);
    
    // Get pages missing RBAC
    const pagesMissingRbac = await getPagesMissingRbac(pool);
    console.log(`Pages missing ANY RBAC mapping: ${pagesMissingRbac.length}\n`);
    
    // Calculate mappings to insert
    const mappingsToInsert = [];
    const mappingsByPage = {};
    
    for (const page of governedPages) {
      const roles = getRolesForPage(page);
      mappingsByPage[page.id] = [];
      
      for (const roleName of roles) {
        const key = `${page.id}:${roleName}`;
        
        if (!existingMappings.has(key)) {
          const permissions = getPermissionsForRole(roleName);
          mappingsToInsert.push({
            pageId: page.id,
            pageCode: page.page_code,
            route: page.route,
            roleName,
            permissions,
          });
          mappingsByPage[page.id].push(roleName);
        }
      }
    }
    
    console.log(`Mappings to insert: ${mappingsToInsert.length}`);
    console.log('------------------------------------------------------------\n');
    
    // Group by module for display
    const byModule = {};
    for (const mapping of mappingsToInsert) {
      const page = governedPages.find(p => p.id === mapping.pageId);
      const module = page?.module_code || 'UNKNOWN';
      if (!byModule[module]) {
        byModule[module] = [];
      }
      byModule[module].push(mapping);
    }
    
    // Display changes
    if (mappingsToInsert.length > 0) {
      console.log('📋 MAPPINGS TO BE INSERTED:');
      console.log('');
      
      for (const [module, mappings] of Object.entries(byModule).sort()) {
        console.log(`  ${module} (${mappings.length} mappings):`);
        
        // Group by page
        const pageGroups = {};
        for (const m of mappings) {
          if (!pageGroups[m.route]) {
            pageGroups[m.route] = [];
          }
          pageGroups[m.route].push(m.roleName);
        }
        
        for (const [route, roles] of Object.entries(pageGroups).slice(0, 5)) {
          console.log(`    ${route}`);
          console.log(`      → ${roles.slice(0, 5).join(', ')}${roles.length > 5 ? ` +${roles.length - 5} more` : ''}`);
        }
        
        if (Object.keys(pageGroups).length > 5) {
          console.log(`    ... and ${Object.keys(pageGroups).length - 5} more pages`);
        }
        console.log('');
      }
    }
    
    // Display pages still missing RBAC after seeding
    const stillMissingAfterSeed = pagesMissingRbac.filter(p => {
      return !mappingsToInsert.some(m => m.pageId === p.id);
    });
    
    if (stillMissingAfterSeed.length > 0) {
      console.log('⚠️  PAGES STILL WITHOUT RBAC AFTER SEEDING:');
      for (const page of stillMissingAfterSeed.slice(0, 10)) {
        console.log(`   ${page.route} (${page.module_code || 'UNKNOWN'})`);
      }
      if (stillMissingAfterSeed.length > 10) {
        console.log(`   ... and ${stillMissingAfterSeed.length - 10} more`);
      }
      console.log('');
    }
    
    // CI Mode: Fail if pages are missing RBAC
    if (ciMode) {
      if (pagesMissingRbac.length > 0) {
        console.error('\n❌ CI FAILURE: Governed pages are missing RBAC mappings.');
        console.error(`   ${pagesMissingRbac.length} pages have no role access configured.`);
        console.error('');
        console.error('   To fix this, run:');
        console.error('   node scripts/seed-role-page-access.js --apply');
        console.error('');
        console.error('   Pages missing RBAC:');
        for (const page of pagesMissingRbac.slice(0, 20)) {
          console.error(`   - ${page.route}`);
        }
        if (pagesMissingRbac.length > 20) {
          console.error(`   ... and ${pagesMissingRbac.length - 20} more`);
        }
        process.exit(1);
      }
      
      console.log('✅ CI CHECK PASSED: All governed pages have RBAC mappings.');
      process.exit(0);
    }
    
    // Apply mode: Insert mappings
    if (apply && !dryRun) {
      console.log('🔧 APPLYING CHANGES...\n');
      
      const inserted = await insertMappings(pool, mappingsToInsert);
      
      console.log(`✅ Inserted ${inserted} RBAC mappings.`);
      console.log('');
      
      // Re-check pages missing RBAC
      const stillMissing = await getPagesMissingRbac(pool);
      if (stillMissing.length > 0) {
        console.log(`⚠️  ${stillMissing.length} pages still have no RBAC mapping.`);
        console.log('   These may be pages without configured roles in the seeder.');
      } else {
        console.log('✅ All governed pages now have RBAC mappings.');
      }
    } else if (dryRun) {
      console.log('ℹ️  DRY RUN: No changes made to database.');
      console.log('   Run with --apply to insert mappings.');
    }
    
    // Generate report if requested
    if (reportMode) {
      const report = generateReport(governedPages, pagesMissingRbac, mappingsToInsert, byModule);
      const reportPath = path.resolve(__dirname, '../docs/RBAC_SEED_REPORT.md');
      fs.writeFileSync(reportPath, report);
      console.log(`\n📄 Report generated: ${reportPath}`);
    }
    
    // Summary
    console.log('\n============================================================');
    console.log('SUMMARY');
    console.log('============================================================');
    console.log(`Total governed pages:       ${governedPages.length}`);
    console.log(`Pages with existing RBAC:   ${governedPages.length - pagesMissingRbac.length}`);
    console.log(`Pages missing RBAC:         ${pagesMissingRbac.length}`);
    console.log(`Mappings to insert:         ${mappingsToInsert.length}`);
    console.log('');
    
  } finally {
    await pool.end();
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReport(governedPages, pagesMissingRbac, mappingsToInsert, byModule) {
  const now = new Date().toISOString();
  
  return `# RBAC Seed Report

**Generated:** ${now}
**Script:** seed-role-page-access.js

## Summary

| Metric | Count |
|--------|-------|
| Total Governed Pages | ${governedPages.length} |
| Pages Missing RBAC | ${pagesMissingRbac.length} |
| Mappings to Insert | ${mappingsToInsert.length} |

## Mappings by Module

${Object.entries(byModule)
  .sort()
  .map(([mod, mappings]) => `| ${mod} | ${mappings.length} mappings |`)
  .join('\n')}

## Pages Missing RBAC

${pagesMissingRbac.length === 0 ? 'None\n' : pagesMissingRbac.map(p => `- \`${p.route}\` (${p.module_code || 'UNKNOWN'})`).join('\n')}

## Configuration

### Super Roles (Access to ALL governed pages)
${CONFIG.superRoles.map(r => `- ${r}`).join('\n')}

### Module Role Mappings
${Object.entries(CONFIG.moduleRoleMappings)
  .filter(([, roles]) => roles.length > 0)
  .map(([mod, roles]) => `- **${mod}**: ${roles.join(', ')}`)
  .join('\n')}
`;
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  apply: args.includes('--apply'),
  ciMode: args.includes('--ci'),
  reportMode: args.includes('--report'),
};

if (args.includes('--help')) {
  console.log(`
Usage: node seed-role-page-access.js [options]

Options:
  --dry-run    Preview changes without modifying database
  --apply      Insert RBAC mappings into database
  --ci         CI mode: exit non-zero if pages missing RBAC
  --report     Generate markdown report
  --help       Show this help message

Examples:
  node seed-role-page-access.js --dry-run
  node seed-role-page-access.js --apply
  node seed-role-page-access.js --ci
`);
  process.exit(0);
}

// Default to dry-run if no mode specified
if (!options.dryRun && !options.apply && !options.ciMode) {
  options.dryRun = true;
}

seedRbac(options).catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
