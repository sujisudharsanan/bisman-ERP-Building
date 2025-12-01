#!/usr/bin/env node

/**
 * Bulk Page Creator
 * Creates missing page files from the consistency report
 * 
 * Usage: 
 *   node create-missing-pages.js --module system
 *   node create-missing-pages.js --module finance
 *   node create-missing-pages.js --all (create all missing pages)
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.join(__dirname, '../my-frontend');
const APP_DIR = path.join(FRONTEND_ROOT, 'src/app');

// Page template
function generatePageTemplate(moduleName, pageName, pagePath) {
  const componentName = pageName
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  return `'use client';

import React from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';

export default function ${componentName}Page() {
  return (
    <SuperAdminShell title="${pageName}">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ${pageName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              ${getModuleDescription(moduleName)}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Page Under Construction
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              This page is currently being developed. Please check back later.
            </p>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
`;
}

function getModuleDescription(moduleName) {
  const descriptions = {
    system: 'System administration and configuration',
    finance: 'Financial management and accounting',
    operations: 'Operations and inventory management',
    procurement: 'Procurement and supplier management',
    compliance: 'Compliance and regulatory management',
  };
  return descriptions[moduleName] || 'Module management';
}

// Missing pages from the report
const missingPages = {
  system: [
    { path: 'user-management', name: 'User Management' },
    { path: 'audit-logs', name: 'Audit Logs' },
    { path: 'backup-restore', name: 'Backup & Restore' },
    { path: 'scheduler', name: 'Task Scheduler' },
    { path: 'system-health-dashboard', name: 'System Health' },
    { path: 'integration-settings', name: 'Integration Settings' },
    { path: 'error-logs', name: 'Error Logs' },
    { path: 'server-logs', name: 'Server Logs' },
    { path: 'deployment-tools', name: 'Deployment Tools' },
    { path: 'api-integration-config', name: 'API Configuration' },
    { path: 'company-setup', name: 'Company Setup' },
    { path: 'master-data-management', name: 'Master Data' },
    { path: 'about-me', name: 'About Me' },
  ],
  finance: [
    { path: 'financial-statements', name: 'Financial Statements' },
    { path: 'budgeting-forecasting', name: 'Budgeting & Forecasting' },
    { path: 'cash-flow-statement', name: 'Cash Flow Statement' },
    { path: 'company-dashboard', name: 'Company Dashboard' },
    { path: 'period-end-closing', name: 'Period End Closing' },
    { path: 'cost-center-analysis', name: 'Cost Center Analysis' },
    { path: 'journal-entries-approval', name: 'Journal Entry Approval' },
    { path: 'trial-balance', name: 'Trial Balance' },
    { path: 'journal-entries', name: 'Journal Entries' },
    { path: 'inter-company-reconciliation', name: 'Inter-Company Reconciliation' },
    { path: 'fixed-asset-register', name: 'Fixed Asset Register' },
    { path: 'tax-reports', name: 'Tax Reports' },
    { path: 'bank-reconciliation', name: 'Bank Reconciliation' },
    { path: 'cash-flow-forecast', name: 'Cash Flow Forecast' },
    { path: 'payment-gateway-integration', name: 'Payment Gateway' },
    { path: 'foreign-exchange-management', name: 'Foreign Exchange' },
    { path: 'loan-management', name: 'Loan Management' },
    { path: 'chart-of-accounts', name: 'Chart of Accounts' },
    { path: 'invoice-posting', name: 'Invoice Posting' },
    { path: 'period-end-adjustment-entries', name: 'Period Adjustments' },
    { path: 'purchase-invoice', name: 'Purchase Invoice' },
    { path: 'payment-entry', name: 'Payment Entry' },
    { path: 'vendor-master', name: 'Vendor Master' },
    { path: 'expense-report', name: 'Expense Report' },
    { path: 'payment-batch-processing', name: 'Batch Processing' },
    { path: 'payment-entry-view', name: 'Payment View' },
    { path: 'bank-statement-upload', name: 'Bank Statement Upload' },
    { path: 'bank-reconciliation-execute', name: 'Execute Reconciliation' },
    { path: 'payment-approval-queue', name: 'Payment Approval' },
    { path: 'about-me', name: 'About Me' },
  ],
  operations: [
    { path: 'stock-entry', name: 'Stock Entry' },
    { path: 'item-master-limited', name: 'Item Master' },
    { path: 'stock-ledger', name: 'Stock Ledger' },
    { path: 'delivery-note', name: 'Delivery Note' },
    { path: 'quality-inspection', name: 'Quality Inspection' },
    { path: 'sales-order', name: 'Sales Order' },
    { path: 'work-order', name: 'Work Order' },
    { path: 'bom-view', name: 'Bill of Materials' },
    { path: 'shipping-logistics', name: 'Shipping & Logistics' },
    { path: 'stock-entry-transfer', name: 'Stock Transfer' },
    { path: 'sales-order-view', name: 'Sales Order View' },
    { path: 'asset-register-hub', name: 'Asset Register' },
    { path: 'about-me', name: 'About Me' },
  ],
  procurement: [
    { path: 'purchase-order', name: 'Purchase Order' },
    { path: 'purchase-request', name: 'Purchase Request' },
    { path: 'supplier-quotation', name: 'Supplier Quotation' },
    { path: 'supplier-master', name: 'Supplier Master' },
    { path: 'material-request', name: 'Material Request' },
    { path: 'about-me', name: 'About Me' },
  ],
  compliance: [
    { path: 'audit-trail', name: 'Audit Trail' },
    { path: 'policy-management', name: 'Policy Management' },
    { path: 'regulatory-report-templates', name: 'Report Templates' },
    { path: 'approval-workflow-view', name: 'Approval Workflows' },
    { path: 'contract-management', name: 'Contract Management' },
    { path: 'litigation-tracker', name: 'Litigation Tracker' },
    { path: 'document-repository-view', name: 'Document Repository' },
    { path: 'vendor-customer-master-legal', name: 'Legal Master Data' },
    { path: 'about-me', name: 'About Me' },
  ],
};

function createPages(moduleName) {
  const pages = missingPages[moduleName];
  if (!pages) {
    console.log(`❌ Unknown module: ${moduleName}`);
    console.log(`Available modules: ${Object.keys(missingPages).join(', ')}`);
    return;
  }
  
  console.log(`\n📝 Creating ${pages.length} pages for ${moduleName} module...\n`);
  
  let created = 0;
  let skipped = 0;
  
  for (const page of pages) {
    const pagePath = path.join(APP_DIR, moduleName, page.path);
    const pageFile = path.join(pagePath, 'page.tsx');
    
    // Check if page already exists
    if (fs.existsSync(pageFile)) {
      console.log(`⏭️  Skipped: ${page.name} (already exists)`);
      skipped++;
      continue;
    }
    
    try {
      // Create directory
      fs.mkdirSync(pagePath, { recursive: true });
      
      // Create page file
      const content = generatePageTemplate(moduleName, page.name, page.path);
      fs.writeFileSync(pageFile, content);
      
      console.log(`✅ Created: ${moduleName}/${page.path}/page.tsx`);
      created++;
    } catch (error) {
      console.log(`❌ Failed: ${page.name} - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped\n`);
}

function createAllPages() {
  console.log('\n🚀 Creating ALL missing pages...\n');
  
  for (const moduleName of Object.keys(missingPages)) {
    createPages(moduleName);
  }
  
  console.log('✅ All modules processed!\n');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--all')) {
  createAllPages();
} else if (args.includes('--module')) {
  const moduleIndex = args.indexOf('--module');
  const moduleName = args[moduleIndex + 1];
  if (!moduleName) {
    console.log('❌ Please specify a module name');
    console.log('Usage: node create-missing-pages.js --module <module-name>');
    process.exit(1);
  }
  createPages(moduleName);
} else {
  console.log(`
📦 Bulk Page Creator

Usage:
  node create-missing-pages.js --module <module-name>
  node create-missing-pages.js --all

Available modules:
  - system (13 pages)
  - finance (30 pages)
  - operations (13 pages)
  - procurement (6 pages)
  - compliance (9 pages)

Examples:
  node create-missing-pages.js --module system
  node create-missing-pages.js --all
  `);
}
