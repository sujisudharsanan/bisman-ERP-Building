#!/usr/bin/env node
/**
 * ============================================================================
 * BISMAN ERP - Phase 2: Seed Missing Pages & Role Assignments
 * ============================================================================
 * 
 * This script adds the 79 missing pages and 11 missing role assignments
 * identified in the Phase 2 Module Alignment Audit.
 * 
 * Run: node scripts/seed-missing-pages-phase2.js
 * ============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

// ============================================================================
// NEW MODULE: ONBOARDING & PUBLIC (for public/auth pages)
// ============================================================================

const NEW_MODULES = [
  { module_code: 'ONBOARDING', display_name: 'Onboarding', icon: 'Rocket', base_route: '/onboarding', sort_order: 100, color_code: '#10B981', layout_group: 'public', is_hidden: true },
  { module_code: 'PUBLIC', display_name: 'Public Pages', icon: 'Globe', base_route: '/', sort_order: 999, color_code: '#6B7280', layout_group: 'public', is_hidden: true },
  { module_code: 'AUTH', display_name: 'Authentication', icon: 'LogIn', base_route: '/auth', sort_order: 998, color_code: '#3B82F6', layout_group: 'public', is_hidden: true },
];

// ============================================================================
// MISSING PAGES (79 pages from Phase 2 audit)
// ============================================================================

const MISSING_PAGES = [
  // =========================================================================
  // PUBLIC/AUTH PAGES (18 pages - no role restrictions, is_public = true)
  // =========================================================================
  { page_code: 'PUBLIC_LANDING', display_name: 'Landing Page', route: '/(public)/landing', module_code: 'PUBLIC', is_public: true, sort_order: 1 },
  { page_code: 'PUBLIC_ACCESS_DENIED', display_name: 'Access Denied', route: '/access-denied', module_code: 'PUBLIC', is_public: true, sort_order: 2 },
  { page_code: 'PUBLIC_GET_STARTED', display_name: 'Get Started', route: '/get-started', module_code: 'PUBLIC', is_public: true, sort_order: 3 },
  { page_code: 'PUBLIC_LEGAL_AGREEMENTS', display_name: 'Legal Agreements', route: '/legal/agreements', module_code: 'PUBLIC', is_public: true, sort_order: 4 },
  { page_code: 'PUBLIC_LOGIN', display_name: 'Login', route: '/login', module_code: 'PUBLIC', is_public: true, sort_order: 5 },
  { page_code: 'PUBLIC_PRICING', display_name: 'Pricing', route: '/pricing', module_code: 'PUBLIC', is_public: true, sort_order: 6 },
  { page_code: 'PUBLIC_SIGNUP', display_name: 'Sign Up', route: '/signup', module_code: 'PUBLIC', is_public: true, sort_order: 7 },
  { page_code: 'PUBLIC_STATUS', display_name: 'System Status', route: '/status', module_code: 'PUBLIC', is_public: true, sort_order: 8 },
  { page_code: 'PUBLIC_TRUST_SECURITY', display_name: 'Trust & Security', route: '/trust-security', module_code: 'PUBLIC', is_public: true, sort_order: 9 },
  { page_code: 'PUBLIC_UNAUTHORIZED', display_name: 'Unauthorized', route: '/unauthorized', module_code: 'PUBLIC', is_public: true, sort_order: 10 },
  { page_code: 'AUTH_ADMIN_LOGIN', display_name: 'Admin Login', route: '/auth/admin-login', module_code: 'AUTH', is_public: true, sort_order: 1 },
  { page_code: 'AUTH_FORGOT_PASSWORD', display_name: 'Forgot Password', route: '/auth/forgot-password', module_code: 'AUTH', is_public: true, sort_order: 2 },
  { page_code: 'AUTH_HUB_INCHARGE_LOGIN', display_name: 'Hub Incharge Login', route: '/auth/hub-incharge-login', module_code: 'AUTH', is_public: true, sort_order: 3 },
  { page_code: 'AUTH_LOGIN', display_name: 'Login', route: '/auth/login', module_code: 'AUTH', is_public: true, sort_order: 4 },
  { page_code: 'AUTH_PORTALS', display_name: 'Login Portals', route: '/auth/portals', module_code: 'AUTH', is_public: true, sort_order: 5 },
  { page_code: 'AUTH_RESET_PASSWORD', display_name: 'Reset Password', route: '/auth/reset-password', module_code: 'AUTH', is_public: true, sort_order: 6 },
  { page_code: 'AUTH_STANDARD_LOGIN', display_name: 'Standard Login', route: '/auth/standard-login', module_code: 'AUTH', is_public: true, sort_order: 7 },
  { page_code: 'QA_LOGIN', display_name: 'QA Login', route: '/qa/login', module_code: 'AUTH', is_public: true, sort_order: 8 },

  // =========================================================================
  // ONBOARDING PAGES (7 pages)
  // =========================================================================
  { page_code: 'ONBOARDING_CLIENTS_NEW', display_name: 'New Client Onboarding', route: '/onboarding/clients/new', module_code: 'ONBOARDING', is_public: true, sort_order: 1 },
  { page_code: 'ONBOARDING_TRIAL', display_name: 'Start Trial', route: '/onboarding/trial', module_code: 'ONBOARDING', is_public: true, sort_order: 2 },
  { page_code: 'ONBOARDING_TRIAL_QUICK', display_name: 'Quick Trial', route: '/onboarding/trial/quick', module_code: 'ONBOARDING', is_public: true, sort_order: 3 },
  { page_code: 'ONBOARDING_TRIAL_RESUME', display_name: 'Resume Trial', route: '/onboarding/trial/resume/[token]', module_code: 'ONBOARDING', is_public: true, sort_order: 4 },
  { page_code: 'WELCOME', display_name: 'Welcome', route: '/welcome', module_code: 'ONBOARDING', is_public: false, sort_order: 5, roles: ['*'] },
  { page_code: 'WELCOME_BRANDING', display_name: 'Welcome Branding', route: '/welcome/branding', module_code: 'ONBOARDING', is_public: false, sort_order: 6, roles: ['*'] },
  { page_code: 'WELCOME_LAUNCHING', display_name: 'Welcome Launching', route: '/welcome/launching', module_code: 'ONBOARDING', is_public: false, sort_order: 7, roles: ['*'] },

  // =========================================================================
  // ADMIN PAGES (10 pages - missing from original seed)
  // =========================================================================
  { page_code: 'ADMIN_AI_ANALYTICS', display_name: 'AI Analytics', route: '/admin/ai-analytics', module_code: 'ADMIN', sort_order: 20, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'ADMIN_BANK_TEMPLATES', display_name: 'Bank Templates', route: '/admin/bank-templates', module_code: 'ADMIN', sort_order: 21, roles: ['ADMIN', 'SUPER_ADMIN', 'CFO'] },
  { page_code: 'ADMIN_BILLING_TENANT_DETAIL', display_name: 'Billing Tenant Detail', route: '/admin/billing/tenants/[id]', module_code: 'ADMIN', sort_order: 22, show_in_sidebar: false, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'ADMIN_BRANCHES_CREATE', display_name: 'Create Branch', route: '/admin/branches/create', module_code: 'ADMIN', sort_order: 23, show_in_sidebar: false, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'ADMIN_CLIENT_PERMISSIONS', display_name: 'Client Permissions', route: '/admin/clients/[id]/permissions', module_code: 'ADMIN', sort_order: 24, show_in_sidebar: false, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'ADMIN_RAG_SOURCES', display_name: 'RAG Sources', route: '/admin/rag-sources', module_code: 'ADMIN', sort_order: 25, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'ADMIN_SLA', display_name: 'SLA Management', route: '/admin/sla', module_code: 'ADMIN', sort_order: 26, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'ADMIN_TASK_APPROVAL_DETAIL', display_name: 'Task Approval Detail', route: '/admin/task-approvals/[taskId]', module_code: 'ADMIN', sort_order: 27, show_in_sidebar: false, roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'] },
  { page_code: 'ADMIN_USER_USAGE_DETAIL', display_name: 'User Usage Detail', route: '/admin/user-usage/[id]', module_code: 'ADMIN', sort_order: 28, show_in_sidebar: false, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'ADMIN_USERS_CREATE', display_name: 'Create User', route: '/admin/users/create', module_code: 'ADMIN', sort_order: 29, show_in_sidebar: false, roles: ['ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'] },

  // =========================================================================
  // ENTERPRISE ADMIN PAGES (7 pages - missing from original seed)
  // =========================================================================
  { page_code: 'EA_DOCS_PRODUCTION_READY', display_name: 'Production Ready Docs', route: '/enterprise-admin/docs/production-ready', module_code: 'ENTERPRISE_ADMIN', sort_order: 20, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'EA_MONITORING_DATABASE', display_name: 'Database Monitoring', route: '/enterprise-admin/monitoring/database', module_code: 'ENTERPRISE_ADMIN', sort_order: 21, show_in_sidebar: false, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'EA_MONITORING_LIVE', display_name: 'Live Monitoring', route: '/enterprise-admin/monitoring/live', module_code: 'ENTERPRISE_ADMIN', sort_order: 22, show_in_sidebar: false, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'EA_MONITORING_PERFORMANCE', display_name: 'Performance Monitoring', route: '/enterprise-admin/monitoring/performance', module_code: 'ENTERPRISE_ADMIN', sort_order: 23, show_in_sidebar: false, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'EA_SUPER_ADMINS_CREATE', display_name: 'Create Super Admin', route: '/enterprise-admin/super-admins/create', module_code: 'ENTERPRISE_ADMIN', sort_order: 24, show_in_sidebar: false, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'EA_PAGES_ROLES_REPORT', display_name: 'Pages & Roles Report', route: '/enterprise-admin/system/pages-roles-report', module_code: 'ENTERPRISE_ADMIN', sort_order: 25, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'EA_USER_USAGE_DETAIL', display_name: 'User Usage Detail', route: '/enterprise-admin/user-usage/[id]', module_code: 'ENTERPRISE_ADMIN', sort_order: 26, show_in_sidebar: false, roles: ['ENTERPRISE_ADMIN'] },

  // =========================================================================
  // SUPER ADMIN PAGES (7 pages - missing from original seed)
  // =========================================================================
  { page_code: 'SA_ORDERS', display_name: 'Orders', route: '/super-admin/orders', module_code: 'SUPER_ADMIN', sort_order: 20, roles: ['SUPER_ADMIN'] },
  { page_code: 'SA_SUBSCRIPTION', display_name: 'Subscription Overview', route: '/super-admin/subscription', module_code: 'SUPER_ADMIN', sort_order: 21, roles: ['SUPER_ADMIN'] },
  { page_code: 'SA_SUBSCRIPTIONS_SETTINGS', display_name: 'Subscription Settings', route: '/super-admin/subscriptions/settings', module_code: 'SUBSCRIPTIONS', sort_order: 22, roles: ['SUPER_ADMIN'] },
  { page_code: 'SA_SYSTEM', display_name: 'System Overview', route: '/super-admin/system', module_code: 'SUPER_ADMIN', sort_order: 23, roles: ['SUPER_ADMIN'] },
  { page_code: 'SA_SYSTEM_ABOUT_ME', display_name: 'About Me', route: '/super-admin/system/about-me', module_code: 'SUPER_ADMIN', sort_order: 24, show_in_sidebar: false, roles: ['SUPER_ADMIN'] },
  { page_code: 'SA_PAGES_ROLES_REPORT', display_name: 'Pages & Roles Report', route: '/super-admin/system/pages-roles-report', module_code: 'SUPER_ADMIN', sort_order: 25, roles: ['SUPER_ADMIN'] },
  { page_code: 'SA_USER_USAGE_DETAIL', display_name: 'User Usage Detail', route: '/super-admin/user-usage/[id]', module_code: 'SUPER_ADMIN', sort_order: 26, show_in_sidebar: false, roles: ['SUPER_ADMIN'] },

  // =========================================================================
  // FINANCE PAGES (3 pages - missing)
  // =========================================================================
  { page_code: 'FINANCE_APPROVAL_DETAIL', display_name: 'Approval Detail', route: '/finance/approval-details/[taskId]', module_code: 'FINANCE', sort_order: 20, show_in_sidebar: false, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS', 'TREASURY'] },
  { page_code: 'RECONCILIATION_DETAIL', display_name: 'Reconciliation Detail', route: '/reconciliation/[id]', module_code: 'FINANCE', sort_order: 21, show_in_sidebar: false, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS', 'BANKER'] },
  { page_code: 'SETTLEMENT_DETAIL', display_name: 'Settlement Detail', route: '/settlements/[id]', module_code: 'FINANCE', sort_order: 22, show_in_sidebar: false, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS', 'BANKER'] },

  // =========================================================================
  // COMMON/SHARED PAGES (16 pages - missing)
  // =========================================================================
  { page_code: 'COMMON_AI_TRAINING', display_name: 'AI Training', route: '/ai-training', module_code: 'COMMON', sort_order: 20, roles: ['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN'] },
  { page_code: 'COMMON_ANALYTICS', display_name: 'Analytics', route: '/analytics', module_code: 'COMMON', sort_order: 21, roles: ['ADMIN', 'SUPER_ADMIN', 'CFO', 'MANAGER'] },
  { page_code: 'COMMON_APPROVALS', display_name: 'Approvals', route: '/approvals', module_code: 'COMMON', sort_order: 22, roles: ['ADMIN', 'MANAGER', 'CFO', 'FINANCE_CONTROLLER', 'OPERATIONS_MANAGER'] },
  { page_code: 'COMMON_ASSISTANT', display_name: 'AI Assistant', route: '/assistant', module_code: 'COMMON', sort_order: 23, roles: ['*'] },
  { page_code: 'COMMON_CALENDAR_ROOT', display_name: 'Calendar', route: '/calendar', module_code: 'COMMON', sort_order: 24, roles: ['*'] },
  { page_code: 'COMMON_CLIENTS_CREATE', display_name: 'Create Client', route: '/clients/create', module_code: 'COMMON', sort_order: 25, show_in_sidebar: false, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'COMMON_CLIENTS_USAGE_DASHBOARD', display_name: 'Client Usage Dashboard', route: '/clients/usage-dashboard', module_code: 'COMMON', sort_order: 26, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'COMMON_DOCUMENTATION', display_name: 'Documentation', route: '/common/documentation', module_code: 'COMMON', sort_order: 27, roles: ['*'] },
  { page_code: 'COMMON_HR_POLICY', display_name: 'HR Policy', route: '/common/hr-policy', module_code: 'COMMON', sort_order: 28, roles: ['*'] },
  { page_code: 'COMMON_TASK_APPROVAL_DETAIL', display_name: 'Task Approval Detail', route: '/common/task-approvals/[id]', module_code: 'COMMON', sort_order: 29, show_in_sidebar: false, roles: ['ADMIN', 'MANAGER', 'STAFF', 'CFO', 'FINANCE_CONTROLLER', 'OPERATIONS_MANAGER', 'HUB_INCHARGE', 'STORE_INCHARGE'] },
  { page_code: 'COMMON_USER_CREATION', display_name: 'User Creation', route: '/common/user-creation', module_code: 'COMMON', sort_order: 30, show_in_sidebar: false, roles: ['ADMIN', 'HR_MANAGER'] },
  { page_code: 'COMMON_SETTINGS', display_name: 'Settings', route: '/settings', module_code: 'COMMON', sort_order: 31, roles: ['*'] },
  { page_code: 'COMMON_SETTINGS_SECURITY', display_name: 'Security Settings', route: '/settings/security', module_code: 'COMMON', sort_order: 32, show_in_sidebar: false, roles: ['*'] },
  { page_code: 'COMMON_TASK_DASHBOARD', display_name: 'Task Dashboard', route: '/task-dashboard', module_code: 'COMMON', sort_order: 33, roles: ['ADMIN', 'MANAGER', 'STAFF', 'OPERATIONS_MANAGER', 'HUB_INCHARGE'] },
  { page_code: 'COMMON_TASKS_CREATE', display_name: 'Create Task', route: '/tasks/create', module_code: 'COMMON', sort_order: 34, show_in_sidebar: false, roles: ['ADMIN', 'MANAGER', 'OPERATIONS_MANAGER'] },
  { page_code: 'COMMON_TRACE', display_name: 'Trace', route: '/trace', module_code: 'COMMON', sort_order: 35, roles: ['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN'] },

  // =========================================================================
  // QA PAGES (4 pages - missing detail pages)
  // =========================================================================
  { page_code: 'QA_ISSUE_DETAIL', display_name: 'Issue Detail', route: '/qa/issues/[id]', module_code: 'QA', sort_order: 10, show_in_sidebar: false, roles: ['QA', 'ENTERPRISE_ADMIN'] },
  { page_code: 'QA_ISSUE_NEW', display_name: 'New Issue', route: '/qa/issues/new', module_code: 'QA', sort_order: 11, show_in_sidebar: false, roles: ['QA', 'ENTERPRISE_ADMIN'] },
  { page_code: 'QA_TEST_TASK_DETAIL', display_name: 'Test Task Detail', route: '/qa/test-tasks/[id]', module_code: 'QA', sort_order: 12, show_in_sidebar: false, roles: ['QA', 'ENTERPRISE_ADMIN'] },
  { page_code: 'QA_TEST_TASK_NEW', display_name: 'New Test Task', route: '/qa/test-tasks/new', module_code: 'QA', sort_order: 13, show_in_sidebar: false, roles: ['QA', 'ENTERPRISE_ADMIN'] },

  // =========================================================================
  // PROCUREMENT PAGES (1 page - missing)
  // =========================================================================
  { page_code: 'PROCUREMENT_PURCHASE_ORDERS', display_name: 'Purchase Orders', route: '/procurement/purchase-orders', module_code: 'PROCUREMENT', sort_order: 1, roles: ['ADMIN', 'PROCUREMENT_OFFICER', 'OPERATIONS_MANAGER', 'CFO'] },

  // =========================================================================
  // OPERATIONS PAGES (2 pages - missing)
  // =========================================================================
  { page_code: 'PUMP_MANAGEMENT_SERVER_LOGS', display_name: 'Server Logs', route: '/pump-management/server-logs', module_code: 'OPERATIONS', sort_order: 10, roles: ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_MANAGER'] },
  { page_code: 'STORE_INCHARGE_DASHBOARD', display_name: 'Store Incharge Dashboard', route: '/store-incharge', module_code: 'OPERATIONS', sort_order: 11, roles: ['STORE_INCHARGE', 'STORE_INCHARGE_SR', 'OPERATIONS_MANAGER'] },

  // =========================================================================
  // SYSTEM PAGES (3 pages - missing)
  // =========================================================================
  { page_code: 'SYSTEM_ABOUT_ME', display_name: 'About Me', route: '/system/about-me', module_code: 'SYSTEM', sort_order: 20, show_in_sidebar: false, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'ADMIN'] },
  { page_code: 'SYSTEM_CLIENT_EDIT', display_name: 'Edit Client', route: '/system/clients/[id]/edit', module_code: 'SYSTEM', sort_order: 21, show_in_sidebar: false, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'ADMIN'] },
  { page_code: 'SYSTEM_CLIENT_NEW', display_name: 'New Client', route: '/system/clients/new', module_code: 'SYSTEM', sort_order: 22, show_in_sidebar: false, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'ADMIN'] },
];

// ============================================================================
// MISSING ROLE PAGE ASSIGNMENTS (11 roles without page access)
// ============================================================================

const MISSING_ROLE_ASSIGNMENTS = {
  // ACCOUNTANT - Finance operational role
  'ACCOUNTANT': [
    '/finance/general-ledger', '/finance/accounts-payable-summary', '/finance/accounts-receivable-summary',
    '/finance/payment-approval-queue', '/reconciliation', '/settlements', '/dashboard', '/common/task-approvals',
    '/common/calendar', '/common/notifications', '/common/about-me', '/common/bank-accounts'
  ],
  
  // ADMIN_OPS - Admin operational role
  'ADMIN_OPS': [
    '/admin', '/admin/clients', '/admin/task-approvals', '/dashboard', '/dashboard/requests',
    '/common/task-approvals', '/common/calendar', '/common/notifications', '/common/about-me'
  ],
  
  // BRANCH_INCHARGE - Branch supervisory role
  'BRANCH_INCHARGE': [
    '/dashboard', '/dashboard/requests', '/dashboard/workbench', '/operations/inventory-management',
    '/common/task-approvals', '/common/payment-request', '/common/calendar', '/common/notifications',
    '/common/about-me', '/task-dashboard'
  ],
  
  // COO - Executive role
  'COO': [
    '/dashboard', '/operations/kpi-dashboard', '/operations/inventory-management',
    '/finance/executive-dashboard', '/reports/payment-summary', '/common/calendar',
    '/common/notifications', '/common/about-me', '/analytics'
  ],
  
  // CTO - Executive tech role
  'CTO': [
    '/dashboard', '/system/system-health-dashboard', '/system/server-logs', '/system/integration-settings',
    '/super-admin/system/system-health-dashboard', '/common/calendar', '/common/notifications',
    '/common/about-me', '/analytics', '/trace'
  ],
  
  // DATA_ENTRY - Operational role
  'DATA_ENTRY': [
    '/dashboard', '/dashboard/requests', '/common/task-approvals', '/common/calendar',
    '/common/notifications', '/common/about-me'
  ],
  
  // HUB_INCHARGE_SR - Senior hub role
  'HUB_INCHARGE_SR': [
    '/dashboard', '/dashboard/requests', '/dashboard/workbench', '/operations/inventory-management',
    '/operations/kpi-dashboard', '/common/task-approvals', '/common/payment-request',
    '/common/calendar', '/common/notifications', '/common/about-me', '/task-dashboard',
    '/reports/payment-summary'
  ],
  
  // INTERN - Trainee role (read-only)
  'INTERN': [
    '/dashboard', '/common/calendar', '/common/notifications', '/common/about-me',
    '/common/hr-policy', '/common/documentation'
  ],
  
  // PROCUREMENT_OFFICER - Procurement role
  'PROCUREMENT_OFFICER': [
    '/dashboard', '/dashboard/requests', '/procurement/purchase-orders',
    '/common/task-approvals', '/common/payment-request', '/common/calendar',
    '/common/notifications', '/common/about-me', '/task-dashboard'
  ],
  
  // STORE_INCHARGE_SR - Senior store role
  'STORE_INCHARGE_SR': [
    '/dashboard', '/dashboard/requests', '/dashboard/workbench', '/store-incharge',
    '/operations/inventory-management', '/operations/kpi-dashboard',
    '/common/task-approvals', '/common/calendar', '/common/notifications',
    '/common/about-me', '/task-dashboard', '/reports/payment-summary'
  ],
  
  // SUPERVISOR - Supervisory role
  'SUPERVISOR': [
    '/dashboard', '/dashboard/requests', '/dashboard/workbench', '/common/task-approvals',
    '/common/calendar', '/common/notifications', '/common/about-me', '/task-dashboard',
    '/approvals'
  ],
};

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const needSSL = !/localhost|127\.0\.0\.1/i.test(url);
  return new Pool({ connectionString: url, ssl: needSSL ? { rejectUnauthorized: false } : false });
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedMissingPagesPhase2() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('🚀 Phase 2: Seeding missing pages & role assignments...\n');

    await client.query('BEGIN');

    // =========================================================================
    // STEP 1: Add is_public column if not exists
    // =========================================================================
    console.log('📋 Checking is_public column...');
    await client.query(`
      ALTER TABLE pages_master ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
    `);
    console.log('   ✅ is_public column ready\n');

    // =========================================================================
    // STEP 2: Insert New Modules
    // =========================================================================
    console.log('📦 Inserting new modules...');
    const moduleIdMap = {};
    
    // First get existing modules
    const existingModules = await client.query('SELECT id, module_code FROM modules_master');
    existingModules.rows.forEach(m => { moduleIdMap[m.module_code] = m.id; });
    
    for (const mod of NEW_MODULES) {
      const result = await client.query(`
        INSERT INTO modules_master (module_code, display_name, icon, base_route, sort_order, is_active, is_hidden, color_code, layout_group)
        VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8)
        ON CONFLICT (module_code) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          updated_at = NOW()
        RETURNING id
      `, [mod.module_code, mod.display_name, mod.icon, mod.base_route, mod.sort_order, mod.is_hidden || false, mod.color_code, mod.layout_group]);
      moduleIdMap[mod.module_code] = result.rows[0].id;
      console.log(`   ✅ ${mod.module_code} (id: ${result.rows[0].id})`);
    }
    console.log(`\n📦 ${NEW_MODULES.length} new modules added.\n`);

    // =========================================================================
    // STEP 3: Insert Missing Pages
    // =========================================================================
    console.log('📄 Inserting missing pages...');
    let pageCount = 0;
    let roleAccessCount = 0;
    const pageIdMap = {};

    for (const page of MISSING_PAGES) {
      const moduleId = moduleIdMap[page.module_code];
      if (!moduleId) {
        console.log(`   ⚠️  Module ${page.module_code} not found for page ${page.page_code}`);
        continue;
      }

      const result = await client.query(`
        INSERT INTO pages_master (page_code, display_name, route, module_id, icon, sort_order, show_in_sidebar, is_active, is_public)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
        ON CONFLICT (page_code) DO UPDATE SET
          route = EXCLUDED.route,
          is_public = EXCLUDED.is_public,
          updated_at = NOW()
        RETURNING id
      `, [
        page.page_code,
        page.display_name,
        page.route,
        moduleId,
        page.icon || 'File',
        page.sort_order,
        page.show_in_sidebar !== false,
        page.is_public || false
      ]);
      
      pageIdMap[page.route] = result.rows[0].id;
      pageCount++;
      
      // Insert role_page_access for non-public pages with specific roles
      if (!page.is_public && page.roles && page.roles[0] !== '*') {
        for (const role of page.roles) {
          await client.query(`
            INSERT INTO role_page_access (role_name, page_id, can_view, can_edit)
            VALUES ($1, $2, true, true)
            ON CONFLICT (role_name, page_id) DO NOTHING
          `, [role, result.rows[0].id]);
          roleAccessCount++;
        }
      }
    }
    console.log(`   ✅ ${pageCount} pages inserted`);
    console.log(`   ✅ ${roleAccessCount} role-page access records created\n`);

    // =========================================================================
    // STEP 4: Add Missing Role Assignments
    // =========================================================================
    console.log('🔐 Adding missing role page assignments...');
    let missingRoleAccessCount = 0;

    for (const [roleName, routes] of Object.entries(MISSING_ROLE_ASSIGNMENTS)) {
      for (const route of routes) {
        // Find page by route
        const pageResult = await client.query(
          'SELECT id FROM pages_master WHERE route = $1',
          [route]
        );
        
        if (pageResult.rows.length > 0) {
          const pageId = pageResult.rows[0].id;
          await client.query(`
            INSERT INTO role_page_access (role_name, page_id, can_view, can_edit)
            VALUES ($1, $2, true, true)
            ON CONFLICT (role_name, page_id) DO NOTHING
          `, [roleName, pageId]);
          missingRoleAccessCount++;
        }
      }
      console.log(`   ✅ ${roleName}: ${routes.length} page assignments`);
    }
    console.log(`\n🔐 ${missingRoleAccessCount} role assignments added for 11 roles.\n`);

    // =========================================================================
    // STEP 5: Commit
    // =========================================================================
    await client.query('COMMIT');

    // =========================================================================
    // STEP 6: Summary
    // =========================================================================
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM modules_master) as modules,
        (SELECT COUNT(*) FROM pages_master) as pages,
        (SELECT COUNT(*) FROM role_page_access) as role_access,
        (SELECT COUNT(DISTINCT role_name) FROM role_page_access) as roles_with_access
    `);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    PHASE 2 SEED COMPLETE                       ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Modules:              ${summary.rows[0].modules}`);
    console.log(`   Pages:                ${summary.rows[0].pages}`);
    console.log(`   Role-Page Access:     ${summary.rows[0].role_access}`);
    console.log(`   Roles with Access:    ${summary.rows[0].roles_with_access}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during seed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// ============================================================================
// RUN
// ============================================================================

seedMissingPagesPhase2()
  .then(() => {
    console.log('✅ Phase 2 seed completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Phase 2 seed failed:', err);
    process.exit(1);
  });
