'use client';

import React, { useState } from 'react';
import { FolderOpen, Plus, Search, Eye, Download, Trash2, Upload, FileText, Image, File, Grid, List, Clock, User } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: 'PDF' | 'DOC' | 'XLS' | 'IMG' | 'OTHER';
  category: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  lastModified: string;
  version: string;
  status: 'Active' | 'Archived' | 'Draft' | 'Pending Approval';
  tags: string[];
}

export default function DocumentManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const documents: Document[] = [
    { id: 'DOC-001', name: 'Company Policy Manual 2025.pdf', type: 'PDF', category: 'Policies', size: '2.4 MB', uploadedBy: 'HR Admin', uploadedAt: '2025-01-10', lastModified: '2025-01-10', version: 'v2.1', status: 'Active', tags: ['policy', 'compliance'] },
    { id: 'DOC-002', name: 'Annual Financial Report Q4 2024.xlsx', type: 'XLS', category: 'Finance', size: '5.8 MB', uploadedBy: 'Finance Manager', uploadedAt: '2025-01-05', lastModified: '2025-01-08', version: 'v1.2', status: 'Active', tags: ['finance', 'report', 'quarterly'] },
    { id: 'DOC-003', name: 'Vendor Agreement Template.docx', type: 'DOC', category: 'Legal', size: '156 KB', uploadedBy: 'Legal Team', uploadedAt: '2024-11-20', lastModified: '2024-12-15', version: 'v3.0', status: 'Active', tags: ['legal', 'template', 'vendor'] },
    { id: 'DOC-004', name: 'Product Catalog 2025.pdf', type: 'PDF', category: 'Marketing', size: '12.5 MB', uploadedBy: 'Marketing Team', uploadedAt: '2025-01-12', lastModified: '2025-01-12', version: 'v1.0', status: 'Pending Approval', tags: ['marketing', 'catalog'] },
    { id: 'DOC-005', name: 'Employee Handbook.pdf', type: 'PDF', category: 'HR', size: '3.2 MB', uploadedBy: 'HR Manager', uploadedAt: '2024-06-01', lastModified: '2024-12-20', version: 'v4.2', status: 'Active', tags: ['hr', 'handbook', 'employee'] },
    { id: 'DOC-006', name: 'ISO 9001 Certificate.pdf', type: 'PDF', category: 'Compliance', size: '890 KB', uploadedBy: 'Quality Manager', uploadedAt: '2024-03-15', lastModified: '2024-03-15', version: 'v1.0', status: 'Active', tags: ['compliance', 'iso', 'certificate'] },
    { id: 'DOC-007', name: 'Safety Training Materials.pptx', type: 'OTHER', category: 'Training', size: '8.5 MB', uploadedBy: 'Safety Officer', uploadedAt: '2024-09-10', lastModified: '2024-11-05', version: 'v2.0', status: 'Archived', tags: ['training', 'safety'] },
    { id: 'DOC-008', name: 'Office Layout Blueprint.png', type: 'IMG', category: 'Facilities', size: '4.1 MB', uploadedBy: 'Admin', uploadedAt: '2024-08-22', lastModified: '2024-08-22', version: 'v1.0', status: 'Active', tags: ['facilities', 'layout'] },
  ];

  const categories = ['Policies', 'Finance', 'Legal', 'Marketing', 'HR', 'Compliance', 'Training', 'Facilities'];

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: documents.length,
    active: documents.filter(d => d.status === 'Active').length,
    pending: documents.filter(d => d.status === 'Pending Approval').length,
    archived: documents.filter(d => d.status === 'Archived').length
  };

  const getFileIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      PDF: <FileText className="w-5 h-5 text-red-500" />,
      DOC: <FileText className="w-5 h-5 text-blue-500" />,
      XLS: <FileText className="w-5 h-5 text-green-500" />,
      IMG: <Image className="w-5 h-5 text-purple-500" />,
      OTHER: <File className="w-5 h-5 text-gray-500" />
    };
    return icons[type] || icons.OTHER;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Archived: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      Draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Pending Approval': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-amber-600" />Document Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Centralized document storage and management system</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
          <Upload className="w-4 h-4" />Upload Document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Documents</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
          <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Archived</p>
          <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search documents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}><List className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}><Grid className="w-4 h-4" /></button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Document</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Size</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Uploaded By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Last Modified</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Version</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.type)}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</div>
                          <div className="flex gap-1 mt-1">
                            {doc.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400 rounded">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{doc.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{doc.size}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{doc.uploadedBy}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(doc.lastModified).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">{doc.version}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(doc.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Download"><Download className="w-4 h-4 text-gray-500" /></button>
                        <button className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    {getFileIcon(doc.type)}
                  </div>
                  {getStatusBadge(doc.status)}
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate" title={doc.name}>{doc.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{doc.size} • {doc.version}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{doc.category}</span>
                  <div className="flex gap-1">
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Eye className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Download className="w-3.5 h-3.5 text-gray-500" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
