// Master Module and Page Configuration
// This represents ALL available modules and pages in the system
// Enterprise Admin can assign these to Super Admins
// Updated: All 235+ registered pages now mapped to modules

const MASTER_MODULES = [
  // =========================================
  // ALWAYS ACCESSIBLE MODULES (No assignment needed)
  // =========================================
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard access',
    icon: 'FiLayout',
    category: 'Common',
    businessCategory: 'All',
    alwaysAccessible: true,
    pages: [
      { id: 'dashboard', name: 'Dashboard', path: '/dashboard' },
      { id: 'dashboard-requests', name: 'Dashboard Requests', path: '/dashboard/requests' },
      { id: 'dashboard-workbench', name: 'Dashboard Workbench', path: '/dashboard/workbench' },
      { id: 'task-dashboard', name: 'Task Dashboard', path: '/task-dashboard' },
      { id: 'root', name: 'Home', path: '/' },
    ],
  },
  {
    id: 'common',
    name: 'Common Module',
    description: 'Pages available to all users - NO ASSIGNMENT REQUIRED',
    icon: 'FiUser',
    category: 'Common',
    businessCategory: 'All',
    alwaysAccessible: true,
    pages: [
      { id: 'about-me', name: 'About Me', path: '/common/about-me' },
      { id: 'change-password', name: 'Change Password', path: '/common/change-password' },
      { id: 'help-center', name: 'Help Center', path: '/common/help-center' },
      { id: 'user-settings', name: 'User Settings', path: '/common/user-settings' },
      { id: 'payment-request', name: 'Payment Request', path: '/common/payment-request' },
      { id: 'payment-requests-create', name: 'Create Payment Request', path: '/common/payment-requests/create' },
      { id: 'hr-policy', name: 'HR Policy', path: '/common/hr-policy' },
      { id: 'user-creation', name: 'User Creation', path: '/common/user-creation' },
      { id: 'bank-accounts', name: 'Bank Accounts', path: '/common/bank-accounts' },
      { id: 'calendar-common', name: 'Calendar', path: '/common/calendar' },
      { id: 'documentation', name: 'Documentation', path: '/common/documentation' },
      { id: 'messages', name: 'Messages', path: '/common/messages' },
      { id: 'notifications-common', name: 'Notifications', path: '/common/notifications' },
      { id: 'security-settings', name: 'Security Settings', path: '/common/security-settings' },
      { id: 'task-approvals-common', name: 'Task Approvals', path: '/common/task-approvals' },
      { id: 'root-calendar', name: 'Calendar (Root)', path: '/calendar' },
      { id: 'access-denied', name: 'Access Denied', path: '/access-denied' },
      { id: 'notifications-root', name: 'Notifications', path: '/notifications' },
      { id: 'settings-root', name: 'Settings', path: '/settings' },
      { id: 'settings-security', name: 'Security Settings', path: '/settings/security' },
      { id: 'approvals', name: 'Approvals', path: '/approvals' },
      { id: 'assistant', name: 'AI Assistant', path: '/assistant' },
    ],
  },
  {
    id: 'chat',
    name: 'Chat & Communication',
    description: 'Real-time messaging and AIVA assistant - NO ASSIGNMENT REQUIRED',
    icon: 'FiMessageSquare',
    category: 'Communication',
    businessCategory: 'All',
    alwaysAccessible: true,
    pages: [
      { id: 'chat', name: 'Chat', path: '/chat' },
      { id: 'chat-ai', name: 'Chat AI', path: '/chat/ai' },
      { id: 'internal-chat', name: 'Internal Chat', path: '/communication/internal-chat' },
    ],
  },

  // =========================================
  // FINANCE MODULE (40+ pages)
  // =========================================
  {
    id: 'finance',
    name: 'Finance Module',
    description: 'Complete financial management system',
    icon: 'FiDollarSign',
    category: 'Finance',
    businessCategory: 'Business ERP',
    pages: [
      // Core Finance
      { id: 'accounts', name: 'Accounts Management', path: '/accounts' },
      { id: 'accounts-payable', name: 'Accounts Payable', path: '/accounts-payable' },
      { id: 'accounts-receivable-summary', name: 'Accounts Receivable Summary', path: '/finance/accounts-receivable-summary' },
      { id: 'accounts-payable-summary', name: 'Accounts Payable Summary', path: '/finance/accounts-payable-summary' },
      { id: 'general-ledger', name: 'General Ledger', path: '/finance/general-ledger' },
      { id: 'chart-of-accounts', name: 'Chart of Accounts', path: '/finance/chart-of-accounts' },
      { id: 'trial-balance', name: 'Trial Balance', path: '/finance/trial-balance' },
      { id: 'financial-statements', name: 'Financial Statements', path: '/finance/financial-statements' },
      // Dashboards
      { id: 'executive-dashboard', name: 'Executive Dashboard', path: '/finance/executive-dashboard' },
      { id: 'cfo-dashboard', name: 'CFO Dashboard', path: '/cfo-dashboard' },
      { id: 'finance-controller', name: 'Finance Controller', path: '/finance-controller' },
      { id: 'company-dashboard', name: 'Company Dashboard', path: '/finance/company-dashboard' },
      // Banking & Payments
      { id: 'banker', name: 'Banker Portal', path: '/banker' },
      { id: 'bank-reconciliation', name: 'Bank Reconciliation', path: '/finance/bank-reconciliation' },
      { id: 'bank-reconciliation-execute', name: 'Execute Bank Reconciliation', path: '/finance/bank-reconciliation-execute' },
      { id: 'bank-statement-upload', name: 'Bank Statement Upload', path: '/finance/bank-statement-upload' },
      { id: 'payment-entry', name: 'Payment Entry', path: '/finance/payment-entry' },
      { id: 'payment-entry-view', name: 'Payment Entry View', path: '/finance/payment-entry-view' },
      { id: 'payment-approval-queue', name: 'Payment Approval Queue', path: '/finance/payment-approval-queue' },
      { id: 'payment-batch-processing', name: 'Payment Batch Processing', path: '/finance/payment-batch-processing' },
      { id: 'payment-gateway-integration', name: 'Payment Gateway Integration', path: '/finance/payment-gateway-integration' },
      // Journal & Invoices
      { id: 'journal-entries', name: 'Journal Entries', path: '/finance/journal-entries' },
      { id: 'journal-entries-approval', name: 'Journal Entries Approval', path: '/finance/journal-entries-approval' },
      { id: 'invoice-posting', name: 'Invoice Posting', path: '/finance/invoice-posting' },
      { id: 'purchase-invoice', name: 'Purchase Invoice', path: '/finance/purchase-invoice' },
      // Budgeting & Forecasting
      { id: 'budget-approval', name: 'Budget Approval', path: '/finance/budget-approval' },
      { id: 'budgeting-forecasting', name: 'Budgeting & Forecasting', path: '/finance/budgeting-forecasting' },
      { id: 'cash-flow-forecast', name: 'Cash Flow Forecast', path: '/finance/cash-flow-forecast' },
      { id: 'cash-flow-statement', name: 'Cash Flow Statement', path: '/finance/cash-flow-statement' },
      // Analysis & Reports
      { id: 'cost-center-analysis', name: 'Cost Center Analysis', path: '/finance/cost-center-analysis' },
      { id: 'expense-report', name: 'Expense Report', path: '/finance/expense-report' },
      { id: 'tax-reports', name: 'Tax Reports', path: '/finance/tax-reports' },
      { id: 'approval-structure-overview', name: 'Approval Structure Overview', path: '/finance/approval-structure-overview' },
      // Asset & Vendor Management
      { id: 'fixed-asset-register', name: 'Fixed Asset Register', path: '/finance/fixed-asset-register' },
      { id: 'vendor-master', name: 'Vendor Master', path: '/finance/vendor-master' },
      // Period End
      { id: 'period-end-closing', name: 'Period End Closing', path: '/finance/period-end-closing' },
      { id: 'period-end-adjustment-entries', name: 'Period End Adjustment Entries', path: '/finance/period-end-adjustment-entries' },
      // Treasury
      { id: 'foreign-exchange-management', name: 'Foreign Exchange Management', path: '/finance/foreign-exchange-management' },
      { id: 'inter-company-reconciliation', name: 'Inter-Company Reconciliation', path: '/finance/inter-company-reconciliation' },
      { id: 'loan-management', name: 'Loan Management', path: '/finance/loan-management' },
      // Billing
      { id: 'billing', name: 'Billing', path: '/billing' },
      { id: 'billing-invoices', name: 'Billing Invoices', path: '/billing/invoices' },
      // Reconciliation
      { id: 'reconciliation', name: 'Reconciliation', path: '/reconciliation' },
      { id: 'reconciliation-upload', name: 'Reconciliation Upload', path: '/reconciliation/upload' },
      // Settlements
      { id: 'settlements', name: 'Settlements', path: '/settlements' },
      // Reports
      { id: 'payment-summary-report', name: 'Payment Summary Report', path: '/reports/payment-summary' },
      { id: 'settlement-audit-report', name: 'Settlement Audit Report', path: '/reports/settlement-audit' },
    ],
  },

  // =========================================
  // OPERATIONS MODULE (18+ pages)
  // =========================================
  {
    id: 'operations',
    name: 'Operations Module',
    description: 'Operations and inventory management',
    icon: 'FiPackage',
    category: 'Operations',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'operations-manager', name: 'Operations Manager Dashboard', path: '/operations-manager' },
      { id: 'inventory-management', name: 'Inventory Management', path: '/operations/inventory-management' },
      { id: 'hub-incharge', name: 'Hub Incharge', path: '/hub-incharge' },
      { id: 'store-incharge', name: 'Store Incharge', path: '/store-incharge' },
      { id: 'staff', name: 'Staff Portal', path: '/staff' },
      { id: 'kpi-dashboard', name: 'KPI Dashboard', path: '/operations/kpi-dashboard' },
      { id: 'asset-register-hub', name: 'Asset Register Hub', path: '/operations/asset-register-hub' },
      { id: 'bom-view', name: 'Bill of Materials View', path: '/operations/bom-view' },
      { id: 'delivery-note', name: 'Delivery Note', path: '/operations/delivery-note' },
      { id: 'item-master-limited', name: 'Item Master (Limited)', path: '/operations/item-master-limited' },
      { id: 'quality-inspection', name: 'Quality Inspection', path: '/operations/quality-inspection' },
      { id: 'sales-order', name: 'Sales Order', path: '/operations/sales-order' },
      { id: 'sales-order-view', name: 'Sales Order View', path: '/operations/sales-order-view' },
      { id: 'shipping-logistics', name: 'Shipping & Logistics', path: '/operations/shipping-logistics' },
      { id: 'stock-entry', name: 'Stock Entry', path: '/operations/stock-entry' },
      { id: 'stock-entry-transfer', name: 'Stock Entry Transfer', path: '/operations/stock-entry-transfer' },
      { id: 'stock-ledger', name: 'Stock Ledger', path: '/operations/stock-ledger' },
      { id: 'work-order', name: 'Work Order', path: '/operations/work-order' },
    ],
  },

  // =========================================
  // INVENTORY MODULE
  // =========================================
  {
    id: 'inventory',
    name: 'Inventory Module',
    description: 'Inventory tracking and warehouse management',
    icon: 'FiBox',
    category: 'Operations',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'barcode-scanning', name: 'Barcode Scanning', path: '/inventory/barcode-scanning' },
      { id: 'category-management', name: 'Category Management', path: '/inventory/category-management' },
      { id: 'reorder-rules', name: 'Reorder Rules', path: '/inventory/reorder-rules' },
      { id: 'inventory-reports', name: 'Inventory Reports', path: '/inventory/reports' },
      { id: 'warehouse-bin-location', name: 'Warehouse Bin Location', path: '/warehouse/bin-location' },
    ],
  },

  // =========================================
  // PROCUREMENT MODULE (9 pages)
  // =========================================
  {
    id: 'procurement',
    name: 'Procurement Module',
    description: 'Purchase orders and supplier management',
    icon: 'FiShoppingCart',
    category: 'Procurement',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'procurement-officer', name: 'Procurement Officer Dashboard', path: '/procurement-officer' },
      { id: 'purchase-orders', name: 'Purchase Orders', path: '/procurement/purchase-orders' },
      { id: 'goods-receipt', name: 'Goods Receipt', path: '/procurement/goods-receipt' },
      { id: 'material-request', name: 'Material Request', path: '/procurement/material-request' },
      { id: 'purchase-order', name: 'Purchase Order', path: '/procurement/purchase-order' },
      { id: 'purchase-request', name: 'Purchase Request', path: '/procurement/purchase-request' },
      { id: 'rfq', name: 'Request for Quotation', path: '/procurement/rfq' },
      { id: 'supplier-master', name: 'Supplier Master', path: '/procurement/supplier-master' },
      { id: 'supplier-quotation', name: 'Supplier Quotation', path: '/procurement/supplier-quotation' },
    ],
  },

  // =========================================
  // COMPLIANCE & LEGAL MODULE (17 pages)
  // =========================================
  {
    id: 'compliance',
    name: 'Compliance & Legal Module',
    description: 'Legal compliance and case management',
    icon: 'FiShield',
    category: 'Compliance',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'compliance-officer', name: 'Compliance Officer Dashboard', path: '/compliance-officer' },
      { id: 'compliance-dashboard', name: 'Compliance Dashboard', path: '/compliance/compliance-dashboard' },
      { id: 'legal', name: 'Legal Dashboard', path: '/legal' },
      { id: 'legal-case-management', name: 'Legal Case Management', path: '/compliance/legal-case-management' },
      { id: 'admin-branches', name: 'Branches', path: '/admin/branches' },
      { id: 'approval-workflow-view', name: 'Approval Workflow View', path: '/compliance/approval-workflow-view' },
      { id: 'audit-trail', name: 'Audit Trail', path: '/compliance/audit-trail' },
      { id: 'contract-management', name: 'Contract Management', path: '/compliance/contract-management' },
      { id: 'document-management', name: 'Document Management', path: '/compliance/document-management' },
      { id: 'document-repository-view', name: 'Document Repository View', path: '/compliance/document-repository-view' },
      { id: 'litigation-tracker', name: 'Litigation Tracker', path: '/compliance/litigation-tracker' },
      { id: 'policy-management', name: 'Policy Management', path: '/compliance/policy-management' },
      { id: 'regulatory-compliance', name: 'Regulatory Compliance', path: '/compliance/regulatory-compliance' },
      { id: 'regulatory-report-templates', name: 'Regulatory Report Templates', path: '/compliance/regulatory-report-templates' },
      { id: 'risk-management', name: 'Risk Management', path: '/compliance/risk-management' },
      { id: 'vendor-customer-master-legal', name: 'Vendor Customer Master Legal', path: '/compliance/vendor-customer-master-legal' },
      { id: 'legal-agreements', name: 'Legal Agreements', path: '/legal/agreements' },
    ],
  },

  // =========================================
  // HR MODULE (5 pages)
  // =========================================
  {
    id: 'hr',
    name: 'Human Resources',
    description: 'Employee, attendance, payroll, and HR operations',
    icon: 'FiUsers',
    category: 'Human Resources',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'hr-user-creation', name: 'HR User Creation', path: '/hr/user-creation' },
      { id: 'hr-policy', name: 'HR Policy Page', path: '/hr/policy' },
      { id: 'attendance-tracking', name: 'Attendance Tracking', path: '/hr/attendance-tracking' },
      { id: 'performance-review', name: 'Performance Review', path: '/hr/performance-review' },
      { id: 'training', name: 'Training', path: '/hr/training' },
    ],
  },

  // =========================================
  // SALES MODULE
  // =========================================
  {
    id: 'sales',
    name: 'Sales Module',
    description: 'Sales management and customer relations',
    icon: 'FiTrendingUp',
    category: 'Sales',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'customer-master', name: 'Customer Master', path: '/sales/customer-master' },
      { id: 'quotation-management', name: 'Quotation Management', path: '/sales/quotation-management' },
    ],
  },

  // =========================================
  // PRODUCTION MODULE
  // =========================================
  {
    id: 'production',
    name: 'Production Module',
    description: 'Production planning and manufacturing',
    icon: 'FiTool',
    category: 'Production',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'production-analytics', name: 'Production Analytics', path: '/production/analytics' },
      { id: 'machine-management', name: 'Machine Management', path: '/production/machine-management' },
      { id: 'production-scheduling', name: 'Production Scheduling', path: '/production/scheduling' },
      { id: 'production-workflow', name: 'Production Workflow', path: '/production/workflow' },
    ],
  },

  // =========================================
  // SHIPPING MODULE
  // =========================================
  {
    id: 'shipping',
    name: 'Shipping Module',
    description: 'Shipping and carrier management',
    icon: 'FiTruck',
    category: 'Operations',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'carrier-management', name: 'Carrier Management', path: '/shipping/carrier-management' },
      { id: 'shipment-tracking', name: 'Shipment Tracking', path: '/shipping/shipment-tracking' },
    ],
  },

  // =========================================
  // ASSET MANAGEMENT MODULE
  // =========================================
  {
    id: 'assets',
    name: 'Asset Management',
    description: 'Asset tracking and maintenance',
    icon: 'FiHardDrive',
    category: 'Operations',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'maintenance-scheduling', name: 'Maintenance Scheduling', path: '/assets/maintenance-scheduling' },
    ],
  },

  // =========================================
  // GOVERNANCE MODULE
  // =========================================
  {
    id: 'governance',
    name: 'Governance Module',
    description: 'Security governance and compliance oversight',
    icon: 'FiEye',
    category: 'Governance',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'audit-integrity', name: 'Audit Integrity', path: '/governance/audit-integrity' },
      { id: 'rbac-structure', name: 'RBAC Structure', path: '/governance/rbac-structure' },
      { id: 'security-overview', name: 'Security Overview', path: '/governance/security-overview' },
      { id: 'security-violations', name: 'Security Violations', path: '/governance/security-violations' },
      { id: 'trust-security', name: 'Trust & Security', path: '/trust-security' },
    ],
  },

  // =========================================
  // TASK MANAGEMENT MODULE
  // =========================================
  {
    id: 'task-management',
    name: 'Task Management Module',
    description: 'Task tracking and management',
    icon: 'FiCheckSquare',
    category: 'Operations',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'create-task', name: 'Create Task', path: '/tasks/create' },
      { id: 'tasks-clarifications', name: 'Task Clarifications', path: '/tasks/clarifications' },
      { id: 'tasks-reviews', name: 'Task Reviews', path: '/tasks/reviews' },
    ],
  },

  // =========================================
  // QA MODULE
  // =========================================
  {
    id: 'qa',
    name: 'QA Module',
    description: 'Quality assurance and testing tools',
    icon: 'FiBug',
    category: 'QA',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'qa-dashboard', name: 'QA Dashboard', path: '/qa' },
      { id: 'qa-issues', name: 'QA Issues', path: '/qa/issues' },
      { id: 'qa-issues-new', name: 'New QA Issue', path: '/qa/issues/new' },
      { id: 'qa-login', name: 'QA Login', path: '/qa/login' },
      { id: 'qa-role-access-explorer', name: 'QA Role Access Explorer', path: '/qa/role-access-explorer' },
      { id: 'qa-test-tasks', name: 'QA Test Tasks', path: '/qa/test-tasks' },
      { id: 'qa-test-tasks-new', name: 'New QA Test Task', path: '/qa/test-tasks/new' },
    ],
  },

  // =========================================
  // ANALYTICS MODULE
  // =========================================
  {
    id: 'analytics',
    name: 'Analytics Module',
    description: 'Business analytics and reporting',
    icon: 'FiBarChart2',
    category: 'Analytics',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'analytics', name: 'Analytics Dashboard', path: '/analytics' },
      { id: 'trace', name: 'Trace', path: '/trace' },
    ],
  },

  // =========================================
  // INTERNAL TOOLS MODULE
  // =========================================
  {
    id: 'internal',
    name: 'Internal Tools',
    description: 'Internal team management tools',
    icon: 'FiTool',
    category: 'Internal',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'internal-customers', name: 'Internal Customers', path: '/internal/customers' },
      { id: 'internal-playbooks', name: 'Playbooks', path: '/internal/playbooks' },
      { id: 'internal-support-sessions', name: 'Support Sessions', path: '/internal/support-sessions' },
      { id: 'internal-teams', name: 'Teams', path: '/internal/teams' },
    ],
  },

  // =========================================
  // ADMIN MODULE (Tenant Admin)
  // =========================================
  {
    id: 'admin',
    name: 'Admin Module',
    description: 'General administration - Can be assigned to Admin and Super Admin users',
    icon: 'FiUser',
    category: 'Administration',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'admin-dashboard', name: 'Admin Dashboard', path: '/admin' },
      { id: 'admin-client-dashboard', name: 'Client Dashboard', path: '/admin/client-dashboard' },
      { id: 'admin-users', name: 'Users Management', path: '/admin/users' },
      { id: 'admin-users-create', name: 'Create User', path: '/admin/users/create' },
      { id: 'admin-clients', name: 'Clients', path: '/admin/clients' },
      { id: 'admin-modules', name: 'Modules', path: '/admin/modules' },
      { id: 'admin-organizations', name: 'Organizations', path: '/admin/organizations' },
      { id: 'admin-billing', name: 'Billing', path: '/admin/billing' },
      { id: 'admin-billing-tenants', name: 'Tenant Billing', path: '/admin/billing/tenants' },
      { id: 'admin-settings', name: 'Settings', path: '/admin/settings' },
      { id: 'admin-reports', name: 'Reports', path: '/admin/reports' },
      { id: 'admin-support', name: 'Support', path: '/admin/support' },
      { id: 'admin-integrations', name: 'Integrations', path: '/admin/integrations' },
      { id: 'admin-notifications', name: 'Notifications', path: '/admin/notifications' },
      { id: 'admin-audit', name: 'Audit', path: '/admin/audit' },
      { id: 'admin-permissions', name: 'Permissions', path: '/admin/permissions' },
      { id: 'admin-developer', name: 'Developer', path: '/admin/developer' },
      { id: 'admin-ai', name: 'AI', path: '/admin/ai' },
      { id: 'admin-ai-analytics', name: 'AI Analytics', path: '/admin/ai-analytics' },
      { id: 'admin-rag-sources', name: 'RAG Sources', path: '/admin/rag-sources' },
      { id: 'admin-bank-templates', name: 'Bank Templates', path: '/admin/bank-templates' },
      { id: 'admin-branches-create', name: 'Create Branch', path: '/admin/branches/create' },
      { id: 'admin-contracts', name: 'Contracts', path: '/admin/contracts' },
      { id: 'admin-contracts-create', name: 'Create Contract', path: '/admin/contracts/create' },
      { id: 'admin-sla', name: 'SLA Management', path: '/admin/sla' },
      { id: 'admin-subscription', name: 'Subscription', path: '/admin/subscription' },
      { id: 'admin-system-flow', name: 'System Flow', path: '/admin/system-flow' },
      { id: 'admin-task-approvals', name: 'Task Approvals', path: '/admin/task-approvals' },
      { id: 'admin-usage', name: 'Usage', path: '/admin/usage' },
      { id: 'admin-user-usage', name: 'User Usage', path: '/admin/user-usage' },
      { id: 'clients-create', name: 'Create Client', path: '/clients/create' },
      { id: 'clients-usage-dashboard', name: 'Client Usage Dashboard', path: '/clients/usage-dashboard' },
      { id: 'pricing', name: 'Pricing', path: '/pricing' },
    ],
  },

  // =========================================
  // SUPER ADMIN MODULE
  // =========================================
  {
    id: 'super-admin',
    name: 'Super Admin Module',
    description: 'Super admin tools and oversight - Can be assigned to Super Admin',
    icon: 'FiShield',
    category: 'Administration',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'super-admin-dashboard', name: 'Super Admin Dashboard', path: '/super-admin' },
      { id: 'super-admin-security', name: 'Security Management', path: '/super-admin/security' },
      { id: 'super-admin-it-admin', name: 'IT Admin Dashboard', path: '/super-admin/system/it-admin' },
      { id: 'super-admin-user-management', name: 'User Management', path: '/super-admin/system/user-management' },
      { id: 'super-admin-pages-roles-report', name: 'Pages & Roles Report', path: '/super-admin/system/pages-roles-report' },
      { id: 'super-admin-role-access-explorer', name: 'Role & Access Explorer', path: '/super-admin/system/role-access-explorer' },
      { id: 'super-admin-system-settings', name: 'System Settings', path: '/super-admin/system/system-settings' },
      { id: 'super-admin-integration-settings', name: 'Integration Settings', path: '/super-admin/system/integration-settings' },
      { id: 'super-admin-deployment-tools', name: 'Deployment Tools', path: '/super-admin/system/deployment-tools' },
      { id: 'super-admin-backup-restore', name: 'Backup & Restore', path: '/super-admin/system/backup-restore' },
      { id: 'super-admin-system-health', name: 'System Health', path: '/super-admin/system/system-health' },
      { id: 'super-admin-system-health-dashboard', name: 'System Health Dashboard', path: '/super-admin/system/system-health-dashboard' },
      { id: 'super-admin-about-me', name: 'About Me', path: '/super-admin/about-me' },
      { id: 'super-admin-system-about-me', name: 'System About Me', path: '/super-admin/system/about-me' },
      { id: 'super-admin-decision-load', name: 'Decision Load', path: '/super-admin/decision-load' },
      { id: 'super-admin-orders', name: 'Orders', path: '/super-admin/orders' },
      { id: 'super-admin-subscription', name: 'Subscription', path: '/super-admin/subscription' },
      { id: 'super-admin-system-root', name: 'System Root', path: '/super-admin/system' },
      { id: 'super-admin-fallback-recovery', name: 'Fallback Recovery', path: '/super-admin/system/fallback-recovery' },
      { id: 'super-admin-permission-manager', name: 'Permission Manager', path: '/super-admin/system/permission-manager' },
      { id: 'super-admin-roles-users-report', name: 'Roles & Users Report', path: '/super-admin/system/roles-users-report' },
    ],
  },

  // =========================================
  // SYSTEM MODULE
  // =========================================
  {
    id: 'system',
    name: 'System Administration',
    description: 'System settings, users, and configuration',
    icon: 'FiSettings',
    category: 'Administration',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'audit-logs', name: 'Audit Logs', path: '/system/audit-logs' },
      { id: 'error-logs', name: 'Error Logs', path: '/system/error-logs' },
      { id: 'server-logs', name: 'Server Logs', path: '/system/server-logs' },
      { id: 'ai-training', name: 'AI Training', path: '/ai-training' },
      { id: 'system-about-me', name: 'About Me', path: '/system/about-me' },
      { id: 'system-audit-integrity', name: 'Audit Integrity Dashboard', path: '/system/audit-integrity-dashboard' },
      { id: 'system-backup-restore', name: 'Backup & Restore', path: '/system/backup-restore' },
      { id: 'system-clients-new', name: 'New Client', path: '/system/clients/new' },
      { id: 'system-deployment-tools', name: 'Deployment Tools', path: '/system/deployment-tools' },
      { id: 'system-integration-settings', name: 'Integration Settings', path: '/system/integration-settings' },
      { id: 'system-pages-roles-report', name: 'Pages & Roles Report', path: '/system/pages-roles-report' },
      { id: 'system-permission-manager', name: 'Permission Manager', path: '/system/permission-manager' },
      { id: 'system-role-access-explorer', name: 'Role Access Explorer', path: '/system/role-access-explorer' },
      { id: 'system-roles-users-report', name: 'Roles & Users Report', path: '/system/roles-users-report' },
      { id: 'system-health-dashboard', name: 'System Health Dashboard', path: '/system/system-health-dashboard' },
      { id: 'system-user-creation', name: 'User Creation', path: '/system/user-creation' },
      { id: 'system-user-management', name: 'User Management', path: '/system/user-management' },
    ],
  },

  // =========================================
  // CLIENT MANAGEMENT (Granular)
  // =========================================
  {
    id: 'client-management',
    name: 'Client Management',
    description: 'Manage clients and user accounts',
    icon: 'FiUsers',
    category: 'Administration',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'user-management', name: 'User Management', path: '/super-admin/system/user-management' },
      { id: 'clients', name: 'Clients List', path: '/admin/clients' },
      { id: 'system-clients', name: 'System Clients', path: '/system/clients' },
    ],
  },

  // =========================================
  // SECURITY MANAGEMENT (Granular)
  // =========================================
  {
    id: 'security-management',
    name: 'Security Management',
    description: 'Security settings and access control',
    icon: 'FiShield',
    category: 'Administration',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'security', name: 'Security', path: '/super-admin/security' },
      { id: 'rbac-security', name: 'RBAC Security', path: '/enterprise-admin/rbac-security' },
      { id: 'security-operations', name: 'Security Operations', path: '/enterprise-admin/security-operations' },
    ],
  },

  // =========================================
  // PAGES & ROLES REPORT (Granular)
  // =========================================
  {
    id: 'pages-roles-report',
    name: 'Pages & Roles Report',
    description: 'View pages and role assignments',
    icon: 'FiFileText',
    category: 'Administration',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'pages-roles-report', name: 'Pages & Roles Report', path: '/super-admin/system/pages-roles-report' },
      { id: 'role-access-explorer', name: 'Role & Access Explorer', path: '/super-admin/system/role-access-explorer' },
    ],
  },

  // =========================================
  // BACKUP & RESTORE (Granular)
  // =========================================
  {
    id: 'backup-restore',
    name: 'Backup & Restore',
    description: 'System backup and restore functionality',
    icon: 'FiDatabase',
    category: 'Administration',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'backup-restore', name: 'Backup & Restore', path: '/super-admin/system/backup-restore' },
    ],
  },

  // =========================================
  // SYSTEM HEALTH (Granular)
  // =========================================
  {
    id: 'system-health',
    name: 'System Health',
    description: 'Monitor system health and performance',
    icon: 'FiActivity',
    category: 'Administration',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'system-health', name: 'System Health Dashboard', path: '/super-admin/system/system-health' },
      { id: 'monitoring', name: 'System Monitoring', path: '/enterprise-admin/monitoring' },
    ],
  },

  // =========================================
  // INTEGRATION SETTINGS (Granular)
  // =========================================
  {
    id: 'integration-settings',
    name: 'Integration Settings',
    description: 'Configure external integrations',
    icon: 'FiLink',
    category: 'Administration',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'integration-settings', name: 'Integration Settings', path: '/super-admin/system/integration-settings' },
      { id: 'integrations', name: 'Integrations', path: '/enterprise-admin/integrations' },
    ],
  },

  // =========================================
  // DEPLOYMENT TOOLS (Granular)
  // =========================================
  {
    id: 'deployment-tools',
    name: 'Deployment Tools',
    description: 'Deployment and DevOps tools',
    icon: 'FiUpload',
    category: 'Administration',
    businessCategory: 'Business ERP',
    pages: [
      { id: 'deployment-tools', name: 'Deployment Tools', path: '/super-admin/system/deployment-tools' },
    ],
  },

  // =========================================
  // ENTERPRISE ADMIN MODULE
  // =========================================
  {
    id: 'enterprise-admin',
    name: 'Enterprise Admin Module',
    description: 'Enterprise-level administration and multi-tenant management - Auto-assigned to Enterprise Admin',
    icon: 'FiBriefcase',
    category: 'Enterprise',
    businessCategory: 'Enterprise',
    hideFromAssignment: true,
    pages: [
      { id: 'dashboard', name: 'Enterprise Dashboard', path: '/enterprise-admin/dashboard' },
      { id: 'modules', name: 'Module Management', path: '/enterprise-admin/modules' },
      { id: 'super-admins', name: 'Super Admins', path: '/enterprise-admin/super-admins' },
      { id: 'super-admins-create', name: 'Create Super Admin', path: '/enterprise-admin/super-admins/create' },
      { id: 'users', name: 'Users', path: '/enterprise-admin/users' },
      { id: 'organizations', name: 'Organizations', path: '/enterprise-admin/organizations' },
      { id: 'billing', name: 'Billing', path: '/enterprise-admin/billing' },
      { id: 'settings', name: 'Settings', path: '/enterprise-admin/settings' },
      { id: 'reports', name: 'Reports', path: '/enterprise-admin/reports' },
      { id: 'support', name: 'Support', path: '/enterprise-admin/support' },
      { id: 'integrations', name: 'Integrations', path: '/enterprise-admin/integrations' },
      { id: 'notifications', name: 'Notifications', path: '/enterprise-admin/notifications' },
      { id: 'audit', name: 'Audit', path: '/enterprise-admin/audit' },
      { id: 'logs', name: 'Logs', path: '/enterprise-admin/logs' },
      { id: 'activity-logs', name: 'Activity Logs', path: '/enterprise-admin/activity-logs' },
      { id: 'monitoring', name: 'Monitoring', path: '/enterprise-admin/monitoring' },
      { id: 'monitoring-database', name: 'Database Monitoring', path: '/enterprise-admin/monitoring/database' },
      { id: 'monitoring-performance', name: 'Performance Monitoring', path: '/enterprise-admin/monitoring/performance' },
      { id: 'monitoring-system-health', name: 'System Health', path: '/enterprise-admin/monitoring/system-health' },
      { id: 'monitoring-live', name: 'Live Monitoring', path: '/enterprise-admin/monitoring/live' },
      { id: 'rbac-security', name: 'RBAC Security', path: '/enterprise-admin/rbac-security' },
      { id: 'security-operations', name: 'Security Operations', path: '/enterprise-admin/security-operations' },
      { id: 'docs-production-ready', name: 'Production Ready Docs', path: '/enterprise-admin/docs/production-ready' },
      { id: 'live-dashboard', name: 'Live Dashboard', path: '/enterprise-admin/live-dashboard' },
      { id: 'page-governance', name: 'Page Governance', path: '/enterprise-admin/page-governance' },
      { id: 'pages-report', name: 'Pages Report', path: '/enterprise-admin/pages-report' },
      { id: 'roles', name: 'Roles', path: '/enterprise-admin/roles' },
      { id: 'subscriptions', name: 'Subscriptions', path: '/enterprise-admin/subscriptions' },
      { id: 'system-pages-roles-report', name: 'System Pages & Roles Report', path: '/enterprise-admin/system/pages-roles-report' },
    ],
  },

  // =========================================
  // SUBSCRIPTIONS MODULE
  // =========================================
  {
    id: 'subscriptions',
    name: 'Subscriptions Module',
    description: 'Subscription plan management, feature controls, billing and enforcement',
    icon: 'FiCreditCard',
    category: 'Administration',
    businessCategory: 'Enterprise',
    pages: [
      { id: 'subscriptions', name: 'Subscriptions', path: '/super-admin/subscriptions' },
      { id: 'subscription-plans', name: 'Plan Management', path: '/super-admin/subscriptions/plans' },
      { id: 'subscription-tenants', name: 'Tenant Subscriptions', path: '/super-admin/subscriptions/tenants' },
      { id: 'subscription-billing', name: 'Billing Overrides', path: '/super-admin/subscriptions/billing' },
      { id: 'subscription-audit', name: 'Subscription Audit', path: '/super-admin/subscriptions/audit' },
      { id: 'subscription-coupons', name: 'Coupons', path: '/super-admin/subscriptions/coupons' },
      { id: 'subscription-settings', name: 'Subscription Settings', path: '/super-admin/subscriptions/settings' },
      { id: 'subscription-micro-unlock', name: 'Micro Unlock', path: '/super-admin/subscriptions/micro-unlock' },
    ],
  },

  // =========================================
  // PUMP MANAGEMENT MODULE
  // =========================================
  {
    id: 'pump-management',
    name: 'Pump Management',
    description: 'Pump station management for Pump ERP',
    icon: 'FiDroplet',
    category: 'Operations',
    businessCategory: 'Pump Management',
    pages: [
      { id: 'pump-server-logs', name: 'Pump Server Logs', path: '/pump-management/server-logs' },
    ],
  },
];

module.exports = { MASTER_MODULES };
