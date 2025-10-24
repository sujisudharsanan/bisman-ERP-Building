#!/usr/bin/env node

/**
 * Complete Sync - Extract ALL pages from Frontend PAGE_REGISTRY
 * 
 * This improved script uses better regex to extract all page entries
 * including multi-line definitions and complex structures.
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_REGISTRY = path.join(__dirname, '../../my-frontend/src/common/config/page-registry.ts');
const BACKEND_ROUTES = path.join(__dirname, '../routes/pagesRoutes.js');

console.log('🔄 Complete sync - extracting ALL pages from frontend...\n');

// Read frontend registry
const registryContent = fs.readFileSync(FRONTEND_REGISTRY, 'utf-8');

// Find PAGE_REGISTRY array
const registryStart = registryContent.indexOf('export const PAGE_REGISTRY');
const registryEnd = registryContent.indexOf('];', registryStart);

if (registryStart === -1 || registryEnd === -1) {
  console.error('❌ Could not find PAGE_REGISTRY');
  process.exit(1);
}

const registrySection = registryContent.substring(registryStart, registryEnd + 2);

// Extract all page objects - improved parsing
const pages = [];
const lines = registrySection.split('\n');
let currentPage = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Start of new page object
  if (line === '{' && i > 0) {
    currentPage = {};
  }
  
  // Extract fields
  if (currentPage !== null) {
    // ID
    const idMatch = line.match(/^id:\s*['"]([^'"]+)['"]/);
    if (idMatch) {
      currentPage.id = idMatch[1];
    }
    
    // Name
    const nameMatch = line.match(/^name:\s*['"]([^'"]+)['"]/);
    if (nameMatch) {
      currentPage.name = nameMatch[1];
    }
    
    // Module
    const moduleMatch = line.match(/^module:\s*['"]([^'"]+)['"]/);
    if (moduleMatch) {
      currentPage.module = moduleMatch[1];
    }
  }
  
  // End of page object
  if (line === '},' || line === '}') {
    if (currentPage && currentPage.id && currentPage.name) {
      // Use module or default to 'System'
      if (!currentPage.module) {
        currentPage.module = 'System';
      }
      
      pages.push({
        key: currentPage.id,
        name: currentPage.name,
        module: currentPage.module
      });
    }
    currentPage = null;
  }
}

console.log(`✅ Extracted ${pages.length} pages from frontend\n`);

if (pages.length === 0) {
  console.error('❌ No pages found! Check parsing logic.');
  process.exit(1);
}

// Show sample
console.log('📋 Sample pages found:');
pages.slice(0, 10).forEach(p => {
  console.log(`   • ${p.name} (${p.module}) - ${p.key}`);
});
if (pages.length > 10) {
  console.log(`   ... and ${pages.length - 10} more\n`);
}

// Group by module
const pagesByModule = {};
pages.forEach(page => {
  if (!pagesByModule[page.module]) {
    pagesByModule[page.module] = [];
  }
  pagesByModule[page.module].push(page);
});

// Generate backend file content
let pagesArray = '';
Object.keys(pagesByModule).sort().forEach(module => {
  pagesArray += `  // ${module} Pages\n`;
  pagesByModule[module].forEach(page => {
    // Escape single quotes in names
    const safeName = page.name.replace(/'/g, "\\'");
    pagesArray += `  { key: '${page.key}', name: '${safeName}', module: '${page.module}' },\n`;
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

console.log(`✅ Updated: ${path.basename(BACKEND_ROUTES)}`);
console.log(`📄 Total pages registered: ${pages.length}\n`);

// Output breakdown by module
console.log('📊 Pages by Module:');
Object.keys(pagesByModule).sort().forEach(module => {
  console.log(`   ${module}: ${pagesByModule[module].length} pages`);
});

console.log('\n✨ Complete! All pages extracted and synced.\n');
console.log('💡 Next: Restart backend to load all pages');
console.log(`   Expected: ${pages.length} pages available\n`);
