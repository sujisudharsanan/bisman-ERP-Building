#!/usr/bin/env node

/**
 * Sync Backend pagesRoutes.js with Frontend PAGE_REGISTRY
 * 
 * This script reads the frontend PAGE_REGISTRY and updates the backend
 * pagesRoutes.js to include ALL pages defined in the frontend.
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_REGISTRY = path.join(__dirname, '../../my-frontend/src/common/config/page-registry.ts');
const BACKEND_ROUTES = path.join(__dirname, '../routes/pagesRoutes.js');

console.log('🔄 Syncing Backend with Frontend PAGE_REGISTRY...\n');

// Read frontend registry
const registryContent = fs.readFileSync(FRONTEND_REGISTRY, 'utf-8');

// Extract PAGE_REGISTRY array
const registryMatch = registryContent.match(/export const PAGE_REGISTRY[^=]*=\s*\[([\s\S]*?)\]\s*;/);

if (!registryMatch) {
  console.error('❌ Could not find PAGE_REGISTRY in frontend file');
  process.exit(1);
}

// Parse pages with detailed regex
const pages = [];
const entryRegex = /\{([^}]+)\}/g;
let match;

while ((match = entryRegex.exec(registryMatch[1])) !== null) {
  const entry = match[1];
  
  const idMatch = entry.match(/id:\s*['"]([^'"]+)['"]/);
  const nameMatch = entry.match(/name:\s*['"]([^'"]+)['"]/);
  const moduleMatch = entry.match(/module:\s*['"]([^'"]+)['"]/);
  
  if (idMatch && nameMatch) {
    pages.push({
      key: idMatch[1],
      name: nameMatch[1],
      module: moduleMatch ? moduleMatch[1] : 'System'
    });
  }
}

console.log(`✅ Found ${pages.length} pages in frontend PAGE_REGISTRY\n`);

// Generate backend SYSTEM_PAGES entries grouped by module
const pagesByModule = {};
pages.forEach(page => {
  if (!pagesByModule[page.module]) {
    pagesByModule[page.module] = [];
  }
  pagesByModule[page.module].push(page);
});

let pagesArray = '';
Object.keys(pagesByModule).sort().forEach(module => {
  pagesArray += `  // ${module} Pages\n`;
  pagesByModule[module].forEach(page => {
    pagesArray += `  { key: '${page.key}', name: '${page.name}', module: '${page.module}' },\n`;
  });
  pagesArray += '\n';
});

const fileContent = `// Pages API Routes - Returns available pages for permission management
// SYNCED WITH FRONTEND PAGE_REGISTRY
// Generated on: ${new Date().toISOString()}
// Total Pages: ${pages.length}

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Define all available pages in the system
const SYSTEM_PAGES = [
${pagesArray.trimEnd()}
];

// GET /api/pages - Return all available pages
router.get('/', authMiddleware.authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: SYSTEM_PAGES,
      count: SYSTEM_PAGES.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch pages',
        code: 'PAGES_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/pages/by-module - Return pages grouped by module
router.get('/by-module', authMiddleware.authenticate, async (req, res) => {
  try {
    const pagesByModule = {};
    SYSTEM_PAGES.forEach(page => {
      if (!pagesByModule[page.module]) {
        pagesByModule[page.module] = [];
      }
      pagesByModule[page.module].push(page);
    });

    res.json({
      success: true,
      data: pagesByModule,
      modules: Object.keys(pagesByModule),
      totalPages: SYSTEM_PAGES.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pages by module:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch pages by module',
        code: 'PAGES_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
`;

// Backup existing file
if (fs.existsSync(BACKEND_ROUTES)) {
  const backupFile = BACKEND_ROUTES + '.backup.' + Date.now();
  fs.copyFileSync(BACKEND_ROUTES, backupFile);
  console.log(`📦 Backed up existing file to: ${path.basename(backupFile)}`);
}

// Write new file
fs.writeFileSync(BACKEND_ROUTES, fileContent, 'utf8');
console.log(`✅ Generated: ${path.basename(BACKEND_ROUTES)}`);
console.log(`📄 Total pages registered: ${pages.length}\n`);

// Output breakdown by module
console.log('📊 Pages by Module:');
Object.keys(pagesByModule).sort().forEach(module => {
  console.log(`   ${module}: ${pagesByModule[module].length}`);
});

console.log('\n✨ Done! Backend now has all pages from frontend registry.\n');
console.log('💡 Next steps:');
console.log('   1. Restart your backend server');
console.log('   2. Frontend and backend are now in sync');
console.log(`   3. All ${pages.length} pages will be available\n`);
