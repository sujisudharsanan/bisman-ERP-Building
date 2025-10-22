#!/usr/bin/env node

/**
 * Export Page Registry to JSON
 * 
 * This script exports the page registry from TypeScript to JSON format
 * for AI tools, documentation, and external integrations.
 * 
 * Output: my-frontend/public/layout_registry.json
 * 
 * Usage: node scripts/export-page-registry.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const FRONTEND_ROOT = path.join(__dirname, '../../my-frontend');
const REGISTRY_PATH = path.join(FRONTEND_ROOT, 'src/common/config/page-registry.ts');
const OUTPUT_PATH = path.join(FRONTEND_ROOT, 'public/layout_registry.json');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

console.log(`\n${colors.blue}📦 Exporting Page Registry to JSON...${colors.reset}\n`);

try {
  // Read the TypeScript file
  const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  
  // Extract PAGE_REGISTRY array
  const registryMatch = content.match(/export const PAGE_REGISTRY[^=]*=\s*\[([\s\S]*?)\]\s*;/);
  
  if (!registryMatch) {
    throw new Error('Could not find PAGE_REGISTRY in file');
  }
  
  // Parse entries - simplified extraction
  const pages = [];
  const entryRegex = /\{\s*id:\s*['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = entryRegex.exec(registryMatch[1])) !== null) {
    pages.push({ id: match[1] });
  }
  
  // Extract more details with regex patterns
  const fullEntries = registryMatch[1].split(/\},\s*\{/);
  const detailedPages = fullEntries.map((entry) => {
    const page = {};
    
    // Extract fields
    const idMatch = entry.match(/id:\s*['"]([^'"]+)['"]/);
    const nameMatch = entry.match(/name:\s*['"]([^'"]+)['"]/);
    const pathMatch = entry.match(/path:\s*['"]([^'"]+)['"]/);
    const moduleMatch = entry.match(/module:\s*['"]([^'"]+)['"]/);
    const statusMatch = entry.match(/status:\s*['"]([^'"]+)['"]/);
    const descMatch = entry.match(/description:\s*['"]([^'"]+)['"]/);
    const orderMatch = entry.match(/order:\s*(\d+)/);
    
    // Extract arrays
    const permMatch = entry.match(/permissions:\s*\[([\s\S]*?)\]/);
    const rolesMatch = entry.match(/roles:\s*\[([\s\S]*?)\]/);
    
    if (idMatch) page.id = idMatch[1];
    if (nameMatch) page.name = nameMatch[1];
    if (pathMatch) page.path = pathMatch[1];
    if (moduleMatch) page.module = moduleMatch[1];
    if (statusMatch) page.status = statusMatch[1];
    if (descMatch) page.description = descMatch[1];
    if (orderMatch) page.order = parseInt(orderMatch[1]);
    
    if (permMatch) {
      page.permissions = permMatch[1]
        .match(/['"]([^'"]+)['"]/g)
        ?.map(s => s.replace(/['"]/g, '')) || [];
    }
    
    if (rolesMatch) {
      page.roles = rolesMatch[1]
        .match(/['"]([^'"]+)['"]/g)
        ?.map(s => s.replace(/['"]/g, '')) || [];
    }
    
    return page;
  }).filter(p => p.id); // Only include entries with an id
  
  // Extract MODULE definitions
  const modulesMatch = content.match(/export const MODULES[^=]*=\s*\{([\s\S]*?)\};/);
  const modules = {};
  
  if (modulesMatch) {
    const moduleEntries = modulesMatch[1].split(/\},\s*[a-z]+:/);
    moduleEntries.forEach((entry) => {
      const idMatch = entry.match(/['"']?([a-z]+)['"']?:\s*\{/);
      const nameMatch = entry.match(/name:\s*['"]([^'"]+)['"]/);
      const descMatch = entry.match(/description:\s*['"]([^'"]+)['"]/);
      const orderMatch = entry.match(/order:\s*(\d+)/);
      
      if (idMatch && nameMatch) {
        const moduleId = idMatch[1];
        modules[moduleId] = {
          id: moduleId,
          name: nameMatch[1],
          description: descMatch ? descMatch[1] : '',
          order: orderMatch ? parseInt(orderMatch[1]) : 0
        };
      }
    });
  }
  
  // Build output structure
  const output = {
    meta: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      source: 'my-frontend/src/common/config/page-registry.ts',
      generator: 'scripts/export-page-registry.js'
    },
    statistics: {
      totalPages: detailedPages.length,
      totalModules: Object.keys(modules).length,
      pagesByModule: {},
      pagesByStatus: {
        active: detailedPages.filter(p => p.status === 'active').length,
        'coming-soon': detailedPages.filter(p => p.status === 'coming-soon').length,
        disabled: detailedPages.filter(p => p.status === 'disabled').length
      }
    },
    modules: modules,
    pages: detailedPages
  };
  
  // Calculate pages by module
  detailedPages.forEach(page => {
    if (page.module) {
      output.statistics.pagesByModule[page.module] = 
        (output.statistics.pagesByModule[page.module] || 0) + 1;
    }
  });
  
  // Write JSON file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  
  // Success output
  console.log(`${colors.green}✅ Successfully exported page registry!${colors.reset}`);
  console.log(`${colors.blue}📄 Output file:${colors.reset} ${OUTPUT_PATH}`);
  console.log(`\n${colors.blue}📊 Statistics:${colors.reset}`);
  console.log(`   Total Pages: ${output.statistics.totalPages}`);
  console.log(`   Total Modules: ${output.statistics.totalModules}`);
  console.log(`\n${colors.blue}📦 Pages by Module:${colors.reset}`);
  Object.entries(output.statistics.pagesByModule).forEach(([module, count]) => {
    console.log(`   ${module}: ${count} pages`);
  });
  console.log(`\n${colors.blue}📊 Pages by Status:${colors.reset}`);
  Object.entries(output.statistics.pagesByStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count} pages`);
  });
  console.log(`\n${colors.yellow}💡 This file can be used by AI tools and documentation generators${colors.reset}\n`);
  
} catch (error) {
  console.error(`${colors.red}❌ Error exporting page registry:${colors.reset}`, error.message);
  process.exit(1);
}
