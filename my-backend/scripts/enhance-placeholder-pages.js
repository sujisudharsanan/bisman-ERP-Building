/**
 * Enhanced Page Content Generator
 * 
 * This script automatically enhances placeholder pages with proper content
 * based on the page's module and purpose
 */

const fs = require('fs');
const path = require('path');

// Page enhancement templates
const PAGE_TEMPLATES = {
  system: {
    layout: 'SuperAdminShell',
    features: ['Data table', 'Search & filter', 'CRUD operations', 'Export functionality'],
  },
  finance: {
    layout: 'DashboardLayout',
    features: ['Financial metrics', 'Charts & graphs', 'Reports', 'Transaction history'],
  },
  operations: {
    layout: 'DashboardLayout',
    features: ['Operational metrics', 'Task management', 'Real-time updates', 'Status tracking'],
  },
  compliance: {
    layout: 'DashboardLayout',
    features: ['Compliance status', 'Document management', 'Audit trails', 'Reporting'],
  },
  procurement: {
    layout: 'DashboardLayout',
    features: ['Purchase orders', 'Vendor management', 'Inventory tracking', 'Approvals'],
  },
};

/**
 * Generate enhanced page content
 */
function generateEnhancedPageContent(pageName, module, route) {
  const template = PAGE_TEMPLATES[module] || PAGE_TEMPLATES.system;
  const titleCase = pageName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return `'use client';

import React, { useState, useEffect } from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import { 
  Search,
  Download,
  Plus,
  Filter,
  RefreshCw,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface ${pageName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Data {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export default function ${pageName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Page() {
  const [data, setData] = useState<${pageName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Data[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/${module}/${route}');
      // const result = await response.json();
      // setData(result.data);
      
      // Mock data for now
      setTimeout(() => {
        setData([
          {
            id: '1',
            name: 'Sample Item 1',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'Sample Item 2',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting data...');
  };

  const handleCreate = () => {
    // TODO: Implement create functionality
    console.log('Creating new item...');
  };

  return (
    <SuperAdminShell title="${titleCase}">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ${titleCase}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage and monitor ${titleCase.toLowerCase()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data.filter(item => item.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {data.filter(item => item.status === 'pending').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {data.filter(item => item.status === 'inactive').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
              
              <button
                onClick={fetchData}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Data Found
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Get started by creating your first item'}
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {item.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={\`px-2 inline-flex text-xs leading-5 font-semibold rounded-full \${
                          item.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : item.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }\`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">
                          View
                        </button>
                        <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Feature Implementation Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Implementation Required
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p className="mb-2">This page is displaying mock data. To complete the implementation:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Connect to backend API endpoint: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/api/${module}/${route}</code></li>
                  <li>Implement CRUD operations (Create, Read, Update, Delete)</li>
                  <li>Add form validation and error handling</li>
                  <li>Implement export functionality (CSV/Excel)</li>
                  <li>Add pagination and sorting</li>
                  <li>Customize columns and fields based on requirements</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
`;
}

/**
 * Main execution
 */
function main() {
  const reportPath = path.join(__dirname, '../reports/page-content-analysis.json');
  
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Please run analyze-pages-content.js first to generate the report');
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const placeholderPages = report.categories.placeholder.filter(page => 
    page.path.includes('system/') && 
    !page.path.includes('pages-roles-report') &&
    !page.path.includes('about-me')
  );

  console.log('🚀 Enhancing placeholder pages...\n');
  console.log(`Found ${placeholderPages.length} system pages to enhance\n`);

  let enhanced = 0;
  let skipped = 0;

  placeholderPages.forEach(page => {
    const pagePath = path.join(__dirname, '../../my-frontend/src/app', page.path);
    const route = page.path.replace(/\/page\.tsx$/, '').replace(/^system\//, '');
    const pageName = route;
    const module = 'system';

    console.log(`📝 Enhancing: ${page.path}`);
    console.log(`   Route: ${route}`);
    
    try {
      const newContent = generateEnhancedPageContent(pageName, module, route);
      
      // Create backup
      const backupPath = pagePath + '.backup';
      fs.copyFileSync(pagePath, backupPath);
      
      // Write new content
      fs.writeFileSync(pagePath, newContent);
      
      console.log(`   ✅ Enhanced successfully (backup saved)\n`);
      enhanced++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      skipped++;
    }
  });

  console.log('='.repeat(80));
  console.log(`\n📊 Enhancement Summary:`);
  console.log(`   ✅ Enhanced: ${enhanced}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review the enhanced pages in your frontend`);
  console.log(`   2. Connect each page to its backend API endpoint`);
  console.log(`   3. Customize the data structure and UI as needed`);
  console.log(`   4. Test authentication and authorization`);
  console.log();
}

if (require.main === module) {
  main();
}

module.exports = { generateEnhancedPageContent };
