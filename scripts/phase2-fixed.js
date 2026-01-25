const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

// Role allowlists - same as before
const ROLE_ALLOWLISTS = {
  'CEO': ['/cfo-dashboard', '/dashboard/workbench', '/operations/kpi-dashboard', '/reports/payment-summary', '/reports/settlement-audit', '/compliance/compliance-dashboard', '/common/user-creation'],
  
  'CFO': ['/finance/accounts-payable-summary', '/finance/accounts-receivable-summary', '/finance/approval-details/[taskId]', '/finance/approval-structure-overview', '/finance/bank-reconciliation', '/finance/bank-reconciliation-execute', '/finance/bank-statement-upload', '/finance/budget-approval', '/finance/budgeting-forecasting', '/finance/cash-flow-forecast', '/finance/cash-flow-statement', '/finance/chart-of-accounts', '/finance/company-dashboard', '/finance/cost-center-analysis', '/finance/executive-dashboard', '/finance/expense-report', '/finance/financial-statements', '/finance/fixed-asset-register', '/finance/foreign-exchange-management', '/finance/general-ledger', '/finance/inter-company-reconciliation', '/finance/invoice-posting', '/finance/journal-entries', '/finance/journal-entries-approval', '/finance/loan-management', '/finance/payment-approval-queue', '/finance/payment-batch-processing', '/finance/payment-entry', '/finance/payment-entry-view', '/finance/payment-gateway-integration', '/finance/period-end-adjustment-entries', '/finance/period-end-closing', '/finance/purchase-invoice', '/finance/tax-reports', '/finance/trial-balance', '/finance/vendor-master', '/finance-controller', '/reconciliation', '/reconciliation/[id]', '/reconciliation/upload', '/settlements', '/settlements/[id]', '/billing', '/billing/invoices', '/reports/payment-summary', '/reports/settlement-audit', '/cfo-dashboard', '/dashboard/workbench', '/common/bank-accounts', '/compliance/compliance-dashboard', '/procurement/purchase-orders'],
  
  'COO': ['/operations/inventory-management', '/operations/kpi-dashboard', '/operations/asset-register-hub', '/operations/bom-view', '/operations/delivery-note', '/operations/item-master-limited', '/operations/quality-inspection', '/operations/sales-order', '/operations/sales-order-view', '/operations/shipping-logistics', '/operations/stock-entry', '/operations/stock-entry-transfer', '/operations/stock-ledger', '/operations/work-order', '/operations-manager', '/production/analytics', '/production/machine-management', '/production/scheduling', '/production/workflow', '/inventory/barcode-scanning', '/inventory/category-management', '/inventory/reorder-rules', '/inventory/reports', '/shipping/carrier-management', '/shipping/shipment-tracking', '/warehouse/bin-location', '/cfo-dashboard', '/dashboard/workbench', '/reports/payment-summary', '/reports/settlement-audit', '/finance/executive-dashboard'],
  
  'CTO': ['/system/integration-settings', '/system/server-logs', '/system/system-health-dashboard', '/production/analytics', '/production/machine-management', '/production/scheduling', '/production/workflow', '/dashboard/workbench'],
  
  'FINANCE_CONTROLLER': ['/finance/accounts-payable-summary', '/finance/accounts-receivable-summary', '/finance/approval-details/[taskId]', '/finance/approval-structure-overview', '/finance/executive-dashboard', '/finance/general-ledger', '/finance/payment-approval-queue', '/finance-controller', '/reconciliation', '/reconciliation/[id]', '/reconciliation/upload', '/settlements', '/settlements/[id]', '/reports/payment-summary', '/reports/settlement-audit', '/dashboard/workbench', '/common/bank-accounts'],
  
  'HUB_INCHARGE': ['/hub-incharge', '/dashboard/workbench', '/operations/inventory-management', '/operations/kpi-dashboard', '/operations/asset-register-hub', '/operations/bom-view', '/operations/delivery-note', '/operations/item-master-limited', '/operations/quality-inspection', '/operations/sales-order', '/operations/sales-order-view', '/operations/shipping-logistics', '/operations/stock-entry', '/operations/stock-entry-transfer', '/operations/stock-ledger', '/operations/work-order', '/operations-manager', '/store-incharge', '/pump-management/server-logs'],
  
  'STORE_INCHARGE': ['/store-incharge', '/dashboard/workbench', '/operations/inventory-management', '/operations/kpi-dashboard', '/operations/asset-register-hub', '/operations/bom-view', '/operations/delivery-note', '/operations/item-master-limited', '/operations/quality-inspection', '/operations/sales-order', '/operations/sales-order-view', '/operations/shipping-logistics', '/operations/stock-entry', '/operations/stock-entry-transfer', '/operations/stock-ledger', '/operations/work-order', '/operations-manager', '/pump-management/server-logs'],
  
  'OPERATIONS_MANAGER': ['/operations/inventory-management', '/operations/kpi-dashboard', '/operations/asset-register-hub', '/operations/bom-view', '/operations/delivery-note', '/operations/item-master-limited', '/operations/quality-inspection', '/operations/sales-order', '/operations/sales-order-view', '/operations/shipping-logistics', '/operations/stock-entry', '/operations/stock-entry-transfer', '/operations/stock-ledger', '/operations/work-order', '/operations-manager', '/hub-incharge', '/store-incharge', '/dashboard/workbench', '/production/analytics', '/production/machine-management', '/production/scheduling', '/production/workflow', '/procurement/purchase-orders', '/pump-management/server-logs'],
  
  'HUB_INCHARGE_SR': ['/hub-incharge', '/dashboard/workbench', '/operations/inventory-management', '/operations/kpi-dashboard', '/reports/payment-summary'],
  'STORE_INCHARGE_SR': ['/store-incharge', '/dashboard/workbench', '/operations/inventory-management', '/operations/kpi-dashboard', '/reports/payment-summary'],
  'BRANCH_INCHARGE': ['/dashboard/workbench', '/operations/inventory-management'],
  
  'ACCOUNTANT': ['/finance/accounts-payable-summary', '/finance/accounts-receivable-summary', '/finance/approval-details/[taskId]', '/finance/approval-structure-overview', '/finance/bank-reconciliation', '/finance/bank-reconciliation-execute', '/finance/bank-statement-upload', '/finance/budget-approval', '/finance/budgeting-forecasting', '/finance/cash-flow-forecast', '/finance/cash-flow-statement', '/finance/chart-of-accounts', '/finance/company-dashboard', '/finance/cost-center-analysis', '/finance/executive-dashboard', '/finance/expense-report', '/finance/financial-statements', '/finance/fixed-asset-register', '/finance/foreign-exchange-management', '/finance/general-ledger', '/finance/inter-company-reconciliation', '/finance/invoice-posting', '/finance/journal-entries', '/finance/journal-entries-approval', '/finance/loan-management', '/finance/payment-approval-queue', '/finance/payment-batch-processing', '/finance/payment-entry', '/finance/payment-entry-view', '/finance/payment-gateway-integration', '/finance/period-end-adjustment-entries', '/finance/period-end-closing', '/finance/purchase-invoice', '/finance/tax-reports', '/finance/trial-balance', '/finance/vendor-master', '/finance-controller', '/reconciliation', '/reconciliation/[id]', '/reconciliation/upload', '/settlements', '/settlements/[id]', '/common/bank-accounts'],
  
  'ACCOUNTS': ['/finance/accounts-receivable-summary', '/finance/general-ledger', '/finance/payment-approval-queue', '/finance/approval-details/[taskId]', '/reconciliation', '/reconciliation/[id]', '/reconciliation/upload', '/settlements', '/settlements/[id]', '/billing/invoices', '/reports/payment-summary', '/common/bank-accounts'],
  
  'ACCOUNTS_PAYABLE': ['/finance/accounts-payable-summary', '/finance/invoice-posting', '/finance/payment-entry', '/finance/payment-entry-view', '/finance/purchase-invoice', '/finance/vendor-master'],
  
  'BANKER': ['/common/bank-accounts', '/finance/payment-approval-queue', '/reconciliation', '/reconciliation/[id]', '/settlements', '/settlements/[id]'],
  
  'TREASURY': ['/finance/executive-dashboard', '/finance/payment-approval-queue', '/finance/approval-details/[taskId]'],
  
  'COMPLIANCE': ['/compliance/approval-workflow-view', '/compliance/audit-trail', '/compliance/compliance-dashboard', '/compliance/contract-management', '/compliance/document-management', '/compliance/document-repository-view', '/compliance/legal-case-management', '/compliance/litigation-tracker', '/compliance/policy-management', '/compliance/regulatory-compliance', '/compliance/regulatory-report-templates', '/compliance/risk-management', '/compliance/vendor-customer-master-legal', '/compliance-officer', '/governance/audit-integrity', '/governance/rbac-structure', '/governance/security-overview', '/governance/security-violations'],
  
  'LEGAL': ['/legal', '/compliance/approval-workflow-view', '/compliance/audit-trail', '/compliance/compliance-dashboard', '/compliance/contract-management', '/compliance/document-management', '/compliance/document-repository-view', '/compliance/legal-case-management', '/compliance/litigation-tracker', '/compliance/policy-management', '/compliance/regulatory-compliance', '/compliance/regulatory-report-templates', '/compliance/risk-management', '/compliance/vendor-customer-master-legal', '/compliance-officer'],
  
  'AUDITOR': ['/compliance/approval-workflow-view', '/compliance/audit-trail', '/compliance/compliance-dashboard', '/compliance/contract-management', '/compliance/document-management', '/compliance/document-repository-view', '/compliance/legal-case-management', '/compliance/litigation-tracker', '/compliance/policy-management', '/compliance/regulatory-compliance', '/compliance/regulatory-report-templates', '/compliance/risk-management', '/compliance/vendor-customer-master-legal', '/compliance-officer', '/governance/audit-integrity', '/governance/rbac-structure', '/governance/security-overview', '/governance/security-violations', '/reports/settlement-audit'],
  
  'HR': ['/hr/attendance-tracking', '/hr/performance-review', '/hr/policy', '/hr/training', '/hr/user-creation', '/system/user-creation'],
  'HR_MANAGER': ['/hr/attendance-tracking', '/hr/performance-review', '/hr/policy', '/hr/training', '/hr/user-creation', '/system/user-creation', '/dashboard/workbench'],
  
  'PROCUREMENT_OFFICER': ['/procurement/goods-receipt', '/procurement/material-request', '/procurement/purchase-order', '/procurement/purchase-orders', '/procurement/purchase-request', '/procurement/rfq', '/procurement/supplier-master', '/procurement/supplier-quotation', '/procurement-officer'],
  
  'STAFF': ['/staff'],
  'SUPERVISOR': ['/staff', '/reports/payment-summary'],
  'DATA_ENTRY': ['/staff', '/sales/customer-master', '/sales/quotation-management'],
  'INTERN': [],
  
  'BISMAN_ENGINEERING': ['/communication/internal-chat', '/internal/customers', '/internal/playbooks', '/internal/support-sessions', '/internal/teams', '/qa', '/qa/issues', '/qa/issues/[id]', '/qa/issues/new', '/qa/role-access-explorer', '/qa/test-tasks', '/qa/test-tasks/[id]', '/qa/test-tasks/new', '/system/server-logs'],
  'BISMAN_SUPPORT': ['/communication/internal-chat', '/internal/customers', '/internal/playbooks', '/internal/support-sessions', '/internal/teams'],
  'BISMAN_CUSTOMER_CARE': ['/communication/internal-chat', '/internal/customers', '/internal/playbooks', '/internal/support-sessions', '/internal/teams'],
  'BISMAN_FINANCE': ['/billing', '/billing/invoices', '/communication/internal-chat', '/internal/customers', '/internal/playbooks', '/internal/support-sessions', '/internal/teams'],
  'BISMAN_BILLING': ['/billing', '/billing/invoices', '/communication/internal-chat', '/internal/customers', '/internal/playbooks', '/internal/support-sessions', '/internal/teams'],
  
  'QA': ['/qa', '/qa/issues', '/qa/issues/[id]', '/qa/issues/new', '/qa/role-access-explorer', '/qa/test-tasks', '/qa/test-tasks/[id]', '/qa/test-tasks/new']
};

const SKIP_ROLES = ['SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'ADMIN_OPS', 'IT_ADMIN'];

async function tightenRole(roleName, allowlist) {
  const beforeRes = await pool.query('SELECT COUNT(*) as cnt FROM role_page_access WHERE role_name = $1', [roleName]);
  const before = parseInt(beforeRes.rows[0].cnt);
  
  if (allowlist.length === 0) {
    await pool.query('DELETE FROM role_page_access WHERE role_name = $1', [roleName]);
    return { role: roleName, before, after: 0, deleted: before, inserted: 0 };
  }
  
  // Build IN clause with positional params
  const routeParams = allowlist.map((_, i) => `$${i + 2}`).join(',');
  
  // Delete non-allowlist pages
  const delQuery = `
    DELETE FROM role_page_access rpa
    USING pages_master pm
    WHERE rpa.role_name = $1
      AND rpa.page_id = pm.id
      AND pm.route NOT IN (${routeParams})
  `;
  const delParams = [roleName, ...allowlist];
  const delRes = await pool.query(delQuery, delParams);
  
  // Insert missing allowlist pages
  const insQuery = `
    INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete)
    SELECT $1, pm.id, true, false, false
    FROM pages_master pm
    WHERE pm.route IN (${routeParams})
      AND pm.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM role_page_access WHERE role_name = $1 AND page_id = pm.id)
  `;
  const insRes = await pool.query(insQuery, delParams);
  
  const afterRes = await pool.query('SELECT COUNT(*) as cnt FROM role_page_access WHERE role_name = $1', [roleName]);
  const after = parseInt(afterRes.rows[0].cnt);
  
  return { role: roleName, before, after, deleted: delRes.rowCount, inserted: insRes.rowCount };
}

async function run() {
  console.log('='.repeat(60));
  console.log('PHASE 2: RBAC TIGHTENING (FIXED)');
  console.log('='.repeat(60) + '\n');
  
  for (const [role, allowlist] of Object.entries(ROLE_ALLOWLISTS)) {
    if (SKIP_ROLES.includes(role)) {
      console.log(`⏭️  SKIP: ${role}`);
      continue;
    }
    try {
      const r = await tightenRole(role, allowlist);
      const ch = r.after - r.before;
      console.log(`✅ ${role.padEnd(25)} | ${r.before} → ${r.after} (${ch >= 0 ? '+' : ''}${ch}) | -${r.deleted} +${r.inserted}`);
    } catch (e) {
      console.log(`❌ ${role}: ${e.message}`);
    }
  }
  
  // Verification
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION');
  console.log('='.repeat(60));
  
  const counts = await pool.query(`
    SELECT role_name, COUNT(*) AS pages FROM role_page_access WHERE can_view = true GROUP BY role_name ORDER BY pages DESC
  `);
  console.log('\nFinal Role Page Counts:');
  counts.rows.forEach(r => console.log(`   ${r.role_name.padEnd(25)} | ${r.pages}`));
  
  const total = await pool.query('SELECT COUNT(*) as cnt FROM role_page_access');
  console.log(`\nTOTAL MAPPINGS: ${total.rows[0].cnt}`);
  
  const base = await pool.query('SELECT COUNT(*) as cnt FROM base_user_pages');
  console.log(`BASE_USER pages: ${base.rows[0].cnt} (inherited)`);
}

run().catch(e => console.error(e)).finally(() => pool.end());
