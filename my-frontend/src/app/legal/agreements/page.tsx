"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, AlertCircle, Plus, Download, Filter, ChevronRight, Building2, Users, TrendingUp } from 'lucide-react';

interface Contract {
  id: string;
  contract_number: string;
  contract_type: string;
  party_name: string;
  start_date: string;
  end_date: string;
  status: string;
  monthly_value: number | null;
  days_until_expiry?: number;
}

interface Stats {
  total_active: number;
  expiring_in_30_days: number;
  monthly_commitment: number;
  advance_locked: number;
}

export default function AgreementsLegalPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch stats
        const statsRes = await fetch('/api/admin/contracts/stats', { credentials: 'include' });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data || null);
        }

        // Fetch contracts
        const url = new URL('/api/admin/contracts', window.location.origin);
        if (filterType) url.searchParams.set('contract_type', filterType);
        if (filterStatus) url.searchParams.set('status', filterStatus);
        
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch contracts');
        const data = await res.json();
        setContracts(data.data?.contracts || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load contracts');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [filterType, filterStatus]);

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'EXPIRED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'TERMINATED': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getExpiryBadge = (daysUntilExpiry?: number) => {
    if (typeof daysUntilExpiry !== 'number') return null;
    if (daysUntilExpiry < 0) {
      return <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Expired</span>;
    }
    if (daysUntilExpiry < 30) {
      return <span className="px-2 py-0.5 text-xs rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{daysUntilExpiry}d left</span>;
    }
    return <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{daysUntilExpiry}d</span>;
  };

  const getContractTypeIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'RENT': return <Building2 className="w-4 h-4" />;
      case 'SERVICE': return <Users className="w-4 h-4" />;
      case 'VENDOR': return <TrendingUp className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Agreements & Contracts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Centralized contract lifecycle and compliance management</p>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href="/admin/contracts/create" 
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Contract
          </a>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Active Contracts</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{loading ? '...' : (stats?.total_active ?? '—')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Expiring in 30 days</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{loading ? '...' : (stats?.expiring_in_30_days ?? '—')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Commitment</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {loading ? '...' : (stats?.monthly_commitment ? `₹ ${stats.monthly_commitment.toLocaleString()}` : '—')}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Advance Amount Locked</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {loading ? '...' : (stats?.advance_locked ? `₹ ${stats.advance_locked.toLocaleString()}` : '—')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-wrap gap-4">
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Types</option>
          <option value="RENT">Rent</option>
          <option value="SERVICE">Service</option>
          <option value="VENDOR">Vendor</option>
          <option value="EMPLOYMENT">Employment</option>
          <option value="LEASE">Lease</option>
        </select>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="EXPIRED">Expired</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </section>

      {/* Contracts Table */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading contracts...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Contract #</th>
                  <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Party</th>
                  <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</th>
                  <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Expiry</th>
                  <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Value</th>
                  <th className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No contracts found</p>
                      <a href="/admin/contracts/create" className="text-violet-600 hover:underline mt-2 inline-block">
                        Create your first contract
                      </a>
                    </td>
                  </tr>
                ) : (
                  contracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getContractTypeIcon(contract.contract_type)}
                          <span className="font-medium text-gray-900 dark:text-white">{contract.contract_number || contract.id}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">{contract.contract_type}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">{contract.party_name}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">{new Date(contract.start_date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-300">{new Date(contract.end_date).toLocaleDateString()}</span>
                          {getExpiryBadge(contract.days_until_expiry)}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeClass(contract.status)}`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">
                        {contract.monthly_value ? `₹ ${Number(contract.monthly_value).toLocaleString()}` : '—'}
                      </td>
                      <td className="p-4">
                        <a 
                          href={`/admin/contracts/${contract.id}`} 
                          className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                        >
                          View <ChevronRight className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
