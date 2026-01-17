#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BISMAN ERP - Page Registry Consistency Check
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This script validates that all page files are registered in page-registry.ts
 * and that all registered pages have corresponding files.
 * 
 * Usage:
 *   node scripts/check-page-consistency.js
 *   npm run check:pages
 * 
 * Add to CI/CD pipeline for automated validation.
 * 
 * Exit codes:
 *   0 = All checks passed
 *   1 = Consistency issues found
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// Configuration
const APP_DIR = path.join(__dirname, '../src/app');
const REGISTRY_PATH = path.join(__dirname, '../src/common/config/page-registry.ts');

// Pages that don't need to be registered (public/auth/utility pages)
const EXEMPT_PATTERNS = [
  /^\/auth\//,              // Auth pages
  /^\/\(public\)\//,        // Public route group
  /^\/\(dashboard\)\//,     // Dashboard route group (optional - can be registered)
  /^\/access-denied$/,      // Utility pages
  /^\/unauthorized$/,
  /^\/login$/,
  /^\/signup$/,
  /^\/terms$/,
  /^\/privacy$/,
  /^\/pricing$/,
  /^\/contact-sales$/,
  /^\/support$/,
  /^\/status/,              // Status pages
  /^\/docs\//,              // Documentation
  /^\/welcome/,             // Onboarding
  /^\/onboarding\//,
  /\[.*\]/,                 // Dynamic route segments (children of registered parents)
];

// Collect all page.tsx files recursively
function findAllPages(dir, pages = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findAllPages(fullPath, pages);
    } else if (file === 'page.tsx') {
      // Convert to route path
      const relativePath = fullPath
        .replace(APP_DIR, '')
        .replace('/page.tsx', '')
        .replace(/\\/g, '/'); // Windows compatibility
      pages.push(relativePath || '/');
    }
  }
  
  return pages;
}

// Extract registered paths from page-registry.ts
function getRegisteredPaths() {
  const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  const paths = [];
  
  // Match path: '/some/path' or path: "/some/path"
  const regex = /path:\s*['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // Skip TypeScript type definitions
    if (match[1] !== 'string') {
      paths.push(match[1]);
    }
  }
  
  return [...new Set(paths)]; // Remove duplicates
}

// Check if a path is exempt from registration
function isExempt(pagePath) {
  return EXEMPT_PATTERNS.some(pattern => pattern.test(pagePath));
}

// Normalize path for comparison (handle route groups)
function normalizePath(pagePath) {
  // Remove route group parentheses: /(dashboard)/admin -> /admin
  return pagePath.replace(/\/\([^)]+\)/g, '');
}

// Main check function
function runCheck() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  BISMAN ERP - Page Registry Consistency Check');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const allPages = findAllPages(APP_DIR);
  const registeredPaths = getRegisteredPaths();
  
  console.log(`📊 Statistics:`);
  console.log(`   Total page.tsx files: ${allPages.length}`);
  console.log(`   Registered paths: ${registeredPaths.length}`);
  console.log('');

  // Check for missing files (registered but no page.tsx)
  const missingFiles = [];
  for (const regPath of registeredPaths) {
    // Check standard path first
    let expectedFile = path.join(APP_DIR, regPath, 'page.tsx');
    let found = fs.existsSync(expectedFile);
    
    // Check if it might be in a route group like (dashboard)
    if (!found) {
      // Try common route groups
      const routeGroups = ['(dashboard)', '(public)', '(auth)'];
      for (const group of routeGroups) {
        const groupPath = path.join(APP_DIR, group, regPath, 'page.tsx');
        if (fs.existsSync(groupPath)) {
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      missingFiles.push(regPath);
    }
  }

  // Check for unregistered pages
  const unregisteredPages = [];
  for (const pagePath of allPages) {
    const normalizedPath = normalizePath(pagePath);
    
    if (isExempt(pagePath) || isExempt(normalizedPath)) {
      continue;
    }
    
    // Check if registered (either original or normalized path)
    const isRegistered = registeredPaths.includes(pagePath) || 
                         registeredPaths.includes(normalizedPath);
    
    if (!isRegistered) {
      unregisteredPages.push(pagePath);
    }
  }

  // Check for duplicate IDs
  const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  const idMatches = content.match(/id:\s*['"]([^'"]+)['"]/g) || [];
  const ids = idMatches
    .map(m => m.match(/['"]([^'"]+)['"]/)?.[1])
    .filter(id => id && id !== 'string');
  
  const idCounts = {};
  ids.forEach(id => { idCounts[id] = (idCounts[id] || 0) + 1; });
  const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);

  // Report results
  let hasErrors = false;

  if (missingFiles.length > 0) {
    console.log('❌ MISSING PAGE FILES (registered but no file):');
    missingFiles.forEach(p => console.log(`   - ${p}`));
    console.log('');
    hasErrors = true;
  } else {
    console.log('✅ All registered pages have corresponding files');
    console.log('');
  }

  if (unregisteredPages.length > 0) {
    console.log('⚠️  UNREGISTERED PAGES (file exists but not in registry):');
    unregisteredPages.slice(0, 20).forEach(p => console.log(`   - ${p}`));
    if (unregisteredPages.length > 20) {
      console.log(`   ... and ${unregisteredPages.length - 20} more`);
    }
    console.log('');
    // This is a warning, not an error (pages still work)
  } else {
    console.log('✅ All non-exempt pages are registered');
    console.log('');
  }

  if (duplicateIds.length > 0) {
    console.log('❌ DUPLICATE PAGE IDs:');
    duplicateIds.forEach(([id, count]) => console.log(`   - "${id}" appears ${count} times`));
    console.log('');
    hasErrors = true;
  } else {
    console.log('✅ No duplicate page IDs found');
    console.log('');
  }

  // Final result
  console.log('═══════════════════════════════════════════════════════════════');
  if (hasErrors) {
    console.log('❌ FAILED - Consistency issues found');
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(1);
  } else {
    console.log('✅ PASSED - Page registry is consistent');
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(0);
  }
}

runCheck();
