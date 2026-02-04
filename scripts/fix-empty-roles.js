const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

// Role mapping based on route patterns
const ROLE_MAPPING = {
  // Enterprise Admin pages
  '/enterprise-admin': ['ENTERPRISE_ADMIN'],
  
  // Super Admin pages
  '/super-admin': ['SUPER_ADMIN'],
  
  // Admin pages
  '/admin': ['SUPER_ADMIN', 'SYSTEM_ADMIN'],
  
  // Finance pages
  '/finance': ['SUPER_ADMIN', 'CFO', 'FINANCE_CONTROLLER'],
  '/finance-controller': ['SUPER_ADMIN', 'CFO', 'FINANCE_CONTROLLER'],
  '/reconciliation': ['SUPER_ADMIN', 'CFO', 'FINANCE_CONTROLLER'],
  '/settlements': ['SUPER_ADMIN', 'CFO', 'FINANCE_CONTROLLER'],
  
  // Compliance pages
  '/compliance': ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'LEGAL'],
  '/compliance-officer': ['SUPER_ADMIN', 'COMPLIANCE_OFFICER'],
  '/legal': ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'LEGAL'],
  
  // Operations pages
  '/operations': ['SUPER_ADMIN', 'COO', 'OPERATIONS_MANAGER', 'STORE_INCHARGE', 'HUB_INCHARGE'],
  '/operations-manager': ['SUPER_ADMIN', 'COO', 'OPERATIONS_MANAGER'],
  '/store-incharge': ['SUPER_ADMIN', 'STORE_INCHARGE', 'HUB_INCHARGE'],
  
  // Procurement pages
  '/procurement': ['SUPER_ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_OFFICER'],
  '/procurement-officer': ['SUPER_ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_OFFICER'],
  
  // HR pages
  '/hr': ['SUPER_ADMIN', 'HR_MANAGER'],
  
  // System pages
  '/system': ['SUPER_ADMIN', 'SYSTEM_ADMIN'],
  '/analytics': ['SUPER_ADMIN', 'CFO', 'COO', 'FINANCE_CONTROLLER'],
  '/upgrade-required': ['SUPER_ADMIN'],
  
  // QA pages
  '/qa': ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'QA_ENGINEER'],
  
  // Common/shared pages - accessible by authenticated users
  '/common': ['SUPER_ADMIN', 'SYSTEM_ADMIN'],
  '/clients': ['SUPER_ADMIN', 'SYSTEM_ADMIN'],
  '/tasks': ['SUPER_ADMIN', 'SYSTEM_ADMIN'],
  '/onboarding': ['SUPER_ADMIN', 'SYSTEM_ADMIN'],
  
  // Welcome/setup pages
  '/welcome': ['SUPER_ADMIN'],
  
  // Contact sales
  '/contact-sales': ['SUPER_ADMIN'],
  '/privacy': ['SUPER_ADMIN'],
};

// Public pages that should have empty roles (no auth required)
const PUBLIC_PAGES = [
  '/login',
  '/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/access-denied',
  '/pricing',
];

async function main() {
  try {
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║           RBAC EMPTY ROLES REPORT & FIX                          ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    // Get ALL pages with empty roles (not just sidebar visible)
    const pages = await pool.query(
      "SELECT id, page_code, route, required_roles, show_in_sidebar FROM pages_master WHERE required_roles = '{}' AND status = 'active' ORDER BY route"
    );

    console.log('=== BEFORE FIX: Pages with empty required_roles ===\n');
    
    // Group by route prefix
    const groups = {};
    for (const p of pages.rows) {
      const prefix = '/' + (p.route.split('/')[1] || '');
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(p);
    }
    
    for (const [prefix, items] of Object.entries(groups).sort()) {
      console.log(`📁 ${prefix} (${items.length} pages)`);
      items.forEach(p => console.log(`   - ${p.route} ${p.show_in_sidebar ? '(sidebar)' : ''}`));
      console.log('');
    }
    
    console.log(`\nTotal pages with empty roles: ${pages.rows.length}\n`);
    console.log('═'.repeat(70));
    console.log('\n=== APPLYING FIXES ===\n');

    let fixed = 0;
    let skipped = 0;
    let publicSkipped = 0;
    const fixes = [];

    for (const page of pages.rows) {
      // Skip public pages
      if (PUBLIC_PAGES.includes(page.route)) {
        console.log(`🌐 Skipping public page: ${page.route}`);
        publicSkipped++;
        continue;
      }

      // Find matching role mapping
      let roles = null;
      for (const [pattern, mappedRoles] of Object.entries(ROLE_MAPPING)) {
        if (page.route.startsWith(pattern)) {
          roles = mappedRoles;
          break;
        }
      }

      if (roles) {
        // Update the page
        const rolesArray = `{${roles.join(',')}}`;
        await pool.query(
          'UPDATE pages_master SET required_roles = $1 WHERE id = $2',
          [rolesArray, page.id]
        );
        fixes.push({ route: page.route, roles: roles.join(', ') });
        fixed++;
      } else {
        console.log(`⚠️  No mapping for: ${page.route}`);
        skipped++;
      }
    }

    console.log('\n=== FIXES APPLIED ===\n');
    fixes.forEach(f => console.log(`✅ ${f.route} → [${f.roles}]`));

    console.log('\n═'.repeat(70));
    console.log('\n=== SUMMARY ===');
    console.log(`✅ Fixed: ${fixed} pages`);
    console.log(`🌐 Public pages (skipped): ${publicSkipped} pages`);
    console.log(`⚠️  Skipped (no mapping): ${skipped} pages`);
    
    // Verify
    console.log('\n=== VERIFICATION ===');
    const remaining = await pool.query(
      "SELECT COUNT(*) as count FROM pages_master WHERE required_roles = '{}' AND status = 'active'"
    );
    console.log(`Remaining pages with empty roles (total): ${remaining.rows[0].count}`);
    
    const remainingSidebar = await pool.query(
      "SELECT COUNT(*) as count FROM pages_master WHERE required_roles = '{}' AND status = 'active' AND show_in_sidebar = true"
    );
    console.log(`Remaining pages with empty roles (sidebar): ${remainingSidebar.rows[0].count}`);

  } catch (e) {
    console.error('Error:', e.message);
  }
  pool.end();
}

main();
