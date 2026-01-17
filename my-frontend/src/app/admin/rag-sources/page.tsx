'use client';

import { useState, useMemo } from 'react';
import { Search, Upload, RefreshCw, FileText, Trash2, Tag, CheckCircle, Clock, AlertCircle, X, Plus } from 'lucide-react';

type RagSource = {
  id: string;
  fileName: string;
  path: string;
  fileSize: string;
  tags: string[];
  embeddingStatus: 'completed' | 'processing' | 'pending' | 'failed';
  chunks: number;
  uploadedBy: string;
  createdAt: string;
};

const mockSources: RagSource[] = [
  { id: 'RAG-001', fileName: 'Company_Policy_Manual.pdf', path: '/documents/policies/', fileSize: '2.4 MB', tags: ['policy', 'hr', 'compliance'], embeddingStatus: 'completed', chunks: 145, uploadedBy: 'Admin User', createdAt: '2025-01-14' },
  { id: 'RAG-002', fileName: 'Product_Catalog_2025.pdf', path: '/documents/products/', fileSize: '8.1 MB', tags: ['products', 'catalog', 'sales'], embeddingStatus: 'completed', chunks: 312, uploadedBy: 'Sales Manager', createdAt: '2025-01-13' },
  { id: 'RAG-003', fileName: 'Employee_Handbook.docx', path: '/documents/hr/', fileSize: '1.2 MB', tags: ['hr', 'onboarding'], embeddingStatus: 'completed', chunks: 87, uploadedBy: 'HR Admin', createdAt: '2025-01-12' },
  { id: 'RAG-004', fileName: 'Technical_Documentation.pdf', path: '/documents/tech/', fileSize: '5.6 MB', tags: ['technical', 'api', 'development'], embeddingStatus: 'processing', chunks: 0, uploadedBy: 'Tech Lead', createdAt: '2025-01-14' },
  { id: 'RAG-005', fileName: 'Financial_Guidelines.pdf', path: '/documents/finance/', fileSize: '3.2 MB', tags: ['finance', 'guidelines', 'compliance'], embeddingStatus: 'completed', chunks: 198, uploadedBy: 'Finance Head', createdAt: '2025-01-10' },
  { id: 'RAG-006', fileName: 'Training_Materials.pptx', path: '/documents/training/', fileSize: '12.4 MB', tags: ['training', 'onboarding'], embeddingStatus: 'pending', chunks: 0, uploadedBy: 'Training Coord', createdAt: '2025-01-14' },
  { id: 'RAG-007', fileName: 'Vendor_Contracts.pdf', path: '/documents/legal/', fileSize: '4.8 MB', tags: ['legal', 'contracts', 'vendors'], embeddingStatus: 'failed', chunks: 0, uploadedBy: 'Legal Team', createdAt: '2025-01-11' },
  { id: 'RAG-008', fileName: 'Safety_Protocols.pdf', path: '/documents/safety/', fileSize: '1.8 MB', tags: ['safety', 'compliance', 'operations'], embeddingStatus: 'completed', chunks: 112, uploadedBy: 'Safety Officer', createdAt: '2025-01-09' },
];

const statusConfig = {
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: RefreshCw },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
};

export default function RAGSourcesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const stats = useMemo(() => ({
    total: mockSources.length,
    completed: mockSources.filter(s => s.embeddingStatus === 'completed').length,
    processing: mockSources.filter(s => s.embeddingStatus === 'processing').length,
    pending: mockSources.filter(s => s.embeddingStatus === 'pending').length,
    failed: mockSources.filter(s => s.embeddingStatus === 'failed').length,
    totalChunks: mockSources.reduce((acc, s) => acc + s.chunks, 0),
  }), []);

  const filteredSources = useMemo(() => {
    return mockSources.filter(source => {
      const matchesSearch = source.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           source.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || source.embeddingStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const handleAddTag = () => {
    if (newTag.trim() && !uploadTags.includes(newTag.trim())) {
      setUploadTags([...uploadTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setUploadTags(uploadTags.filter(t => t !== tag));
  };

  const handleUpload = () => {
    // Simulate upload
    alert(`Uploading ${selectedFiles.length} file(s) with tags: ${uploadTags.join(', ')}`);
    setShowUploadModal(false);
    setSelectedFiles([]);
    setUploadTags([]);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">RAG Sources</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage knowledge base documents for AI-powered search</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
            <RefreshCw className="w-4 h-4" />
            Reindex All
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Sources</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Processing</p>
          <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Chunks</p>
          <p className="text-2xl font-bold text-purple-600">{stats.totalChunks.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by filename or tag..."
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
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">File</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tags</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Chunks</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Uploaded By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSources.map((source) => {
                const StatusIcon = statusConfig[source.embeddingStatus].icon;
                return (
                  <tr key={source.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{source.fileName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{source.path}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{source.fileSize}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {source.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded">
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusConfig[source.embeddingStatus].color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[source.embeddingStatus].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{source.chunks}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{source.uploadedBy}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{source.createdAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Reindex">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredSources.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No sources found matching your criteria
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Document</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* File Drop Zone */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Drag and drop files here, or click to browse</p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.pptx,.xlsx"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                  Browse Files
                </label>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Selected files:</p>
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <FileText className="w-4 h-4" />
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {uploadTags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-sm rounded">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-blue-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <button onClick={handleAddTag} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                Cancel
              </button>
              <button 
                onClick={handleUpload} 
                disabled={selectedFiles.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
