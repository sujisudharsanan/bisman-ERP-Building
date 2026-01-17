#!/usr/bin/env node
/* eslint-disable no-console, no-undef */

/**
 * Find missing page files from master-modules.js
 */

const fs = require('fs');
const path = require('path');

const masterModulesPath = path.join(__dirname, '../../my-backend/config/master-modules.js');
const { MASTER_MODULES } = require(masterModulesPath);

const APP_DIR = path.join(__dirname, '../src/app');

// Collect all module paths
const allModulePaths = [];
MASTER_MODULES.forEach(mod => {
  mod.pages.forEach(p => allModulePaths.push(p.path));
});

// Check which don't have files
const missing = [];
allModulePaths.forEach(pagePath => {
  // Skip chat pages
  if (pagePath.startsWith('/chat')) return;
  
  let found = false;
  const checkPath = path.join(APP_DIR, pagePath, 'page.tsx');
  if (fs.existsSync(checkPath)) found = true;
  
  // Check in route groups
  if (!found) {
    ['(dashboard)', '(public)', '(auth)'].forEach(group => {
      const groupPath = path.join(APP_DIR, group, pagePath, 'page.tsx');
      if (fs.existsSync(groupPath)) found = true;
    });
  }
  
  if (!found) missing.push(pagePath);
});

// Output unique missing paths
const unique = [...new Set(missing)].sort();
console.log('Missing page files (' + unique.length + '):');
unique.forEach(p => console.log(p));
