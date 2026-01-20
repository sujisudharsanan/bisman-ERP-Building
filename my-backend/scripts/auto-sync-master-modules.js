/**
 * Auto-Update Master Modules from PAGE_REGISTRY
 * 
 * This script reads PAGE_REGISTRY and updates master-modules.js
 * to ensure all pages are mapped correctly.
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_REGISTRY = path.join(__dirname, '../../my-frontend/src/common/config/page-registry.ts');
const MASTER_MODULES = path.join(__dirname, '../config/master-modules.js');

// Parse PAGE_REGISTRY
function parsePageRegistry() {
  const content = fs.readFileSync(FRONTEND_REGISTRY, 'utf8');
  const pages = [];
  const lines = content.split('\n');
  let currentPage = {};
  
  for (const line of lines) {
    const idMatch = line.match(/^\s*id:\s*['"]([^'"]+)['"]/);
    const nameMatch = line.match(/^\s*name:\s*['"]([^'"]+)['"]/);
    const pathMatch = line.match(/^\s*path:\s*['"]([^'"]+)['"]/);
    const moduleMatch = line.match(/^\s*module:\s*['"]([^'"]+)['"]/);
    
    if (idMatch) currentPage.id = idMatch[1];
    if (nameMatch) currentPage.name = nameMatch[1];
    if (pathMatch) currentPage.path = pathMatch[1];
    if (moduleMatch) {
      currentPage.module = moduleMatch[1];
      if (currentPage.id && currentPage.name && currentPage.path) {
        pages.push({ ...currentPage });
      }
      currentPage = {};
    }
  }
  
  return pages;
}

// Group pages by module
function groupByModule(pages) {
  const groups = {};
  for (const page of pages) {
    const mod = page.module || 'unknown';
    if (!groups[mod]) groups[mod] = [];
    groups[mod].push(page);
  }
  return groups;
}

// Generate new master-modules.js content
function generateMasterModules(groupedPages) {
  const moduleConfigs = [];
  
  // Define module metadata
  const moduleMetadata = {
    'dashboard': { name: 'Dashboard', description: 'Main dashboard access', icon: 'FiLayout', category: 'Common', alwaysAccessible: true },
    'common': { name: 'Common Module', description: 'Pages available to all users', icon: 'FiUser', category: 'Common', alwaysAccessible: true },
    'chat': { name: 'Chat & Communication', description: 'Real-time messaging', icon: 'FiMessageSquare', category: 'Communication', alwaysAccessible: true },
    'finance': { name: 'Finance Module', description: 'Complete financial management', icon: 'FiDollarSign', category: 'Finance', businessCategory: 'Business ERP' },
    'operations': { name: 'Operations Module', description: 'Warehouse and inventory management', icon: 'FiPackage', category: 'Operations', businessCategory: 'Business ERP' },
    'procurement': { name: 'Procurement Module', description: 'Purchase orders and vendor management', icon: 'FiShoppingCart', category: 'Procurement', businessCategory: 'Business ERP' },
    'compliance': { name: 'Compliance & Legal', description: 'Regulatory compliance and legal', icon: 'FiShield', category: 'Compliance', businessCategory: 'Business ERP' },
    'hr': { name: 'Human Resources', description: 'HR management', icon: 'FiUsers', category: 'HR', businessCategory: 'Business ERP' },
    'billing': { name: 'Billing & Subscription', description: 'Subscription management', icon: 'FiCreditCard', category: 'Billing' },
    'admin': { name: 'Admin Console', description: 'Platform administration', icon: 'FiSettings', category: 'Admin' },
    'super-admin': { name: 'Super Admin', description: 'Super Admin management', icon: 'FiShield', category: 'Admin' },
    'enterprise-admin': { name: 'Enterprise Admin', description: 'Enterprise-wide administration', icon: 'FiGlobe', category: 'Admin' },
    'system': { name: 'System Administration', description: 'System-level management', icon: 'FiServer', category: 'System' },
    'governance': { name: 'Governance', description: 'Security and compliance governance', icon: 'FiLock', category: 'Governance' },
    'task-management': { name: 'Task Management', description: 'Task workflows and approvals', icon: 'FiCheckSquare', category: 'Operations' },
    'analytics': { name: 'Analytics', description: 'Business analytics and reporting', icon: 'FiBarChart', category: 'Analytics' },
    'internal': { name: 'Internal Tools', description: 'Internal support tools', icon: 'FiTool', category: 'Internal' },
    'qa': { name: 'QA & Testing', description: 'Quality assurance tools', icon: 'FiClipboard', category: 'QA' },
    'pump-management': { name: 'Pump Management', description: 'Pump operations', icon: 'FiActivity', category: 'Industry' },
    'sales': { name: 'Sales', description: 'Sales and CRM', icon: 'FiTrendingUp', category: 'Sales' },
    'production': { name: 'Production', description: 'Manufacturing and production', icon: 'FiBox', category: 'Production' },
    'shipping': { name: 'Shipping', description: 'Shipping and logistics', icon: 'FiTruck', category: 'Logistics' },
    'assets': { name: 'Assets', description: 'Asset management', icon: 'FiArchive', category: 'Assets' },
    'inventory': { name: 'Inventory', description: 'Inventory management', icon: 'FiPackage', category: 'Operations' },
    'unknown': { name: 'Miscellaneous', description: 'Uncategorized pages', icon: 'FiFile', category: 'Other' }
  };
  
  for (const [moduleKey, pages] of Object.entries(groupedPages)) {
    const meta = moduleMetadata[moduleKey] || moduleMetadata['unknown'];
    
    const pagesArray = pages.map(p => 
      `      { id: '${p.id}', name: '${p.name.replace(/'/g, "\\'")}', path: '${p.path}' }`
    ).join(',\n');
    
    const alwaysAccessible = meta.alwaysAccessible ? '\n    alwaysAccessible: true,' : '';
    const businessCategory = meta.businessCategory ? `\n    businessCategory: '${meta.businessCategory}',` : '';
    
    moduleConfigs.push(`  {
    id: '${moduleKey}',
    name: '${meta.name}',
    description: '${meta.description}',
    icon: '${meta.icon}',
    category: '${meta.category}',${businessCategory}${alwaysAccessible}
    pages: [
${pagesArray}
    ],
  }`);
  }
  
  return `// Master Module and Page Configuration
// Auto-generated from PAGE_REGISTRY on ${new Date().toISOString()}
// Total Modules: ${Object.keys(groupedPages).length}
// Total Pages: ${Object.values(groupedPages).flat().length}

const MASTER_MODULES = [
${moduleConfigs.join(',\n')}
];

module.exports = { MASTER_MODULES };
`;
}

// Main
function main() {
  console.log('🔄 Auto-updating master-modules.js from PAGE_REGISTRY...\n');
  
  const registryPages = parsePageRegistry();
  console.log(`✅ Parsed ${registryPages.length} pages from PAGE_REGISTRY`);
  
  const groupedPages = groupByModule(registryPages);
  console.log(`✅ Found ${Object.keys(groupedPages).length} modules`);
  
  for (const [mod, pages] of Object.entries(groupedPages)) {
    console.log(`   - ${mod}: ${pages.length} pages`);
  }
  
  // Generate new content
  const newContent = generateMasterModules(groupedPages);
  
  // Backup old file
  const backupPath = MASTER_MODULES + '.backup.' + Date.now();
  fs.copyFileSync(MASTER_MODULES, backupPath);
  console.log(`\n📦 Backed up old file to: ${path.basename(backupPath)}`);
  
  // Write new file
  fs.writeFileSync(MASTER_MODULES, newContent);
  console.log(`✅ Updated master-modules.js with ${registryPages.length} pages`);
  
  console.log('\n🎉 Done! Restart backend to apply changes.');
}

main();
