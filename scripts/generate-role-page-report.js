/**
 * Generate a report of all pages grouped by ROLE from page-registry.ts
 */
const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '../my-frontend/src/common/config/page-registry.ts');
const content = fs.readFileSync(registryPath, 'utf8');

// Parse PAGE_REGISTRY - including roles array and description
const pages = [];
const pageMatches = content.matchAll(/\{\s*\n?\s*id:\s*['"]([^'"]+)['"],\s*\n?\s*name:\s*['"]([^'"]+)['"],\s*\n?\s*path:\s*['"]([^'"]+)['"],[\s\S]*?module:\s*['"]([^'"]+)['"],[\s\S]*?roles:\s*\[([^\]]*)\],[\s\S]*?status:\s*['"]([^'"]+)['"],[\s\S]*?description:\s*['"]([^'"]*)['"]/g);

for (const m of pageMatches) {
  const rolesStr = m[5];
  // Parse roles array - extract role names
  const roleMatches = rolesStr.matchAll(/['"]([^'"]+)['"]/g);
  const roles = [];
  for (const rm of roleMatches) {
    roles.push(rm[1]);
  }
  
  pages.push({
    id: m[1],
    name: m[2],
    path: m[3],
    module: m[4],
    roles: roles,
    status: m[6],
    description: m[7] || 'No description'
  });
}

// Group pages by role
const pagesByRole = {};
const allRoles = new Set();

for (const page of pages) {
  for (const role of page.roles) {
    allRoles.add(role);
    if (!pagesByRole[role]) {
      pagesByRole[role] = [];
    }
    pagesByRole[role].push(page);
  }
}

// Sort roles alphabetically
const sortedRoles = Array.from(allRoles).sort();

// Print report
console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                              BISMAN ERP - PAGES BY ROLE REPORT                                                     ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Role summary table
console.log('┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│ ROLE SUMMARY                                                                                                         │');
console.log('├──────────────────────────────────┬───────────┬──────────────────────────────────────────────────────────────────────┤');
console.log('│ Role Name                        │ Pages     │ Description                                                          │');
console.log('├──────────────────────────────────┼───────────┼──────────────────────────────────────────────────────────────────────┤');

let totalAssignments = 0;
const roleDescriptions = {
  'ALL': 'All authenticated users',
  'ADMIN': 'Organization administrator',
  'SUPER_ADMIN': 'Platform super administrator',
  'ENTERPRISE_ADMIN': 'Enterprise-level administrator',
  'SYSTEM_ADMIN': 'System administrator',
  'CFO': 'Chief Financial Officer',
  'CEO': 'Chief Executive Officer',
  'COO': 'Chief Operating Officer',
  'CTO': 'Chief Technology Officer',
  'FINANCE_CONTROLLER': 'Finance controller and oversight',
  'HR_MANAGER': 'Human Resources manager',
  'OPERATIONS_MANAGER': 'Operations manager',
  'PROCUREMENT_OFFICER': 'Procurement officer',
  'COMPLIANCE_OFFICER': 'Compliance officer',
  'BRANCH_INCHARGE': 'Branch in-charge',
  'HUB_INCHARGE': 'Hub in-charge',
  'STORE_INCHARGE': 'Store in-charge',
  'HUB_INCHARGE_SR': 'Senior hub in-charge',
  'STORE_INCHARGE_SR': 'Senior store in-charge',
  'STAFF': 'General staff member',
  'MANAGER': 'Manager role',
  'SUPERVISOR': 'Supervisor role',
  'DATA_ENTRY': 'Data entry operator',
  'QA': 'Quality Assurance team',
  'INTERNAL_TEAM': 'Internal BISMAN team',
  'OWNER': 'Business owner',
  'ACCOUNTANT': 'Accountant role',
  'AUDITOR': 'Auditor role',
  'LEGAL': 'Legal team',
};

for (const role of sortedRoles) {
  const pageCount = pagesByRole[role].length;
  totalAssignments += pageCount;
  const rolePad = role.padEnd(32);
  const countPad = String(pageCount).padStart(5);
  const desc = (roleDescriptions[role] || 'Custom role').substring(0, 64).padEnd(64);
  console.log(`│ ${rolePad} │ ${countPad}   │ ${desc} │`);
}
console.log('├──────────────────────────────────┴───────────┼──────────────────────────────────────────────────────────────────────┤');
console.log(`│ TOTAL ROLES: ${String(sortedRoles.length).padEnd(5)} | ASSIGNMENTS: ${String(totalAssignments).padEnd(6)}│ (A page can be assigned to multiple roles)                       │`);
console.log('└──────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────┘');
console.log('');

// Detailed pages per role
for (const role of sortedRoles) {
  const rolePages = pagesByRole[role];
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👤 ROLE: ${role} (${rolePages.length} pages)`);
  console.log(`   ${roleDescriptions[role] || 'Custom role'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('┌─────┬────────────────────────────────┬──────────────────┬───────────────────────────────────────────────────────────┐');
  console.log('│ #   │ Page Name                      │ Module           │ Purpose / Description                                     │');
  console.log('├─────┼────────────────────────────────┼──────────────────┼───────────────────────────────────────────────────────────┤');
  rolePages.forEach((page, i) => {
    const num = String(i + 1).padStart(3);
    const name = page.name.substring(0, 30).padEnd(30);
    const mod = page.module.substring(0, 16).padEnd(16);
    const desc = (page.description || 'No description').substring(0, 55).padEnd(55);
    console.log(`│ ${num} │ ${name} │ ${mod} │ ${desc} │`);
  });
  console.log('└─────┴────────────────────────────────┴──────────────────┴───────────────────────────────────────────────────────────┘');
}

console.log('\n');
console.log(`Report generated: ${new Date().toISOString()}`);
console.log(`Total Unique Roles: ${sortedRoles.length}`);
console.log(`Total Pages: ${pages.length}`);
console.log(`Total Role-Page Assignments: ${totalAssignments}`);
console.log('');
