'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  Edit,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  Phone,
  Mail,
  MapPin,
  Globe,
  Shield,
  MoreVertical,
  Star
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface VendorCustomer {
  id: string;
  name: string;
  type: 'vendor' | 'customer';
  legalName: string;
  registrationNumber: string;
  taxId: string;
  status: 'active' | 'pending_approval' | 'suspended' | 'terminated';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    designation: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  compliance: {
    dueDiligenceComplete: boolean;
    lastReviewDate?: string;
    nextReviewDate?: string;
    contractExpiry?: string;
    ndaSigned: boolean;
    certifications: string[];
  };
  createdAt: string;
  lastUpdated: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockEntities: VendorCustomer[] = [
  {
    id: 'ENT001',
    name: 'TechSupply Corp',
    type: 'vendor',
    legalName: 'TechSupply Corporation Ltd.',
    registrationNumber: 'REG-2020-12345',
    taxId: 'TAX-987654321',
    status: 'active',
    riskLevel: 'low',
    category: 'IT Services',
    primaryContact: {
      name: 'John Smith',
      email: 'john.smith@techsupply.com',
      phone: '+1 (555) 123-4567',
      designation: 'Account Manager'
    },
    address: {
      street: '123 Tech Boulevard',
      city: 'San Francisco',
      state: 'CA',
      country: 'United States',
      postalCode: '94105'
    },
    compliance: {
      dueDiligenceComplete: true,
      lastReviewDate: '2024-01-10',
      nextReviewDate: '2024-07-10',
      contractExpiry: '2025-12-31',
      ndaSigned: true,
      certifications: ['ISO 27001', 'SOC 2']
    },
    createdAt: '2020-06-15',
    lastUpdated: '2024-01-10'
  },
  {
    id: 'ENT002',
    name: 'Global Industries Inc',
    type: 'customer',
    legalName: 'Global Industries Incorporated',
    registrationNumber: 'REG-2019-54321',
    taxId: 'TAX-123456789',
    status: 'active',
    riskLevel: 'medium',
    category: 'Manufacturing',
    primaryContact: {
      name: 'Sarah Johnson',
      email: 'sarah.j@globalind.com',
      phone: '+1 (555) 987-6543',
      designation: 'Procurement Director'
    },
    address: {
      street: '456 Industrial Way',
      city: 'Chicago',
      state: 'IL',
      country: 'United States',
      postalCode: '60601'
    },
    compliance: {
      dueDiligenceComplete: true,
      lastReviewDate: '2023-11-15',
      nextReviewDate: '2024-05-15',
      contractExpiry: '2024-12-31',
      ndaSigned: true,
      certifications: ['ISO 9001']
    },
    createdAt: '2019-03-20',
    lastUpdated: '2023-11-15'
  },
  {
    id: 'ENT003',
    name: 'SecurePay Ltd',
    type: 'vendor',
    legalName: 'SecurePay Limited',
    registrationNumber: 'REG-2021-67890',
    taxId: 'TAX-456789123',
    status: 'pending_approval',
    riskLevel: 'high',
    category: 'Payment Services',
    primaryContact: {
      name: 'Michael Chen',
      email: 'm.chen@securepay.com',
      phone: '+44 20 7123 4567',
      designation: 'Partnership Manager'
    },
    address: {
      street: '789 Finance Street',
      city: 'London',
      state: '',
      country: 'United Kingdom',
      postalCode: 'EC1A 1BB'
    },
    compliance: {
      dueDiligenceComplete: false,
      ndaSigned: false,
      certifications: ['PCI DSS']
    },
    createdAt: '2024-01-05',
    lastUpdated: '2024-01-15'
  },
  {
    id: 'ENT004',
    name: 'DataCloud Solutions',
    type: 'vendor',
    legalName: 'DataCloud Solutions GmbH',
    registrationNumber: 'HRB-123456',
    taxId: 'DE123456789',
    status: 'active',
    riskLevel: 'low',
    category: 'Cloud Services',
    primaryContact: {
      name: 'Anna Mueller',
      email: 'anna.mueller@datacloud.de',
      phone: '+49 30 1234567',
      designation: 'Enterprise Sales'
    },
    address: {
      street: 'Berliner Str. 100',
      city: 'Berlin',
      state: 'Berlin',
      country: 'Germany',
      postalCode: '10115'
    },
    compliance: {
      dueDiligenceComplete: true,
      lastReviewDate: '2023-12-01',
      nextReviewDate: '2024-06-01',
      contractExpiry: '2026-03-31',
      ndaSigned: true,
      certifications: ['ISO 27001', 'SOC 2', 'GDPR Compliant']
    },
    createdAt: '2021-08-10',
    lastUpdated: '2023-12-01'
  },
  {
    id: 'ENT005',
    name: 'Legacy Partners',
    type: 'customer',
    legalName: 'Legacy Partners LLC',
    registrationNumber: 'LLC-2018-99999',
    taxId: 'TAX-999888777',
    status: 'suspended',
    riskLevel: 'critical',
    category: 'Financial Services',
    primaryContact: {
      name: 'Robert Brown',
      email: 'rbrown@legacypartners.com',
      phone: '+1 (555) 111-2222',
      designation: 'CFO'
    },
    address: {
      street: '321 Wall Street',
      city: 'New York',
      state: 'NY',
      country: 'United States',
      postalCode: '10005'
    },
    compliance: {
      dueDiligenceComplete: true,
      lastReviewDate: '2023-06-15',
      nextReviewDate: '2023-12-15',
      contractExpiry: '2024-03-31',
      ndaSigned: true,
      certifications: []
    },
    createdAt: '2018-02-28',
    lastUpdated: '2023-09-01'
  }
];

const stats = {
  totalEntities: 156,
  activeVendors: 89,
  activeCustomers: 52,
  pendingReview: 15
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: VendorCustomer['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    pending_approval: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    terminated: { label: 'Terminated', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: XCircle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function RiskBadge({ level }: { level: VendorCustomer['riskLevel'] }) {
  const config = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }[level];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {level} Risk
    </span>
  );
}

function TypeBadge({ type }: { type: 'vendor' | 'customer' }) {
  const config = {
    vendor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    customer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {type}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function VendorCustomerMasterLegalPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const filteredEntities = useMemo(() => {
    return mockEntities.filter(entity => {
      const matchesSearch =
        entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || entity.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || entity.status === statusFilter;
      const matchesRisk = riskFilter === 'all' || entity.riskLevel === riskFilter;
      return matchesSearch && matchesType && matchesStatus && matchesRisk;
    });
  }, [searchQuery, typeFilter, statusFilter, riskFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor & Customer Legal Master</h1>
            <p className="text-gray-500 dark:text-gray-400">Legal and compliance information for business partners</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Add Entity
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
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEntities}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Entities</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeVendors}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Vendors</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeCustomers}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Customers</p>
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
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, legal name, or registration..."
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
            <option value="vendor">Vendors</option>
            <option value="customer">Customers</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending_approval">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="terminated">Terminated</option>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical Risk</option>
          </select>
        </div>

        {/* Entity Cards */}
        <div className="space-y-4">
          {filteredEntities.map((entity) => (
            <div
              key={entity.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Building2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{entity.name}</h3>
                      <TypeBadge type={entity.type} />
                      <StatusBadge status={entity.status} />
                      <RiskBadge level={entity.riskLevel} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{entity.legalName}</p>
                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Reg: {entity.registrationNumber}</span>
                      <span>•</span>
                      <span>Tax ID: {entity.taxId}</span>
                      <span>•</span>
                      <span>{entity.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                    <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                    <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Documents">
                    <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="More">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {/* Contact */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Primary Contact</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{entity.primaryContact.name}</p>
                  <p className="text-xs text-gray-500">{entity.primaryContact.designation}</p>
                  <div className="flex gap-2 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{entity.primaryContact.email}</span>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Address</p>
                  <div className="flex items-start gap-1 text-sm text-gray-600 dark:text-gray-300">
                    <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                    <span>{entity.address.city}, {entity.address.country}</span>
                  </div>
                </div>

                {/* Compliance */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Compliance Status</p>
                  <div className="flex flex-wrap gap-1">
                    {entity.compliance.dueDiligenceComplete && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Due Diligence
                      </span>
                    )}
                    {entity.compliance.ndaSigned && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                        <Shield className="w-3 h-3" />
                        NDA
                      </span>
                    )}
                    {entity.compliance.certifications.slice(0, 2).map(cert => (
                      <span key={cert} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEntities.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No entities found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
