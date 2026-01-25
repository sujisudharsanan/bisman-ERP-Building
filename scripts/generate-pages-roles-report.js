/**
 * Generate comprehensive Pages & Roles Report
 * Shows all pages with their URLs and assigned roles
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

async function generateReport() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Generating Pages & Roles Report...\n');
    
    // Get all pages with their assigned roles
    const pagesResult = await client.query(`
      SELECT 
        p.id,
        p.page_code,
        p.display_name,
        p.route,
        p.show_in_sidebar,
        p.status,
        p.icon,
        m.module_code,
        m.display_name as module_name,
        COALESCE(
          (SELECT string_agg(DISTINCT rpa.role_name, ', ' ORDER BY rpa.role_name)
           FROM role_page_access rpa 
           WHERE rpa.page_id = p.id AND rpa.can_view = true),
          ''
        ) as assigned_roles,
        (SELECT COUNT(DISTINCT rpa.role_name)
         FROM role_page_access rpa 
         WHERE rpa.page_id = p.id AND rpa.can_view = true) as role_count
      FROM pages_master p
      LEFT JOIN modules_master m ON m.id = p.module_id
      WHERE p.status = 'active'
      ORDER BY m.sort_order, m.module_code, p.sort_order, p.display_name
    `);
    
    // Get role summary
    const roleSummary = await client.query(`
      SELECT 
        role_name,
        COUNT(*) as page_count
      FROM role_page_access
      WHERE can_view = true
      GROUP BY role_name
      ORDER BY page_count DESC
    `);
    
    // Get SuperAdmin page pool summary
    const pagePoolSummary = await client.query(`
      SELECT 
        sa.id as superadmin_id,
        sa.name as superadmin_name,
        COUNT(pp.page_id) as pages_in_pool
      FROM super_admins sa
      LEFT JOIN superadmin_page_pool pp ON pp.superadmin_id = sa.id AND pp.is_active = true
      GROUP BY sa.id, sa.name
      ORDER BY sa.id
    `);
    
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];
    
    // Build report
    let report = `# BISMAN ERP - Pages & Roles Report

**Generated:** ${timestamp}

---

## Summary

| Metric | Count |
|--------|-------|
| Total Active Pages | ${pagesResult.rows.length} |
| Pages with Roles Assigned | ${pagesResult.rows.filter(r => r.role_count > 0).length} |
| Pages without Roles | ${pagesResult.rows.filter(r => r.role_count == 0).length} |
| Total Roles | ${roleSummary.rows.length} |

---

## Role Summary

| Role | Pages Assigned |
|------|----------------|
`;
    
    roleSummary.rows.forEach(r => {
      report += `| ${r.role_name} | ${r.page_count} |\n`;
    });
    
    // SuperAdmin Page Pool Summary
    report += `\n---\n\n## SuperAdmin Page Pools\n\n`;
    report += `| SuperAdmin ID | Name | Pages in Pool |\n`;
    report += `|---------------|------|---------------|\n`;
    pagePoolSummary.rows.forEach(r => {
      report += `| ${r.superadmin_id} | ${r.superadmin_name || 'N/A'} | ${r.pages_in_pool} |\n`;
    });
    
    // Group pages by module
    const byModule = {};
    pagesResult.rows.forEach(row => {
      const mod = row.module_name || row.module_code || 'Uncategorized';
      if (!byModule[mod]) byModule[mod] = [];
      byModule[mod].push(row);
    });
    
    report += `\n---\n\n## Pages by Module\n\n`;
    
    for (const [moduleName, pages] of Object.entries(byModule)) {
      report += `### ${moduleName} (${pages.length} pages)\n\n`;
      report += `| # | Page Name | Route | Sidebar | Role Count | Roles Assigned |\n`;
      report += `|---|-----------|-------|:-------:|:----------:|----------------|\n`;
      
      pages.forEach((p, idx) => {
        const sidebar = p.show_in_sidebar ? '✓' : '';
        const pageName = (p.display_name || p.page_code || 'Unknown').replace(/\|/g, '\\|');
        const route = p.route || 'N/A';
        const roles = p.assigned_roles || 'None';
        const roleDisplay = roles.length > 80 ? roles.substring(0, 77) + '...' : roles;
        
        report += `| ${idx + 1} | ${pageName} | \`${route}\` | ${sidebar} | ${p.role_count} | ${roleDisplay} |\n`;
      });
      
      report += `\n`;
    }
    
    // Pages without roles section
    const unassigned = pagesResult.rows.filter(r => r.role_count == 0);
    if (unassigned.length > 0) {
      report += `---\n\n## ⚠️ Pages Without Role Assignments (${unassigned.length})\n\n`;
      report += `These pages have no roles assigned and may be inaccessible:\n\n`;
      report += `| # | Page Name | Route | Module |\n`;
      report += `|---|-----------|-------|--------|\n`;
      
      unassigned.forEach((p, idx) => {
        const pageName = (p.display_name || p.page_code || 'Unknown').replace(/\|/g, '\\|');
        const moduleName = p.module_name || p.module_code || 'N/A';
        report += `| ${idx + 1} | ${pageName} | \`${p.route}\` | ${moduleName} |\n`;
      });
    }
    
    // Full detail list (CSV-like)
    report += `\n---\n\n## Full Page List (Detailed)\n\n`;
    report += `<details>\n<summary>Click to expand full page list with all roles</summary>\n\n`;
    report += `| ID | Page Code | Display Name | Route | Module | Sidebar | Roles |\n`;
    report += `|----|-----------|--------------|-------|--------|:-------:|-------|\n`;
    
    pagesResult.rows.forEach(p => {
      const pageName = (p.display_name || '').replace(/\|/g, '\\|');
      const pageCode = (p.page_code || '').replace(/\|/g, '\\|');
      const moduleName = p.module_name || p.module_code || 'N/A';
      const sidebar = p.show_in_sidebar ? '✓' : '';
      const roles = p.assigned_roles || 'None';
      
      report += `| ${p.id} | ${pageCode} | ${pageName} | \`${p.route}\` | ${moduleName} | ${sidebar} | ${roles} |\n`;
    });
    
    report += `\n</details>\n`;
    
    // Write to file
    const filename = path.join(__dirname, '..', 'docs', `PAGES_ROLES_REPORT_${dateStr}.md`);
    fs.writeFileSync(filename, report);
    
    console.log('✅ Report saved to:', filename);
    console.log('\n--- Report Summary ---');
    console.log(`Total Pages: ${pagesResult.rows.length}`);
    console.log(`Pages with Roles: ${pagesResult.rows.filter(r => r.role_count > 0).length}`);
    console.log(`Pages without Roles: ${pagesResult.rows.filter(r => r.role_count == 0).length}`);
    console.log(`Total Roles: ${roleSummary.rows.length}`);
    console.log('\nTop 10 Roles by Page Count:');
    roleSummary.rows.slice(0, 10).forEach(r => {
      console.log(`  ${r.role_name}: ${r.page_count} pages`);
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

generateReport().catch(console.error);
