'use client';

import React, { useState } from 'react';
import { FileText, Plus, Search, Eye, Edit2, Download, Calendar, AlertTriangle, CheckCircle, Clock, DollarSign, Users } from 'lucide-react';

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  type: 'Service' | 'Supply' | 'Employment' | 'Lease' | 'Partnership' | 'NDA';
  counterparty: string;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
  status: 'Draft' | 'Active' | 'Expiring Soon' | 'Expired' | 'Terminated' | 'Under Review';
  owner: string;
  renewalType: 'Auto-renew' | 'Manual' | 'One-time';
}

export default function ContractManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const contracts: Contract[] = [
    { id: 'CT-001', contractNumber: 'CONT-2025-001', title: 'IT Infrastructure Support', type: 'Service', counterparty: 'Tech Solutions Ltd', startDate: '2025-01-01', endDate: '2025-12-31', value: 250000, currency: 'INR', status: 'Active', owner: 'IT Department', renewalType: 'Auto-renew' },
    { id: 'CT-002', contractNumber: 'CONT-2025-002', title: 'Raw Materials Supply Agreement', type: 'Supply', counterparty: 'ABC Supplies Co', startDate: '2024-07-01', endDate: '2025-01-31', value: 500000, currency: 'INR', status: 'Expiring Soon', owner: 'Procurement', renewalType: 'Manual' },
    { id: 'CT-003', contractNumber: 'CONT-2024-045', title: 'Office Lease Agreement', type: 'Lease', counterparty: 'Property Holdings', startDate: '2024-01-01', endDate: '2026-12-31', value: 1200000, currency: 'INR', status: 'Active', owner: 'Admin', renewalType: 'Manual' },
    { id: 'CT-004', contractNumber: 'CONT-2025-003', title: 'Consulting Services Agreement', type: 'Service', counterparty: 'Business Consultants Inc', startDate: '2025-01-15', endDate: '2025-04-15', value: 150000, currency: 'INR', status: 'Under Review', owner: 'Management', renewalType: 'One-time' },
    { id: 'CT-005', contractNumber: 'CONT-2024-032', title: 'Employee Non-Disclosure Agreement', type: 'NDA', counterparty: 'New Employees', startDate: '2024-06-01', endDate: '2027-06-01', value: 0, currency: 'INR', status: 'Active', owner: 'HR', renewalType: 'Auto-renew' },
    { id: 'CT-006', contractNumber: 'CONT-2023-089', title: 'Equipment Maintenance Contract', type: 'Service', counterparty: 'Maintenance Pro', startDate: '2023-06-01', endDate: '2024-12-31', value: 180000, currency: 'INR', status: 'Expired', owner: 'Operations', renewalType: 'Manual' },
  ];

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch = contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.counterparty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesType = typeFilter === 'all' || contract.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'Active').length,
    expiringSoon: contracts.filter(c => c.status === 'Expiring Soon').length,
    totalValue: contracts.filter(c => c.status === 'Active').reduce((sum, c) => sum + c.value, 0)
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Expiring Soon': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      Terminated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'Under Review': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      Service: 'bg-purple-100 text-purple-700',
      Supply: 'bg-blue-100 text-blue-700',
      Employment: 'bg-green-100 text-green-700',
      Lease: 'bg-orange-100 text-orange-700',
      Partnership: 'bg-pink-100 text-pink-700',
      NDA: 'bg-gray-100 text-gray-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>{type}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-600" />Contract Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and track all business contracts and agreements</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" />New Contract
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Contracts</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Soon</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Value</p>
          <p className="text-2xl font-bold text-indigo-600">₹{(stats.totalValue / 100000).toFixed(1)}L</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search contracts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Types</option>
            <option value="Service">Service</option>
            <option value="Supply">Supply</option>
            <option value="Lease">Lease</option>
            <option value="NDA">NDA</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
            <option value="Under Review">Under Review</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contract</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Counterparty</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Period</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Value</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Owner</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{contract.title}</div>
                      <div className="text-xs text-gray-500">{contract.contractNumber}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{contract.counterparty}</td>
                  <td className="px-4 py-3 text-center">{getTypeBadge(contract.type)}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{new Date(contract.startDate).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">to {new Date(contract.endDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {contract.value > 0 ? `₹${contract.value.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{contract.owner}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(contract.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Download"><Download className="w-4 h-4 text-gray-500" /></button>
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
