'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Upload,
  Download,
  Folder,
  FolderOpen,
  File,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  Lock,
  Star,
  StarOff,
  Grid,
  List,
  Plus,
  ChevronRight,
  MoreVertical,
  Share2,
  History
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Document {
  id: string;
  name: string;
  type: 'policy' | 'procedure' | 'template' | 'report' | 'certificate' | 'contract';
  category: string;
  version: string;
  status: 'current' | 'draft' | 'archived' | 'pending_review';
  owner: string;
  lastModified: string;
  size: string;
  isStarred: boolean;
  isLocked: boolean;
  expiryDate?: string;
  tags: string[];
}

interface Folder {
  id: string;
  name: string;
  documentCount: number;
  lastUpdated: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockFolders: Folder[] = [
  { id: 'F001', name: 'Policies', documentCount: 24, lastUpdated: '2024-01-18' },
  { id: 'F002', name: 'Procedures', documentCount: 45, lastUpdated: '2024-01-20' },
  { id: 'F003', name: 'Templates', documentCount: 18, lastUpdated: '2024-01-15' },
  { id: 'F004', name: 'Compliance Reports', documentCount: 32, lastUpdated: '2024-01-19' },
  { id: 'F005', name: 'Certificates', documentCount: 12, lastUpdated: '2024-01-10' },
  { id: 'F006', name: 'Contracts', documentCount: 89, lastUpdated: '2024-01-20' }
];

const mockDocuments: Document[] = [
  {
    id: 'DOC001',
    name: 'Data Privacy Policy',
    type: 'policy',
    category: 'Policies',
    version: '3.2',
    status: 'current',
    owner: 'Legal Team',
    lastModified: '2024-01-15',
    size: '2.4 MB',
    isStarred: true,
    isLocked: false,
    expiryDate: '2025-01-15',
    tags: ['GDPR', 'Privacy', 'Data Protection']
  },
  {
    id: 'DOC002',
    name: 'Employee Onboarding Procedure',
    type: 'procedure',
    category: 'Procedures',
    version: '2.1',
    status: 'current',
    owner: 'HR Department',
    lastModified: '2024-01-10',
    size: '1.8 MB',
    isStarred: false,
    isLocked: false,
    tags: ['HR', 'Onboarding', 'Training']
  },
  {
    id: 'DOC003',
    name: 'Risk Assessment Template',
    type: 'template',
    category: 'Templates',
    version: '1.5',
    status: 'current',
    owner: 'Risk Management',
    lastModified: '2024-01-08',
    size: '450 KB',
    isStarred: true,
    isLocked: false,
    tags: ['Risk', 'Assessment', 'Template']
  },
  {
    id: 'DOC004',
    name: 'Q4 2023 Compliance Report',
    type: 'report',
    category: 'Compliance Reports',
    version: '1.0',
    status: 'pending_review',
    owner: 'Compliance Team',
    lastModified: '2024-01-18',
    size: '5.2 MB',
    isStarred: false,
    isLocked: true,
    tags: ['Quarterly', 'Compliance', 'Report']
  },
  {
    id: 'DOC005',
    name: 'ISO 27001 Certificate',
    type: 'certificate',
    category: 'Certificates',
    version: '1.0',
    status: 'current',
    owner: 'IT Security',
    lastModified: '2023-06-15',
    size: '890 KB',
    isStarred: true,
    isLocked: true,
    expiryDate: '2026-06-15',
    tags: ['ISO', 'Security', 'Certification']
  },
  {
    id: 'DOC006',
    name: 'Anti-Corruption Policy',
    type: 'policy',
    category: 'Policies',
    version: '2.0',
    status: 'draft',
    owner: 'Legal Team',
    lastModified: '2024-01-20',
    size: '1.2 MB',
    isStarred: false,
    isLocked: false,
    tags: ['Ethics', 'Compliance', 'Policy']
  }
];

const stats = {
  totalDocuments: 220,
  pendingReview: 15,
  expiringSoon: 8,
  recentlyUpdated: 24
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Document['status'] }) {
  const config = {
    current: { label: 'Current', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    draft: { label: 'Draft', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Edit },
    archived: { label: 'Archived', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
    pending_review: { label: 'Pending Review', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TypeIcon({ type }: { type: Document['type'] }) {
  const colors = {
    policy: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    procedure: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    template: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    report: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    certificate: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30',
    contract: 'text-red-600 bg-red-100 dark:bg-red-900/30'
  }[type];

  return (
    <div className={`p-2 rounded-lg ${colors}`}>
      <FileText className="w-5 h-5" />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DocumentRepositoryViewPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    return mockDocuments.filter(doc => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      const matchesType = typeFilter === 'all' || doc.type === typeFilter;
      const matchesFolder = !selectedFolder || doc.category === selectedFolder;
      return matchesSearch && matchesStatus && matchesType && matchesFolder;
    });
  }, [searchQuery, statusFilter, typeFilter, selectedFolder]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Repository</h1>
            <p className="text-gray-500 dark:text-gray-400">Central repository for compliance documents</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDocuments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Documents</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingReview}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Review</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.expiringSoon}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Soon</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recentlyUpdated}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recently Updated</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Folders Sidebar */}
          <div className="w-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Folders</h3>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <Plus className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left ${
                  !selectedFolder
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Folder className="w-4 h-4" />
                <span className="flex-1">All Documents</span>
                <span className="text-xs text-gray-500">{stats.totalDocuments}</span>
              </button>
              {mockFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left ${
                    selectedFolder === folder.name
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {selectedFolder === folder.name ? (
                    <FolderOpen className="w-4 h-4" />
                  ) : (
                    <Folder className="w-4 h-4" />
                  )}
                  <span className="flex-1 truncate">{folder.name}</span>
                  <span className="text-xs text-gray-500">{folder.documentCount}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="flex-1">
            {/* Filters */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="current">Current</option>
                  <option value="draft">Draft</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="archived">Archived</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="policy">Policies</option>
                  <option value="procedure">Procedures</option>
                  <option value="template">Templates</option>
                  <option value="report">Reports</option>
                  <option value="certificate">Certificates</option>
                  <option value="contract">Contracts</option>
                </select>
              </div>
              <div className="flex items-center gap-2 ml-4 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Breadcrumb */}
            {selectedFolder && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <button onClick={() => setSelectedFolder(null)} className="hover:text-blue-600">All Documents</button>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-900 dark:text-white">{selectedFolder}</span>
              </div>
            )}

            {/* Document List */}
            {viewMode === 'list' ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Version</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Owner</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Modified</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <TypeIcon type={doc.type} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">{doc.name}</span>
                                {doc.isStarred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                                {doc.isLocked && <Lock className="w-4 h-4 text-gray-400" />}
                              </div>
                              <div className="flex gap-1 mt-1">
                                {doc.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">v{doc.version}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{doc.owner}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{doc.lastModified}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="View">
                              <Eye className="w-4 h-4 text-blue-600" />
                            </button>
                            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="Download">
                              <Download className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="History">
                              <History className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="More">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <TypeIcon type={doc.type} />
                      <div className="flex items-center gap-1">
                        {doc.isStarred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        {doc.isLocked && <Lock className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">{doc.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">v{doc.version} • {doc.size}</p>
                    <StatusBadge status={doc.status} />
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-500">{doc.lastModified}</span>
                      <div className="flex gap-1">
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                          <Download className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredDocuments.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No documents found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
