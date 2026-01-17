'use client';

import React, { useState } from 'react';
import { Send, Plus, Search, Eye, Edit2, Users, DollarSign, Clock, CheckCircle, Calendar, Package, Building } from 'lucide-react';

interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  category: string;
  createdDate: string;
  closingDate: string;
  itemCount: number;
  estimatedValue: number;
  currency: string;
  vendorsInvited: number;
  responsesReceived: number;
  status: 'Draft' | 'Open' | 'Closed' | 'Awarded' | 'Cancelled';
  createdBy: string;
  awardedTo?: string;
}

export default function RFQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const rfqs: RFQ[] = [
    { id: 'RFQ-001', rfqNumber: 'RFQ-2025-001', title: 'Annual Office Supplies Contract', category: 'Office Supplies', createdDate: '2025-01-10', closingDate: '2025-01-25', itemCount: 25, estimatedValue: 500000, currency: 'INR', vendorsInvited: 5, responsesReceived: 3, status: 'Open', createdBy: 'Procurement Officer' },
    { id: 'RFQ-002', rfqNumber: 'RFQ-2025-002', title: 'IT Hardware Procurement', category: 'IT Equipment', createdDate: '2025-01-08', closingDate: '2025-01-20', itemCount: 12, estimatedValue: 1500000, currency: 'INR', vendorsInvited: 8, responsesReceived: 6, status: 'Closed', createdBy: 'IT Manager' },
    { id: 'RFQ-003', rfqNumber: 'RFQ-2025-003', title: 'Raw Material Supply Q1', category: 'Raw Materials', createdDate: '2025-01-05', closingDate: '2025-01-15', itemCount: 8, estimatedValue: 2500000, currency: 'INR', vendorsInvited: 6, responsesReceived: 5, status: 'Awarded', createdBy: 'Procurement Head', awardedTo: 'ABC Supplies Co.' },
    { id: 'RFQ-004', rfqNumber: 'RFQ-2025-004', title: 'Packaging Materials', category: 'Packaging', createdDate: '2025-01-12', closingDate: '2025-01-28', itemCount: 10, estimatedValue: 350000, currency: 'INR', vendorsInvited: 4, responsesReceived: 0, status: 'Open', createdBy: 'Production Manager' },
    { id: 'RFQ-005', rfqNumber: 'RFQ-2025-005', title: 'Security Services Annual Contract', category: 'Services', createdDate: '2025-01-15', closingDate: '2025-02-01', itemCount: 1, estimatedValue: 1200000, currency: 'INR', vendorsInvited: 6, responsesReceived: 0, status: 'Draft', createdBy: 'Admin Manager' },
    { id: 'RFQ-006', rfqNumber: 'RFQ-2024-089', title: 'Maintenance Equipment', category: 'Equipment', createdDate: '2024-12-20', closingDate: '2025-01-05', itemCount: 15, estimatedValue: 800000, currency: 'INR', vendorsInvited: 7, responsesReceived: 7, status: 'Awarded', createdBy: 'Maintenance Head', awardedTo: 'Industrial Parts Inc.' },
  ];

  const filteredRFQs = rfqs.filter((rfq) => {
    const matchesSearch = rfq.rfqNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rfq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: rfqs.length,
    open: rfqs.filter(r => r.status === 'Open').length,
    awarded: rfqs.filter(r => r.status === 'Awarded').length,
    totalValue: rfqs.filter(r => r.status === 'Awarded').reduce((sum, r) => sum + r.estimatedValue, 0)
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      Open: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Closed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Awarded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getDaysRemaining = (closingDate: string) => {
    const days = Math.ceil((new Date(closingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="text-red-500">Closed</span>;
    if (days === 0) return <span className="text-orange-500">Today</span>;
    if (days <= 3) return <span className="text-yellow-600">{days} days</span>;
    return <span className="text-gray-600">{days} days</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Send className="w-8 h-8 text-purple-600" />Request for Quotation
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage vendor quotation requests and comparisons</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
          <Plus className="w-4 h-4" />Create RFQ
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total RFQs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Open</p>
              <p className="text-2xl font-bold text-green-600">{stats.open}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Awarded</p>
              <p className="text-2xl font-bold text-blue-600">{stats.awarded}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Awarded Value</p>
              <p className="text-2xl font-bold text-purple-600">₹{(stats.totalValue / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search RFQs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
            <option value="Awarded">Awarded</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">RFQ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Est. Value</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendors</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Responses</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Closes In</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRFQs.map((rfq) => (
                <tr key={rfq.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{rfq.rfqNumber}</div>
                      <div className="text-xs text-gray-500">{new Date(rfq.createdDate).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{rfq.title}</div>
                    {rfq.awardedTo && (
                      <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                        <Building className="w-3 h-3" />{rfq.awardedTo}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{rfq.category}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                      <Package className="w-4 h-4" />{rfq.itemCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">₹{rfq.estimatedValue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                      <Users className="w-4 h-4" />{rfq.vendorsInvited}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-medium ${rfq.responsesReceived > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {rfq.responsesReceived}/{rfq.vendorsInvited}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">{getDaysRemaining(rfq.closingDate)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(rfq.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {rfq.status === 'Draft' && (
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                      )}
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
