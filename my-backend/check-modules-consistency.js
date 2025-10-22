#!/usr/bin/env node

/**
 * ERP Module Consistency Checker
 * 
 * This script verifies that all ERP module pages are:
 * 1. Properly created in the filesystem
 * 2. Registered in the page registry
 * 3. Accessible via the sidebar navigation
 * 4. Mapped to appropriate user roles
 * 
 * Usage: node check-modules-consistency.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

// Helper functions for colored output
const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  extra: (msg) => console.log(`${colors.magenta}🧩 ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}\n${msg}\n${'='.repeat(80)}${colors.reset}\n`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`),
  detail: (msg) => console.log(`   ${colors.white}${msg}${colors.reset}`),
};

// Paths configuration
const FRONTEND_ROOT = path.join(__dirname, '../my-frontend');
const APP_DIR = path.join(FRONTEND_ROOT, 'src/app');
const PAGE_REGISTRY_PATH = path.join(FRONTEND_ROOT, 'src/common/config/page-registry.ts');
const BACKEND_PAGES_PATH = path.join(__dirname, 'routes/pagesRoutes.js');

/**
 * Scan filesystem for all page.tsx files
 */
function scanFilesystemPages() {
  const pages = [];
  
  function scanDirectory(dir, basePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip special Next.js directories
        if (entry.name.startsWith('_') || entry.name.startsWith('(') || entry.name === 'api') {
          continue;
        }
        scanDirectory(fullPath, relativePath);
      } else if (entry.name === 'page.tsx' || entry.name === 'page.js') {
        // Found a page file
        const route = basePath === '' ? '/' : `/${basePath.replace(/\\/g, '/')}`;
        pages.push({
          route,
          fullPath,
          exists: true
        });
      }
    }
  }
  
  try {
    scanDirectory(APP_DIR);
  } catch (error) {
    log.error(`Failed to scan filesystem: ${error.message}`);
  }
  
  return pages;
}

/**
 * Parse page registry file
 */
function parsePageRegistry() {
  try {
    const content = fs.readFileSync(PAGE_REGISTRY_PATH, 'utf-8');
    
    // Extract page objects from the registry
    const pages = [];
    const pageRegex = /{\s*id:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]\s*,\s*path:\s*['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = pageRegex.exec(content)) !== null) {
      pages.push({
        id: match[1],
        name: match[2],
        path: match[3]
      });
    }
    
    return pages;
  } catch (error) {
    log.error(`Failed to parse page registry: ${error.message}`);
    return [];
  }
}

/**
 * Parse backend pages routes
 */
function parseBackendPages() {
  try {
    const content = fs.readFileSync(BACKEND_PAGES_PATH, 'utf-8');
    
    // Extract page keys from SYSTEM_PAGES array
    const pages = [];
    const pageRegex = /{\s*key:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = pageRegex.exec(content)) !== null) {
      pages.push({
        key: match[1],
        name: match[2],
        path: `/${match[1]}`
      });
    }
    
    return pages;
  } catch (error) {
    log.error(`Failed to parse backend pages: ${error.message}`);
    return [];
  }
}

/**
 * Normalize paths for comparison
 */
function normalizePath(path) {
  return path.replace(/^\/+|\/+$/g, '').toLowerCase();
}

/**
 * Check if a page file exists in filesystem
 */
function checkPageExists(pagePath) {
  const possiblePaths = [
    path.join(APP_DIR, pagePath, 'page.tsx'),
    path.join(APP_DIR, pagePath, 'page.js'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return { exists: true, fullPath: p };
    }
  }
  
  return { exists: false, fullPath: null };
}

/**
 * Main consistency check
 */
function checkConsistency() {
  log.title('🔍 ERP MODULE CONSISTENCY CHECKER');
  
  log.info('Scanning filesystem for pages...');
  const filesystemPages = scanFilesystemPages();
  log.detail(`Found ${filesystemPages.length} pages in filesystem`);
  
  log.info('Parsing page registry...');
  const registryPages = parsePageRegistry();
  log.detail(`Found ${registryPages.length} pages in registry`);
  
  log.info('Parsing backend pages...');
  const backendPages = parseBackendPages();
  log.detail(`Found ${backendPages.length} pages in backend`);
  
  // Create maps for easy lookup
  const filesystemMap = new Map(
    filesystemPages.map(p => [normalizePath(p.route), p])
  );
  const registryMap = new Map(
    registryPages.map(p => [normalizePath(p.path), p])
  );
  const backendMap = new Map(
    backendPages.map(p => [normalizePath(p.path), p])
  );
  
  // Analysis results
  const results = {
    filesystemOnly: [],
    registryOnly: [],
    backendOnly: [],
    allGood: [],
    registryMissingFiles: [],
    backendMissingFiles: [],
  };
  
  // Check filesystem pages
  for (const [route, page] of filesystemMap) {
    const inRegistry = registryMap.has(route);
    const inBackend = backendMap.has(route);
    
    if (inRegistry && inBackend) {
      results.allGood.push(page);
    } else if (!inRegistry && !inBackend) {
      results.filesystemOnly.push(page);
    } else if (!inRegistry) {
      results.filesystemOnly.push({ ...page, inBackend: true });
    } else if (!inBackend) {
      results.filesystemOnly.push({ ...page, inRegistry: true });
    }
  }
  
  // Check registry pages
  for (const [route, page] of registryMap) {
    if (!filesystemMap.has(route)) {
      const fileCheck = checkPageExists(page.path);
      results.registryMissingFiles.push({
        ...page,
        fileExists: fileCheck.exists,
        checkedPath: fileCheck.fullPath
      });
    }
  }
  
  // Check backend pages
  for (const [route, page] of backendMap) {
    if (!filesystemMap.has(route)) {
      const fileCheck = checkPageExists(page.path);
      results.backendMissingFiles.push({
        ...page,
        fileExists: fileCheck.exists,
        checkedPath: fileCheck.fullPath
      });
    }
  }
  
  // Display results
  displayResults(results, filesystemPages.length, registryPages.length, backendPages.length);
  
  return results;
}

/**
 * Display analysis results
 */
function displayResults(results, totalFs, totalReg, totalBack) {
  log.section('📊 ANALYSIS RESULTS');
  
  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  log.detail(`Filesystem Pages: ${totalFs}`);
  log.detail(`Registry Pages: ${totalReg}`);
  log.detail(`Backend Pages: ${totalBack}`);
  log.detail(`Properly Mapped: ${results.allGood.length}`);
  
  // Show properly connected pages
  if (results.allGood.length > 0) {
    log.section(`✅ PROPERLY CONNECTED PAGES (${results.allGood.length})`);
    const byModule = {};
    results.allGood.forEach(p => {
      const module = p.route.split('/')[1] || 'root';
      if (!byModule[module]) byModule[module] = [];
      byModule[module].push(p.route);
    });
    
    Object.keys(byModule).sort().forEach(module => {
      log.detail(`${module}: ${byModule[module].length} pages`);
    });
  }
  
  // Show pages that exist but not in registry/backend
  if (results.filesystemOnly.length > 0) {
    log.section(`🧩 EXTRA PAGES (exist but not linked) - ${results.filesystemOnly.length}`);
    results.filesystemOnly.forEach(p => {
      log.warning(`${p.route}`);
      log.detail(`  Path: ${p.fullPath}`);
      if (p.inRegistry) log.detail(`  ✓ In registry`);
      if (p.inBackend) log.detail(`  ✓ In backend`);
    });
  }
  
  // Show registry pages without files
  if (results.registryMissingFiles.length > 0) {
    log.section(`⚠️  REGISTRY PAGES MISSING FILES - ${results.registryMissingFiles.length}`);
    results.registryMissingFiles.forEach(p => {
      log.error(`${p.path} (${p.name})`);
      log.detail(`  ID: ${p.id}`);
      log.detail(`  Expected: ${path.join(APP_DIR, p.path, 'page.tsx')}`);
    });
  }
  
  // Show backend pages without files
  if (results.backendMissingFiles.length > 0) {
    log.section(`⚠️  BACKEND PAGES MISSING FILES - ${results.backendMissingFiles.length}`);
    results.backendMissingFiles.forEach(p => {
      log.error(`${p.path} (${p.name})`);
      log.detail(`  Key: ${p.key}`);
      log.detail(`  Expected: ${path.join(APP_DIR, p.path, 'page.tsx')}`);
    });
  }
  
  // Final verdict
  log.section('📋 FINAL VERDICT');
  const hasIssues = 
    results.filesystemOnly.length > 0 ||
    results.registryMissingFiles.length > 0 ||
    results.backendMissingFiles.length > 0;
  
  if (!hasIssues) {
    log.success('All pages are properly connected! 🎉');
  } else {
    log.warning('Found inconsistencies that need attention:');
    if (results.filesystemOnly.length > 0) {
      log.detail(`- ${results.filesystemOnly.length} pages exist but not registered`);
    }
    if (results.registryMissingFiles.length > 0) {
      log.detail(`- ${results.registryMissingFiles.length} registry entries missing page files`);
    }
    if (results.backendMissingFiles.length > 0) {
      log.detail(`- ${results.backendMissingFiles.length} backend entries missing page files`);
    }
  }
  
  log.title('END OF REPORT');
}

/**
 * Generate fix suggestions
 */
function generateFixSuggestions(results) {
  if (results.registryMissingFiles.length === 0 && results.filesystemOnly.length === 0) {
    return;
  }
  
  log.section('💡 FIX SUGGESTIONS');
  
  if (results.filesystemOnly.length > 0) {
    console.log(`\n${colors.yellow}To add unlinked pages to the registry:${colors.reset}`);
    results.filesystemOnly.slice(0, 3).forEach(p => {
      console.log(`\n  // Add to page-registry.ts:`);
      console.log(`  {`);
      console.log(`    id: '${normalizePath(p.route).replace(/\//g, '-')}',`);
      console.log(`    name: '${p.route.split('/').pop() || 'Page'}',`);
      console.log(`    path: '${p.route}',`);
      console.log(`    icon: FileText,`);
      console.log(`    module: 'system', // or appropriate module`);
      console.log(`    permissions: ['system-settings'],`);
      console.log(`    roles: ['SUPER_ADMIN'],`);
      console.log(`    status: 'active',`);
      console.log(`  },`);
    });
  }
  
  if (results.registryMissingFiles.length > 0) {
    console.log(`\n${colors.red}To create missing page files:${colors.reset}`);
    results.registryMissingFiles.slice(0, 3).forEach(p => {
      console.log(`\n  mkdir -p "${path.join(APP_DIR, p.path)}"`);
      console.log(`  touch "${path.join(APP_DIR, p.path, 'page.tsx')}"`);
    });
  }
}

/**
 * Validate sidebar links against page registry
 */
function validateSidebarLinks() {
  log.section('🔗 SIDEBAR LINK VALIDATION');
  
  const sidebarFiles = [
    path.join(FRONTEND_ROOT, 'src/common/components/DynamicSidebar.tsx'),
    path.join(FRONTEND_ROOT, 'src/components/Sidebar.tsx'),
    path.join(FRONTEND_ROOT, 'src/components/navigation/Sidebar.tsx'),
    path.join(FRONTEND_ROOT, 'src/app/components/Sidebar.tsx'),
  ];
  
  let sidebarPath = null;
  for (const file of sidebarFiles) {
    if (fs.existsSync(file)) {
      sidebarPath = file;
      break;
    }
  }
  
  if (!sidebarPath) {
    log.warning('Sidebar component not found - skipping link validation');
    return { deadLinks: [], validLinks: [] };
  }
  
  log.info(`Checking sidebar: ${path.basename(sidebarPath)}`);
  
  try {
    const content = fs.readFileSync(sidebarPath, 'utf-8');
    
    // Extract href/to/path attributes from links
    const linkPatterns = [
      /href=["']([^"']+)["']/g,
      /to=["']([^"']+)["']/g,
      /path=["']([^"']+)["']/g,
      /Link.*?href=["']([^"']+)["']/g,
      /<a.*?href=["']([^"']+)["']/g,
    ];
    
    const allLinks = new Set();
    
    linkPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const link = match[1];
        // Filter out external links, anchors, and special Next.js routes
        if (!link.startsWith('http') && 
            !link.startsWith('#') && 
            !link.startsWith('mailto:') &&
            !link.includes('${') && // Skip template literals
            link !== '/' &&
            !link.startsWith('/_next')) {
          allLinks.add(link);
        }
      }
    });
    
    // Get registered paths from page registry
    const registryPages = parsePageRegistry();
    const registeredPaths = new Set(registryPages.map(p => p.path));
    
    // Check each link
    const validLinks = [];
    const deadLinks = [];
    
    allLinks.forEach(link => {
      if (registeredPaths.has(link)) {
        validLinks.push(link);
      } else {
        deadLinks.push(link);
      }
    });
    
    // Output results
    if (deadLinks.length === 0 && allLinks.size > 0) {
      log.success(`All ${validLinks.length} sidebar links are valid!`);
    } else if (allLinks.size === 0) {
      log.info('Sidebar uses dynamic navigation (no hardcoded links)');
    } else {
      log.error(`Found ${deadLinks.length} dead/unregistered sidebar links:`);
      deadLinks.forEach(link => {
        log.detail(`❌ ${link}`);
      });
    }
    
    if (validLinks.length > 0) {
      log.info(`Valid hardcoded links: ${validLinks.length}`);
    }
    
    return { deadLinks, validLinks };
    
  } catch (error) {
    log.error(`Error reading sidebar: ${error.message}`);
    return { deadLinks: [], validLinks: [] };
  }
}

/**
 * Find orphan pages (pages not linked from anywhere)
 */
function findOrphanPages() {
  log.section('👻 ORPHAN PAGE DETECTION');
  
  const registryPages = parsePageRegistry();
  const sidebarFiles = [
    path.join(FRONTEND_ROOT, 'src/common/components/DynamicSidebar.tsx'),
    path.join(FRONTEND_ROOT, 'src/components/Sidebar.tsx'),
    path.join(FRONTEND_ROOT, 'src/components/navigation/Sidebar.tsx'),
  ];
  
  let sidebarContent = '';
  for (const file of sidebarFiles) {
    if (fs.existsSync(file)) {
      sidebarContent += fs.readFileSync(file, 'utf-8');
    }
  }
  
  if (!sidebarContent) {
    log.warning('Sidebar not found - skipping orphan detection');
    return { orphanPages: [] };
  }
  
  log.info('Checking for unreachable pages...');
  
  const orphanPages = [];
  
  registryPages.forEach(page => {
    // Check if page path appears in sidebar (for static sidebars)
    const isLinked = sidebarContent.includes(page.path);
    
    // Check if page has no roles (unreachable by any user)
    const hasNoRoles = !page.roles || page.roles.length === 0;
    
    // Check if page is disabled
    const isDisabled = page.status === 'disabled';
    
    // For dynamic sidebars (like DynamicSidebar.tsx), pages are auto-generated
    // So we only flag pages with no roles or disabled status
    const isDynamicSidebar = sidebarContent.includes('DynamicSidebar') || 
                              sidebarContent.includes('getNavigationStructure');
    
    if (isDynamicSidebar) {
      if (hasNoRoles) {
        orphanPages.push({
          ...page,
          reason: 'no roles assigned'
        });
      } else if (isDisabled) {
        orphanPages.push({
          ...page,
          reason: 'status: disabled'
        });
      }
    } else {
      if (!isLinked || hasNoRoles) {
        orphanPages.push({
          ...page,
          reason: !isLinked ? 'not in sidebar' : 'no roles assigned'
        });
      }
    }
  });
  
  if (orphanPages.length === 0) {
    log.success('No orphan pages found - all pages are reachable!');
  } else {
    log.warning(`Found ${orphanPages.length} potential orphan pages:`);
    orphanPages.forEach(page => {
      log.detail(`⚠️  ${page.path} - ${page.reason}`);
    });
  }
  
  return { orphanPages };
}

// Run the check
try {
  const results = checkConsistency();
  generateFixSuggestions(results);
  
  // Additional validations
  const sidebarValidation = validateSidebarLinks();
  const orphanDetection = findOrphanPages();
  
  // Exit with error code if issues found
  const hasIssues = 
    results.filesystemOnly.length > 0 ||
    results.registryMissingFiles.length > 0 ||
    results.backendMissingFiles.length > 0 ||
    sidebarValidation.deadLinks.length > 0 ||
    orphanDetection.orphanPages.length > 0;
  
  process.exit(hasIssues ? 1 : 0);
} catch (error) {
  log.error(`Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
