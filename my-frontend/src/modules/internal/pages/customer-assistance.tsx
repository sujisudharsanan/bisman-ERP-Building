'use client';

import React, { useState } from 'react';
import { 
  useCustomers, 
  useCustomerDetail,
  useActiveSession,
  useStartSupportSession,
  useEndSupportSession,
  Customer
} from '@/hooks/useInternalOperations';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  Building2, 
  Search, 
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Headphones,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Timer,
  Lock,
  Unlock,
  FileText,
  Calendar
} from 'lucide-react';

export default function CustomerAssistancePage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestDuration, setRequestDuration] = useState(60);

  const { data: customersData, isLoading, error, refetch } = useCustomers({ page, limit: 20, search: search || undefined });
  const { data: customerDetail, isLoading: detailLoading } = useCustomerDetail(selectedCustomer || undefined);
  const { data: activeSessionData } = useActiveSession();
  const startSessionMutation = useStartSupportSession();
  const endSessionMutation = useEndSupportSession();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleRequestAccess = async () => {
    if (!selectedCustomer || !requestReason) return;
    
    try {
      await startSessionMutation.mutateAsync({
        clientId: selectedCustomer,
        reason: requestReason,
        durationMinutes: requestDuration
      });
      setShowRequestModal(false);
      setRequestReason('');
    } catch (err) {
      console.error('Failed to start support session:', err);
    }
  };

  const handleEndSession = async () => {
    if (!activeSessionData?.session) return;
    await endSessionMutation.mutateAsync(activeSessionData.session.id);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You don't have permission to access customer data.</p>
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
          <div className="p-3 bg-blue-100 rounded-xl">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Assistance</h1>
            <p className="text-gray-600">View and assist customers (read-only unless in support mode)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeSessionData?.session && (
            <Badge variant="warning" className="px-3 py-1.5 animate-pulse">
              <Timer className="w-4 h-4 mr-1" />
              Support Mode Active
            </Badge>
          )}
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Support Session Banner */}
      {activeSessionData?.session && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Unlock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-900">Support Access Active</h3>
                <p className="text-sm text-orange-700">
                  You have full access to <span className="font-medium">{activeSessionData.session.client_name}</span>
                </p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleEndSession}
              disabled={endSessionMutation.isPending}
            >
              <X className="w-4 h-4 mr-1" />
              End Session
            </Button>
          </div>
        </Card>
      )}

      {/* Search */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers by name, code, or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Customers ({customersData?.pagination?.total || 0})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-10 bg-gray-200 rounded w-48" /></td>
                        <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-20" /></td>
                        <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-16" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                        <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-20" /></td>
                      </tr>
                    ))
                  ) : !customersData?.customers?.length ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No Customers Found</h3>
                        <p className="text-gray-500">
                          {search ? 'Try a different search term' : 'No customers in the system'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    customersData.customers.map((customer) => (
                      <tr 
                        key={customer.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${selectedCustomer === customer.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedCustomer(customer.id)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.client_code || 'No code'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={customer.status === 'Active' ? 'success' : 'secondary'}>
                            {customer.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline">
                            {customer.subscriptionPlan}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(customer.last_activity_date)}
                        </td>
                        <td className="px-6 py-4">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer.id); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {customersData?.pagination && customersData.pagination.total > 20 && (
              <div className="px-6 py-3 border-t flex items-center justify-between bg-gray-50">
                <div className="text-sm text-gray-600">
                  Page {page} of {Math.ceil(customersData.pagination.total / 20)}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= Math.ceil(customersData.pagination.total / 20)} onClick={() => setPage(p => p + 1)}>
                    Next<ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Customer Detail Panel */}
        <div className="lg:col-span-1">
          {selectedCustomer ? (
            <Card className="sticky top-6">
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Customer Details</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {detailLoading ? (
                <div className="p-6 space-y-4">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-20 bg-gray-200 rounded" />
                  </div>
                </div>
              ) : customerDetail?.customer ? (
                <div className="p-4 space-y-4">
                  {/* Access Level Indicator */}
                  <div className={`p-3 rounded-lg flex items-center gap-3 ${customerDetail.supportModeActive ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    {customerDetail.supportModeActive ? (
                      <>
                        <Unlock className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-900">Full Access</p>
                          <p className="text-xs text-green-700">Support session active</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="text-sm font-medium text-yellow-900">Read-Only Access</p>
                          <p className="text-xs text-yellow-700">Request support access for more</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{customerDetail.customer.name}</h4>
                    <p className="text-sm text-gray-500">{customerDetail.customer.client_code}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase">Status</p>
                      <p className="font-medium">{customerDetail.customer.status}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase">Plan</p>
                      <p className="font-medium">{customerDetail.customer.subscriptionPlan}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase">Product</p>
                      <p className="font-medium">{customerDetail.customer.productType}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase">Subscription</p>
                      <p className="font-medium">{customerDetail.customer.subscriptionStatus}</p>
                    </div>
                  </div>

                  {/* Users (only if support mode active) */}
                  {customerDetail.supportModeActive && customerDetail.customer.users && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Users ({customerDetail.customer.users.length})
                      </h5>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {customerDetail.customer.users.map((user) => (
                          <div key={user.id} className="p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{user.username}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                            <Badge variant={user.is_active ? 'success' : 'secondary'} className="text-xs">
                              {user.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Support Access Button */}
                  {!customerDetail.supportModeActive && (
                    <Button 
                      className="w-full" 
                      onClick={() => setShowRequestModal(true)}
                    >
                      <Headphones className="w-4 h-4 mr-2" />
                      Request Support Access
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  Customer not found
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-6 text-center text-gray-500">
              <EyeOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Select a customer to view details</p>
            </Card>
          )}
        </div>
      </div>

      {/* Request Support Access Modal */}
      {showRequestModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Headphones className="w-5 h-5 text-orange-500" />
                Request Support Access
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowRequestModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Audit Notice</p>
                    <p className="text-xs text-yellow-700">
                      This request will be logged with your ID, reason, and all actions performed.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Reason for Access *
                </label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Describe why you need access to this customer's data..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Session Duration
                </label>
                <select
                  value={requestDuration}
                  onChange={(e) => setRequestDuration(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={240}>4 hours (max)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowRequestModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRequestAccess}
                disabled={!requestReason.trim() || startSessionMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {startSessionMutation.isPending ? 'Requesting...' : 'Start Support Session'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Read-Only Notice */}
      {!activeSessionData?.session && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Read-Only Mode</h4>
              <p className="text-sm text-blue-700 mt-1">
                You are viewing customer data in read-only mode. To access full customer details or 
                assist with account issues, request a time-limited support session. All support sessions 
                are logged for audit compliance.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
