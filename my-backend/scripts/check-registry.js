// Check which pages exist in filesystem but not in master-modules.js
const { MASTER_MODULES } = require('../config/master-modules.js');

const registeredPaths = new Set();
MASTER_MODULES.forEach(m => m.pages.forEach(p => registeredPaths.add(p.path)));

const fsPages = [
  '/access-denied','/accounts','/accounts-payable','/admin','/admin/ai','/admin/ai-analytics',
  '/admin/audit','/admin/billing','/admin/clients','/admin/dashboard','/admin/developer',
  '/admin/integrations','/admin/modules','/admin/notifications','/admin/organizations',
  '/admin/permissions','/admin/rag-sources','/admin/reports','/admin/settings','/admin/support',
  '/admin/users','/ai-training','/assistant','/banker','/calendar','/cfo-dashboard','/chat',
  '/chat/ai','/common/about-me','/common/bank-accounts','/common/calendar','/common/change-password',
  '/common/documentation','/common/help-center','/common/hr-policy','/common/messages',
  '/common/notifications','/common/payment-request','/common/payment-requests/create',
  '/common/security-settings','/common/task-approvals','/common/user-creation','/common/user-settings',
  '/compliance-officer','/compliance/agreements','/compliance/compliance-dashboard',
  '/compliance/legal-case-management','/dashboard','/enterprise-admin/activity-logs',
  '/enterprise-admin/ai-handling','/enterprise-admin/audit','/enterprise-admin/billing',
  '/enterprise-admin/dashboard','/enterprise-admin/integrations','/enterprise-admin/logs',
  '/enterprise-admin/modules','/enterprise-admin/monitoring','/enterprise-admin/monitoring/database',
  '/enterprise-admin/monitoring/performance','/enterprise-admin/monitoring/system-health',
  '/enterprise-admin/notifications','/enterprise-admin/organizations','/enterprise-admin/reports',
  '/enterprise-admin/settings','/enterprise-admin/super-admins','/enterprise-admin/super-admins/create',
  '/enterprise-admin/support','/enterprise-admin/users','/finance-controller',
  '/finance/accounts-payable-summary','/finance/accounts-receivable-summary',
  '/finance/executive-dashboard','/finance/general-ledger','/hr/policy','/hr/user-creation',
  '/hub-incharge','/it-admin','/legal','/operations-manager','/operations/inventory-management',
  '/operations/kpi-dashboard','/procurement-officer','/procurement/purchase-orders','/settings',
  '/staff','/store-incharge','/super-admin','/super-admin/ai-handling','/super-admin/orders',
  '/super-admin/security','/super-admin/system','/system/about-me','/system/api-integration-config',
  '/system/audit-logs','/system/backup-restore','/system/company-setup','/system/deployment-tools',
  '/system/error-logs','/system/integration-settings','/system/master-data-management',
  '/system/pages-roles-report','/system/permission-manager','/system/role-access-explorer',
  '/system/roles-users-report','/system/scheduler','/system/server-logs',
  '/system/system-health-dashboard','/system/system-settings','/system/user-creation',
  '/system/user-management','/task-dashboard','/tasks/create','/treasury'
];

console.log('=== PAGES IN FILESYSTEM BUT NOT IN MASTER-MODULES ===\n');
const missing = fsPages.filter(p => !registeredPaths.has(p));
missing.forEach(p => console.log(p));

console.log('\n=== PAGES IN MASTER-MODULES BUT NOT IN FILESYSTEM ===\n');
const notInFs = [];
registeredPaths.forEach(p => { 
  if (!fsPages.includes(p)) notInFs.push(p); 
});
notInFs.forEach(p => console.log(p));

console.log('\n=== SUMMARY ===');
console.log('Total filesystem pages:', fsPages.length);
console.log('Total registered pages:', registeredPaths.size);
console.log('Missing from registry:', missing.length);
console.log('In registry but no file:', notInFs.length);
