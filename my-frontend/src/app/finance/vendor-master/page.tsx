'use client';

import React, { useState, useMemo } from 'react';
import { Building2, Plus, Search, Edit2, Trash2, Eye, Package, DollarSign, MapPin, Phone, Mail, CheckCircle, XCircle, Filter } from 'lucide-react';

interface Vendor {
  id: string;
  code: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  gst: string;
  paymentTerms: string;
  creditLimit: number;
  outstandingBalance: number;
  status: 'Active' | 'Inactive' | 'Blocked';
  rating: number;
  totalOrders: number;
}

export default function VendorMasterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewVendor, setShowNewVendor] = useState(false);

  const vendors: Vendor[] = [
    { id: 'V001', code: 'VND-2025-001', name: 'ABC Suppliers Pvt Ltd', category: 'Raw Materials', email: 'contact@abcsuppliers.com', phone: '+91 98765 43210', address: '123 Industrial Area', city: 'Mumbai', country: 'India', gst: '27AABCU9603R1ZM', paymentTerms: 'Net 30', creditLimit: 5000000, outstandingBalance: 1250000, status: 'Active', rating: 4.5, totalOrders: 156 },
    { id: 'V002', code: 'VND-2025-002', name: 'XYZ Manufacturing Co', category: 'Components', email: 'sales@xyzmanufacturing.com', phone: '+91 98765 43211', address: '456 Factory Road', city: 'Pune', country: 'India', gst: '27AABCU9603R1ZN', paymentTerms: 'Net 45', creditLimit: 3000000, outstandingBalance: 750000, status: 'Active', rating: 4.2, totalOrders: 89 },
    { id: 'V003', code: 'VND-2025-003', name: 'Global Trade International', category: 'Imports', email: 'info@globaltrade.com', phone: '+91 98765 43212', address: '789 Trade Center', city: 'Delhi', country: 'India', gst: '07AABCU9603R1ZO', paymentTerms: 'Net 60', creditLimit: 10000000, outstandingBalance: 3500000, status: 'Active', rating: 4.8, totalOrders: 234 },
    { id: 'V004', code: 'VND-2025-004', name: 'Quality Parts Ltd', category: 'Spare Parts', email: 'orders@qualityparts.com', phone: '+91 98765 43213', address: '321 Parts Avenue', city: 'Chennai', country: 'India', gst: '33AABCU9603R1ZP', paymentTerms: 'Net 30', creditLimit: 2000000, outstandingBalance: 0, status: 'Inactive', rating: 3.8, totalOrders: 45 },
    { id: 'V005', code: 'VND-2025-005', name: 'Premium Packaging Solutions', category: 'Packaging', email: 'sales@premiumpack.com', phone: '+91 98765 43214', address: '654 Pack Street', city: 'Bangalore', country: 'India', gst: '29AABCU9603R1ZQ', paymentTerms: 'Net 15', creditLimit: 1500000, outstandingBalance: 450000, status: 'Active', rating: 4.0, totalOrders: 78 },
    { id: 'V006', code: 'VND-2025-006', name: 'Tech Components Inc', category: 'Electronics', email: 'procurement@techcomp.com', phone: '+91 98765 43215', address: '987 Tech Park', city: 'Hyderabad', country: 'India', gst: '36AABCU9603R1ZR', paymentTerms: 'Net 30', creditLimit: 4000000, outstandingBalance: 2100000, status: 'Blocked', rating: 2.5, totalOrders: 23 },
  ];

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    total: vendors.length,
    active: vendors.filter(v => v.status === 'Active').length,
    totalOutstanding: vendors.reduce((sum, v) => sum + v.outstandingBalance, 0),
    avgRating: (vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length).toFixed(1)
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles = {
      Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      Blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>{status}</span>;
  };

  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg key={star} className={`w-4 h-4 ${star <= Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-xs text-gray-500 ml-1">({rating})</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-orange-600" />Vendor Master
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage supplier and vendor information</p>
        </div>
        <button onClick={() => setShowNewVendor(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
          <Plus className="w-4 h-4" />Add Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Building2 className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Vendors</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding Balance</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalOutstanding)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.avgRating} ★</p>
            </div>
            <Package className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search vendors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Blocked">Blocked</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Location</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Credit Limit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Outstanding</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rating</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{vendor.name}</div>
                        <div className="text-xs text-gray-500">{vendor.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{vendor.category}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1"><Mail className="w-3 h-3" />{vendor.email}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{vendor.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1"><MapPin className="w-3 h-3" />{vendor.city}</div>
                    <div className="text-xs text-gray-500">{vendor.country}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{formatCurrency(vendor.creditLimit)}</td>
                  <td className={`px-4 py-3 text-sm font-medium text-right ${vendor.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(vendor.outstandingBalance)}</td>
                  <td className="px-4 py-3">{renderRating(vendor.rating)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(vendor.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewVendor(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Vendor</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor Name *</label><input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" placeholder="Company name" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label><select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"><option>Raw Materials</option><option>Components</option><option>Packaging</option><option>Services</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label><input type="email" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" placeholder="email@company.com" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label><input type="tel" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" placeholder="+91 00000 00000" /></div>
            </div>
            <div className="mb-4"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label><textarea rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" placeholder="Full address"></textarea></div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label><input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label><input type="text" defaultValue="India" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Number</label><input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" placeholder="XXAABCU9603R1ZX" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label><select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credit Limit</label><input type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" placeholder="0.00" /></div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowNewVendor(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg">Cancel</button>
              <button className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700">Save Vendor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
