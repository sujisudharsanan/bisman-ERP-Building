const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

// Define allowlists inline as SQL strings
const TIGHTEN_QUERIES = [
  // CEO - executive dashboards only
  { role: 'CEO', allowlist: `'/cfo-dashboard','/dashboard/workbench','/operations/kpi-dashboard','/reports/payment-summary','/reports/settlement-audit','/compliance/compliance-dashboard','/common/user-creation'` },
  
  // CFO - full finance
  { role: 'CFO', allowlist: `'/finance/accounts-payable-summary','/finance/accounts-receivable-summary','/finance/approval-details/[taskId]','/finance/approval-structure-overview','/finance/bank-reconciliation','/finance/bank-reconciliation-execute','/finance/bank-statement-upload','/finance/budget-approval','/finance/budgeting-forecasting','/finance/cash-flow-forecast','/finance/cash-flow-statement','/finance/chart-of-accounts','/finance/company-dashboard','/finance/cost-center-analysis','/finance/executive-dashboard','/finance/expense-report','/finance/financial-statements','/finance/fixed-asset-register','/finance/foreign-exchange-management','/finance/general-ledger','/finance/inter-company-reconciliation','/finance/invoice-posting','/finance/journal-entries','/finance/journal-entries-approval','/finance/loan-management','/finance/payment-approval-queue','/finance/payment-batch-processing','/finance/payment-entry','/finance/payment-entry-view','/finance/payment-gateway-integration','/finance/period-end-adjustment-entries','/finance/period-end-closing','/finance/purchase-invoice','/finance/tax-reports','/finance/trial-balance','/finance/vendor-master','/finance-controller','/reconciliation','/reconciliation/[id]','/reconciliation/upload','/settlements','/settlements/[id]','/billing','/billing/invoices','/reports/payment-summary','/reports/settlement-audit','/cfo-dashboard','/dashboard/workbench','/common/bank-accounts','/compliance/compliance-dashboard','/procurement/purchase-orders'` },
  
  // COO - operations focus
  { role: 'COO', allowlist: `'/operations/inventory-management','/operations/kpi-dashboard','/operations/asset-register-hub','/operations/bom-view','/operations/delivery-note','/operations/item-master-limited','/operations/quality-inspection','/operations/sales-order','/operations/sales-order-view','/operations/shipping-logistics','/operations/stock-entry','/operations/stock-entry-transfer','/operations/stock-ledger','/operations/work-order','/operations-manager','/production/analytics','/production/machine-management','/production/scheduling','/production/workflow','/inventory/barcode-scanning','/inventory/category-management','/inventory/reorder-rules','/inventory/reports','/shipping/carrier-management','/shipping/shipment-tracking','/warehouse/bin-location','/cfo-dashboard','/dashboard/workbench','/reports/payment-summary','/reports/settlement-audit','/finance/executive-dashboard'` },
  
  // CTO - tech focus
  { role: 'CTO', allowlist: `'/system/integration-settings','/system/server-logs','/system/system-health-dashboard','/production/analytics','/production/machine-management','/production/scheduling','/production/workflow','/dashboard/workbench'` },
  
  // FINANCE_CONTROLLER
  { role: 'FINANCE_CONTROLLER', allowlist: `'/finance/accounts-payable-summary','/finance/accounts-receivable-summary','/finance/approval-details/[taskId]','/finance/approval-structure-overview','/finance/executive-dashboard','/finance/general-ledger','/finance/payment-approval-queue','/finance-controller','/reconciliation','/reconciliation/[id]','/reconciliation/upload','/settlements','/settlements/[id]','/reports/payment-summary','/reports/settlement-audit','/dashboard/workbench','/common/bank-accounts'` },
  
  // HUB_INCHARGE
  { role: 'HUB_INCHARGE', allowlist: `'/hub-incharge','/dashboard/workbench','/operations/inventory-management','/operations/kpi-dashboard','/operations/asset-register-hub','/operations/bom-view','/operations/delivery-note','/operations/item-master-limited','/operations/quality-inspection','/operations/sales-order','/operations/sales-order-view','/operations/shipping-logistics','/operations/stock-entry','/operations/stock-entry-transfer','/operations/stock-ledger','/operations/work-order','/operations-manager','/store-incharge','/pump-management/server-logs'` },
  
  // STORE_INCHARGE
  { role: 'STORE_INCHARGE', allowlist: `'/store-incharge','/dashboard/workbench','/operations/inventory-management','/operations/kpi-dashboard','/operations/asset-register-hub','/operations/bom-view','/operations/delivery-note','/operations/item-master-limited','/operations/quality-inspection','/operations/sales-order','/operations/sales-order-view','/operations/shipping-logistics','/operations/stock-entry','/operations/stock-entry-transfer','/operations/stock-ledger','/operations/work-order','/operations-manager','/pump-management/server-logs'` },
  
  // OPERATIONS_MANAGER
  { role: 'OPERATIONS_MANAGER', allowlist: `'/operations/inventory-management','/operations/kpi-dashboard','/operations/asset-register-hub','/operations/bom-view','/operations/delivery-note','/operations/item-master-limited','/operations/quality-inspection','/operations/sales-order','/operations/sales-order-view','/operations/shipping-logistics','/operations/stock-entry','/operations/stock-entry-transfer','/operations/stock-ledger','/operations/work-order','/operations-manager','/hub-incharge','/store-incharge','/dashboard/workbench','/production/analytics','/production/machine-management','/production/scheduling','/production/workflow','/procurement/purchase-orders','/pump-management/server-logs'` },
  
  // SR roles
  { role: 'HUB_INCHARGE_SR', allowlist: `'/hub-incharge','/dashboard/workbench','/operations/inventory-management','/operations/kpi-dashboard','/reports/payment-summary'` },
  { role: 'STORE_INCHARGE_SR', allowlist: `'/store-incharge','/dashboard/workbench','/operations/inventory-management','/operations/kpi-dashboard','/reports/payment-summary'` },
  { role: 'BRANCH_INCHARGE', allowlist: `'/dashboard/workbench','/operations/inventory-management'` },
  
  // ACCOUNTANT - full finance operations
  { role: 'ACCOUNTANT', allowlist: `'/finance/accounts-payable-summary','/finance/accounts-receivable-summary','/finance/approval-details/[taskId]','/finance/approval-structure-overview','/finance/bank-reconciliation','/finance/bank-reconciliation-execute','/finance/bank-statement-upload','/finance/budget-approval','/finance/budgeting-forecasting','/finance/cash-flow-forecast','/finance/cash-flow-statement','/finance/chart-of-accounts','/finance/company-dashboard','/finance/cost-center-analysis','/finance/executive-dashboard','/finance/expense-report','/finance/financial-statements','/finance/fixed-asset-register','/finance/foreign-exchange-management','/finance/general-ledger','/finance/inter-company-reconciliation','/finance/invoice-posting','/finance/journal-entries','/finance/journal-entries-approval','/finance/loan-management','/finance/payment-approval-queue','/finance/payment-batch-processing','/finance/payment-entry','/finance/payment-entry-view','/finance/payment-gateway-integration','/finance/period-end-adjustment-entries','/finance/period-end-closing','/finance/purchase-invoice','/finance/tax-reports','/finance/trial-balance','/finance/vendor-master','/finance-controller','/reconciliation','/reconciliation/[id]','/reconciliation/upload','/settlements','/settlements/[id]','/common/bank-accounts'` },
  
  // ACCOUNTS - limited
  { role: 'ACCOUNTS', allowlist: `'/finance/accounts-receivable-summary','/finance/general-ledger','/finance/payment-approval-queue','/finance/approval-details/[taskId]','/reconciliation','/reconciliation/[id]','/reconciliation/upload','/settlements','/settlements/[id]','/billing/invoices','/reports/payment-summary','/common/bank-accounts'` },
  
  // ACCOUNTS_PAYABLE
  { role: 'ACCOUNTS_PAYABLE', allowlist: `'/finance/accounts-payable-summary','/finance/invoice-posting','/finance/payment-entry','/finance/payment-entry-view','/finance/purchase-invoice','/finance/vendor-master'` },
  
  // BANKER
  { role: 'BANKER', allowlist: `'/common/bank-accounts','/finance/payment-approval-queue','/reconciliation','/reconciliation/[id]','/settlements','/settlements/[id]'` },
  
  // TREASURY
  { role: 'TREASURY', allowlist: `'/finance/executive-dashboard','/finance/payment-approval-queue','/finance/approval-details/[taskId]'` },
  
  // COMPLIANCE
  { role: 'COMPLIANCE', allowlist: `'/compliance/approval-workflow-view','/compliance/audit-trail','/compliance/compliance-dashboard','/compliance/contract-management','/compliance/document-management','/compliance/document-repository-view','/compliance/legal-case-management','/compliance/litigation-tracker','/compliance/policy-management','/compliance/regulatory-compliance','/compliance/regulatory-report-templates','/compliance/risk-management','/compliance/vendor-customer-master-legal','/compliance-officer','/governance/audit-integrity','/governance/rbac-structure','/governance/security-overview','/governance/security-violations'` },
  
  // LEGAL
  { role: 'LEGAL', allowlist: `'/legal','/compliance/approval-workflow-view','/compliance/audit-trail','/compliance/compliance-dashboard','/compliance/contract-management','/compliance/document-management','/compliance/document-repository-view','/compliance/legal-case-management','/compliance/litigation-tracker','/compliance/policy-management','/compliance/regulatory-compliance','/compliance/regulatory-report-templates','/compliance/risk-management','/compliance/vendor-customer-master-legal','/compliance-officer'` },
  
  // AUDITOR
  { role: 'AUDITOR', allowlist: `'/compliance/approval-workflow-view','/compliance/audit-trail','/compliance/compliance-dashboard','/compliance/contract-management','/compliance/document-management','/compliance/document-repository-view','/compliance/legal-case-management','/compliance/litigation-tracker','/compliance/policy-management','/compliance/regulatory-compliance','/compliance/regulatory-report-templates','/compliance/risk-management','/compliance/vendor-customer-master-legal','/compliance-officer','/governance/audit-integrity','/governance/rbac-structure','/governance/security-overview','/governance/security-violations','/reports/settlement-audit'` },
  
  // HR
  { role: 'HR', allowlist: `'/hr/attendance-tracking','/hr/performance-review','/hr/policy','/hr/training','/hr/user-creation','/system/user-creation'` },
  { role: 'HR_MANAGER', allowlist: `'/hr/attendance-tracking','/hr/performance-review','/hr/policy','/hr/training','/hr/user-creation','/system/user-creation','/dashboard/workbench'` },
  
  // PROCUREMENT_OFFICER
  { role: 'PROCUREMENT_OFFICER', allowlist: `'/procurement/goods-receipt','/procurement/material-request','/procurement/purchase-order','/procurement/purchase-orders','/procurement/purchase-request','/procurement/rfq','/procurement/supplier-master','/procurement/supplier-quotation','/procurement-officer'` },
  
  // Minimal roles
  { role: 'STAFF', allowlist: `'/staff'` },
  { role: 'SUPERVISOR', allowlist: `'/staff','/reports/payment-summary'` },
  { role: 'DATA_ENTRY', allowlist: `'/staff','/sales/customer-master','/sales/quotation-management'` },
  
  // BISMAN internal
  { role: 'BISMAN_ENGINEERING', allowlist: `'/communication/internal-chat','/internal/customers','/internal/playbooks','/internal/support-sessions','/internal/teams','/qa','/qa/issues','/qa/issues/[id]','/qa/issues/new','/qa/role-access-explorer','/qa/test-tasks','/qa/test-tasks/[id]','/qa/test-tasks/new','/system/server-logs'` },
  { role: 'BISMAN_SUPPORT', allowlist: `'/communication/internal-chat','/internal/customers','/internal/playbooks','/internal/support-sessions','/internal/teams'` },
  { role: 'BISMAN_CUSTOMER_CARE', allowlist: `'/communication/internal-chat','/internal/customers','/internal/playbooks','/internal/support-sessions','/internal/teams'` },
  { role: 'BISMAN_FINANCE', allowlist: `'/billing','/billing/invoices','/communication/internal-chat','/internal/customers','/internal/playbooks','/internal/support-sessions','/internal/teams'` },
  { role: 'BISMAN_BILLING', allowlist: `'/billing','/billing/invoices','/communication/internal-chat','/internal/customers','/internal/playbooks','/internal/support-sessions','/internal/teams'` },
  
  // QA
  { role: 'QA', allowlist: `'/qa','/qa/issues','/qa/issues/[id]','/qa/issues/new','/qa/role-access-explorer','/qa/test-tasks','/qa/test-tasks/[id]','/qa/test-tasks/new'` }
];

async function run() {
  console.log('='.repeat(60));
  console.log('PHASE 2: RBAC TIGHTENING');
  console.log('='.repeat(60) + '\n');
  
  for (const { role, allowlist } of TIGHTEN_QUERIES) {
    try {
      // Get before count
      const before = await pool.query(`SELECT COUNT(*) as cnt FROM role_page_access WHERE role_name = '${role}'`);
      
      // Delete non-allowlist
      await pool.query(`
        DELETE FROM role_page_access rpa
        USING pages_master pm
        WHERE rpa.role_name = '${role}'
          AND rpa.page_id = pm.id
          AND pm.route NOT IN (${allowlist})
      `);
      
      // Insert missing allowlist
      await pool.query(`
        INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete)
        SELECT '${role}', pm.id, true, false, false
        FROM pages_master pm
        WHERE pm.route IN (${allowlist})
          AND pm.status = 'active'
          AND NOT EXISTS (SELECT 1 FROM role_page_access WHERE role_name = '${role}' AND page_id = pm.id)
      `);
      
      // Get after count
      const after = await pool.query(`SELECT COUNT(*) as cnt FROM role_page_access WHERE role_name = '${role}'`);
      
      const b = parseInt(before.rows[0].cnt);
      const a = parseInt(after.rows[0].cnt);
      const ch = a - b;
      console.log(`✅ ${role.padEnd(25)} | ${b} → ${a} (${ch >= 0 ? '+' : ''}${ch})`);
    } catch (e) {
      console.log(`❌ ${role}: ${e.message}`);
    }
  }
  
  // Remove INTERN completely (inherits BASE_USER only)
  await pool.query(`DELETE FROM role_page_access WHERE role_name = 'INTERN'`);
  console.log(`✅ INTERN                    | cleared (inherits BASE_USER only)`);
  
  // Verification
  console.log('\n' + '='.repeat(60));
  console.log('FINAL COUNTS');
  console.log('='.repeat(60));
  
  const counts = await pool.query(`
    SELECT role_name, COUNT(*) AS pages 
    FROM role_page_access 
    WHERE can_view = true 
    GROUP BY role_name 
    ORDER BY pages DESC
  `);
  
  console.log('\nRole                       | Pages');
  console.log('---------------------------|------');
  counts.rows.forEach(r => console.log(`${r.role_name.padEnd(26)} | ${r.pages}`));
  
  const total = await pool.query('SELECT COUNT(*) as cnt FROM role_page_access');
  console.log(`\nTOTAL MAPPINGS: ${total.rows[0].cnt}`);
  
  const base = await pool.query('SELECT COUNT(*) as cnt FROM base_user_pages');
  console.log(`BASE_USER pages: ${base.rows[0].cnt} (inherited by business roles)`);
}

run().catch(e => console.error(e)).finally(() => pool.end());
