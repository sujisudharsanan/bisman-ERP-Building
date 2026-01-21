#!/usr/bin/env node
/**
 * Sync Page Mapping Script
 * 
 * This script synchronizes the frontend page-mapping.ts with the backend master-modules.js
 * Run from the project root: node scripts/sync-page-mapping.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const FRONTEND_PAGE_MAPPING = path.join(__dirname, '../my-frontend/src/common/config/page-mapping.ts');
const BACKEND_MASTER_MODULES = path.join(__dirname, '../my-backend/config/master-modules.js');

// Read the page-mapping.ts file
function readPageMapping() {
  const content = fs.readFileSync(FRONTEND_PAGE_MAPPING, 'utf8');
  
  // Extract PAGE_DEFINITIONS array (simple regex - for complex cases use AST)
  const pageDefMatch = content.match(/export const PAGE_DEFINITIONS: PageDefinition\[\] = \[([\s\S]*?)\];/);
  const moduleDefMatch = content.match(/export const MODULE_DEFINITIONS: Record<ModuleKey, ModuleDefinition> = \{([\s\S]*?)\};/);
  
  return { content, pageDefMatch, moduleDefMatch };
}

// Generate master-modules.js content
function generateMasterModules(pages, modules) {
  // Group pages by module
  const pagesByModule = {};
  for (const page of pages) {
    if (!pagesByModule[page.module]) {
      pagesByModule[page.module] = [];
    }
    pagesByModule[page.module].push({
      id: page.id,
      name: page.name,
      path: page.route,
    });
  }

  // Generate module entries
  const moduleEntries = Object.entries(modules).map(([key, mod]) => {
    const pages = pagesByModule[key] || [];
    return `  {
    id: '${mod.id}',
    name: '${mod.name}',
    description: '${mod.description}',
    icon: 'Fi${mod.icon}',
    category: '${mod.color}',
    ${mod.hideFromAssignment ? 'hideFromAssignment: true,' : ''}
    ${mod.alwaysAccessible ? 'alwaysAccessible: true,' : ''}
    pages: [
${pages.map(p => `      { id: '${p.id}', name: '${p.name}', path: '${p.path}' }`).join(',\n')}
    ],
  }`;
  });

  return `// Master Module and Page Configuration
// Auto-generated from page-mapping.ts on ${new Date().toISOString()}
// Total Modules: ${Object.keys(modules).length}
// Total Pages: ${pages.length}

const MASTER_MODULES = [
${moduleEntries.join(',\n')}
];

module.exports = { MASTER_MODULES };
`;
}

// Main
function main() {
  console.log('📋 Page Mapping Sync Tool');
  console.log('========================\n');
  
  // Check if files exist
  if (!fs.existsSync(FRONTEND_PAGE_MAPPING)) {
    console.error('❌ Frontend page-mapping.ts not found at:', FRONTEND_PAGE_MAPPING);
    process.exit(1);
  }
  
  console.log('✅ Frontend page-mapping.ts found');
  console.log('📁 Location:', FRONTEND_PAGE_MAPPING);
  
  // For now, just print statistics
  // Full sync would require parsing TypeScript properly
  console.log('\n📊 To sync:');
  console.log('1. Edit /my-frontend/src/common/config/page-mapping.ts');
  console.log('2. Run: npm run sync-pages (TODO: add to package.json)');
  console.log('3. This will update /my-backend/config/master-modules.js\n');
  
  console.log('📝 Page Mapping Structure:');
  console.log('- PAGE_DEFINITIONS: Array of all pages with routes, sidebar visibility, etc.');
  console.log('- MODULE_DEFINITIONS: Module metadata and protection settings');
  console.log('\n🔗 Helper Functions:');
  console.log('- getSidebarPages(moduleKey): Get pages visible in sidebar');
  console.log('- getModulePages(moduleKey): Get all pages for a module');
  console.log('- getSidebarPageCount(moduleKey): Count of sidebar pages');
  console.log('- getTotalPageCount(moduleKey): Count of all pages');
  console.log('- isModuleProtectedForRole(moduleKey, role): Check if protected');
}

main();
