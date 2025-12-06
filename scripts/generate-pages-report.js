#!/usr/bin/env node
/**
 * Pages & Modules Report Generator
 * Analyzes page registry and identifies unassigned/orphaned pages
 */

const fs = require('fs');
const path = require('path');

// Parse the page-registry.ts file
const registryPath = path.join(__dirname, '../my-frontend/src/common/config/page-registry.ts');
const content = fs.readFileSync(registryPath, 'utf-8');

// Extract MODULE definitions
const moduleMatch = content.match(/export const MODULES:\s*Record<string,\s*ModuleMetadata>\s*=\s*\{([\s\S]*?)\};/);
const modules = new Set();

if (moduleMatch) {
  const moduleContent = moduleMatch[1];
  // Extract module IDs from keys like: system: {, finance: {, 'pump-management': {
  const modulePattern = /['"]?([a-zA-Z-]+)['"]?\s*:\s*\{/g;
  let match;
  while ((match = modulePattern.exec(moduleContent)) !== null) {
    modules.add(match[1]);
  }
}

console.log('Found modules:', [...modules]);

// Extract all pages from PAGE_REGISTRY
const pages = [];
const pagePattern = /\{\s*id:\s*['"]([^'"]+)['"]/g;
let pageMatch;
const pageStartIndex = content.indexOf('export const PAGE_REGISTRY');

if (pageStartIndex !== -1) {
  const registryContent = content.substring(pageStartIndex);
  
  // Parse each page object
  const pageBlocks = registryContent.split(/\}\s*,\s*\{/).map((block, i) => {
    if (i === 0) return block.replace(/.*\[\s*\{/, '{');
    return '{' + block;
  });
  
  for (const block of pageBlocks) {
    const idMatch = block.match(/id:\s*['"]([^'"]+)['"]/);
    const nameMatch = block.match(/name:\s*['"]([^'"]+)['"]/);
    const pathMatch = block.match(/path:\s*['"]([^'"]+)['"]/);
    const moduleMatch = block.match(/module:\s*['"]([^'"]+)['"]/);
    const statusMatch = block.match(/status:\s*['"]([^'"]+)['"]/);
    const rolesMatch = block.match(/roles:\s*\[([^\]]*)\]/);
    const showInSidebarMatch = block.match(/showInSidebar:\s*(true|false)/);
    
    if (idMatch && pathMatch) {
      const roles = rolesMatch 
        ? rolesMatch[1].split(',').map(r => r.trim().replace(/['"]/g, '')).filter(Boolean)
        : [];
      
      pages.push({
        id: idMatch[1],
        name: nameMatch ? nameMatch[1] : idMatch[1],
        path: pathMatch[1],
        module: moduleMatch ? moduleMatch[1] : null,
        status: statusMatch ? statusMatch[1] : 'unknown',
        roles: roles,
        showInSidebar: showInSidebarMatch ? showInSidebarMatch[1] === 'true' : true,
      });
    }
  }
}

// Remove duplicates based on path
const uniquePages = [];
const seenPaths = new Set();
for (const page of pages) {
  if (!seenPaths.has(page.path)) {
    seenPaths.add(page.path);
    uniquePages.push(page);
  }
}

// Group pages by module
const byModule = {};
const unassigned = [];
const invalidModule = [];

for (const page of uniquePages) {
  if (!page.module || page.module === '' || page.module === 'null') {
    unassigned.push(page);
  } else if (!modules.has(page.module) && !['super-admin', 'enterprise-admin', 'task-management'].includes(page.module)) {
    invalidModule.push(page);
  } else {
    if (!byModule[page.module]) {
      byModule[page.module] = [];
    }
    byModule[page.module].push(page);
  }
}

// Generate Report
const reportDate = new Date().toISOString().split('T')[0];
let report = `# BISMAN ERP - Pages & Modules Report
Generated: ${new Date().toLocaleString()}

## Summary
- **Total Pages Found:** ${uniquePages.length}
- **Assigned to Modules:** ${uniquePages.length - unassigned.length - invalidModule.length}
- **Unassigned Pages:** ${unassigned.length}
- **Invalid Module Assignment:** ${invalidModule.length}
- **Total Modules:** ${modules.size}

---

## Pages by Module

`;

// Add known modules from the MODULES object
const knownModules = ['system', 'finance', 'procurement', 'operations', 'compliance', 'pump-management', 'hr', 'billing', 'admin', 'common'];
const allModules = [...new Set([...knownModules, ...Object.keys(byModule)])];

for (const mod of allModules.sort()) {
  const pages = byModule[mod] || [];
  report += `### ${mod.toUpperCase()} (${pages.length} pages)\n\n`;
  
  if (pages.length === 0) {
    report += `*No pages assigned to this module*\n\n`;
  } else {
    report += `| # | Page Name | Path | Status | Roles | Sidebar |\n`;
    report += `|---|-----------|------|--------|-------|--------|\n`;
    
    pages.forEach((p, i) => {
      const roles = p.roles.length > 0 ? p.roles.slice(0, 3).join(', ') + (p.roles.length > 3 ? '...' : '') : '-';
      const sidebar = p.showInSidebar ? '✅' : '❌';
      report += `| ${i + 1} | ${p.name} | \`${p.path}\` | ${p.status} | ${roles} | ${sidebar} |\n`;
    });
    report += `\n`;
  }
}

// Unassigned pages section
report += `---

## ⚠️ UNASSIGNED PAGES (${unassigned.length})

These pages have no module assignment and won't appear in any sidebar:

`;

if (unassigned.length === 0) {
  report += `*All pages are properly assigned to modules* ✅\n\n`;
} else {
  report += `| # | Page ID | Path | Status |\n`;
  report += `|---|---------|------|--------|\n`;
  unassigned.forEach((p, i) => {
    report += `| ${i + 1} | ${p.id} | \`${p.path}\` | ${p.status} |\n`;
  });
  report += `\n`;
}

// Invalid module section
report += `---

## ❌ INVALID MODULE ASSIGNMENT (${invalidModule.length})

These pages are assigned to modules that don't exist in the MODULES configuration:

`;

if (invalidModule.length === 0) {
  report += `*All module assignments are valid* ✅\n\n`;
} else {
  report += `| # | Page ID | Path | Invalid Module |\n`;
  report += `|---|---------|------|----------------|\n`;
  invalidModule.forEach((p, i) => {
    report += `| ${i + 1} | ${p.id} | \`${p.path}\` | ${p.module} |\n`;
  });
  report += `\n`;
}

// Status summary
report += `---

## Pages by Status

`;

const byStatus = {};
for (const page of uniquePages) {
  const status = page.status || 'unknown';
  if (!byStatus[status]) byStatus[status] = [];
  byStatus[status].push(page);
}

for (const [status, pages] of Object.entries(byStatus)) {
  const emoji = status === 'active' ? '🟢' : status === 'disabled' ? '🔴' : '⚪';
  report += `### ${emoji} ${status.toUpperCase()} (${pages.length} pages)\n\n`;
  pages.slice(0, 20).forEach(p => {
    report += `- \`${p.path}\` - ${p.name}\n`;
  });
  if (pages.length > 20) {
    report += `- ... and ${pages.length - 20} more\n`;
  }
  report += `\n`;
}

// Module count summary table
report += `---

## Module Assignment Summary

| Module | Pages Count | Active | Disabled |
|--------|-------------|--------|----------|
`;

for (const mod of allModules.sort()) {
  const pages = byModule[mod] || [];
  const active = pages.filter(p => p.status === 'active').length;
  const disabled = pages.filter(p => p.status === 'disabled').length;
  report += `| ${mod} | ${pages.length} | ${active} | ${disabled} |\n`;
}

// Save report
const reportPath = path.join(__dirname, '../docs/PAGES_MODULES_REPORT.md');
fs.writeFileSync(reportPath, report);
console.log(`\nReport saved to: ${reportPath}`);

// Also output to console
console.log('\n' + '='.repeat(60));
console.log(report);
