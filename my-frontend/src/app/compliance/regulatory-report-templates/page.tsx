'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Send,
  Building2,
  BarChart2,
  FileCheck,
  Upload,
  MoreVertical
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface ReportTemplate {
  id: string;
  name: string;
  code: string;
  category: string;
  regulatoryBody: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'ad-hoc';
  status: 'active' | 'draft' | 'archived';
  lastGenerated?: string;
  nextDue?: string;
  owner: string;
  format: 'pdf' | 'excel' | 'xml' | 'csv';
  description: string;
  sections: string[];
  automationEnabled: boolean;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockTemplates: ReportTemplate[] = [
  {
    id: 'RPT001',
    name: 'Quarterly Financial Compliance Report',
    code: 'FCR-Q',
    category: 'Financial',
    regulatoryBody: 'SEC',
    frequency: 'quarterly',
    status: 'active',
    lastGenerated: '2023-12-31',
    nextDue: '2024-03-31',
    owner: 'Finance Team',
    format: 'pdf',
    description: 'Comprehensive quarterly financial compliance report for SEC filing',
    sections: ['Executive Summary', 'Financial Statements', 'Risk Assessment', 'Compliance Certification'],
    automationEnabled: true
  },
  {
    id: 'RPT002',
    name: 'GDPR Data Processing Report',
    code: 'GDPR-DPR',
    category: 'Privacy',
    regulatoryBody: 'EU Data Protection',
    frequency: 'annually',
    status: 'active',
    lastGenerated: '2024-01-01',
    nextDue: '2025-01-01',
    owner: 'DPO',
    format: 'pdf',
    description: 'Annual report on data processing activities under GDPR',
    sections: ['Data Inventory', 'Processing Activities', 'Consent Management', 'Breach Log'],
    automationEnabled: true
  },
  {
    id: 'RPT003',
    name: 'Monthly Anti-Money Laundering Report',
    code: 'AML-M',
    category: 'Financial Crime',
    regulatoryBody: 'FinCEN',
    frequency: 'monthly',
    status: 'active',
    lastGenerated: '2024-01-15',
    nextDue: '2024-02-15',
    owner: 'Compliance Team',
    format: 'excel',
    description: 'Monthly suspicious activity monitoring and reporting',
    sections: ['Transaction Analysis', 'SAR Summary', 'KYC Updates', 'Risk Indicators'],
    automationEnabled: true
  },
  {
    id: 'RPT004',
    name: 'Environmental Compliance Report',
    code: 'ENV-A',
    category: 'Environmental',
    regulatoryBody: 'EPA',
    frequency: 'annually',
    status: 'active',
    lastGenerated: '2023-12-01',
    nextDue: '2024-12-01',
    owner: 'HSE Team',
    format: 'pdf',
    description: 'Annual environmental impact and compliance report',
    sections: ['Emissions Data', 'Waste Management', 'Water Usage', 'Remediation Activities'],
    automationEnabled: false
  },
  {
    id: 'RPT005',
    name: 'Workplace Safety Report',
    code: 'WSR-Q',
    category: 'Health & Safety',
    regulatoryBody: 'OSHA',
    frequency: 'quarterly',
    status: 'draft',
    owner: 'HR Safety',
    format: 'pdf',
    description: 'Quarterly workplace safety incidents and metrics report',
    sections: ['Incident Summary', 'Training Records', 'Inspection Results', 'Corrective Actions'],
    automationEnabled: false
  },
  {
    id: 'RPT006',
    name: 'Vendor Due Diligence Report',
    code: 'VDD-AH',
    category: 'Third Party',
    regulatoryBody: 'Internal',
    frequency: 'ad-hoc',
    status: 'active',
    owner: 'Procurement',
    format: 'pdf',
    description: 'Ad-hoc vendor risk assessment and due diligence report',
    sections: ['Vendor Profile', 'Risk Assessment', 'Compliance Check', 'Recommendation'],
    automationEnabled: false
  }
];

const stats = {
  totalTemplates: 28,
  activeTemplates: 24,
  dueThisMonth: 5,
  automatedReports: 18
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: ReportTemplate['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    draft: { label: 'Draft', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    archived: { label: 'Archived', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }
  }[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function FrequencyBadge({ frequency }: { frequency: ReportTemplate['frequency'] }) {
  const labels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
    'ad-hoc': 'Ad-hoc'
  };

  return (
    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
      {labels[frequency]}
    </span>
  );
}

function FormatBadge({ format }: { format: ReportTemplate['format'] }) {
  const colors = {
    pdf: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    excel: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    xml: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    csv: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  }[format];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${colors}`}>
      {format}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function RegulatoryReportTemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');

  const filteredTemplates = useMemo(() => {
    return mockTemplates.filter(template => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.regulatoryBody.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
      const matchesFrequency = frequencyFilter === 'all' || template.frequency === frequencyFilter;
      return matchesSearch && matchesCategory && matchesFrequency;
    });
  }, [searchQuery, categoryFilter, frequencyFilter]);

  const categories = [...new Set(mockTemplates.map(t => t.category))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Regulatory Report Templates</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage and generate compliance reports</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Upload className="w-4 h-4" />
              Import Template
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Template
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTemplates}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Templates</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeTemplates}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.dueThisMonth}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Due This Month</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <BarChart2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.automatedReports}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Automated</p>
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
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Frequencies</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
            <option value="ad-hoc">Ad-hoc</option>
          </select>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={template.status} />
                  <FrequencyBadge frequency={template.frequency} />
                  <FormatBadge format={template.format} />
                </div>
                {template.automationEnabled && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Auto
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{template.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{template.code} • {template.regulatoryBody}</p>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{template.description}</p>

              <div className="flex flex-wrap gap-1 mb-4">
                {template.sections.slice(0, 3).map((section) => (
                  <span key={section} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                    {section}
                  </span>
                ))}
                {template.sections.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                    +{template.sections.length - 3}
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {template.nextDue && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Next: {template.nextDue}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                    <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Generate">
                    <FileCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                    <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="More">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No templates found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
