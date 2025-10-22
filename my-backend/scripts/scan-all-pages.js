/**
 * Scan All Pages Script
 * Scans the frontend directory for all page.tsx files and generates a complete pages list
 * This ensures the backend has a complete registry of all available pages
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_APP_DIR = path.join(__dirname, '../../my-frontend/src/app');
const OUTPUT_FILE = path.join(__dirname, '../routes/pagesRoutes.js');

// Directories to exclude from scan
const EXCLUDE_DIRS = [
  'api',
  '_dashboard_backup',
  'examples',
  'demo',
  'loader-demo',
  'example',
  'archive'
];

// Module mapping based on path patterns
const MODULE_MAP = {
  'system': 'IT & System',
  'finance': 'Finance',
  'operations': 'Operations',
  'compliance': 'Compliance',
  'procurement': 'Procurement',
  'auth': 'Authentication',
  'super-admin': 'Super Admin',
  'admin': 'Administration',
  'manager': 'Administration',
  'staff': 'Administration',
  'dashboard': 'Dashboard',
  'cfo-dashboard': 'Finance',
  'finance-controller': 'Finance',
  'treasury': 'Finance',
  'accounts': 'Finance',
  'accounts-payable': 'Finance',
  'banker': 'Finance',
  'procurement-officer': 'Procurement',
  'store-incharge': 'Operations',
  'hub-incharge': 'Operations',
  'operations-manager': 'Operations',
  'compliance-officer': 'Compliance',
  'legal': 'Compliance',
  'it-admin': 'IT & System',
  'task-dashboard': 'Tasks',
  'access-denied': 'System',
};

// Function to convert path to readable name
function pathToName(pagePath) {
  return pagePath
    .split('/')
    .map(part => part
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    )
    .join(' - ');
}

// Function to determine module from path
function getModule(pagePath) {
  const parts = pagePath.split('/');
  
  // Check direct mapping first
  for (const [key, module] of Object.entries(MODULE_MAP)) {
    if (pagePath.includes(key)) {
      return module;
    }
  }
  
  // Check first part of path
  const firstPart = parts[0];
  if (MODULE_MAP[firstPart]) {
    return MODULE_MAP[firstPart];
  }
  
  // Default mapping based on common patterns
  if (parts.length > 1) {
    const module = parts[0];
    return module.charAt(0).toUpperCase() + module.slice(1);
  }
  
  return 'General';
}

// Recursive function to find all page.tsx files
function findPageFiles(dir, baseDir = dir) {
  let pageFiles = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      // Get relative path from base directory
      const relativePath = path.relative(baseDir, fullPath);
      const parentDir = path.dirname(relativePath);
      
      // Skip excluded directories
      if (EXCLUDE_DIRS.some(exclude => relativePath.includes(exclude))) {
        continue;
      }
      
      // Skip backup directories
      if (relativePath.includes('backup') || relativePath.includes('_backup')) {
        continue;
      }
      
      if (stat.isDirectory()) {
        // Recursively search subdirectories
        pageFiles = pageFiles.concat(findPageFiles(fullPath, baseDir));
      } else if (item === 'page.tsx') {
        // Found a page.tsx file
        const pagePath = parentDir === '.' ? '' : parentDir.replace(/\\/g, '/');
        
        // Skip the root page
        if (pagePath === '' || pagePath === '.') {
          pageFiles.push({
            key: 'home',
            name: 'Home',
            module: 'Dashboard',
            path: pagePath,
            order: 0
          });
        } else {
          pageFiles.push({
            key: pagePath,
            name: pathToName(pagePath),
            module: getModule(pagePath),
            path: pagePath,
            order: 999
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }
  
  return pageFiles;
}

// Sort pages by module and name
function sortPages(pages) {
  return pages.sort((a, b) => {
    // First sort by module
    if (a.module !== b.module) {
      return a.module.localeCompare(b.module);
    }
    // Then by name
    return a.name.localeCompare(b.name);
  });
}

// Generate the pagesRoutes.js file content
function generateRoutesFile(pages) {
  const sortedPages = sortPages(pages);
  
  // Group pages by module for better organization
  const pagesByModule = {};
  sortedPages.forEach(page => {
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
// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated on: ${new Date().toISOString()}
// Total Pages: ${sortedPages.length}

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
  
  return fileContent;
}

// Main execution
console.log('🔍 Scanning for all page.tsx files...\n');

if (!fs.existsSync(FRONTEND_APP_DIR)) {
  console.error(`❌ Frontend app directory not found: ${FRONTEND_APP_DIR}`);
  process.exit(1);
}

// Find all page files
const pageFiles = findPageFiles(FRONTEND_APP_DIR);

console.log(`✅ Found ${pageFiles.length} page.tsx files\n`);

// Display breakdown by module
const moduleCount = {};
pageFiles.forEach(page => {
  moduleCount[page.module] = (moduleCount[page.module] || 0) + 1;
});

console.log('📊 Pages by Module:');
Object.keys(moduleCount).sort().forEach(module => {
  console.log(`   ${module}: ${moduleCount[module]}`);
});
console.log();

// Generate the routes file
const routesContent = generateRoutesFile(pageFiles);

// Backup existing file if it exists
if (fs.existsSync(OUTPUT_FILE)) {
  const backupFile = OUTPUT_FILE + '.backup.' + Date.now();
  fs.copyFileSync(OUTPUT_FILE, backupFile);
  console.log(`📦 Backed up existing file to: ${path.basename(backupFile)}`);
}

// Write the new file
fs.writeFileSync(OUTPUT_FILE, routesContent, 'utf8');
console.log(`✅ Generated: ${path.basename(OUTPUT_FILE)}`);
console.log(`📄 Total pages registered: ${pageFiles.length}\n`);

// Output sample of pages for verification
console.log('📋 Sample of registered pages:');
pageFiles.slice(0, 10).forEach(page => {
  console.log(`   • ${page.name} (${page.module}) - ${page.key}`);
});

if (pageFiles.length > 10) {
  console.log(`   ... and ${pageFiles.length - 10} more pages`);
}

console.log('\n✨ Done! All pages have been registered.\n');
console.log('💡 Next steps:');
console.log('   1. Restart your backend server to load the new routes');
console.log('   2. Check the Pages & Roles Report in the frontend');
console.log('   3. All 140+ pages should now be visible\n');
