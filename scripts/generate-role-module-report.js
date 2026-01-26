/**
 * Generate a report of pages by ROLE, grouped by MODULE within each role
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

// Group pages by role, then by module within each role
const pagesByRole = {};
const allRoles = new Set();

for (const page of pages) {
  for (const role of page.roles) {
    allRoles.add(role);
    if (!pagesByRole[role]) {
      pagesByRole[role] = {};
    }
    if (!pagesByRole[role][page.module]) {
      pagesByRole[role][page.module] = [];
    }
    pagesByRole[role][page.module].push(page);
  }
}

// Sort roles alphabetically
const sortedRoles = Array.from(allRoles).sort();

// Role descriptions
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
  'COMPLIANCE': 'Compliance team',
  'BRANCH_INCHARGE': 'Branch in-charge',
  'HUB_INCHARGE': 'Hub in-charge',
  'STORE_INCHARGE': 'Store in-charge',
  'LEGAL': 'Legal team',
  'ACCOUNTS': 'Accounting staff',
  'ACCOUNTS_PAYABLE': 'Accounts payable team',
  'TREASURY': 'Treasury operations',
  'BANKER': 'Banking operations',
  'HR': 'HR staff',
};

// Print report
console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                         BISMAN ERP - ROLE-MODULE PAGE ASSIGNMENT REPORT                                              ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Summary table
console.log('┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│ ROLE SUMMARY                                                                                                            │');
console.log('├────────────────────────────┬─────────┬──────────────────────────────────────────────────────────────────────────────────┤');
console.log('│ Role                       │ Pages   │ Modules Accessed                                                                 │');
console.log('├────────────────────────────┼─────────┼──────────────────────────────────────────────────────────────────────────────────┤');

let totalAssignments = 0;
for (const role of sortedRoles) {
  const modules = Object.keys(pagesByRole[role]).sort();
  let pageCount = 0;
  for (const mod of modules) {
    pageCount += pagesByRole[role][mod].length;
  }
  totalAssignments += pageCount;
  
  const rolePad = role.padEnd(26);
  const countPad = String(pageCount).padStart(5);
  const modList = modules.join(', ').substring(0, 78).padEnd(78);
  console.log(`│ ${rolePad} │ ${countPad}   │ ${modList} │`);
}
console.log('├────────────────────────────┴─────────┴──────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ TOTAL: ${sortedRoles.length} Roles | ${totalAssignments} Page Assignments                                                                                │`);
console.log('└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘');
console.log('');

// Detailed report per role
for (const role of sortedRoles) {
  const modules = Object.keys(pagesByRole[role]).sort();
  let totalPages = 0;
  for (const mod of modules) {
    totalPages += pagesByRole[role][mod].length;
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log(`👤 ROLE: ${role}`);
  console.log(`   ${roleDescriptions[role] || 'Custom role'}`);
  console.log(`   Total Pages: ${totalPages} | Modules: ${modules.length}`);
  console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
  
  for (const mod of modules) {
    const modPages = pagesByRole[role][mod];
    console.log('');
    console.log(`   📦 ${mod.toUpperCase()} (${modPages.length} pages)`);
    console.log('   ┌─────┬────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────┐');
    console.log('   │ #   │ Page Name                      │ Purpose                                                                     │');
    console.log('   ├─────┼────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┤');
    
    modPages.forEach((page, i) => {
      const num = String(i + 1).padStart(3);
      const name = page.name.substring(0, 30).padEnd(30);
      const desc = (page.description || 'No description').substring(0, 71).padEnd(71);
      console.log(`   │ ${num} │ ${name} │ ${desc} │`);
    });
    
    console.log('   └─────┴────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────┘');
  }
}

console.log('\n');
console.log(`Report generated: ${new Date().toISOString()}`);
console.log(`Total Unique Roles: ${sortedRoles.length}`);
console.log(`Total Pages: ${pages.length}`);
console.log(`Total Role-Page Assignments: ${totalAssignments}`);
console.log('');
