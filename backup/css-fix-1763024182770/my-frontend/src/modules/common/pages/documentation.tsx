'use client';

import React from 'react';
import { FileText, Download, Search } from 'lucide-react';

/**
 * Common Module - Documentation Page
 * Accessible to ALL authenticated users
 */
export default function DocumentationPage() {
  const docSections = [
    { id: 1, title: 'Getting Started Guide', category: 'Basics', pages: 12 },
    { id: 2, title: 'User Manual', category: 'Guides', pages: 45 },
    { id: 3, title: 'API Documentation', category: 'Technical', pages: 78 },
    { id: 4, title: 'Best Practices', category: 'Guides', pages: 23 },
    { id: 5, title: 'Troubleshooting Guide', category: 'Support', pages: 34 },
    { id: 6, title: 'Security Guidelines', category: 'Security', pages: 19 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Documentation
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive guides and references for BISMAN ERP
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Documentation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {docSections.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                <Download className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {doc.title}
              </h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{doc.category}</span>
                <span className="text-gray-500 dark:text-gray-500">{doc.pages} pages</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
