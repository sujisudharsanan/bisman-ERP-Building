'use client';

import React, { useState } from 'react';
import { 
  useSupportSessions, 
  useActiveSession,
  useEndSupportSession,
  SupportSession
} from '@/hooks/useInternalOperations';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  Headphones, 
  Clock, 
  User, 
  Building2,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  Timer,
  ChevronLeft,
  ChevronRight,
  Eye,
  Shield,
  FileText
} from 'lucide-react';

export default function SupportSessionsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [page, setPage] = useState(1);
  
  const { data: sessionsData, isLoading, error, refetch } = useSupportSessions({ 
    status: statusFilter, 
    page, 
    limit: 20 
  });
  const { data: activeSessionData } = useActiveSession();
  const endSessionMutation = useEndSupportSession();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRemainingTime = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const isSessionActive = (session: SupportSession) => {
    return session.is_active && new Date(session.expires_at) > new Date();
  };

  const handleEndSession = async (sessionId: number) => {
    if (confirm('Are you sure you want to end this support session?')) {
      await endSessionMutation.mutateAsync(sessionId);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You don't have permission to view support sessions.</p>
          <Button onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-xl">
            <Headphones className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Sessions</h1>
            <p className="text-gray-600">View active and historical support access sessions</p>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Active Session Banner */}
      {activeSessionData?.session && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Timer className="w-6 h-6 text-orange-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-900">Active Support Session</h3>
                <p className="text-sm text-orange-700">
                  Assisting <span className="font-medium">{activeSessionData.session.client_name}</span> 
                  {' '} · {getRemainingTime(activeSessionData.session.expires_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="warning" className="animate-pulse">
                <Clock className="w-3 h-3 mr-1" />
                ACTIVE
              </Badge>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleEndSession(activeSessionData.session!.id)}
                disabled={endSessionMutation.isPending}
              >
                <X className="w-4 h-4 mr-1" />
                End Session
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Sessions</p>
              <p className="text-xl font-bold text-gray-900">
                {sessionsData?.sessions?.filter(s => isSessionActive(s)).length || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-xl font-bold text-gray-900">
                {sessionsData?.pagination?.total || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Page</p>
              <p className="text-xl font-bold text-gray-900">
                {sessionsData?.sessions?.length || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Expired Today</p>
              <p className="text-xl font-bold text-gray-900">
                {sessionsData?.sessions?.filter(s => 
                  !isSessionActive(s) && 
                  new Date(s.created_at).toDateString() === new Date().toDateString()
                ).length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Status:</span>
          <div className="flex gap-2">
            {(['all', 'active', 'expired'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter(status); setPage(1); }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sessions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Support User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires/Ended</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 bg-gray-200 rounded w-40" /></td>
                    <td className="px-6 py-4"><div className="h-10 bg-gray-200 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-16" /></td>
                  </tr>
                ))
              ) : !sessionsData?.sessions?.length ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Headphones className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Support Sessions</h3>
                    <p className="text-gray-500">
                      {statusFilter !== 'all' ? `No ${statusFilter} sessions found` : 'No support sessions have been created yet'}
                    </p>
                  </td>
                </tr>
              ) : (
                sessionsData.sessions.map((session) => {
                  const active = isSessionActive(session);
                  return (
                    <tr key={session.id} className={`hover:bg-gray-50 ${active ? 'bg-orange-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{session.support_user_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{session.support_user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{session.client_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{session.client_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700 max-w-xs truncate" title={session.reason}>
                          <FileText className="w-3 h-3 inline mr-1 text-gray-400" />
                          {session.reason}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(session.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {session.ended_at ? (
                          <span className="text-gray-500">Ended: {formatDate(session.ended_at)}</span>
                        ) : active ? (
                          <span className="text-orange-600 font-medium">{getRemainingTime(session.expires_at)}</span>
                        ) : (
                          <span className="text-gray-500">Expired: {formatDate(session.expires_at)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {active ? (
                          <Badge variant="warning" className="animate-pulse">
                            <Timer className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : session.ended_at ? (
                          <Badge variant="secondary">
                            <X className="w-3 h-3 mr-1" />
                            Ended
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <Clock className="w-3 h-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {active && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEndSession(session.id)}
                              disabled={endSessionMutation.isPending}
                              title="End Session"
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {sessionsData?.pagination && sessionsData.pagination.total > 20 && (
          <div className="px-6 py-3 border-t flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-600">
              Page {page} of {Math.ceil(sessionsData.pagination.total / 20)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(sessionsData.pagination.total / 20)}
                onClick={() => setPage(p => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Audit Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Audit Compliance</h4>
            <p className="text-sm text-blue-700 mt-1">
              All support sessions are logged with: support user ID, target client, reason, timestamps, 
              and all actions performed during the session. This data is retained for compliance and 
              can be reviewed by Enterprise Admins at any time.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
