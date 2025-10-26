'use client';

import React, { useState, useEffect } from 'react';
import {
  FiUsers,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiShield,
  FiPackage,
  FiCheckCircle,
  FiXCircle,
  FiPlus,
  FiSettings,
  FiEye,
  FiUserPlus,
  FiActivity,
  FiGrid,
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Module {
  id: string;
  name: string;
  description?: string;
  pages?: any[];
}

interface SuperAdmin {
  id: number;
  username: string;
  email: string;
  businessName?: string;
  businessType?: string;
  vertical?: string;
  role: string;
  createdAt: string;
  isActive: boolean;
  assignedModules: string[];
  totalClients?: number;
  pagePermissions?: { [moduleId: string]: string[] };
}

export default function SuperAdminManagementPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<SuperAdmin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterVertical, setFilterVertical] = useState<string>('all');
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdminForDelete, setSelectedAdminForDelete] = useState<SuperAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Available verticals
  const verticals = [
    'Petrol Pump',
    'Logistics',
    'Manufacturing',
    'Retail',
    'Wholesale',
    'Services',
    'Healthcare',
    'Education',
    'Other',
  ];

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadData();
  }, [user, loading, router]);

  useEffect(() => {
    filterSuperAdmins();
  }, [searchQuery, filterStatus, filterVertical, superAdmins]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadMasterModules(), loadSuperAdmins()]);
    setIsLoading(false);
  };

  const loadMasterModules = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/master-modules`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch modules');

      const data = await response.json();
      if (data.ok && data.modules) {
        setAvailableModules(data.modules);
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  const loadSuperAdmins = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/super-admins`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch super admins');

      const data = await response.json();
      if (data.ok && data.superAdmins) {
        setSuperAdmins(data.superAdmins);
        setFilteredAdmins(data.superAdmins);
      }
    } catch (error) {
      console.error('Error loading super admins:', error);
      alert('Failed to load Super Admins');
    }
  };

  const filterSuperAdmins = () => {
    let filtered = [...superAdmins];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (admin) =>
          admin.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.vertical?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((admin) =>
        filterStatus === 'active' ? admin.isActive : !admin.isActive
      );
    }

    // Vertical filter
    if (filterVertical !== 'all') {
      filtered = filtered.filter((admin) => admin.vertical === filterVertical);
    }

    setFilteredAdmins(filtered);
  };

  const handleToggleStatus = async (admin: SuperAdmin) => {
    const newStatus = !admin.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} ${admin.username}?`)) {
      return;
    }

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/super-admins/${admin.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} super admin`);

      const data = await response.json();
      if (data.ok) {
        alert(`Super Admin ${action}d successfully!`);
        loadSuperAdmins();
      }
    } catch (error) {
      console.error(`Error ${action}ing super admin:`, error);
      alert(`Failed to ${action} Super Admin`);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdminForDelete) return;

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${baseURL}/api/enterprise-admin/super-admins/${selectedAdminForDelete.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to delete super admin');

      const data = await response.json();
      if (data.ok) {
        alert('Super Admin deleted successfully!');
        setShowDeleteModal(false);
        setSelectedAdminForDelete(null);
        loadSuperAdmins();
      }
    } catch (error) {
      console.error('Error deleting super admin:', error);
      alert('Failed to delete Super Admin');
    }
  };

  const getModuleNames = (moduleIds: string[]) => {
    return moduleIds
      .map((id) => availableModules.find((m) => m.id === id)?.name || id)
      .join(', ');
  };

  const stats = {
    total: superAdmins.length,
    active: superAdmins.filter((a) => a.isActive).length,
    inactive: superAdmins.filter((a) => a.isActive === false).length,
    modules: availableModules.length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <FiUsers className="text-blue-600 dark:text-blue-400" />
                Super Admin Management
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Create, manage, and assign modules to Super Admins across different verticals
              </p>
            </div>
            <Link
              href="/enterprise-admin/super-admins/create"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <FiUserPlus className="w-5 h-5" />
              Create Super Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Super Admins</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.total}
                </p>
              </div>
              <FiUsers className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {stats.active}
                </p>
              </div>
              <FiCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {stats.inactive}
                </p>
              </div>
              <FiXCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available Modules</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {stats.modules}
                </p>
              </div>
              <FiPackage className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, business..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Vertical Filter */}
            <div>
              <select
                value={filterVertical}
                onChange={(e) => setFilterVertical(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Verticals</option>
                {verticals.map((vertical) => (
                  <option key={vertical} value={vertical}>
                    {vertical}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Super Admins List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Super Admins...</p>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="p-8 text-center">
              <FiUsers className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No Super Admins found. Create your first Super Admin to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Super Admin
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Vertical/Segment
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Assigned Modules
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Clients
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                              {admin.username.substring(0, 2).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {admin.username}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {admin.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {admin.businessName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {admin.vertical || admin.businessType || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {admin.assignedModules && admin.assignedModules.length > 0 ? (
                            <>
                              {admin.assignedModules.slice(0, 3).map((moduleId) => {
                                const module = availableModules.find((m) => m.id === moduleId);
                                return (
                                  <span
                                    key={moduleId}
                                    className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                                  >
                                    {module?.name || moduleId}
                                  </span>
                                );
                              })}
                              {admin.assignedModules.length > 3 && (
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                  +{admin.assignedModules.length - 3} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">No modules assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {admin.totalClients || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(admin)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                            admin.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {admin.isActive ? (
                            <>
                              <FiCheckCircle className="w-3 h-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <FiXCircle className="w-3 h-3" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/enterprise-admin/super-admins/${admin.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View Details"
                          >
                            <FiEye className="w-5 h-5" />
                          </Link>
                          <Link
                            href={`/enterprise-admin/super-admins/${admin.id}/edit`}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Edit"
                          >
                            <FiEdit className="w-5 h-5" />
                          </Link>
                          <Link
                            href={`/enterprise-admin/super-admins/${admin.id}/modules`}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                            title="Manage Modules"
                          >
                            <FiSettings className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedAdminForDelete(admin);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAdminForDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{selectedAdminForDelete.username}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAdminForDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAdmin}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
