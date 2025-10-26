'use client';

import React, { useState, useEffect } from 'react';
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiEdit,
  FiTrash2,
  FiEye,
  FiDownload,
  FiRefreshCw,
  FiUserPlus,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiPhone,
  FiMail,
  FiMapPin,
  FiCreditCard,
  FiFileText,
} from 'react-icons/fi';
import { NonPrivilegedUser, UserRoleType, ApprovalStatus } from '../payment-types';

interface FilterState {
  search: string;
  roleType: UserRoleType | 'all';
  approvalStatus: ApprovalStatus | 'all';
  gstType: 'all' | 'with_gst' | 'without_gst';
}

export default function NonPrivilegedUsersListPage() {
  const [users, setUsers] = useState<NonPrivilegedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<NonPrivilegedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<NonPrivilegedUser | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    roleType: 'all',
    approvalStatus: 'all',
    gstType: 'all',
  });

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [filters, users]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/payment/non-privileged-users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
      // Mock data for development
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.contact_number.includes(searchLower) ||
          user.pan_number.toLowerCase().includes(searchLower) ||
          user.business_name?.toLowerCase().includes(searchLower)
      );
    }

    // Role type filter
    if (filters.roleType !== 'all') {
      filtered = filtered.filter((user) => user.role_type === filters.roleType);
    }

    // Approval status filter
    if (filters.approvalStatus !== 'all') {
      filtered = filtered.filter((user) => user.approvalStatus === filters.approvalStatus);
    }

    // GST type filter
    if (filters.gstType !== 'all') {
      filtered = filtered.filter((user) => user.gst_type === filters.gstType);
    }

    setFilteredUsers(filtered);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleViewDetails = (user: NonPrivilegedUser) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/payment/non-privileged-users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      alert('User deleted successfully');
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user. Please try again.');
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    const config = {
      pending_manager_approval: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        icon: FiClock,
        label: 'Pending Manager',
      },
      pending_admin_approval: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        icon: FiClock,
        label: 'Pending Admin',
      },
      approved: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        icon: FiCheckCircle,
        label: 'Approved',
      },
      rejected: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-300',
        icon: FiXCircle,
        label: 'Rejected',
      },
    };

    const { bg, text, icon: Icon, label } = config[status];

    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </span>
    );
  };

  const getRoleLabel = (role: UserRoleType) => {
    const labels = {
      vendor: 'Vendor',
      building_owner: 'Building Owner',
      creditor: 'Creditor',
    };
    return labels[role];
  };

  const exportToCSV = () => {
    const headers = [
      'Name',
      'Business Name',
      'Role',
      'Contact',
      'Email',
      'PAN',
      'Status',
      'GST Type',
      'Service Type',
    ];
    
    const rows = filteredUsers.map((user) => [
      user.full_name,
      user.business_name || '-',
      getRoleLabel(user.role_type),
      user.contact_number,
      user.email || '-',
      user.pan_number,
      user.approval_status,
      user.gst_type,
      user.service_type,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `non-privileged-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FiRefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FiUsers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Non-Privileged Users
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                transition-colors duration-200 flex items-center space-x-2"
            >
              <FiDownload className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                transition-colors duration-200 flex items-center space-x-2"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => window.location.href = '/payment/non-privileged-users/new'}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                transition-colors duration-200 flex items-center space-x-2"
            >
              <FiUserPlus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, PAN, or business name..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg transition-colors duration-200 flex items-center space-x-2
                ${showFilters 
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <FiFilter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role Type
                </label>
                <select
                  value={filters.roleType}
                  onChange={(e) => handleFilterChange('roleType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Roles</option>
                  <option value="vendor">Vendor</option>
                  <option value="building_owner">Building Owner</option>
                  <option value="creditor">Creditor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Approval Status
                </label>
                <select
                  value={filters.approvalStatus}
                  onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending_manager_approval">Pending Manager</option>
                  <option value="pending_admin_approval">Pending Admin</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GST Type
                </label>
                <select
                  value={filters.gstType}
                  onChange={(e) => handleFilterChange('gstType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="with_gst">With GST</option>
                  <option value="without_gst">Without GST</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role & Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm mt-1">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.full_name}
                        </div>
                        {user.business_name && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.business_name}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          PAN: {user.pan_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getRoleLabel(user.role_type)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {user.gst_type === 'with_gst' ? 'With GST' : 'Without GST'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.service_type}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-gray-900 dark:text-white">
                          <FiPhone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{user.contact_number}</span>
                        </div>
                        {user.email && (
                          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <FiMail className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[150px]">{user.email}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <FiMapPin className="w-3.5 h-3.5" />
                          <span>{user.city}, {user.state}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(user.approvalStatus)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.location.href = `/payment/non-privileged-users/edit/${user.id}`}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                User Details
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiXCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <FiUsers className="w-5 h-5" />
                  <span>Personal Information</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                    <p className="text-gray-900 dark:text-white">{selectedUser.full_name}</p>
                  </div>
                  {selectedUser.business_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Business Name</label>
                      <p className="text-gray-900 dark:text-white">{selectedUser.business_name}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Role Type</label>
                    <p className="text-gray-900 dark:text-white">{getRoleLabel(selectedUser.role_type)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Service Type</label>
                    <p className="text-gray-900 dark:text-white">{selectedUser.service_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">PAN Number</label>
                    <p className="text-gray-900 dark:text-white font-mono">{selectedUser.pan_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">GST Type</label>
                    <p className="text-gray-900 dark:text-white">
                      {selectedUser.gst_type === 'with_gst' ? 'With GST' : 'Without GST'}
                    </p>
                  </div>
                  {selectedUser.gst_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">GST Number</label>
                      <p className="text-gray-900 dark:text-white font-mono">{selectedUser.gst_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <FiMapPin className="w-5 h-5" />
                  <span>Contact Information</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                    <p className="text-gray-900 dark:text-white">{selectedUser.address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">City</label>
                    <p className="text-gray-900 dark:text-white">{selectedUser.city}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">State</label>
                    <p className="text-gray-900 dark:text-white">{selectedUser.state}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Pincode</label>
                    <p className="text-gray-900 dark:text-white">{selectedUser.pincode}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact Number</label>
                    <p className="text-gray-900 dark:text-white">{selectedUser.contact_number}</p>
                  </div>
                  {selectedUser.email && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                      <p className="text-gray-900 dark:text-white">{selectedUser.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <FiCreditCard className="w-5 h-5" />
                  <span>Bank Details</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Holder</label>
                    <p className="text-gray-900 dark:text-white">{selectedUser.bank_holder_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Bank Name</label>
                    <p className="text-gray-900 dark:text-white">{selectedUser.bank_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Number</label>
                    <p className="text-gray-900 dark:text-white font-mono">{selectedUser.account_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">IFSC Code</label>
                    <p className="text-gray-900 dark:text-white font-mono">{selectedUser.ifsc_code}</p>
                  </div>
                  {selectedUser.upi_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">UPI ID</label>
                      <p className="text-gray-900 dark:text-white">{selectedUser.upi_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              {selectedUser.remarks && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                    <FiFileText className="w-5 h-5" />
                    <span>Remarks</span>
                  </h3>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedUser.remarks}</p>
                </div>
              )}

              {/* Status */}
              <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Approval Status</h3>
                {getStatusBadge(selectedUser.approvalStatus)}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800
                  transition-colors duration-200"
              >
                Close
              </button>
              <button
                onClick={() => window.location.href = `/payment/non-privileged-users/edit/${selectedUser.id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                  transition-colors duration-200 flex items-center space-x-2"
              >
                <FiEdit className="w-4 h-4" />
                <span>Edit User</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mock data for development
const mockUsers = [
  {
    id: '1',
    full_name: 'Rajesh Kumar',
    business_name: 'Kumar Transport Services',
    role_type: 'vendor',
    gst_type: 'with_gst',
    service_type: 'transport',
    address: '123 Main Street, Sector 15',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    contact_number: '9876543210',
    email: 'rajesh@kumar.com',
    bank_holder_name: 'Rajesh Kumar',
    bank_name: 'HDFC Bank',
    account_number: '12345678901234',
    ifsc_code: 'HDFC0001234',
    upi_id: 'rajesh@upi',
    pan_number: 'ABCDE1234F',
    gst_number: '29ABCDE1234F1Z5',
    approvalStatus: 'approved',
    approval_status: 'approved',
    created_at: '2025-01-15T10:30:00Z',
    updated_at: '2025-01-20T14:45:00Z',
  },
  {
    id: '2',
    full_name: 'Priya Sharma',
    business_name: 'Sharma Property Management',
    role_type: 'building_owner',
    gst_type: 'without_gst',
    service_type: 'rent',
    address: '456 Park Avenue, Whitefield',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560066',
    contact_number: '9876543211',
    email: 'priya@sharma.com',
    bank_holder_name: 'Priya Sharma',
    bank_name: 'ICICI Bank',
    account_number: '98765432109876',
    ifsc_code: 'ICIC0001234',
    pan_number: 'FGHIJ5678K',
    approvalStatus: 'pending_manager_approval',
    approval_status: 'pending_manager_approval',
    created_at: '2025-01-22T09:15:00Z',
    updated_at: '2025-01-22T09:15:00Z',
  },
  {
    id: '3',
    full_name: 'Amit Patel',
    role_type: 'creditor',
    gst_type: 'with_gst',
    service_type: 'consultancy',
    address: '789 Tech Park, Electronic City',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560100',
    contact_number: '9876543212',
    bank_holder_name: 'Amit Patel',
    bank_name: 'SBI',
    account_number: '11223344556677',
    ifsc_code: 'SBIN0001234',
    pan_number: 'LMNOP9012Q',
    gst_number: '29LMNOP9012Q1Z5',
    approvalStatus: 'pending_admin_approval',
    approval_status: 'pending_admin_approval',
    created_at: '2025-01-23T11:20:00Z',
    updated_at: '2025-01-24T08:30:00Z',
  },
] as unknown as NonPrivilegedUser[];
