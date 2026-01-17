'use client';

import React, { useState, useMemo } from 'react';
import { ClipboardCheck, Plus, Search, Eye, CheckCircle, XCircle, Clock, AlertTriangle, Package, Calendar, User, FileText, Camera } from 'lucide-react';

interface Inspection {
  id: string;
  inspectionNumber: string;
  referenceType: 'Purchase Receipt' | 'Work Order' | 'Stock Entry';
  referenceNumber: string;
  item: string;
  itemCode: string;
  quantity: number;
  inspectedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  inspectionDate: string;
  inspector: string;
  status: 'Pending' | 'In Progress' | 'Passed' | 'Failed' | 'Partial';
  defects?: string;
}

export default function QualityInspectionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const inspections: Inspection[] = [
    { id: 'QI-001', inspectionNumber: 'QI-2025-0089', referenceType: 'Purchase Receipt', referenceNumber: 'PR-2025-0156', item: 'Raw Material A', itemCode: 'RM-001', quantity: 500, inspectedQty: 500, acceptedQty: 485, rejectedQty: 15, inspectionDate: '2025-01-15', inspector: 'Quality Inspector 1', status: 'Partial', defects: 'Surface scratches on 15 units' },
    { id: 'QI-002', inspectionNumber: 'QI-2025-0090', referenceType: 'Work Order', referenceNumber: 'WO-2025-0034', item: 'Assembly Unit A', itemCode: 'ASM-001', quantity: 45, inspectedQty: 45, acceptedQty: 45, rejectedQty: 0, inspectionDate: '2025-01-15', inspector: 'Quality Inspector 2', status: 'Passed' },
    { id: 'QI-003', inspectionNumber: 'QI-2025-0091', referenceType: 'Purchase Receipt', referenceNumber: 'PR-2025-0158', item: 'Component B', itemCode: 'CMP-002', quantity: 200, inspectedQty: 0, acceptedQty: 0, rejectedQty: 0, inspectionDate: '2025-01-16', inspector: 'Unassigned', status: 'Pending' },
    { id: 'QI-004', inspectionNumber: 'QI-2025-0092', referenceType: 'Work Order', referenceNumber: 'WO-2025-0036', item: 'Finished Product X', itemCode: 'FP-X01', quantity: 50, inspectedQty: 50, acceptedQty: 50, rejectedQty: 0, inspectionDate: '2025-01-14', inspector: 'Quality Inspector 1', status: 'Passed' },
    { id: 'QI-005', inspectionNumber: 'QI-2025-0093', referenceType: 'Purchase Receipt', referenceNumber: 'PR-2025-0160', item: 'Electronic Part C', itemCode: 'EP-003', quantity: 100, inspectedQty: 100, acceptedQty: 0, rejectedQty: 100, inspectionDate: '2025-01-14', inspector: 'Quality Inspector 2', status: 'Failed', defects: 'Wrong specifications - entire batch rejected' },
    { id: 'QI-006', inspectionNumber: 'QI-2025-0094', referenceType: 'Stock Entry', referenceNumber: 'SE-2025-0157', item: 'Sub-Assembly D', itemCode: 'SUB-004', quantity: 75, inspectedQty: 30, acceptedQty: 28, rejectedQty: 2, inspectionDate: '2025-01-15', inspector: 'Quality Inspector 1', status: 'In Progress' },
  ];

  const filteredInspections = useMemo(() => {
    return inspections.filter((inspection) => {
      const matchesSearch = inspection.inspectionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inspection.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    total: inspections.length,
    pending: inspections.filter(i => i.status === 'Pending' || i.status === 'In Progress').length,
    passed: inspections.filter(i => i.status === 'Passed').length,
    failed: inspections.filter(i => i.status === 'Failed').length,
    acceptanceRate: Math.round((inspections.reduce((sum, i) => sum + i.acceptedQty, 0) / inspections.reduce((sum, i) => sum + i.inspectedQty, 0) || 0) * 100)
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Pending: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Passed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      Partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    };
    const icons: Record<string, any> = { Pending: Clock, 'In Progress': ClipboardCheck, Passed: CheckCircle, Failed: XCircle, Partial: AlertTriangle };
    const Icon = icons[status];
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}><Icon className="w-3 h-3" />{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-teal-600" />Quality Inspection
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Inspect incoming materials and production output</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus className="w-4 h-4" />New Inspection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Inspections</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Passed</p>
          <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Acceptance Rate</p>
          <p className="text-2xl font-bold text-teal-600">{stats.acceptanceRate}%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search inspections..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
            <option value="Partial">Partial</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Inspection #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Item</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Qty</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Inspected</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Accepted</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rejected</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Inspector</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInspections.map((inspection) => (
                <tr key={inspection.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-teal-600">{inspection.inspectionNumber}</div>
                    <div className="text-xs text-gray-500">{new Date(inspection.inspectionDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-500">{inspection.referenceType}</div>
                    <div className="text-sm text-gray-900 dark:text-white">{inspection.referenceNumber}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">{inspection.item}</div>
                        <div className="text-xs text-gray-500">{inspection.itemCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">{inspection.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-center">{inspection.inspectedQty}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600 text-center">{inspection.acceptedQty}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600 text-center">{inspection.rejectedQty}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{inspection.inspector}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(inspection.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Report"><FileText className="w-4 h-4 text-gray-500" /></button>
                      {(inspection.status === 'Pending' || inspection.status === 'In Progress') && (
                        <button className="p-1.5 hover:bg-teal-100 dark:hover:bg-teal-900/30 rounded" title="Inspect"><ClipboardCheck className="w-4 h-4 text-teal-600" /></button>
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
