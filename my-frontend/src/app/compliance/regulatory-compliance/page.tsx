'use client';

import React, { useState } from 'react';
import { Scale, Plus, Search, Eye, Edit2, AlertTriangle, CheckCircle, Clock, FileText, Calendar, TrendingUp, Shield } from 'lucide-react';

interface ComplianceItem {
  id: string;
  regulation: string;
  category: 'Tax' | 'Labor' | 'Environmental' | 'Safety' | 'Financial' | 'Data Privacy' | 'Industry Specific';
  description: string;
  dueDate: string;
  frequency: 'Annual' | 'Quarterly' | 'Monthly' | 'One-time';
  responsiblePerson: string;
  department: string;
  status: 'Compliant' | 'Non-Compliant' | 'Pending Review' | 'Due Soon' | 'Overdue';
  lastAuditDate?: string;
  nextAuditDate?: string;
  riskLevel: 'High' | 'Medium' | 'Low';
}

export default function RegulatoryCompliancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const complianceItems: ComplianceItem[] = [
    { id: 'RC-001', regulation: 'GST Filing - Monthly Returns', category: 'Tax', description: 'Monthly GST return filing (GSTR-3B)', dueDate: '2025-01-20', frequency: 'Monthly', responsiblePerson: 'Finance Manager', department: 'Finance', status: 'Due Soon', lastAuditDate: '2024-12-20', nextAuditDate: '2025-01-20', riskLevel: 'High' },
    { id: 'RC-002', regulation: 'Annual Labor Compliance Audit', category: 'Labor', description: 'ESI, PF, and labor law compliance audit', dueDate: '2025-03-31', frequency: 'Annual', responsiblePerson: 'HR Director', department: 'HR', status: 'Compliant', lastAuditDate: '2024-03-15', nextAuditDate: '2025-03-31', riskLevel: 'Medium' },
    { id: 'RC-003', regulation: 'Environmental Clearance Renewal', category: 'Environmental', description: 'Pollution control board clearance renewal', dueDate: '2025-06-30', frequency: 'Annual', responsiblePerson: 'Operations Head', department: 'Operations', status: 'Compliant', lastAuditDate: '2024-06-28', nextAuditDate: '2025-06-30', riskLevel: 'High' },
    { id: 'RC-004', regulation: 'Fire Safety Certificate', category: 'Safety', description: 'Annual fire safety inspection and certification', dueDate: '2025-02-15', frequency: 'Annual', responsiblePerson: 'Admin Manager', department: 'Admin', status: 'Pending Review', lastAuditDate: '2024-02-10', nextAuditDate: '2025-02-15', riskLevel: 'High' },
    { id: 'RC-005', regulation: 'TDS Return Filing - Q3', category: 'Tax', description: 'Quarterly TDS return filing', dueDate: '2025-01-15', frequency: 'Quarterly', responsiblePerson: 'Tax Accountant', department: 'Finance', status: 'Overdue', lastAuditDate: '2024-10-15', nextAuditDate: '2025-01-15', riskLevel: 'High' },
    { id: 'RC-006', regulation: 'GDPR Data Protection Audit', category: 'Data Privacy', description: 'Annual data protection compliance review', dueDate: '2025-04-30', frequency: 'Annual', responsiblePerson: 'IT Manager', department: 'IT', status: 'Compliant', lastAuditDate: '2024-04-25', nextAuditDate: '2025-04-30', riskLevel: 'Medium' },
    { id: 'RC-007', regulation: 'ISO 9001 Surveillance Audit', category: 'Industry Specific', description: 'Quality management system surveillance audit', dueDate: '2025-05-15', frequency: 'Annual', responsiblePerson: 'Quality Manager', department: 'Quality', status: 'Compliant', lastAuditDate: '2024-05-10', nextAuditDate: '2025-05-15', riskLevel: 'Medium' },
    { id: 'RC-008', regulation: 'Financial Audit - Statutory', category: 'Financial', description: 'Annual statutory financial audit', dueDate: '2025-09-30', frequency: 'Annual', responsiblePerson: 'CFO', department: 'Finance', status: 'Compliant', lastAuditDate: '2024-09-25', nextAuditDate: '2025-09-30', riskLevel: 'High' },
  ];

  const categories = ['Tax', 'Labor', 'Environmental', 'Safety', 'Financial', 'Data Privacy', 'Industry Specific'];

  const filteredItems = complianceItems.filter((item) => {
    const matchesSearch = item.regulation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: complianceItems.length,
    compliant: complianceItems.filter(c => c.status === 'Compliant').length,
    dueSoon: complianceItems.filter(c => c.status === 'Due Soon').length,
    overdue: complianceItems.filter(c => c.status === 'Overdue').length,
    highRisk: complianceItems.filter(c => c.riskLevel === 'High').length
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Compliant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Non-Compliant': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'Pending Review': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Due Soon': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getRiskBadge = (risk: string) => {
    const styles: Record<string, string> = {
      High: 'bg-red-100 text-red-700',
      Medium: 'bg-yellow-100 text-yellow-700',
      Low: 'bg-green-100 text-green-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[risk]}`}>{risk}</span>;
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      Tax: 'bg-purple-100 text-purple-700',
      Labor: 'bg-blue-100 text-blue-700',
      Environmental: 'bg-green-100 text-green-700',
      Safety: 'bg-orange-100 text-orange-700',
      Financial: 'bg-indigo-100 text-indigo-700',
      'Data Privacy': 'bg-pink-100 text-pink-700',
      'Industry Specific': 'bg-cyan-100 text-cyan-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[category]}`}>{category}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Scale className="w-8 h-8 text-purple-600" />Regulatory Compliance
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and manage regulatory compliance requirements</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
          <Plus className="w-4 h-4" />Add Requirement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Requirements</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Compliant</p>
              <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Due Soon</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.dueSoon}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">High Risk</p>
              <p className="text-2xl font-bold text-orange-600">{stats.highRisk}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search compliance..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Compliant">Compliant</option>
            <option value="Due Soon">Due Soon</option>
            <option value="Overdue">Overdue</option>
            <option value="Pending Review">Pending Review</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Regulation</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Due Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Responsible</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Frequency</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Risk</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{item.regulation}</div>
                      <div className="text-xs text-gray-500 max-w-xs truncate">{item.description}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getCategoryBadge(item.category)}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{new Date(item.dueDate).toLocaleDateString()}</div>
                    {item.lastAuditDate && (
                      <div className="text-xs text-gray-500">Last: {new Date(item.lastAuditDate).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{item.responsiblePerson}</div>
                    <div className="text-xs text-gray-500">{item.department}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">{item.frequency}</td>
                  <td className="px-4 py-3 text-center">{getRiskBadge(item.riskLevel)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
