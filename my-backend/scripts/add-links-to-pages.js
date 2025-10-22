/**
 * Add Navigation Links to All Pages Script
 * 
 * This script adds breadcrumb navigation and related links to all ERP pages
 */

const fs = require('fs');
const path = require('path');

// Frontend directory
const frontendDir = path.join(__dirname, '../../my-frontend');
const appDir = path.join(frontendDir, 'src/app');

// Link component template
const LINK_IMPORT = `import Link from 'next/link';`;

// Breadcrumb component to add
const BREADCRUMB_COMPONENT = `
// Breadcrumb Navigation Component
function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
          >
            <svg className="w-3 h-3 mr-2.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
            </svg>
            Dashboard
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              <svg className="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              {item.href ? (
                <Link
                  href={item.href}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2 dark:text-gray-400 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
`;

// Quick Links component
const QUICK_LINKS_COMPONENT = `
// Quick Links Component
function QuickLinks({ links }: { links: Array<{ label: string; href: string; icon?: React.ReactNode }> }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">Quick Links</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link, index) => (
          <Link
            key={index}
            href={link.href}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-white dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
          >
            {link.icon && <span className="mr-1.5">{link.icon}</span>}
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
`;

/**
 * Get module name from path
 */
function getModuleName(filePath) {
  const relativePath = path.relative(appDir, filePath);
  const parts = relativePath.split(path.sep);
  
  if (parts[0] === 'system') return 'System';
  if (parts[0] === 'finance') return 'Finance';
  if (parts[0] === 'operations') return 'Operations';
  if (parts[0] === 'compliance') return 'Compliance';
  if (parts[0] === 'procurement') return 'Procurement';
  
  return 'Dashboard';
}

/**
 * Get page name from path
 */
function getPageName(filePath) {
  const relativePath = path.relative(appDir, filePath);
  const parts = relativePath.split(path.sep);
  const folder = parts[parts.length - 2];
  
  return folder
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get related links based on module
 */
function getRelatedLinks(moduleName) {
  const links = {
    'System': [
      { label: 'User Management', href: '/system/user-management' },
      { label: 'System Settings', href: '/system/system-settings' },
      { label: 'Audit Logs', href: '/system/audit-logs' },
      { label: 'Roles & Users Report', href: '/system/roles-users-report' },
    ],
    'Finance': [
      { label: 'General Ledger', href: '/finance/general-ledger' },
      { label: 'Accounts Payable', href: '/finance/accounts-payable-summary' },
      { label: 'Accounts Receivable', href: '/finance/accounts-receivable-summary' },
      { label: 'Executive Dashboard', href: '/finance/executive-dashboard' },
    ],
    'Operations': [
      { label: 'Inventory Management', href: '/operations/inventory-management' },
      { label: 'KPI Dashboard', href: '/operations/kpi-dashboard' },
    ],
    'Compliance': [
      { label: 'Compliance Dashboard', href: '/compliance/compliance-dashboard' },
      { label: 'Legal Case Management', href: '/compliance/legal-case-management' },
    ],
    'Procurement': [
      { label: 'Purchase Orders', href: '/procurement/purchase-orders' },
    ],
  };
  
  return links[moduleName] || [];
}

/**
 * Check if file already has Link import
 */
function hasLinkImport(content) {
  return /import\s+Link\s+from\s+['"]next\/link['"]/.test(content);
}

/**
 * Check if file already has Breadcrumb component
 */
function hasBreadcrumb(content) {
  return /function Breadcrumb/.test(content) || /<Breadcrumb/.test(content);
}

/**
 * Add links to a page file
 */
function addLinksToPage(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip if already has breadcrumb
    if (hasBreadcrumb(content)) {
      return { modified: false, reason: 'Already has breadcrumb' };
    }
    
    // Skip non-client components
    if (!content.includes("'use client'")) {
      return { modified: false, reason: 'Not a client component' };
    }
    
    // Skip if too small (likely a redirect or simple page)
    if (content.length < 1000) {
      return { modified: false, reason: 'File too small' };
    }
    
    const moduleName = getModuleName(filePath);
    const pageName = getPageName(filePath);
    const relatedLinks = getRelatedLinks(moduleName);
    
    // Add Link import if not present
    if (!hasLinkImport(content)) {
      content = content.replace(
        /(import React.*from 'react';)/,
        `$1\n${LINK_IMPORT}`
      );
    }
    
    // Add Breadcrumb and QuickLinks components before the main export
    const breadcrumbInsertPoint = content.lastIndexOf('export default function');
    if (breadcrumbInsertPoint > 0) {
      content = 
        content.slice(0, breadcrumbInsertPoint) +
        BREADCRUMB_COMPONENT +
        '\n' +
        QUICK_LINKS_COMPONENT +
        '\n' +
        content.slice(breadcrumbInsertPoint);
    }
    
    // Add breadcrumb usage after the page header
    const breadcrumbUsage = `
        {/* Breadcrumb Navigation */}
        <Breadcrumb items={[
          { label: '${moduleName}', href: '/${moduleName.toLowerCase()}' },
          { label: '${pageName}' }
        ]} />
`;

    const quickLinksUsage = `
        {/* Quick Links */}
        ${relatedLinks.length > 0 ? `<QuickLinks links={${JSON.stringify(relatedLinks)}} />` : ''}
`;
    
    // Insert after the page header div
    if (content.includes('<div className="space-y-6">')) {
      content = content.replace(
        /(<div className="space-y-6">)/,
        `$1\n${breadcrumbUsage}\n${quickLinksUsage}`
      );
    }
    
    // Write back
    fs.writeFileSync(filePath, content);
    
    return { modified: true, reason: 'Links added successfully' };
    
  } catch (error) {
    return { modified: false, reason: `Error: ${error.message}` };
  }
}

/**
 * Find all page files
 */
function findPageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== '_templates') {
        findPageFiles(filePath, fileList);
      }
    } else if (file === 'page.tsx') {
      // Only add system module pages for now
      if (filePath.includes('/system/')) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Main execution
 */
function main() {
  console.log('🔗 Adding navigation links to all pages...\n');
  
  const pageFiles = findPageFiles(appDir);
  console.log(`Found ${pageFiles.length} system module page files to process\n`);
  
  let modified = 0;
  let skipped = 0;
  const results = [];
  
  pageFiles.forEach(filePath => {
    const relativePath = path.relative(appDir, filePath);
    console.log(`Processing: ${relativePath}`);
    
    const result = addLinksToPage(filePath);
    results.push({ path: relativePath, ...result });
    
    if (result.modified) {
      console.log(`  ✅ ${result.reason}\n`);
      modified++;
    } else {
      console.log(`  ⏭️  ${result.reason}\n`);
      skipped++;
    }
  });
  
  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Modified: ${modified}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📄 Total: ${pageFiles.length}`);
  console.log();
  
  // Show what was added
  if (modified > 0) {
    console.log('📝 Added components to each page:');
    console.log('   • Breadcrumb navigation (Dashboard > Module > Page)');
    console.log('   • Quick Links to related pages');
    console.log('   • Next.js Link imports for client-side navigation');
    console.log();
  }
  
  console.log('💡 Benefits:');
  console.log('   • Better user navigation');
  console.log('   • Quick access to related pages');
  console.log('   • Improved UX with breadcrumbs');
  console.log('   • SEO-friendly internal linking');
  console.log();
}

if (require.main === module) {
  main();
}

module.exports = { addLinksToPage, findPageFiles };
