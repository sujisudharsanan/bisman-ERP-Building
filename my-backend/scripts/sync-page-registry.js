#!/usr/bin/env node

/**
 * Sync Frontend PAGE_REGISTRY with Backend pagesRoutes.js
 * 
 * This script reads the backend pagesRoutes.js and updates the frontend
 * page-registry.ts to match, ensuring both are in sync.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROUTES = path.join(__dirname, '../routes/pagesRoutes.js');
const FRONTEND_REGISTRY = path.join(__dirname, '../../my-frontend/src/common/config/page-registry.ts');

console.log('🔄 Syncing Frontend PAGE_REGISTRY with Backend...\n');

// Read backend routes
const backendContent = fs.readFileSync(BACKEND_ROUTES, 'utf-8');

// Extract SYSTEM_PAGES array
const pagesMatch = backendContent.match(/const SYSTEM_PAGES = \[([\s\S]*?)\];/);

if (!pagesMatch) {
  console.error('❌ Could not find SYSTEM_PAGES in backend routes');
  process.exit(1);
}

// Parse pages
const pagesStr = pagesMatch[1];
const pages = [];
const pageRegex = /\{\s*key:\s*'([^']+)',\s*name:\s*'([^']+)',\s*module:\s*'([^']+)'\s*\}/g;

let match;
while ((match = pageRegex.exec(pagesStr)) !== null) {
  pages.push({
    key: match[1],
    name: match[2],
    module: match[3]
  });
}

console.log(`✅ Found ${pages.length} pages in backend\n`);

// Generate TypeScript PAGE_REGISTRY entries
const registryEntries = pages.map(page => {
  const id = page.key;
  const name = page.name;
  const path = `/${page.key}`;
  const module = page.module.toLowerCase().replace(/[^a-z]/g, '');
  const moduleMap = {
    'itsystem': 'system',
    'superadmin': 'system',
    'administration': 'system',
    'dashboard': 'system',
    'authentication': 'system',
    'finance': 'finance',
    'procurement': 'procurement',
    'operations': 'operations',
    'compliance': 'compliance',
    'system': 'system'
  };
  const mappedModule = moduleMap[module] || 'system';
  
  // Determine roles based on module
  const roleMap = {
    'system': ['SUPER_ADMIN'],
    'finance': ['SUPER_ADMIN', 'CFO', 'FINANCE_CONTROLLER'],
    'procurement': ['SUPER_ADMIN', 'PROCUREMENT_OFFICER'],
    'operations': ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'HUB_INCHARGE'],
    'compliance': ['SUPER_ADMIN', 'COMPLIANCE_OFFICER']
  };
  const roles = roleMap[mappedModule] || ['SUPER_ADMIN'];
  
  return `  {
    id: '${id}',
    name: '${name}',
    path: '${path}',
    module: '${mappedModule}',
    permissions: ['${mappedModule}-access'],
    roles: ${JSON.stringify(roles)},
    icon: 'FileText',
    order: 999,
    status: 'active',
    description: '${name}'
  }`;
}).join(',\n');

// Read current registry file
const registryContent = fs.readFileSync(FRONTEND_REGISTRY, 'utf-8');

// Find and replace PAGE_REGISTRY
const registryStart = registryContent.indexOf('export const PAGE_REGISTRY');
const registryEnd = registryContent.indexOf('];', registryStart) + 2;

if (registryStart === -1 || registryEnd === -1) {
  console.error('❌ Could not find PAGE_REGISTRY in frontend file');
  process.exit(1);
}

const beforeRegistry = registryContent.substring(0, registryStart);
const afterRegistry = registryContent.substring(registryEnd);

const newRegistry = `export const PAGE_REGISTRY: PageMetadata[] = [\n${registryEntries}\n];`;

const newContent = beforeRegistry + newRegistry + afterRegistry;

// Backup original
const backupFile = FRONTEND_REGISTRY + '.backup.' + Date.now();
fs.copyFileSync(FRONTEND_REGISTRY, backupFile);
console.log(`📦 Backed up original to: ${path.basename(backupFile)}`);

// Write new file
fs.writeFileSync(FRONTEND_REGISTRY, newContent, 'utf-8');

console.log(`✅ Updated PAGE_REGISTRY with ${pages.length} pages`);
console.log(`📄 File: src/common/config/page-registry.ts\n`);

console.log('📊 Pages by Module:');
const byModule = {};
pages.forEach(p => {
  byModule[p.module] = (byModule[p.module] || 0) + 1;
});
Object.keys(byModule).sort().forEach(mod => {
  console.log(`   ${mod}: ${byModule[mod]}`);
});

console.log('\n✨ Sync complete! Restart your frontend to see changes.\n');
