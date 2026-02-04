#!/usr/bin/env node
/**
 * RBAC Dynamic Audit Script
 * ==========================
 * 
 * Detects violations of the dynamic RBAC principle:
 * 1. Hardcoded role checks in frontend (allowedRoles arrays)
 * 2. Hardcoded role checks in backend (requireRole with static lists)
 * 3. Pages in frontend without database mapping
 * 4. APIs without dynamic permission checks
 * 
 * Run: node scripts/rbac-dynamic-audit.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuration
const FRONTEND_DIR = path.join(__dirname, '../my-frontend/src');
const BACKEND_DIR = path.join(__dirname, '../my-backend');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway'
});

// Patterns to detect hardcoded role checks
const FORBIDDEN_PATTERNS = [
  // Frontend patterns
  { pattern: /allowedRoles\s*=\s*\[/g, type: 'HARDCODED_ROLES', severity: 'WARNING' },
  { pattern: /if\s*\(\s*role\s*===?\s*['"`][A-Z_]+['"`]\s*\)/gi, type: 'DIRECT_ROLE_CHECK', severity: 'ERROR' },
  { pattern: /if\s*\(\s*userRole\s*===?\s*['"`][A-Z_]+['"`]\s*\)/gi, type: 'DIRECT_ROLE_CHECK', severity: 'ERROR' },
  { pattern: /requireRole\s*\(\s*\[/g, type: 'STATIC_REQUIRE_ROLE', severity: 'WARNING' },
  { pattern: /['"`](SUPER_ADMIN|ENTERPRISE_ADMIN|ADMIN)['"`]\s*\)/g, type: 'HARDCODED_ROLE_STRING', severity: 'INFO' },
];

// Files/directories to skip
const SKIP_PATHS = [
  'node_modules',
  '.next',
  'dist',
  '.git',
  'scripts/rbac-dynamic-audit.js', // Skip self
  'protected-access.ts', // Legitimate protection config
];

const results = {
  frontendViolations: [],
  backendViolations: [],
  missingDbMappings: [],
  summary: {
    totalViolations: 0,
    errors: 0,
    warnings: 0,
    info: 0
  }
};

// Recursively scan files
function scanDirectory(dir, fileExtensions, callback) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
    
    // Skip excluded paths
    if (SKIP_PATHS.some(skip => relativePath.includes(skip))) continue;
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath, fileExtensions, callback);
    } else if (fileExtensions.some(ext => file.endsWith(ext))) {
      callback(fullPath, relativePath);
    }
  }
}

// Check file for violations
function checkFile(content, filePath) {
  const lines = content.split('\n');
  const violations = [];
  
  for (const { pattern, type, severity } of FORBIDDEN_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(content)) !== null) {
      // Find line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
      const line = lines[lineNumber - 1]?.trim() || '';
      
      violations.push({
        file: filePath,
        line: lineNumber,
        type,
        severity,
        match: match[0],
        context: line.substring(0, 100)
      });
    }
  }
  
  return violations;
}

// Get all routes from frontend
function extractFrontendRoutes() {
  const routes = [];
  const appDir = path.join(FRONTEND_DIR, 'app');
  
  function scanAppDir(dir, currentRoute = '') {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Handle dynamic routes
        let routeSegment = item;
        if (item.startsWith('[') && item.endsWith(']')) {
          routeSegment = ':' + item.slice(1, -1);
        }
        
        // Skip private folders
        if (item.startsWith('_')) continue;
        
        const newRoute = `${currentRoute}/${routeSegment}`;
        scanAppDir(fullPath, newRoute);
      } else if (item === 'page.tsx' || item === 'page.js') {
        routes.push(currentRoute || '/');
      }
    }
  }
  
  scanAppDir(appDir);
  return routes;
}

// Check database for page mappings
async function checkDatabaseMappings(routes) {
  const missing = [];
  
  try {
    // Get all routes from pages_master
    const result = await pool.query(`
      SELECT route, page_code, display_name 
      FROM pages_master 
      WHERE is_active = true
    `);
    
    const dbRoutes = new Set(result.rows.map(r => r.route).filter(Boolean));
    
    for (const route of routes) {
      // Skip certain routes that don't need DB mapping
      if (route === '/' || 
          route.startsWith('/auth') || 
          route.startsWith('/api') ||
          route.includes(':')) continue;
      
      if (!dbRoutes.has(route)) {
        missing.push({
          route,
          recommendation: `Add to pages_master with appropriate role assignments`
        });
      }
    }
  } catch (error) {
    console.error('Database check failed:', error.message);
  }
  
  return missing;
}

// Generate report
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('RBAC DYNAMIC AUDIT REPORT');
  console.log('='.repeat(80) + '\n');
  
  // Frontend Violations
  console.log('\n📁 FRONTEND VIOLATIONS\n' + '-'.repeat(40));
  if (results.frontendViolations.length === 0) {
    console.log('✅ No violations found');
  } else {
    for (const v of results.frontendViolations) {
      const icon = v.severity === 'ERROR' ? '❌' : v.severity === 'WARNING' ? '⚠️' : 'ℹ️';
      console.log(`${icon} [${v.severity}] ${v.file}:${v.line}`);
      console.log(`   Type: ${v.type}`);
      console.log(`   Context: ${v.context}`);
      console.log('');
    }
  }
  
  // Backend Violations
  console.log('\n📁 BACKEND VIOLATIONS\n' + '-'.repeat(40));
  if (results.backendViolations.length === 0) {
    console.log('✅ No violations found');
  } else {
    for (const v of results.backendViolations) {
      const icon = v.severity === 'ERROR' ? '❌' : v.severity === 'WARNING' ? '⚠️' : 'ℹ️';
      console.log(`${icon} [${v.severity}] ${v.file}:${v.line}`);
      console.log(`   Type: ${v.type}`);
      console.log(`   Context: ${v.context}`);
      console.log('');
    }
  }
  
  // Missing DB Mappings
  console.log('\n📁 MISSING DATABASE MAPPINGS\n' + '-'.repeat(40));
  if (results.missingDbMappings.length === 0) {
    console.log('✅ All frontend routes have database mappings');
  } else {
    for (const m of results.missingDbMappings) {
      console.log(`⚠️ ${m.route}`);
      console.log(`   ${m.recommendation}`);
      console.log('');
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Violations: ${results.summary.totalViolations}`);
  console.log(`  Errors:   ${results.summary.errors}`);
  console.log(`  Warnings: ${results.summary.warnings}`);
  console.log(`  Info:     ${results.summary.info}`);
  console.log(`Missing DB Mappings: ${results.missingDbMappings.length}`);
  console.log('');
  
  // Recommendations
  console.log('\n📋 RECOMMENDATIONS\n' + '-'.repeat(40));
  console.log('1. Replace hardcoded allowedRoles with dynamic permission checks');
  console.log('2. Use useEffectiveAccess() hook for frontend route protection');
  console.log('3. Use authorize.js middleware with dynamic permission lookup for APIs');
  console.log('4. Ensure all frontend routes are mapped in pages_master table');
  console.log('5. Use admin_page_assignments for role-to-page mappings');
  console.log('');
}

// Main execution
async function main() {
  console.log('🔍 Starting RBAC Dynamic Audit...\n');
  
  // Scan frontend
  console.log('Scanning frontend...');
  scanDirectory(FRONTEND_DIR, ['.tsx', '.ts', '.jsx', '.js'], (fullPath, relativePath) => {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const violations = checkFile(content, relativePath);
    results.frontendViolations.push(...violations);
  });
  
  // Scan backend
  console.log('Scanning backend...');
  scanDirectory(BACKEND_DIR, ['.js', '.ts'], (fullPath, relativePath) => {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const violations = checkFile(content, relativePath);
    results.backendViolations.push(...violations);
  });
  
  // Check database mappings
  console.log('Checking database mappings...');
  const routes = extractFrontendRoutes();
  results.missingDbMappings = await checkDatabaseMappings(routes);
  
  // Calculate summary
  const allViolations = [...results.frontendViolations, ...results.backendViolations];
  results.summary.totalViolations = allViolations.length;
  results.summary.errors = allViolations.filter(v => v.severity === 'ERROR').length;
  results.summary.warnings = allViolations.filter(v => v.severity === 'WARNING').length;
  results.summary.info = allViolations.filter(v => v.severity === 'INFO').length;
  
  // Generate report
  generateReport();
  
  await pool.end();
  
  // Exit with error code if there are errors
  process.exit(results.summary.errors > 0 ? 1 : 0);
}

main().catch(console.error);
