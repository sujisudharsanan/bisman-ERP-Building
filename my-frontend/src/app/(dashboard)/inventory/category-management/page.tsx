'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Package,
  Tag,
  Grid,
  List,
  Image as ImageIcon,
  DollarSign,
  BarChart2,
  ArrowUpDown,
  ChevronRight,
  FolderTree
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId?: string;
  parentName?: string;
  level: number;
  productCount: number;
  status: 'active' | 'inactive';
  image?: string;
  sortOrder: number;
  attributes: string[];
  createdAt: string;
  updatedAt: string;
}

interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  withProducts: number;
  maxDepth: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockCategories: Category[] = [
  {
    id: 'CAT001',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and components',
    level: 0,
    productCount: 1250,
    status: 'active',
    sortOrder: 1,
    attributes: ['Brand', 'Warranty', 'Power Rating'],
    createdAt: '2023-01-01',
    updatedAt: '2024-01-10'
  },
  {
    id: 'CAT002',
    name: 'Motors & Drives',
    slug: 'motors-drives',
    description: 'Industrial motors and drive systems',
    parentId: 'CAT001',
    parentName: 'Electronics',
    level: 1,
    productCount: 350,
    status: 'active',
    sortOrder: 1,
    attributes: ['HP Rating', 'Voltage', 'Phase'],
    createdAt: '2023-01-05',
    updatedAt: '2024-01-08'
  },
  {
    id: 'CAT003',
    name: 'Control Panels',
    slug: 'control-panels',
    description: 'Electrical control panels and switchgear',
    parentId: 'CAT001',
    parentName: 'Electronics',
    level: 1,
    productCount: 180,
    status: 'active',
    sortOrder: 2,
    attributes: ['Amperage', 'Enclosure Type'],
    createdAt: '2023-01-05',
    updatedAt: '2024-01-05'
  },
  {
    id: 'CAT004',
    name: 'Machinery',
    slug: 'machinery',
    description: 'Industrial machinery and equipment',
    level: 0,
    productCount: 890,
    status: 'active',
    sortOrder: 2,
    attributes: ['Capacity', 'Power Source'],
    createdAt: '2023-01-01',
    updatedAt: '2024-01-12'
  },
  {
    id: 'CAT005',
    name: 'CNC Machines',
    slug: 'cnc-machines',
    description: 'Computer numerical control machines',
    parentId: 'CAT004',
    parentName: 'Machinery',
    level: 1,
    productCount: 85,
    status: 'active',
    sortOrder: 1,
    attributes: ['Axis Count', 'Work Area', 'Spindle Speed'],
    createdAt: '2023-02-01',
    updatedAt: '2024-01-10'
  },
  {
    id: 'CAT006',
    name: 'Packaging',
    slug: 'packaging',
    description: 'Packaging materials and solutions',
    level: 0,
    productCount: 560,
    status: 'active',
    sortOrder: 3,
    attributes: ['Material', 'Size', 'Quantity'],
    createdAt: '2023-01-01',
    updatedAt: '2024-01-08'
  },
  {
    id: 'CAT007',
    name: 'Raw Materials',
    slug: 'raw-materials',
    description: 'Raw materials for manufacturing',
    level: 0,
    productCount: 0,
    status: 'inactive',
    sortOrder: 4,
    attributes: ['Grade', 'Specifications'],
    createdAt: '2023-06-01',
    updatedAt: '2023-12-01'
  },
  {
    id: 'CAT008',
    name: 'Safety Equipment',
    slug: 'safety-equipment',
    description: 'Personal and industrial safety products',
    level: 0,
    productCount: 320,
    status: 'active',
    sortOrder: 5,
    attributes: ['Certification', 'Size'],
    createdAt: '2023-03-01',
    updatedAt: '2024-01-15'
  }
];

const mockStats: CategoryStats = {
  total: 45,
  active: 42,
  inactive: 3,
  withProducts: 38,
  maxDepth: 3
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Category['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700', icon: XCircle },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function CategoryCard({ category, onEdit, onView }: { 
  category: Category; 
  onEdit: () => void;
  onView: () => void;
}) {
  return (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
      category.status === 'inactive' ? 'opacity-60' : ''
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{category.name}</h3>
            <code className="text-xs text-gray-500">/{category.slug}</code>
          </div>
        </div>
        <StatusBadge status={category.status} />
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{category.description}</p>

      {category.parentName && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
          <FolderTree className="w-3 h-3" />
          <span>Parent: {category.parentName}</span>
        </div>
      )}

      <div className="flex justify-between items-center text-sm mb-4">
        <div className="flex items-center gap-1 text-gray-600">
          <Package className="w-4 h-4" />
          <span>{category.productCount} products</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Tag className="w-4 h-4" />
          <span>{category.attributes.length} attributes</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {category.attributes.slice(0, 3).map((attr) => (
          <span key={attr} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
            {attr}
          </span>
        ))}
        {category.attributes.length > 3 && (
          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
            +{category.attributes.length - 3}
          </span>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t">
        <button 
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button 
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
      </div>
    </div>
  );
}

function CategoryDetailModal({ category, onClose }: { category: Category; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{category.name}</h2>
                <code className="text-sm text-gray-500">/{category.slug}</code>
              </div>
            </div>
            <StatusBadge status={category.status} />
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600">{category.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Hierarchy</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Level</span>
                  <span>{category.level}</span>
                </div>
                {category.parentName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Parent Category</span>
                    <span>{category.parentName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Sort Order</span>
                  <span>{category.sortOrder}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Products</span>
                  <span className="font-medium">{category.productCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>{category.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated</span>
                  <span>{category.updatedAt}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Category Attributes</h3>
            {category.attributes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {category.attributes.map((attr) => (
                  <span key={attr} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                    {attr}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No attributes defined</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Edit className="w-4 h-4" />
              Edit Category
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100">
              <Package className="w-4 h-4" />
              View Products
            </button>
          </div>
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CategoryManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const filteredCategories = useMemo(() => {
    return mockCategories.filter(category => {
      const matchesSearch =
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || category.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Group by parent for tree view
  const rootCategories = filteredCategories.filter(c => !c.parentId);
  const childCategories = filteredCategories.filter(c => c.parentId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
            <p className="text-gray-500">Organize products into categories</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.total}</p>
                <p className="text-sm text-gray-500">Total Categories</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.inactive}</p>
                <p className="text-sm text-gray-500">Inactive</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.withProducts}</p>
                <p className="text-sm text-gray-500">With Products</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FolderTree className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.maxDepth}</p>
                <p className="text-sm text-gray-500">Max Depth</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2 border rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Categories Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onView={() => setSelectedCategory(category)}
                onEdit={() => console.log('Edit', category.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sort</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{category.name}</p>
                          <code className="text-xs text-gray-500">/{category.slug}</code>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {category.parentName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {category.productCount}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={category.status} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {category.sortOrder}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedCategory(category)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="More">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredCategories.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No categories found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCategory && (
        <CategoryDetailModal
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </div>
  );
}
