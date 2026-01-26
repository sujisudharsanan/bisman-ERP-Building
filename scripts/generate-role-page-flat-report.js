/**
 * Generate a flat report: Role | Page Name | Module Name
 */
const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '../my-frontend/src/common/config/page-registry.ts');
const content = fs.readFileSync(registryPath, 'utf8');

// Parse PAGE_REGISTRY
const rows = [];
const pageMatches = content.matchAll(/\{\s*\n?\s*id:\s*['"]([^'"]+)['"],\s*\n?\s*name:\s*['"]([^'"]+)['"],\s*\n?\s*path:\s*['"]([^'"]+)['"],[\s\S]*?module:\s*['"]([^'"]+)['"],[\s\S]*?roles:\s*\[([^\]]*)\]/g);

for (const m of pageMatches) {
  const pageName = m[2];
  const moduleName = m[4];
  const rolesStr = m[5];
  
  const roleMatches = rolesStr.matchAll(/['"]([^'"]+)['"]/g);
  for (const rm of roleMatches) {
    rows.push({
      role: rm[1],
      pageName: pageName,
      module: moduleName
    });
  }
}

// Sort by role, then module, then page name
rows.sort((a, b) => {
  if (a.role !== b.role) return a.role.localeCompare(b.role);
  if (a.module !== b.module) return a.module.localeCompare(b.module);
  return a.pageName.localeCompare(b.pageName);
});

// Print report
console.log('');
console.log('BISMAN ERP - ROLE PAGE ASSIGNMENT REPORT');
console.log('=========================================');
console.log('');
console.log('┌────────────────────────────┬────────────────────────────────────┬─────────────────────┐');
console.log('│ Role                       │ Page Name                          │ Module              │');
console.log('├────────────────────────────┼────────────────────────────────────┼─────────────────────┤');

for (const row of rows) {
  const role = row.role.substring(0, 26).padEnd(26);
  const page = row.pageName.substring(0, 34).padEnd(34);
  const mod = row.module.substring(0, 19).padEnd(19);
  console.log(`│ ${role} │ ${page} │ ${mod} │`);
}

console.log('└────────────────────────────┴────────────────────────────────────┴─────────────────────┘');
console.log('');
console.log(`Total Rows: ${rows.length}`);
console.log(`Generated: ${new Date().toISOString()}`);

// Save to file
const outputPath = path.join(__dirname, '../docs/ROLE_PAGE_REPORT.md');
let md = '# BISMAN ERP - Role Page Assignment Report\n\n';
md += `Generated: ${new Date().toISOString()}\n\n`;
md += `Total Rows: ${rows.length}\n\n`;
md += '| Role | Page Name | Module |\n';
md += '|------|-----------|--------|\n';
for (const row of rows) {
  md += `| ${row.role} | ${row.pageName} | ${row.module} |\n`;
}
fs.writeFileSync(outputPath, md);
console.log(`\nReport saved to: docs/ROLE_PAGE_REPORT.md`);
