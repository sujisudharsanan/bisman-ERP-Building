/**
 * Sync Master Modules Pages with PAGE_REGISTRY
 * 
 * This script:
 * 1. Reads all pages from frontend PAGE_REGISTRY
 * 2. Updates master-modules.js to include missing pages
 * 3. Ensures page IDs match between both files
 * 
 * NOTE: Excludes module-level IDs (e.g., 'admin', 'billing') which are not pages.
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_REGISTRY = path.join(__dirname, '../../my-frontend/src/common/config/page-registry.ts');
const MASTER_MODULES = path.join(__dirname, '../config/master-modules.js');

// Module-level IDs that should NOT be treated as pages
// These are module identifiers in PAGE_REGISTRY, not actual page entries
const MODULE_IDS_TO_IGNORE = [
  'admin',
  'billing', 
  'common',
  'enterprise-management',
  'enterprise-management-pages',
  'finance',
  'hr',
  'inventory',
  'legal',
  'operations',
  'procurement',
  'reports',
  'sales',
  'super-admin',
  'system',
  'treasury',
];

// Read PAGE_REGISTRY
function parsePageRegistry() {
  const content = fs.readFileSync(FRONTEND_REGISTRY, 'utf8');
  
  // Extract all page entries from PAGE_REGISTRY array
  // Format: { id: 'xxx', name: 'xxx', path: 'xxx', ... module: 'xxx' }
  const pages = [];
  
  // Match complete page objects
  const pageBlockRegex = /\{\s*\n?\s*id:\s*['"]([^'"]+)['"],\s*\n?\s*name:\s*['"]([^'"]+)['"],\s*\n?\s*path:\s*['"]([^'"]+)['"][^}]*?module:\s*['"]([^'"]+)['"]/gs;
  
  let match;
  while ((match = pageBlockRegex.exec(content)) !== null) {
    pages.push({
      id: match[1],
      name: match[2],
      path: match[3],
      module: match[4]
    });
  }
  
  // If that didn't work, try a simpler line-by-line approach
  if (pages.length === 0) {
    console.log('Trying alternative parsing...');
    const lines = content.split('\n');
    let currentPage = {};
    
    for (const line of lines) {
      const idMatch = line.match(/^\s*id:\s*['"]([^'"]+)['"]/);
      const nameMatch = line.match(/^\s*name:\s*['"]([^'"]+)['"]/);
      const pathMatch = line.match(/^\s*path:\s*['"]([^'"]+)['"]/);
      const moduleMatch = line.match(/^\s*module:\s*['"]([^'"]+)['"]/);
      
      if (idMatch) currentPage.id = idMatch[1];
      if (nameMatch) currentPage.name = nameMatch[1];
      if (pathMatch) currentPage.path = pathMatch[1];
      if (moduleMatch) {
        currentPage.module = moduleMatch[1];
        if (currentPage.id && currentPage.name && currentPage.path) {
          pages.push({ ...currentPage });
        }
        currentPage = {};
      }
    }
  }
  
  return pages;
}

// Read master-modules.js and extract page IDs
function parseMasterModules() {
  const content = fs.readFileSync(MASTER_MODULES, 'utf8');
  
  const pageIds = new Set();
  const pageRegex = /\{\s*id:\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = pageRegex.exec(content)) !== null) {
    pageIds.add(match[1]);
  }
  
  return pageIds;
}

// Group pages by module
function groupByModule(pages) {
  const groups = {};
  for (const page of pages) {
    const mod = page.module || 'Unknown';
    if (!groups[mod]) {
      groups[mod] = [];
    }
    groups[mod].push(page);
  }
  return groups;
}

// Main
function main() {
  console.log('📊 Syncing Master Modules with PAGE_REGISTRY...\n');
  
  const registryPages = parsePageRegistry();
  const masterModulePageIds = parseMasterModules();
  
  // Filter out module-level IDs that aren't actual pages
  const actualPages = registryPages.filter(p => !MODULE_IDS_TO_IGNORE.includes(p.id));
  
  console.log(`PAGE_REGISTRY: ${registryPages.length} total entries`);
  console.log(`  - Actual pages: ${actualPages.length}`);
  console.log(`  - Module IDs (excluded): ${registryPages.length - actualPages.length}`);
  console.log(`Master Modules: ${masterModulePageIds.size} page entries\n`);
  
  // Find pages NOT in master-modules (excluding module IDs)
  const missingFromModules = actualPages.filter(p => !masterModulePageIds.has(p.id));
  
  // Find page IDs in modules but not in registry (also exclude module IDs from "extra")
  const extraInModules = [...masterModulePageIds].filter(id => 
    !actualPages.some(p => p.id === id) && !MODULE_IDS_TO_IGNORE.includes(id)
  );
  
  console.log(`❌ Missing from master-modules: ${missingFromModules.length} pages`);
  console.log(`⚠️  Extra in master-modules: ${extraInModules.length} page IDs\n`);
  
  // Group missing by module
  const groupedMissing = groupByModule(missingFromModules);
  
  console.log('─────────────────────────────────────────────');
  console.log('MISSING PAGES BY MODULE:');
  console.log('─────────────────────────────────────────────');
  
  for (const [mod, pages] of Object.entries(groupedMissing)) {
    console.log(`\n📁 ${mod} (${pages.length} pages):`);
    pages.forEach(p => {
      console.log(`   { id: '${p.id}', name: '${p.name}', path: '${p.path}' },`);
    });
  }
  
  if (extraInModules.length > 0) {
    console.log('\n─────────────────────────────────────────────');
    console.log('EXTRA PAGE IDs (in modules but not registry):');
    console.log('─────────────────────────────────────────────');
    extraInModules.forEach(id => console.log(`   - ${id}`));
  }
  
  // Generate updated module pages to add
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('COPY/PASTE ADDITIONS TO master-modules.js:');
  console.log('═══════════════════════════════════════════════\n');
  
  for (const [mod, pages] of Object.entries(groupedMissing)) {
    console.log(`// Add to ${mod} module pages array:`);
    pages.forEach(p => {
      console.log(`      { id: '${p.id}', name: '${p.name}', path: '${p.path}' },`);
    });
    console.log('');
  }
  
  console.log('\n✅ Done. Review and add the missing pages to master-modules.js');
}

main();
