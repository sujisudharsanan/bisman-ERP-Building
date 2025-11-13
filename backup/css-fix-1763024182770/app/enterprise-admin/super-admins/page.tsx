'use client';

import React, { useState, useEffect } from 'react';
import {
  FiUsers,
  FiPlusCircle,
  FiEdit,
  FiTrash2,
  FiSettings,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSearch,
  FiFilter,
  FiDownload,
  FiRefreshCw,
} from 'react-icons/fi';
import Link from 'next/link';

interface SuperAdmin {
  id: string;
  business_name: string;
  business_slug: string;
  business_type_name: string;
  business_type_slug: string;
  email: string;
  phone: string;
  admin_name: string;
  is_active: boolean;
  subscription_status: string;
  subscription_plan: string;
  total_modules: number;
  enabled_modules: number;
  created_at: string;
}

export default function SuperAdminManagerPage() {
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data for demo
  const mockData: SuperAdmin[] = [
    {
      id: '1',
      business_name: 'Rajesh Petrol Pump - Highway 44',
      business_slug: 'rajesh-petrol-pump',
      business_type_name: 'Petrol Pump',
      business_type_slug: 'petrol-pump',
      email: 'rajesh@petrolpump.com',
      phone: '9876543210',
      admin_name: 'Rajesh Kumar',
      is_active: true,
      subscription_status: 'active',
      subscription_plan: 'professional',
      total_modules: 11,
      enabled_modules: 11,
      created_at: '2025-01-15T10:30:00Z',
    },
    {
      id: '2',
      business_name: 'ABC Logistics Pvt Ltd',
      business_slug: 'abc-logistics',
      business_type_name: 'Logistics',
      business_type_slug: 'logistics',
      email: 'amit@abclogistics.com',
      phone: '9876543211',
      admin_name: 'Amit Patel',
      is_active: true,
      subscription_status: 'active',
      subscription_plan: 'enterprise',
      total_modules: 12,
      enabled_modules: 12,
      created_at: '2025-01-20T14:45:00Z',
    },
  ];

  useEffect(() => {
    fetchSuperAdmins();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterType, filterStatus, superAdmins]);

  const fetchSuperAdmins = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const res = await fetch('/api/enterprise-admin/super-admins');
      // const data = await res.json();
      
      // Using mock data for demo
      setTimeout(() => {
        setSuperAdmins(mockData);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching super admins:', error);
      setSuperAdmins(mockData);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...superAdmins];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (admin) =>
          admin.business_name.toLowerCase().includes(search) ||
          admin.admin_name.toLowerCase().includes(search) ||
          admin.email.toLowerCase().includes(search) ||
          admin.phone.includes(search)
      );
    }

    // Business type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((admin) => admin.business_type_slug === filterType);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((admin) => admin.subscription_status === filterStatus);
    }

    setFilteredAdmins(filtered);
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      active: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        icon: FiCheckCircle,
        label: 'Active',
      },
      trial: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        icon: FiClock,
        label: 'Trial',
      },
      suspended: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        icon: FiXCircle,
        label: 'Suspended',
      },
      cancelled: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-300',
        icon: FiXCircle,
        label: 'Cancelled',
      },
    };

    const config = configs[status as keyof typeof configs] || configs.active;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{config.label}</span>
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      trial: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      professional: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      enterprise: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[plan as keyof typeof colors] || colors.basic}`}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </span>
    );
  };

  const handleDelete = async (id: string, businessName: string) => {
    if (!confirm(`Are you sure you want to delete "${businessName}"?\n\nThis will remove all users and data for this business. This action cannot be undone.`)) {
      return;
    }

    try {
      // TODO: Implement delete API
      console.log('Deleting super admin:', id);
      alert('Delete functionality will be implemented with backend API');
    } catch (error) {
      console.error('Error deleting super admin:', error);
      alert('Failed to delete super admin');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FiRefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading super admins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Super Admin Manager
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage business instances and their Super Admins
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchSuperAdmins}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                transition-colors flex items-center space-x-2"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <Link
              href="/enterprise-admin/super-admins/create"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                transition-colors flex items-center space-x-2"
            >
              <FiPlusCircle className="w-4 h-4" />
              <span>Create Super Admin</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Businesses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{superAdmins.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FiUsers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {superAdmins.filter((a) => a.subscription_status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FiCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Trial</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {superAdmins.filter((a) => a.subscription_status === 'trial').length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FiClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Suspended</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {superAdmins.filter((a) => a.subscription_status === 'suspended').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <FiXCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Business Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Business Types</option>
            <option value="petrol-pump">Petrol Pump</option>
            <option value="logistics">Logistics</option>
            <option value="restaurant">Restaurant</option>
            <option value="retail-store">Retail Store</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Super Admins Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Super Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Modules
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FiUsers className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400">No super admins found</p>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {admin.business_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {admin.business_slug}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {admin.admin_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {admin.email}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {admin.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded text-xs font-medium">
                        {admin.business_type_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {admin.enabled_modules}/{admin.total_modules}
                        </div>
                        <button
                          onClick={() => window.location.href = `/enterprise-admin/super-admins/${admin.id}/modules`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Manage Modules"
                        >
                          <FiSettings className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(admin.subscription_status)}
                    </td>
                    <td className="px-6 py-4">
                      {getPlanBadge(admin.subscription_plan)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/enterprise-admin/super-admins/${admin.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/enterprise-admin/super-admins/${admin.id}/edit`}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FiEdit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(admin.id, admin.business_name)}
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
    </div>
  );
}
