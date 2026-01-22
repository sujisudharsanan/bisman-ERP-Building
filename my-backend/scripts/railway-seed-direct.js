#!/usr/bin/env node
/**
 * Direct Railway Seed Script - bypasses .env
 */

const { Pool } = require('pg');

const RAILWAY_URL = process.argv[2] || process.env.RAILWAY_URL;
if (!RAILWAY_URL) {
  console.error('Usage: node railway-seed-direct.js <RAILWAY_URL>');
  process.exit(1);
}

console.log('🚀 BISMAN ERP - Direct Railway Seed');
console.log('====================================');

// MODULES
const MODULES = [
  { module_code: 'SYSTEM', display_name: 'System Administration', icon: 'Shield', base_route: '/system', sort_order: 1, color_code: '#3B82F6', layout_group: 'admin' },
  { module_code: 'FINANCE', display_name: 'Finance & Accounting', icon: 'DollarSign', base_route: '/finance', sort_order: 2, color_code: '#10B981', layout_group: 'common' },
  { module_code: 'PROCUREMENT', display_name: 'Procurement', icon: 'ShoppingCart', base_route: '/procurement', sort_order: 3, color_code: '#8B5CF6', layout_group: 'common' },
  { module_code: 'OPERATIONS', display_name: 'Operations', icon: 'Package', base_route: '/operations', sort_order: 4, color_code: '#F59E0B', layout_group: 'common' },
  { module_code: 'COMPLIANCE', display_name: 'Compliance & Legal', icon: 'Scale', base_route: '/compliance', sort_order: 5, color_code: '#EF4444', layout_group: 'common' },
  { module_code: 'HR', display_name: 'Human Resources', icon: 'Users', base_route: '/hr', sort_order: 6, color_code: '#14B8A6', layout_group: 'common' },
  { module_code: 'BILLING', display_name: 'Billing & Subscription', icon: 'CreditCard', base_route: '/billing', sort_order: 7, color_code: '#6366F1', layout_group: 'common' },
  { module_code: 'REPORTS', display_name: 'Reports', icon: 'BarChart3', base_route: '/reports', sort_order: 8, color_code: '#EC4899', layout_group: 'common' },
  { module_code: 'GOVERNANCE', display_name: 'Governance', icon: 'Shield', base_route: '/governance', sort_order: 0, color_code: '#8B5CF6', layout_group: 'admin' },
  { module_code: 'INTERNAL', display_name: 'Internal Operations', icon: 'Shield', base_route: '/internal', sort_order: -1, color_code: '#F43F5E', layout_group: 'internal', is_hidden: true },
  { module_code: 'SUPER_ADMIN', display_name: 'Super Admin', icon: 'Shield', base_route: '/super-admin', sort_order: -2, color_code: '#6366F1', layout_group: 'super-admin' },
  { module_code: 'ENTERPRISE_ADMIN', display_name: 'Enterprise Admin', icon: 'Building', base_route: '/enterprise-admin', sort_order: -3, color_code: '#7C3AED', layout_group: 'enterprise-admin' },
  { module_code: 'ADMIN', display_name: 'Admin Console', icon: 'Shield', base_route: '/admin', sort_order: 9, color_code: '#64748B', layout_group: 'admin' },
  { module_code: 'QA', display_name: 'QA & Testing', icon: 'ClipboardCheck', base_route: '/qa', sort_order: 10, color_code: '#06B6D4', layout_group: 'internal', is_hidden: true },
  { module_code: 'COMMON', display_name: 'Common', icon: 'User', base_route: '/common', sort_order: 999, color_code: '#6B7280', layout_group: 'common' },
  { module_code: 'DASHBOARD', display_name: 'Dashboard', icon: 'LayoutDashboard', base_route: '/dashboard', sort_order: 0, color_code: '#3B82F6', layout_group: 'common' },
  { module_code: 'SUBSCRIPTIONS', display_name: 'Subscriptions', icon: 'CreditCard', base_route: '/super-admin/subscriptions', sort_order: 3, color_code: '#F59E0B', layout_group: 'super-admin' },
  { module_code: 'ONBOARDING', display_name: 'Onboarding', icon: 'UserPlus', base_route: '/onboarding', sort_order: 998, color_code: '#10B981', layout_group: 'common' },
  { module_code: 'PUBLIC', display_name: 'Public', icon: 'Globe', base_route: '/', sort_order: 1000, color_code: '#6B7280', layout_group: 'public' },
  { module_code: 'AUTH', display_name: 'Authentication', icon: 'Lock', base_route: '/auth', sort_order: 1001, color_code: '#EF4444', layout_group: 'auth' },
];

// PAGES (key ones from Phase 1)
const PAGES = [
  { page_code: 'ENTERPRISE_ADMIN_DASHBOARD', display_name: 'Enterprise Dashboard', route: '/enterprise-admin/dashboard', module_code: 'ENTERPRISE_ADMIN', icon: 'LayoutDashboard', sort_order: 1, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_ROLES', display_name: 'Role Management', route: '/enterprise-admin/roles', module_code: 'ENTERPRISE_ADMIN', icon: 'Shield', sort_order: 2, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_USERS', display_name: 'User Management', route: '/enterprise-admin/users', module_code: 'ENTERPRISE_ADMIN', icon: 'Users', sort_order: 3, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_HUBS', display_name: 'Hub Management', route: '/enterprise-admin/hubs', module_code: 'ENTERPRISE_ADMIN', icon: 'Building', sort_order: 4, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_BILLING', display_name: 'Billing & Subscription', route: '/enterprise-admin/billing', module_code: 'ENTERPRISE_ADMIN', icon: 'CreditCard', sort_order: 5, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'SUPER_ADMIN_DASHBOARD', display_name: 'Super Admin Dashboard', route: '/super-admin/dashboard', module_code: 'SUPER_ADMIN', icon: 'LayoutDashboard', sort_order: 1, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_ENTERPRISES', display_name: 'Enterprises', route: '/super-admin/enterprises', module_code: 'SUPER_ADMIN', icon: 'Building2', sort_order: 2, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_USERS', display_name: 'All Users', route: '/super-admin/users', module_code: 'SUPER_ADMIN', icon: 'Users', sort_order: 3, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_SETTINGS', display_name: 'Settings', route: '/super-admin/settings', module_code: 'SUPER_ADMIN', icon: 'Settings', sort_order: 4, roles: ['SUPER_ADMIN'] },
  { page_code: 'DASHBOARD_MAIN', display_name: 'Dashboard', route: '/dashboard', module_code: 'DASHBOARD', icon: 'LayoutDashboard', sort_order: 1, roles: ['*'] },
  { page_code: 'FINANCE_DASHBOARD', display_name: 'Finance Dashboard', route: '/finance/dashboard', module_code: 'FINANCE', icon: 'LayoutDashboard', sort_order: 1, roles: ['ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'LOGIN', display_name: 'Login', route: '/login', module_code: 'AUTH', icon: 'LogIn', sort_order: 1, roles: ['*'], is_public: true },
  { page_code: 'FORGOT_PASSWORD', display_name: 'Forgot Password', route: '/forgot-password', module_code: 'AUTH', icon: 'Key', sort_order: 2, roles: ['*'], is_public: true },
  { page_code: 'RESET_PASSWORD', display_name: 'Reset Password', route: '/reset-password', module_code: 'AUTH', icon: 'RefreshCw', sort_order: 3, roles: ['*'], is_public: true },
];

async function seed() {
  const pool = new Pool({
    connectionString: RAILWAY_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  console.log('✅ Connected to Railway PostgreSQL');

  try {
    await client.query('BEGIN');
    console.log('\n📦 Seeding modules...');

    const moduleIdMap = {};
    for (const mod of MODULES) {
      const result = await client.query(`
        INSERT INTO modules_master (module_code, display_name, description, icon, base_route, sort_order, is_active, is_hidden, color_code, layout_group, product_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (module_code) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          icon = EXCLUDED.icon,
          base_route = EXCLUDED.base_route,
          sort_order = EXCLUDED.sort_order,
          is_hidden = EXCLUDED.is_hidden,
          color_code = EXCLUDED.color_code,
          layout_group = EXCLUDED.layout_group
        RETURNING id
      `, [
        mod.module_code,
        mod.display_name,
        mod.description || `${mod.display_name} module`,
        mod.icon || 'Layers',
        mod.base_route,
        mod.sort_order || 99,
        true,
        mod.is_hidden || false,
        mod.color_code || '#3B82F6',
        mod.layout_group || 'common',
        mod.product_type || 'all'
      ]);
      moduleIdMap[mod.module_code] = result.rows[0].id;
    }
    console.log(`   ✓ ${Object.keys(moduleIdMap).length} modules`);

    console.log('\n📄 Seeding pages...');
    let pageCount = 0;
    for (const page of PAGES) {
      const moduleId = moduleIdMap[page.module_code];
      if (!moduleId) {
        console.log(`   ⚠️  Skipped ${page.page_code} - module ${page.module_code} not found`);
        continue;
      }

      const result = await client.query(`
        INSERT INTO pages_master (page_code, display_name, route, module_id, icon, sort_order, is_active, is_public)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (page_code) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          route = EXCLUDED.route,
          module_id = EXCLUDED.module_id,
          icon = EXCLUDED.icon,
          sort_order = EXCLUDED.sort_order,
          is_public = EXCLUDED.is_public
        RETURNING id
      `, [
        page.page_code,
        page.display_name,
        page.route,
        moduleId,
        page.icon || 'FileText',
        page.sort_order || 99,
        true,
        page.is_public || false
      ]);

      const pageId = result.rows[0].id;
      pageCount++;

      // Insert role access
      if (page.roles && page.roles.length > 0) {
        for (const role of page.roles) {
          if (role === '*') continue;
          await client.query(`
            INSERT INTO role_page_access (role_code, page_id, can_view, can_create, can_edit, can_delete)
            VALUES ($1, $2, true, true, true, true)
            ON CONFLICT (role_code, page_id) DO NOTHING
          `, [role, pageId]);
        }
      }
    }
    console.log(`   ✓ ${pageCount} pages`);

    await client.query('COMMIT');
    console.log('\n✅ Railway seed completed successfully!');

    // Verification
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM modules_master) as modules,
        (SELECT COUNT(*) FROM pages_master) as pages,
        (SELECT COUNT(*) FROM role_page_access) as role_access
    `);
    console.log('\n📊 Final counts on Railway:');
    console.log(`   Modules: ${counts.rows[0].modules}`);
    console.log(`   Pages: ${counts.rows[0].pages}`);
    console.log(`   Role-Page Access: ${counts.rows[0].role_access}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
