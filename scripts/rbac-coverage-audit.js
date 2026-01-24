/* eslint-env node, commonjs */
/**
 * BISMAN ERP - Role ↔ Page Mapping Coverage Audit
 * 
 * This script performs a comprehensive audit of the RBAC system to ensure:
 * - Every role has pages mapped
 * - Every active page has at least one role mapped
 * - No orphan or duplicate mappings exist
 * - No route collisions in pages_master
 * 
 * Run: node scripts/rbac-coverage-audit.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway'
});

// Store results for final verdict
const auditResults = {
  totalRoles: 0,
  totalActivePages: 0,
  pagesWithRoles: 0,
  pagesWithoutRoles: 0,
  orphanMappings: 0,
  duplicateMappings: 0,
  routeCollisions: 0,
  issues: []
};

async function runAudit() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    BISMAN ERP - RBAC COVERAGE AUDIT REPORT                           ║');
  console.log('║                    Railway Production Database                                        ║');
  console.log('║                    Generated: ' + new Date().toISOString() + '                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Get total active pages count first
    const totalPagesRes = await pool.query(`
      SELECT COUNT(*) as total FROM pages_master WHERE is_active = true
    `);
    auditResults.totalActivePages = parseInt(totalPagesRes.rows[0].total);

    await sectionA_RolesSummary();
    await sectionB_UnassignedPages();
    await sectionC_PagesMultipleRoles();
    await sectionD_OrphanMappings();
    await sectionE_DuplicateMappings();
    await sectionF_RouteCollisions();
    await sectionG_FinalVerdict();

  } catch (err) {
    console.error('AUDIT ERROR:', err);
  } finally {
    await pool.end();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: Roles Summary (Coverage)
// ═══════════════════════════════════════════════════════════════════════════════
async function sectionA_RolesSummary() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('SECTION A: ROLES SUMMARY (COVERAGE)');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('');

  const query = `
    WITH role_stats AS (
      SELECT 
        r.id,
        r.name,
        r.display_name,
        r.level,
        r.status,
        COUNT(DISTINCT rpa.page_id) FILTER (WHERE rpa.can_view = true) as total_mapped_pages,
        COUNT(DISTINCT rpa.page_id) FILTER (
          WHERE rpa.can_view = true 
          AND pm.show_in_sidebar = true 
          AND pm.is_active = true
        ) as sidebar_pages,
        COUNT(DISTINCT rpa.page_id) FILTER (
          WHERE rpa.can_view = true AND pm.is_active = true
        ) as active_pages_mapped,
        COUNT(DISTINCT rpa.page_id) FILTER (
          WHERE rpa.can_view = true AND pm.is_active = false
        ) as inactive_pages_mapped
      FROM rbac_roles r
      LEFT JOIN role_page_access rpa ON r.name = rpa.role_name
      LEFT JOIN pages_master pm ON pm.id = rpa.page_id
      GROUP BY r.id, r.name, r.display_name, r.level, r.status
    )
    SELECT 
      id,
      name,
      display_name,
      level,
      status,
      total_mapped_pages,
      sidebar_pages,
      active_pages_mapped,
      inactive_pages_mapped,
      ROUND(
        (active_pages_mapped::numeric / NULLIF((SELECT COUNT(*) FROM pages_master WHERE is_active = true), 0)) * 100, 
        1
      ) as coverage_pct
    FROM role_stats
    ORDER BY total_mapped_pages ASC, name
  `;

  const result = await pool.query(query);
  auditResults.totalRoles = result.rows.length;

  console.log(`Total Roles: ${result.rows.length}`);
  console.log(`Total Active Pages in System: ${auditResults.totalActivePages}`);
  console.log('');
  console.log('┌──────────────────────────┬────────────────────────┬───────┬──────────┬─────────┬─────────┬────────┬──────────┬──────────┐');
  console.log('│ Role Name                │ Display Name           │ Level │ Status   │ Total   │ Sidebar │ Active │ Inactive │ Coverage │');
  console.log('├──────────────────────────┼────────────────────────┼───────┼──────────┼─────────┼─────────┼────────┼──────────┼──────────┤');
  
  result.rows.forEach(row => {
    const name = (row.name || '').padEnd(24).slice(0, 24);
    const displayName = (row.display_name || '-').padEnd(22).slice(0, 22);
    const level = String(row.level || '-').padEnd(5);
    const status = (row.status || '-').padEnd(8).slice(0, 8);
    const total = String(row.total_mapped_pages || 0).padEnd(7);
    const sidebar = String(row.sidebar_pages || 0).padEnd(7);
    const active = String(row.active_pages_mapped || 0).padEnd(6);
    const inactive = String(row.inactive_pages_mapped || 0).padEnd(8);
    const coverage = (row.coverage_pct ? row.coverage_pct + '%' : '0%').padEnd(8);
    
    console.log(`│ ${name} │ ${displayName} │ ${level} │ ${status} │ ${total} │ ${sidebar} │ ${active} │ ${inactive} │ ${coverage} │`);
  });
  
  console.log('└──────────────────────────┴────────────────────────┴───────┴──────────┴─────────┴─────────┴────────┴──────────┴──────────┘');

  // Identify roles with zero pages
  const zeroPageRoles = result.rows.filter(r => parseInt(r.total_mapped_pages) === 0);
  if (zeroPageRoles.length > 0) {
    console.log('');
    console.log('⚠️  WARNING: Roles with ZERO pages mapped:');
    zeroPageRoles.forEach(r => console.log(`   • ${r.name} (${r.display_name || 'no display name'})`));
    auditResults.issues.push(`${zeroPageRoles.length} roles have zero pages mapped`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B: Unassigned Pages (CRITICAL)
// ═══════════════════════════════════════════════════════════════════════════════
async function sectionB_UnassignedPages() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('SECTION B: UNASSIGNED PAGES (CRITICAL - Active pages with NO role mapped)');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('');

  const query = `
    SELECT 
      pm.id as page_id,
      pm.page_code,
      pm.display_name,
      pm.route,
      pm.show_in_sidebar,
      COALESCE(m.display_name, 'UNKNOWN') AS module_name
    FROM pages_master pm
    LEFT JOIN role_page_access rpa 
      ON rpa.page_id = pm.id AND rpa.can_view = true
    LEFT JOIN modules_master m ON m.id = pm.module_id
    WHERE pm.is_active = true
    GROUP BY pm.id, pm.page_code, pm.display_name, pm.route, pm.show_in_sidebar, m.display_name
    HAVING COUNT(rpa.page_id) = 0
    ORDER BY module_name, pm.display_name
  `;

  const result = await pool.query(query);
  auditResults.pagesWithoutRoles = result.rows.length;
  auditResults.pagesWithRoles = auditResults.totalActivePages - result.rows.length;

  if (result.rows.length === 0) {
    console.log('✅ ALL ACTIVE PAGES HAVE AT LEAST ONE ROLE ASSIGNED');
    console.log('   No unassigned pages found.');
  } else {
    console.log(`❌ CRITICAL: ${result.rows.length} active pages have NO role assigned!`);
    console.log('');
    console.table(result.rows);
    auditResults.issues.push(`${result.rows.length} active pages have no role assigned`);
    
    // Group by module for better visibility
    console.log('');
    console.log('Unassigned pages by module:');
    const byModule = {};
    result.rows.forEach(row => {
      const mod = row.module_name || 'UNKNOWN';
      if (!byModule[mod]) byModule[mod] = [];
      byModule[mod].push(row);
    });
    
    Object.keys(byModule).sort().forEach(mod => {
      console.log(`\n   📁 ${mod}:`);
      byModule[mod].forEach(p => {
        const sidebar = p.show_in_sidebar ? '📌' : '  ';
        console.log(`      ${sidebar} ${p.display_name} → ${p.route}`);
      });
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C: Pages Assigned to Multiple Roles
// ═══════════════════════════════════════════════════════════════════════════════
async function sectionC_PagesMultipleRoles() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('SECTION C: PAGES ASSIGNED TO MULTIPLE ROLES (Informational)');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('');

  const query = `
    SELECT 
      pm.id as page_id,
      pm.page_code,
      pm.display_name,
      pm.route,
      COUNT(DISTINCT rpa.role_name) as number_of_roles,
      STRING_AGG(DISTINCT rpa.role_name, ', ' ORDER BY rpa.role_name) as roles
    FROM pages_master pm
    JOIN role_page_access rpa ON rpa.page_id = pm.id AND rpa.can_view = true
    WHERE pm.is_active = true
    GROUP BY pm.id, pm.page_code, pm.display_name, pm.route
    HAVING COUNT(DISTINCT rpa.role_name) > 1
    ORDER BY number_of_roles DESC, pm.display_name
    LIMIT 30
  `;

  const result = await pool.query(query);
  
  if (result.rows.length === 0) {
    console.log('ℹ️  No pages are assigned to multiple roles.');
  } else {
    console.log(`ℹ️  ${result.rows.length} pages are assigned to multiple roles (showing top 30):`);
    console.log('');
    
    // Custom table format for better readability
    console.log('┌─────────┬──────────────────────────────┬────────────────────────────────┬───────┬──────────────────────────────────────────────────────────────┐');
    console.log('│ Page ID │ Display Name                 │ Route                          │ Roles │ Role Names                                                   │');
    console.log('├─────────┼──────────────────────────────┼────────────────────────────────┼───────┼──────────────────────────────────────────────────────────────┤');
    
    result.rows.forEach(row => {
      const pageId = String(row.page_id).padEnd(7);
      const displayName = (row.display_name || '').padEnd(28).slice(0, 28);
      const route = (row.route || '').padEnd(30).slice(0, 30);
      const numRoles = String(row.number_of_roles).padEnd(5);
      const roles = (row.roles || '').slice(0, 60).padEnd(60);
      
      console.log(`│ ${pageId} │ ${displayName} │ ${route} │ ${numRoles} │ ${roles} │`);
    });
    
    console.log('└─────────┴──────────────────────────────┴────────────────────────────────┴───────┴──────────────────────────────────────────────────────────────┘');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION D: Orphan Role Mappings (Data Bug)
// ═══════════════════════════════════════════════════════════════════════════════
async function sectionD_OrphanMappings() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('SECTION D: ORPHAN ROLE MAPPINGS (page_id not in pages_master)');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('');

  const query = `
    SELECT 
      rpa.role_name,
      rpa.page_id,
      rpa.can_view,
      rpa.can_edit,
      rpa.can_delete
    FROM role_page_access rpa
    LEFT JOIN pages_master pm ON pm.id = rpa.page_id
    WHERE pm.id IS NULL
    ORDER BY rpa.role_name, rpa.page_id
  `;

  const result = await pool.query(query);
  auditResults.orphanMappings = result.rows.length;

  if (result.rows.length === 0) {
    console.log('✅ No orphan mappings found. All page_ids in role_page_access exist in pages_master.');
  } else {
    console.log(`❌ DATA BUG: ${result.rows.length} orphan mappings found (page_id doesn't exist):`);
    console.log('');
    console.table(result.rows);
    auditResults.issues.push(`${result.rows.length} orphan mappings (invalid page_ids)`);
    
    console.log('');
    console.log('🔧 FIX: Run the following SQL to clean up orphan mappings:');
    console.log('   DELETE FROM role_page_access WHERE page_id NOT IN (SELECT id FROM pages_master);');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION E: Duplicate Mappings (Data Bug)
// ═══════════════════════════════════════════════════════════════════════════════
async function sectionE_DuplicateMappings() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('SECTION E: DUPLICATE MAPPINGS (same role_name + page_id multiple times)');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('');

  const query = `
    SELECT 
      role_name,
      page_id,
      COUNT(*) as duplicate_count
    FROM role_page_access
    GROUP BY role_name, page_id
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC, role_name, page_id
  `;

  const result = await pool.query(query);
  auditResults.duplicateMappings = result.rows.length;

  if (result.rows.length === 0) {
    console.log('✅ No duplicate mappings found. Each (role_name, page_id) pair is unique.');
  } else {
    console.log(`❌ DATA BUG: ${result.rows.length} duplicate mappings found:`);
    console.log('');
    console.table(result.rows);
    auditResults.issues.push(`${result.rows.length} duplicate role-page mappings`);
    
    console.log('');
    console.log('🔧 FIX: Consider adding a unique constraint:');
    console.log('   ALTER TABLE role_page_access ADD CONSTRAINT unique_role_page UNIQUE (role_name, page_id);');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION F: Route Collisions (App Bug Risk)
// ═══════════════════════════════════════════════════════════════════════════════
async function sectionF_RouteCollisions() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('SECTION F: ROUTE COLLISIONS (same route for multiple pages)');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('');

  const query = `
    SELECT 
      route,
      COUNT(*) as page_count,
      STRING_AGG(page_code, ', ' ORDER BY page_code) as page_codes,
      STRING_AGG(CAST(id AS TEXT), ', ' ORDER BY id) as page_ids
    FROM pages_master
    WHERE route IS NOT NULL AND route != ''
    GROUP BY route
    HAVING COUNT(*) > 1
    ORDER BY page_count DESC, route
  `;

  const result = await pool.query(query);
  auditResults.routeCollisions = result.rows.length;

  if (result.rows.length === 0) {
    console.log('✅ No route collisions found. Each route maps to exactly one page.');
  } else {
    console.log(`⚠️  WARNING: ${result.rows.length} routes are used by multiple pages:`);
    console.log('');
    console.table(result.rows);
    auditResults.issues.push(`${result.rows.length} route collisions`);
    
    console.log('');
    console.log('🔧 RECOMMENDATION: Review these routes and ensure only one page uses each route.');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION G: Final Compliance Verdict
// ═══════════════════════════════════════════════════════════════════════════════
async function sectionG_FinalVerdict() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('SECTION G: FINAL COMPLIANCE VERDICT');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('');

  const passed = auditResults.pagesWithoutRoles === 0 && 
                 auditResults.orphanMappings === 0 && 
                 auditResults.duplicateMappings === 0;

  console.log('┌─────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│                              AUDIT SUMMARY                                          │');
  console.log('├─────────────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│  Total Roles in System:                    ${String(auditResults.totalRoles).padStart(6)}                                   │`);
  console.log(`│  Total Active Pages in System:             ${String(auditResults.totalActivePages).padStart(6)}                                   │`);
  console.log(`│  Pages with at least 1 role:               ${String(auditResults.pagesWithRoles).padStart(6)}                                   │`);
  console.log(`│  Pages with ZERO roles (unassigned):       ${String(auditResults.pagesWithoutRoles).padStart(6)}                                   │`);
  console.log(`│  Orphan Mappings (invalid page_ids):       ${String(auditResults.orphanMappings).padStart(6)}                                   │`);
  console.log(`│  Duplicate Mappings:                       ${String(auditResults.duplicateMappings).padStart(6)}                                   │`);
  console.log(`│  Route Collisions:                         ${String(auditResults.routeCollisions).padStart(6)}                                   │`);
  console.log('├─────────────────────────────────────────────────────────────────────────────────────┤');
  
  if (passed) {
    console.log('│                                                                                     │');
    console.log('│   ██████╗  █████╗ ███████╗███████╗███████╗██████╗                                   │');
    console.log('│   ██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗                                  │');
    console.log('│   ██████╔╝███████║███████╗███████╗█████╗  ██║  ██║                                  │');
    console.log('│   ██╔═══╝ ██╔══██║╚════██║╚════██║██╔══╝  ██║  ██║                                  │');
    console.log('│   ██║     ██║  ██║███████║███████║███████╗██████╔╝                                  │');
    console.log('│   ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═════╝                                   │');
    console.log('│                                                                                     │');
    console.log('│   ✅ RBAC COVERAGE AUDIT PASSED                                                     │');
    console.log('│   All active pages have at least one role assigned.                                 │');
    console.log('│   No data integrity issues found.                                                   │');
    console.log('│                                                                                     │');
  } else {
    console.log('│                                                                                     │');
    console.log('│   ███████╗ █████╗ ██╗██╗     ███████╗██████╗                                        │');
    console.log('│   ██╔════╝██╔══██╗██║██║     ██╔════╝██╔══██╗                                       │');
    console.log('│   █████╗  ███████║██║██║     █████╗  ██║  ██║                                       │');
    console.log('│   ██╔══╝  ██╔══██║██║██║     ██╔══╝  ██║  ██║                                       │');
    console.log('│   ██║     ██║  ██║██║███████╗███████╗██████╔╝                                       │');
    console.log('│   ╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═════╝                                        │');
    console.log('│                                                                                     │');
    console.log('│   ❌ RBAC COVERAGE AUDIT FAILED                                                     │');
    console.log('│                                                                                     │');
    console.log('│   Issues Found:                                                                     │');
    auditResults.issues.forEach(issue => {
      const paddedIssue = ('   • ' + issue).padEnd(85);
      console.log(`│${paddedIssue}│`);
    });
    console.log('│                                                                                     │');
  }
  
  console.log('└─────────────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('                              END OF AUDIT REPORT');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('');
}

// Run the audit
runAudit();
