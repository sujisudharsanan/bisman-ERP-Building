/**
 * Generate a report of all modules and pages from page-registry.ts
 */
const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '../my-frontend/src/common/config/page-registry.ts');
const content = fs.readFileSync(registryPath, 'utf8');

// Parse MODULES using a simpler approach
const modules = {};
const modulesSection = content.match(/export const MODULES\s*(?::\s*Record<[^>]+>)?\s*=\s*\{([\s\S]*?)\n\}(?:\s*as\s*const)?;/);
if (modulesSection) {
  const moduleMatches = modulesSection[1].matchAll(/'([^']+)':\s*\{([^}]+)\}/g);
  for (const m of moduleMatches) {
    const key = m[1];
    const body = m[2];
    const nameMatch = body.match(/name:\s*['"]([^'"]+)['"]/);
    const hiddenMatch = body.match(/hidden:\s*(true|false)/);
    modules[key] = {
      name: nameMatch ? nameMatch[1] : key,
      hidden: hiddenMatch ? hiddenMatch[1] === 'true' : false
    };
  }
}

// Parse PAGE_REGISTRY
const pages = [];
// Match each page object in the array - including description
const pageMatches = content.matchAll(/\{\s*\n?\s*id:\s*['"]([^'"]+)['"],\s*\n?\s*name:\s*['"]([^'"]+)['"],\s*\n?\s*path:\s*['"]([^'"]+)['"],[\s\S]*?module:\s*['"]([^'"]+)['"],[\s\S]*?status:\s*['"]([^'"]+)['"],[\s\S]*?description:\s*['"]([^'"]*)['"]/g);

for (const m of pageMatches) {
  pages.push({
    id: m[1],
    name: m[2],
    path: m[3],
    module: m[4],
    status: m[5],
    description: m[6] || 'No description'
  });
}

// Group pages by module
const pagesByModule = {};
for (const page of pages) {
  if (!pagesByModule[page.module]) {
    pagesByModule[page.module] = [];
  }
  pagesByModule[page.module].push(page);
}

// Print report
console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    BISMAN ERP - MODULES & PAGES REPORT                     ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Module summary table
console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
console.log('│ MODULE SUMMARY                                                               │');
console.log('├──────────────────────┬─────────────────────────────────┬───────────┬─────────┤');
console.log('│ Module Key           │ Display Name                    │ Pages     │ Hidden  │');
console.log('├──────────────────────┼─────────────────────────────────┼───────────┼─────────┤');

const moduleKeys = Object.keys(pagesByModule).sort();
let totalPages = 0;
for (const key of moduleKeys) {
  const mod = modules[key] || { name: key, hidden: false };
  const pageCount = pagesByModule[key].length;
  totalPages += pageCount;
  const keyPad = key.padEnd(20);
  const namePad = (mod.name || key).substring(0, 31).padEnd(31);
  const countPad = String(pageCount).padStart(5);
  const hiddenPad = (mod.hidden ? 'Yes' : 'No').padEnd(7);
  console.log(`│ ${keyPad} │ ${namePad} │ ${countPad}   │ ${hiddenPad} │`);
}
console.log('├──────────────────────┴─────────────────────────────────┼───────────┼─────────┤');
console.log(`│ TOTAL                                                  │ ${String(totalPages).padStart(5)}   │         │`);
console.log('└────────────────────────────────────────────────────────┴───────────┴─────────┘');
console.log('');

// Detailed pages per module
for (const key of moduleKeys) {
  const mod = modules[key] || { name: key };
  const modPages = pagesByModule[key];
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📦 MODULE: ${(mod.name || key).toUpperCase()} (${modPages.length} pages)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('┌─────┬────────────────────────────────┬────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ #   │ Page Name                      │ Purpose / Description                                                      │');
  console.log('├─────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤');
  modPages.forEach((page, i) => {
    const num = String(i + 1).padStart(3);
    const name = page.name.substring(0, 30).padEnd(30);
    const desc = (page.description || 'No description').substring(0, 70).padEnd(70);
    console.log(`│ ${num} │ ${name} │ ${desc} │`);
  });
  console.log('└─────┴────────────────────────────────┴────────────────────────────────────────────────────────────────────────────┘');
}

console.log('\n');
console.log(`Report generated: ${new Date().toISOString()}`);
console.log(`Total Modules: ${moduleKeys.length}`);
console.log(`Total Pages: ${totalPages}`);
console.log('');
