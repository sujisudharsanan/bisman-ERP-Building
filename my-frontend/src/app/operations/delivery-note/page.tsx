'use client';

import React, { useState, useMemo } from 'react';
import { Truck, Plus, Search, Eye, Edit2, Download, Package, MapPin, Calendar, User, CheckCircle, Clock, Printer, FileText } from 'lucide-react';

interface DeliveryNote {
  id: string;
  noteNumber: string;
  salesOrderRef: string;
  customer: string;
  deliveryAddress: string;
  deliveryDate: string;
  items: number;
  totalWeight: string;
  status: 'Draft' | 'Dispatched' | 'In Transit' | 'Delivered' | 'Returned';
  driver: string;
  vehicle: string;
}

export default function DeliveryNotePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const deliveryNotes: DeliveryNote[] = [
    { id: 'DN-001', noteNumber: 'DN-2025-0123', salesOrderRef: 'SO-2025-0089', customer: 'ABC Corporation', deliveryAddress: '123 Industrial Area, Mumbai', deliveryDate: '2025-01-15', items: 5, totalWeight: '250 kg', status: 'Dispatched', driver: 'Ramesh Kumar', vehicle: 'MH-12-AB-1234' },
    { id: 'DN-002', noteNumber: 'DN-2025-0124', salesOrderRef: 'SO-2025-0092', customer: 'XYZ Industries Ltd', deliveryAddress: '456 Factory Road, Pune', deliveryDate: '2025-01-16', items: 3, totalWeight: '180 kg', status: 'Draft', driver: '-', vehicle: '-' },
    { id: 'DN-003', noteNumber: 'DN-2025-0125', salesOrderRef: 'SO-2025-0078', customer: 'Global Tech Solutions', deliveryAddress: '789 Tech Park, Bangalore', deliveryDate: '2025-01-14', items: 8, totalWeight: '420 kg', status: 'Delivered', driver: 'Suresh Patil', vehicle: 'KA-01-CD-5678' },
    { id: 'DN-004', noteNumber: 'DN-2025-0126', salesOrderRef: 'SO-2025-0095', customer: 'Retail Solutions Pvt Ltd', deliveryAddress: '321 Commerce Street, Delhi', deliveryDate: '2025-01-15', items: 12, totalWeight: '650 kg', status: 'In Transit', driver: 'Vikram Singh', vehicle: 'DL-02-EF-9012' },
    { id: 'DN-005', noteNumber: 'DN-2025-0127', salesOrderRef: 'SO-2025-0088', customer: 'Manufacturing Hub', deliveryAddress: '654 Industrial Zone, Chennai', deliveryDate: '2025-01-13', items: 6, totalWeight: '380 kg', status: 'Delivered', driver: 'Mohan Raj', vehicle: 'TN-07-GH-3456' },
    { id: 'DN-006', noteNumber: 'DN-2025-0128', salesOrderRef: 'SO-2025-0101', customer: 'Quality Products Inc', deliveryAddress: '987 Business Park, Hyderabad', deliveryDate: '2025-01-17', items: 4, totalWeight: '200 kg', status: 'Draft', driver: '-', vehicle: '-' },
  ];

  const filteredNotes = useMemo(() => {
    return deliveryNotes.filter((note) => {
      const matchesSearch = note.noteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.salesOrderRef.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || note.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    total: deliveryNotes.length,
    dispatched: deliveryNotes.filter(n => n.status === 'Dispatched' || n.status === 'In Transit').length,
    delivered: deliveryNotes.filter(n => n.status === 'Delivered').length,
    pending: deliveryNotes.filter(n => n.status === 'Draft').length
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      Dispatched: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'In Transit': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Returned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-600" />Delivery Notes
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create and manage delivery notes for shipments</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" />Create Delivery Note
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Notes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Transit</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.dispatched}</p>
            </div>
            <Truck className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search delivery notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Dispatched">Dispatched</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Note Number</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Delivery Address</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vehicle</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-blue-600">{note.noteNumber}</div>
                      <div className="text-xs text-gray-500">SO: {note.salesOrderRef}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{note.customer}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{note.deliveryAddress}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(note.deliveryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{note.items}</span>
                    </div>
                    <div className="text-xs text-gray-500">{note.totalWeight}</div>
                  </td>
                  <td className="px-4 py-3">
                    {note.vehicle !== '-' ? (
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">{note.vehicle}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1"><User className="w-3 h-3" />{note.driver}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not Assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(note.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {note.status === 'Draft' && <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>}
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Print"><Printer className="w-4 h-4 text-gray-500" /></button>
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
