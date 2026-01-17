'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  Edit,
  Copy,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Package,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText,
  Calculator
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface BOMItem {
  id: string;
  bomNumber: string;
  productName: string;
  productCode: string;
  version: string;
  status: 'draft' | 'active' | 'obsolete' | 'pending_approval';
  type: 'manufacturing' | 'assembly' | 'template';
  quantity: number;
  unit: string;
  totalCost: number;
  components: number;
  operations: number;
  leadTime: number;
  effectiveDate?: string;
  expiryDate?: string;
  createdBy: string;
  createdDate: string;
  lastModified: string;
}

interface BOMComponent {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  type: 'raw_material' | 'sub_assembly' | 'purchased_part';
  leadTime: number;
  inStock: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockBOMs: BOMItem[] = [
  {
    id: 'BOM001',
    bomNumber: 'BOM-PRD-001',
    productName: 'Widget Pro X500',
    productCode: 'WPX500',
    version: '3.2',
    status: 'active',
    type: 'manufacturing',
    quantity: 1,
    unit: 'Unit',
    totalCost: 245.50,
    components: 15,
    operations: 5,
    leadTime: 3,
    effectiveDate: '2023-06-01',
    createdBy: 'Engineering Team',
    createdDate: '2023-05-15',
    lastModified: '2024-01-10'
  },
  {
    id: 'BOM002',
    bomNumber: 'BOM-PRD-002',
    productName: 'Gadget Standard A200',
    productCode: 'GSA200',
    version: '2.1',
    status: 'active',
    type: 'assembly',
    quantity: 1,
    unit: 'Unit',
    totalCost: 128.75,
    components: 8,
    operations: 3,
    leadTime: 2,
    effectiveDate: '2023-09-01',
    createdBy: 'Engineering Team',
    createdDate: '2023-08-20',
    lastModified: '2024-01-05'
  },
  {
    id: 'BOM003',
    bomNumber: 'BOM-PRD-003',
    productName: 'Component Set C100',
    productCode: 'CSC100',
    version: '1.0',
    status: 'pending_approval',
    type: 'manufacturing',
    quantity: 1,
    unit: 'Set',
    totalCost: 89.00,
    components: 12,
    operations: 4,
    leadTime: 4,
    createdBy: 'John Smith',
    createdDate: '2024-01-15',
    lastModified: '2024-01-18'
  },
  {
    id: 'BOM004',
    bomNumber: 'BOM-TPL-001',
    productName: 'Standard Enclosure Template',
    productCode: 'TPL-ENC',
    version: '1.5',
    status: 'active',
    type: 'template',
    quantity: 1,
    unit: 'Unit',
    totalCost: 45.00,
    components: 6,
    operations: 2,
    leadTime: 1,
    effectiveDate: '2022-01-01',
    createdBy: 'Design Team',
    createdDate: '2022-01-01',
    lastModified: '2023-06-15'
  },
  {
    id: 'BOM005',
    bomNumber: 'BOM-PRD-004',
    productName: 'Legacy Widget Model',
    productCode: 'LWM-OLD',
    version: '4.0',
    status: 'obsolete',
    type: 'manufacturing',
    quantity: 1,
    unit: 'Unit',
    totalCost: 180.00,
    components: 20,
    operations: 6,
    leadTime: 5,
    effectiveDate: '2020-03-01',
    expiryDate: '2023-12-31',
    createdBy: 'Engineering Team',
    createdDate: '2020-02-15',
    lastModified: '2023-12-01'
  }
];

const stats = {
  totalBOMs: 156,
  activeBOMs: 125,
  pendingApproval: 8,
  avgComponents: 12
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: BOMItem['status'] }) {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    obsolete: { label: 'Obsolete', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    pending_approval: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
  }[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: BOMItem['type'] }) {
  const config = {
    manufacturing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    assembly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    template: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {type}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function BOMViewPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedBOM, setExpandedBOM] = useState<string | null>(null);

  const filteredBOMs = useMemo(() => {
    return mockBOMs.filter(bom => {
      const matchesSearch =
        bom.bomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bom.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bom.productCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || bom.status === statusFilter;
      const matchesType = typeFilter === 'all' || bom.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, statusFilter, typeFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bill of Materials</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage product structures and component lists</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Create BOM
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
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalBOMs}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total BOMs</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeBOMs}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active BOMs</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApproval}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgComponents}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Components</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by BOM number, product name, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="assembly">Assembly</option>
            <option value="template">Template</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending</option>
            <option value="obsolete">Obsolete</option>
          </select>
        </div>

        {/* BOM Cards */}
        <div className="space-y-4">
          {filteredBOMs.map((bom) => (
            <div
              key={bom.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Layers className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{bom.bomNumber}</h3>
                        <span className="text-sm text-gray-500">v{bom.version}</span>
                        <TypeBadge type={bom.type} />
                        <StatusBadge status={bom.status} />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">{bom.productName}</p>
                      <p className="text-sm text-gray-500">Product Code: {bom.productCode}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setExpandedBOM(expandedBOM === bom.id ? null : bom.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Expand"
                    >
                      {expandedBOM === bom.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                      <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                      <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Copy">
                      <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Components</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{bom.components}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Operations</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{bom.operations}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Lead Time</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{bom.leadTime} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Cost</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(bom.totalCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Last Modified</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{bom.lastModified}</p>
                  </div>
                </div>
              </div>

              {expandedBOM === bom.id && (
                <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Component Preview</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Click "View" to see full component list and BOM details.
                    </p>
                    <div className="flex gap-3 mt-3">
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                        <Calculator className="w-4 h-4" />
                        Cost Breakdown
                      </button>
                      <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300">
                        <FileText className="w-4 h-4" />
                        Export Details
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredBOMs.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Layers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No BOMs found</p>
          </div>
        )}
      </div>
    </div>
  );
}
