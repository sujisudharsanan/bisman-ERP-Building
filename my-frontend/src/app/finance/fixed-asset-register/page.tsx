'use client';

import React, { useState, useMemo } from 'react';
import { Landmark, Plus, Search, Edit2, Eye, TrendingUp, TrendingDown, Building2, DollarSign, Calendar, ArrowRightLeft, Percent } from 'lucide-react';

interface FixedAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  purchaseDate: string;
  purchaseCost: number;
  usefulLife: number;
  salvageValue: number;
  depreciationMethod: string;
  accumulatedDepreciation: number;
  netBookValue: number;
  status: 'Active' | 'Disposed' | 'Under Maintenance';
}

export default function FixedAssetRegisterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const assets: FixedAsset[] = [
    { id: 'FA-001', code: 'FA-2020-001', name: 'CNC Milling Machine', category: 'Machinery', location: 'Factory Floor A', purchaseDate: '2020-03-15', purchaseCost: 2500000, usefulLife: 10, salvageValue: 250000, depreciationMethod: 'Straight Line', accumulatedDepreciation: 1125000, netBookValue: 1375000, status: 'Active' },
    { id: 'FA-002', code: 'FA-2021-002', name: 'Company Vehicle - Toyota Innova', category: 'Vehicles', location: 'Parking Lot', purchaseDate: '2021-06-20', purchaseCost: 1800000, usefulLife: 8, salvageValue: 180000, depreciationMethod: 'WDV', accumulatedDepreciation: 675000, netBookValue: 1125000, status: 'Active' },
    { id: 'FA-003', code: 'FA-2019-003', name: 'Office Building - Block A', category: 'Buildings', location: 'Main Campus', purchaseDate: '2019-01-01', purchaseCost: 50000000, usefulLife: 30, salvageValue: 5000000, depreciationMethod: 'Straight Line', accumulatedDepreciation: 9000000, netBookValue: 41000000, status: 'Active' },
    { id: 'FA-004', code: 'FA-2022-004', name: 'Server Rack - Dell PowerEdge', category: 'IT Equipment', location: 'Server Room', purchaseDate: '2022-08-10', purchaseCost: 800000, usefulLife: 5, salvageValue: 40000, depreciationMethod: 'Straight Line', accumulatedDepreciation: 380000, netBookValue: 420000, status: 'Active' },
    { id: 'FA-005', code: 'FA-2018-005', name: 'Forklift - Hyster', category: 'Machinery', location: 'Warehouse', purchaseDate: '2018-04-25', purchaseCost: 1200000, usefulLife: 8, salvageValue: 120000, depreciationMethod: 'Straight Line', accumulatedDepreciation: 911250, netBookValue: 288750, status: 'Under Maintenance' },
    { id: 'FA-006', code: 'FA-2017-006', name: 'Office Furniture Set - Conference Room', category: 'Furniture', location: 'Admin Block', purchaseDate: '2017-11-15', purchaseCost: 350000, usefulLife: 10, salvageValue: 35000, depreciationMethod: 'Straight Line', accumulatedDepreciation: 225750, netBookValue: 124250, status: 'Active' },
  ];

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  const categories = [...new Set(assets.map(a => a.category))];

  const stats = {
    totalAssets: assets.length,
    totalCost: assets.reduce((sum, a) => sum + a.purchaseCost, 0),
    totalDepreciation: assets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0),
    totalNBV: assets.reduce((sum, a) => sum + a.netBookValue, 0)
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles = {
      Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Disposed: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      'Under Maintenance': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Landmark className="w-8 h-8 text-violet-600" />Fixed Asset Register
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and manage company fixed assets</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
          <Plus className="w-4 h-4" />Add Asset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAssets}</p>
            </div>
            <Landmark className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gross Value</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalCost)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Accumulated Depreciation</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalDepreciation)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Net Book Value</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalNBV)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Asset</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Purchase Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Cost</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Depreciation</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">NBV</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{asset.name}</div>
                      <div className="text-xs text-gray-500">{asset.code}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{asset.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{asset.location}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(asset.purchaseDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{formatCurrency(asset.purchaseCost)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">({formatCurrency(asset.accumulatedDepreciation)})</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600 text-right">{formatCurrency(asset.netBookValue)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(asset.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Dispose"><ArrowRightLeft className="w-4 h-4 text-gray-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Total Gross Value:</span> <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.totalCost)}</span></div>
            <div><span className="text-gray-500">Total Depreciation:</span> <span className="font-semibold text-red-600">({formatCurrency(stats.totalDepreciation)})</span></div>
            <div><span className="text-gray-500">Total Net Book Value:</span> <span className="font-semibold text-green-600">{formatCurrency(stats.totalNBV)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
