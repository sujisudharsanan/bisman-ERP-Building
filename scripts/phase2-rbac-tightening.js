const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

// ============================================
// PHASE 2: RBAC TIGHTENING - ROLE ALLOWLISTS
// ============================================

const ROLE_ALLOWLISTS = {
  // ========== GROUP 1: C-SUITE (High-risk, heavy cleanup) ==========
  
  'CEO': [
    // Executive dashboards
    '/cfo-dashboard', '/dashboard/workbench', '/operations/kpi-dashboard',
    // High-level reports only
    '/reports/payment-summary', '/reports/settlement-audit',
    // Compliance overview (read-only)
    '/compliance/compliance-dashboard',
    // User creation (delegation)
    '/common/user-creation'
  ],
  
  'CFO': [
    // Finance module (FULL)
    '/finance/accounts-payable-summary', '/finance/accounts-receivable-summary',
    '/finance/approval-details/[taskId]', '/finance/approval-structure-overview',
    '/finance/bank-reconciliation', '/finance/bank-reconciliation-execute',
    '/finance/bank-statement-upload', '/finance/budget-approval',
    '/finance/budgeting-forecasting', '/finance/cash-flow-forecast',
    '/finance/cash-flow-statement', '/finance/chart-of-accounts',
    '/finance/company-dashboard', '/finance/cost-center-analysis',
    '/finance/executive-dashboard', '/finance/expense-report',
    '/finance/financial-statements', '/finance/fixed-asset-register',
    '/finance/foreign-exchange-management', '/finance/general-ledger',
    '/finance/inter-company-reconciliation', '/finance/invoice-posting',
    '/finance/journal-entries', '/finance/journal-entries-approval',
    '/finance/loan-management', '/finance/payment-approval-queue',
    '/finance/payment-batch-processing', '/finance/payment-entry',
    '/finance/payment-entry-view', '/finance/payment-gateway-integration',
    '/finance/period-end-adjustment-entries', '/finance/period-end-closing',
    '/finance/purchase-invoice', '/finance/tax-reports',
    '/finance/trial-balance', '/finance/vendor-master',
    '/finance-controller',
    // Reconciliation
    '/reconciliation', '/reconciliation/[id]', '/reconciliation/upload',
    // Settlements
    '/settlements', '/settlements/[id]',
    // Billing
    '/billing', '/billing/invoices',
    // Reports
    '/reports/payment-summary', '/reports/settlement-audit',
    // Dashboards
    '/cfo-dashboard', '/dashboard/workbench',
    // Bank accounts
    '/common/bank-accounts',
    // Compliance (CFO oversight)
    '/compliance/compliance-dashboard',
    // Procurement view only
    '/procurement/purchase-orders'
  ],
  
  'COO': [
    // Operations (FULL)
    '/operations/inventory-management', '/operations/kpi-dashboard',
    '/operations/asset-register-hub', '/operations/bom-view',
    '/operations/delivery-note', '/operations/item-master-limited',
    '/operations/quality-inspection', '/operations/sales-order',
    '/operations/sales-order-view', '/operations/shipping-logistics',
    '/operations/stock-entry', '/operations/stock-entry-transfer',
    '/operations/stock-ledger', '/operations/work-order',
    '/operations-manager',
    // Production
    '/production/analytics', '/production/machine-management',
    '/production/scheduling', '/production/workflow',
    // Inventory
    '/inventory/barcode-scanning', '/inventory/category-management',
    '/inventory/reorder-rules', '/inventory/reports',
    // Shipping
    '/shipping/carrier-management', '/shipping/shipment-tracking',
    // Warehouse
    '/warehouse/bin-location',
    // Dashboards
    '/cfo-dashboard', '/dashboard/workbench',
    // Reports
    '/reports/payment-summary', '/reports/settlement-audit',
    // Finance overview
    '/finance/executive-dashboard'
  ],
  
  'CTO': [
    // System/Tech pages
    '/system/integration-settings', '/system/server-logs', '/system/system-health-dashboard',
    // Production (tech oversight)
    '/production/analytics', '/production/machine-management',
    '/production/scheduling', '/production/workflow',
    // Dashboard
    '/dashboard/workbench'
  ],
  
  'FINANCE_CONTROLLER': [
    // Finance (subset - controller level)
    '/finance/accounts-payable-summary', '/finance/accounts-receivable-summary',
    '/finance/approval-details/[taskId]', '/finance/approval-structure-overview',
    '/finance/executive-dashboard', '/finance/general-ledger',
    '/finance/payment-approval-queue',
    '/finance-controller',
    // Reconciliation
    '/reconciliation', '/reconciliation/[id]', '/reconciliation/upload',
    // Settlements
    '/settlements', '/settlements/[id]',
    // Reports
    '/reports/payment-summary', '/reports/settlement-audit',
    // Dashboard
    '/dashboard/workbench',
    // Bank
    '/common/bank-accounts'
  ],

  // ========== GROUP 2: OPERATIONS ROLES ==========
  
  'HUB_INCHARGE': [
    // Hub dashboard
    '/hub-incharge', '/dashboard/workbench',
    // Operations
    '/operations/inventory-management', '/operations/kpi-dashboard',
    '/operations/asset-register-hub', '/operations/bom-view',
    '/operations/delivery-note', '/operations/item-master-limited',
    '/operations/quality-inspection', '/operations/sales-order',
    '/operations/sales-order-view', '/operations/shipping-logistics',
    '/operations/stock-entry', '/operations/stock-entry-transfer',
    '/operations/stock-ledger', '/operations/work-order',
    '/operations-manager',
    // Store access
    '/store-incharge',
    // Pump logs (if needed)
    '/pump-management/server-logs'
  ],
  
  'STORE_INCHARGE': [
    // Store dashboard
    '/store-incharge', '/dashboard/workbench',
    // Operations (store-specific)
    '/operations/inventory-management', '/operations/kpi-dashboard',
    '/operations/asset-register-hub', '/operations/bom-view',
    '/operations/delivery-note', '/operations/item-master-limited',
    '/operations/quality-inspection', '/operations/sales-order',
    '/operations/sales-order-view', '/operations/shipping-logistics',
    '/operations/stock-entry', '/operations/stock-entry-transfer',
    '/operations/stock-ledger', '/operations/work-order',
    '/operations-manager',
    // Pump logs
    '/pump-management/server-logs'
  ],
  
  'OPERATIONS_MANAGER': [
    // Operations (FULL)
    '/operations/inventory-management', '/operations/kpi-dashboard',
    '/operations/asset-register-hub', '/operations/bom-view',
    '/operations/delivery-note', '/operations/item-master-limited',
    '/operations/quality-inspection', '/operations/sales-order',
    '/operations/sales-order-view', '/operations/shipping-logistics',
    '/operations/stock-entry', '/operations/stock-entry-transfer',
    '/operations/stock-ledger', '/operations/work-order',
    '/operations-manager',
    // Dashboards
    '/hub-incharge', '/store-incharge', '/dashboard/workbench',
    // Production
    '/production/analytics', '/production/machine-management',
    '/production/scheduling', '/production/workflow',
    // Procurement (view)
    '/procurement/purchase-orders',
    // Pump logs
    '/pump-management/server-logs'
  ],
  
  'HUB_INCHARGE_SR': [
    '/hub-incharge', '/dashboard/workbench',
    '/operations/inventory-management', '/operations/kpi-dashboard',
    '/reports/payment-summary'
  ],
  
  'STORE_INCHARGE_SR': [
    '/store-incharge', '/dashboard/workbench',
    '/operations/inventory-management', '/operations/kpi-dashboard',
    '/reports/payment-summary'
  ],
  
  'BRANCH_INCHARGE': [
    '/dashboard/workbench',
    '/operations/inventory-management'
  ],

  // ========== GROUP 3: FINANCE SUPPORT ROLES ==========
  
  'ACCOUNTANT': [
    // Finance (FULL operations)
    '/finance/accounts-payable-summary', '/finance/accounts-receivable-summary',
    '/finance/approval-details/[taskId]', '/finance/approval-structure-overview',
    '/finance/bank-reconciliation', '/finance/bank-reconciliation-execute',
    '/finance/bank-statement-upload', '/finance/budget-approval',
    '/finance/budgeting-forecasting', '/finance/cash-flow-forecast',
    '/finance/cash-flow-statement', '/finance/chart-of-accounts',
    '/finance/company-dashboard', '/finance/cost-center-analysis',
    '/finance/executive-dashboard', '/finance/expense-report',
    '/finance/financial-statements', '/finance/fixed-asset-register',
    '/finance/foreign-exchange-management', '/finance/general-ledger',
    '/finance/inter-company-reconciliation', '/finance/invoice-posting',
    '/finance/journal-entries', '/finance/journal-entries-approval',
    '/finance/loan-management', '/finance/payment-approval-queue',
    '/finance/payment-batch-processing', '/finance/payment-entry',
    '/finance/payment-entry-view', '/finance/payment-gateway-integration',
    '/finance/period-end-adjustment-entries', '/finance/period-end-closing',
    '/finance/purchase-invoice', '/finance/tax-reports',
    '/finance/trial-balance', '/finance/vendor-master',
    '/finance-controller',
    // Reconciliation
    '/reconciliation', '/reconciliation/[id]', '/reconciliation/upload',
    // Settlements
    '/settlements', '/settlements/[id]',
    // Bank
    '/common/bank-accounts'
  ],
  
  'ACCOUNTS': [
    // Limited finance
    '/finance/accounts-receivable-summary', '/finance/general-ledger',
    '/finance/payment-approval-queue', '/finance/approval-details/[taskId]',
    // Reconciliation
    '/reconciliation', '/reconciliation/[id]', '/reconciliation/upload',
    // Settlements
    '/settlements', '/settlements/[id]',
    // Billing
    '/billing/invoices',
    // Reports
    '/reports/payment-summary',
    // Bank
    '/common/bank-accounts'
  ],
  
  'ACCOUNTS_PAYABLE': [
    // AP specific
    '/finance/accounts-payable-summary', '/finance/invoice-posting',
    '/finance/payment-entry', '/finance/payment-entry-view',
    '/finance/purchase-invoice', '/finance/vendor-master'
  ],
  
  'BANKER': [
    // Bank/reconciliation only
    '/common/bank-accounts',
    '/finance/payment-approval-queue',
    '/reconciliation', '/reconciliation/[id]',
    '/settlements', '/settlements/[id]'
  ],
  
  'TREASURY': [
    '/finance/executive-dashboard', '/finance/payment-approval-queue',
    '/finance/approval-details/[taskId]'
  ],

  // ========== GROUP 4: COMPLIANCE & AUDIT ==========
  
  'COMPLIANCE': [
    '/compliance/approval-workflow-view', '/compliance/audit-trail',
    '/compliance/compliance-dashboard', '/compliance/contract-management',
    '/compliance/document-management', '/compliance/document-repository-view',
    '/compliance/legal-case-management', '/compliance/litigation-tracker',
    '/compliance/policy-management', '/compliance/regulatory-compliance',
    '/compliance/regulatory-report-templates', '/compliance/risk-management',
    '/compliance/vendor-customer-master-legal',
    '/compliance-officer',
    '/governance/audit-integrity', '/governance/rbac-structure',
    '/governance/security-overview', '/governance/security-violations'
  ],
  
  'LEGAL': [
    '/legal',
    '/compliance/approval-workflow-view', '/compliance/audit-trail',
    '/compliance/compliance-dashboard', '/compliance/contract-management',
    '/compliance/document-management', '/compliance/document-repository-view',
    '/compliance/legal-case-management', '/compliance/litigation-tracker',
    '/compliance/policy-management', '/compliance/regulatory-compliance',
    '/compliance/regulatory-report-templates', '/compliance/risk-management',
    '/compliance/vendor-customer-master-legal',
    '/compliance-officer'
  ],
  
  'AUDITOR': [
    '/compliance/approval-workflow-view', '/compliance/audit-trail',
    '/compliance/compliance-dashboard', '/compliance/contract-management',
    '/compliance/document-management', '/compliance/document-repository-view',
    '/compliance/legal-case-management', '/compliance/litigation-tracker',
    '/compliance/policy-management', '/compliance/regulatory-compliance',
    '/compliance/regulatory-report-templates', '/compliance/risk-management',
    '/compliance/vendor-customer-master-legal',
    '/compliance-officer',
    '/governance/audit-integrity', '/governance/rbac-structure',
    '/governance/security-overview', '/governance/security-violations',
    '/reports/settlement-audit'
  ],

  // ========== GROUP 5: HR ==========
  
  'HR': [
    '/hr/attendance-tracking', '/hr/performance-review',
    '/hr/policy', '/hr/training', '/hr/user-creation',
    '/system/user-creation'
  ],
  
  'HR_MANAGER': [
    '/hr/attendance-tracking', '/hr/performance-review',
    '/hr/policy', '/hr/training', '/hr/user-creation',
    '/system/user-creation',
    '/dashboard/workbench'
  ],

  // ========== GROUP 6: PROCUREMENT ==========
  
  'PROCUREMENT_OFFICER': [
    '/procurement/goods-receipt', '/procurement/material-request',
    '/procurement/purchase-order', '/procurement/purchase-orders',
    '/procurement/purchase-request', '/procurement/rfq',
    '/procurement/supplier-master', '/procurement/supplier-quotation',
    '/procurement-officer'
  ],

  // ========== GROUP 7: MINIMAL ROLES ==========
  
  'STAFF': [
    '/staff'
  ],
  
  'SUPERVISOR': [
    '/staff',
    '/reports/payment-summary'
  ],
  
  'DATA_ENTRY': [
    '/staff',
    '/sales/customer-master', '/sales/quotation-management'
  ],
  
  'INTERN': [
    // Minimal - just profile access (inherited from BASE_USER)
  ],

  // ========== GROUP 8: BISMAN INTERNAL ==========
  
  'BISMAN_ENGINEERING': [
    '/communication/internal-chat',
    '/internal/customers', '/internal/playbooks',
    '/internal/support-sessions', '/internal/teams',
    '/qa', '/qa/issues', '/qa/issues/[id]', '/qa/issues/new',
    '/qa/role-access-explorer', '/qa/test-tasks',
    '/qa/test-tasks/[id]', '/qa/test-tasks/new',
    '/system/server-logs'
  ],
  
  'BISMAN_SUPPORT': [
    '/communication/internal-chat',
    '/internal/customers', '/internal/playbooks',
    '/internal/support-sessions', '/internal/teams'
  ],
  
  'BISMAN_CUSTOMER_CARE': [
    '/communication/internal-chat',
    '/internal/customers', '/internal/playbooks',
    '/internal/support-sessions', '/internal/teams'
  ],
  
  'BISMAN_FINANCE': [
    '/billing', '/billing/invoices',
    '/communication/internal-chat',
    '/internal/customers', '/internal/playbooks',
    '/internal/support-sessions', '/internal/teams'
  ],
  
  'BISMAN_BILLING': [
    '/billing', '/billing/invoices',
    '/communication/internal-chat',
    '/internal/customers', '/internal/playbooks',
    '/internal/support-sessions', '/internal/teams'
  ],

  // ========== GROUP 9: QA ==========
  
  'QA': [
    '/qa', '/qa/issues', '/qa/issues/[id]', '/qa/issues/new',
    '/qa/role-access-explorer', '/qa/test-tasks',
    '/qa/test-tasks/[id]', '/qa/test-tasks/new'
  ]
};

// Roles to SKIP (they have full access or special handling)
const SKIP_ROLES = ['SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'ADMIN_OPS', 'IT_ADMIN'];

// Deprecated roles to disable
const DEPRECATED_ROLES = ['MANAGER'];

async function tightenRole(roleName, allowlist) {
  const client = await pool.connect();
  try {
    // Get current count
    const beforeCount = await client.query(
      'SELECT COUNT(*) as cnt FROM role_page_access WHERE role_name = $1 AND can_view = true',
      [roleName]
    );
    
    if (allowlist.length === 0) {
      // Role should have NO direct pages (inherits only from BASE_USER)
      const deleted = await client.query(`
        DELETE FROM role_page_access WHERE role_name = $1 RETURNING id
      `, [roleName]);
      
      return {
        role: roleName,
        before: parseInt(beforeCount.rows[0].cnt),
        after: 0,
        deleted: deleted.rowCount,
        inserted: 0
      };
    }
    
    // Step 1: Delete everything NOT in allowlist
    const deleted = await client.query(`
      DELETE FROM role_page_access rpa
      USING pages_master pm
      WHERE rpa.role_name = $1
        AND rpa.page_id = pm.id
        AND pm.route != ALL($2::text[])
      RETURNING pm.route
    `, [roleName, allowlist]);
    
    // Step 2: Insert missing allowlist routes
    const inserted = await client.query(`
      INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete)
      SELECT $1, pm.id, true, false, false
      FROM pages_master pm
      WHERE pm.route = ANY($2::text[])
        AND pm.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM role_page_access rpa 
          WHERE rpa.role_name = $1 AND rpa.page_id = pm.id
        )
      RETURNING page_id
    `, [roleName, allowlist]);
    
    // Get after count
    const afterCount = await client.query(
      'SELECT COUNT(*) as cnt FROM role_page_access WHERE role_name = $1 AND can_view = true',
      [roleName]
    );
    
    return {
      role: roleName,
      before: parseInt(beforeCount.rows[0].cnt),
      after: parseInt(afterCount.rows[0].cnt),
      deleted: deleted.rowCount,
      inserted: inserted.rowCount
    };
  } finally {
    client.release();
  }
}

async function disableDeprecatedRole(roleName) {
  // Just remove all page access for deprecated roles
  const result = await pool.query(
    'DELETE FROM role_page_access WHERE role_name = $1 RETURNING id',
    [roleName]
  );
  return result.rowCount;
}

async function runPhase2() {
  console.log('='.repeat(60));
  console.log('PHASE 2: RBAC TIGHTENING - ROLE ALLOWLISTS');
  console.log('='.repeat(60));
  console.log('');
  
  const results = [];
  
  // Process each role
  for (const [roleName, allowlist] of Object.entries(ROLE_ALLOWLISTS)) {
    if (SKIP_ROLES.includes(roleName)) {
      console.log(`⏭️  SKIP: ${roleName} (platform role - keep full access)`);
      continue;
    }
    
    try {
      const result = await tightenRole(roleName, allowlist);
      results.push(result);
      
      const change = result.after - result.before;
      const changeStr = change === 0 ? '=' : (change > 0 ? `+${change}` : change);
      console.log(`✅ ${roleName.padEnd(25)} | ${result.before} → ${result.after} (${changeStr}) | -${result.deleted} +${result.inserted}`);
    } catch (e) {
      console.log(`❌ ${roleName}: ${e.message}`);
    }
  }
  
  // Handle deprecated roles
  console.log('\n--- Deprecated Roles ---');
  for (const roleName of DEPRECATED_ROLES) {
    try {
      const deleted = await disableDeprecatedRole(roleName);
      console.log(`🗑️  ${roleName}: removed ${deleted} mappings`);
    } catch (e) {
      console.log(`❌ ${roleName}: ${e.message}`);
    }
  }
  
  // Verification queries
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION');
  console.log('='.repeat(60));
  
  // 1) Business roles with /system/* pages
  const systemLeakage = await pool.query(`
    SELECT rpa.role_name, pm.route
    FROM role_page_access rpa
    JOIN pages_master pm ON pm.id = rpa.page_id
    WHERE pm.route LIKE '/system/%'
      AND rpa.role_name NOT IN ('SYSTEM_ADMIN','SUPER_ADMIN','IT_ADMIN','CTO','BISMAN_ENGINEERING')
  `);
  console.log(`\n1) Business roles with /system/* pages: ${systemLeakage.rows.length}`);
  if (systemLeakage.rows.length > 0) {
    systemLeakage.rows.slice(0, 5).forEach(r => console.log(`   ⚠️  ${r.role_name} → ${r.route}`));
  } else {
    console.log('   ✅ Clean');
  }
  
  // 2) Pump logs assignment
  const pumpLogs = await pool.query(`
    SELECT rpa.role_name
    FROM role_page_access rpa
    JOIN pages_master pm ON pm.id = rpa.page_id
    WHERE pm.route = '/pump-management/server-logs'
    ORDER BY rpa.role_name
  `);
  console.log(`\n2) /pump-management/server-logs assigned to:`);
  if (pumpLogs.rows.length > 0) {
    console.log('   ' + pumpLogs.rows.map(r => r.role_name).join(', '));
  } else {
    console.log('   (none)');
  }
  
  // 3) Final page counts
  const counts = await pool.query(`
    SELECT role_name, COUNT(*) AS pages
    FROM role_page_access
    WHERE can_view = true
    GROUP BY role_name
    ORDER BY pages DESC
  `);
  console.log('\n3) Final Role Page Counts:');
  console.log('   Role                      | Pages');
  console.log('   --------------------------|------');
  counts.rows.forEach(r => {
    console.log(`   ${r.role_name.padEnd(25)} | ${r.pages}`);
  });
  
  // Total
  const total = await pool.query('SELECT COUNT(*) as cnt FROM role_page_access');
  console.log(`\n   TOTAL MAPPINGS: ${total.rows[0].cnt}`);
  
  // 4) BASE_USER pages count
  const baseUser = await pool.query('SELECT COUNT(*) as cnt FROM base_user_pages');
  console.log(`   BASE_USER pages: ${baseUser.rows[0].cnt} (inherited by all business roles)`);
  
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2 COMPLETE');
  console.log('='.repeat(60));
}

runPhase2()
  .catch(e => console.error('Fatal error:', e))
  .finally(() => pool.end());
