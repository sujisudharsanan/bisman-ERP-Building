'use client';

import React, { useState } from 'react';
import { useSecurityViolations, SecurityViolation } from '@/hooks/useSecurityGovernance';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  AlertTriangle, Shield, ShieldOff, Search, Filter, RefreshCw,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, User, FileText
} from 'lucide-react';

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
};

export default function SecurityViolationsLog() {
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data, isLoading, error, refetch } = useSecurityViolations({ page, limit: 20, severity: severity || undefined });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredViolations = data?.violations?.filter((v: SecurityViolation) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return v.description?.toLowerCase().includes(query) || v.userName?.toLowerCase().includes(query) || v.resource?.toLowerCase().includes(query);
  }) || [];

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Violations</h3>
          <Button onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Violations Log</h1>
          <p className="text-gray-600 mt-1">Monitor and investigate security policy violations</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search violations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-48" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                    <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded w-20" /></td>
                  </tr>
                ))
              ) : filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Violations Found</h3>
                    <p className="text-gray-500">{searchQuery || severity ? 'Try adjusting filters' : 'No security violations detected.'}</p>
                  </td>
                </tr>
              ) : (
                filteredViolations.map((violation: SecurityViolation) => (
                  <tr key={violation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${severityColors[violation.severity] || severityColors.medium}`}>
                        <ShieldOff className="w-3 h-3" />{violation.severity?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{violation.type}</td>
                    <td className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate">{violation.description}</td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span className="text-sm">{violation.userName || 'Unknown'}</span></div></td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /><span className="text-sm truncate max-w-[120px]">{violation.resource || 'N/A'}</span></div></td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /><span className="text-sm">{formatDate(violation.createdAt)}</span></div></td>
                    <td className="px-4 py-4">
                      {violation.resolved ? (
                        <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>
                      ) : (
                        <Badge variant="warning"><AlertTriangle className="w-3 h-3 mr-1" />Open</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.pagination.total)} of {data.pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />Previous
              </Button>
              <span className="px-3 py-1 text-sm">Page {page} of {data.pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                Next<ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {data?.pagination && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><ShieldOff className="w-5 h-5 text-red-600" /></div>
              <div><p className="text-sm text-gray-600">Total Violations</p><p className="text-xl font-bold">{data.pagination.total}</p></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
              <div><p className="text-sm text-gray-600">Open Issues</p><p className="text-xl font-bold">{data.violations?.filter((v: SecurityViolation) => !v.resolved).length || 0}</p></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-sm text-gray-600">Resolved</p><p className="text-xl font-bold">{data.violations?.filter((v: SecurityViolation) => v.resolved).length || 0}</p></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-sm text-gray-600">Pages</p><p className="text-xl font-bold">{data.pagination.totalPages}</p></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
