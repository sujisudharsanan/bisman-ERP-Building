#!/usr/bin/env node
/* eslint-disable no-console, no-undef */

/**
 * BISMAN ERP - Module to Page Mapping Report
 * 
 * This script analyzes which pages are mapped to modules and which are not.
 */

const fs = require('fs');
const path = require('path');

// Read master-modules - use path.join for proper resolution
const masterModulesPath = path.join(__dirname, '../../my-backend/config/master-modules.js');
const { MASTER_MODULES } = require(masterModulesPath);

// Extract all paths from modules
const modulePaths = new Map();
const allModulePaths = new Set();

MASTER_MODULES.forEach(mod => {
  const paths = mod.pages.map(p => p.path);
  modulePaths.set(mod.id, { name: mod.name, paths, category: mod.category, alwaysAccessible: mod.alwaysAccessible });
  paths.forEach(p => allModulePaths.add(p));
});

// Read page-registry.ts
const registryPath = path.join(__dirname, '../src/common/config/page-registry.ts');
const registryContent = fs.readFileSync(registryPath, 'utf-8');
const pathRegex = /path:\s*['"]([^'"]+)['"]/g;
const registeredPaths = new Set();
let match;
while ((match = pathRegex.exec(registryContent)) !== null) {
  if (match[1] !== 'string' && match[1].startsWith('/')) {
    registeredPaths.add(match[1]);
  }
}

// Find registered pages not in any module
const unmappedPages = [];
registeredPaths.forEach(p => {
  if (!allModulePaths.has(p)) {
    unmappedPages.push(p);
  }
});

// Group unmapped pages by prefix
const groupedUnmapped = {};
unmappedPages.forEach(p => {
  const parts = p.split('/').filter(Boolean);
  const prefix = parts[0] || 'root';
  if (!groupedUnmapped[prefix]) {
    groupedUnmapped[prefix] = [];
  }
  groupedUnmapped[prefix].push(p);
});

// Print report
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('              BISMAN ERP - MODULE TO PAGE MAPPING REPORT');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');
console.log('📊 SUMMARY:');
console.log('   Total Modules: ' + MASTER_MODULES.length);
console.log('   Total Pages in Modules: ' + allModulePaths.size);
console.log('   Total Registered Pages: ' + registeredPaths.size);
console.log('   Pages NOT in any Module: ' + unmappedPages.length);
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('              PAGES NOT MAPPED TO ANY MODULE (' + unmappedPages.length + ')');
console.log('═══════════════════════════════════════════════════════════════════════');

Object.keys(groupedUnmapped).sort().forEach(prefix => {
  const pages = groupedUnmapped[prefix];
  console.log('');
  console.log('📁 /' + prefix + '/ (' + pages.length + ' pages)');
  pages.sort().forEach(p => console.log('   ❌ ' + p));
});

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('                     MODULES WITH THEIR PAGES');
console.log('═══════════════════════════════════════════════════════════════════════');

MASTER_MODULES.forEach(mod => {
  console.log('');
  const accessLabel = mod.alwaysAccessible ? ' [ALWAYS ACCESSIBLE]' : '';
  console.log('📦 ' + mod.name + ' (' + mod.id + ') - ' + mod.pages.length + ' pages' + accessLabel);
  console.log('   Category: ' + mod.category);
  mod.pages.forEach(p => {
    const inRegistry = registeredPaths.has(p.path) ? '✓' : '⚠️ NOT IN REGISTRY';
    console.log('     ' + inRegistry + ' ' + p.path);
  });
});

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('                         RECOMMENDATIONS');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');
console.log('1. Add unmapped pages to appropriate modules in master-modules.js');
console.log('2. Pages marked with ⚠️ need to be added to page-registry.ts');
console.log('3. Consider creating new modules for groups of related pages');
console.log('');
