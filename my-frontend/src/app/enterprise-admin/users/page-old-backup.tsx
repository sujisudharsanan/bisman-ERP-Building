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
  FiChevronDown,
  FiChevronUp,
  FiSettings,
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface Module {
  id: string;
  name: string;
  description: string;
  pages: Page[];
}

interface Page {
  id: string;
  name: string;
  path: string;
}

interface SuperAdmin {
  id: number;
  username: string;
  email: string;
  businessName: string;
  businessType: string;
  role: string;
  createdAt: string;
  isActive: boolean;
  assignedModules: string[];
  pagePermissions: { [moduleId: string]: string[] };
}

export default function EnterpriseAdminUsersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<SuperAdmin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedAdmin, setSelectedAdmin] = useState<SuperAdmin | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>({});
  const [availableModules, setAvailableModules] = useState<Module[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Load master modules and super admins
    loadMasterModules();
    loadSuperAdmins();
  }, [user, loading, router]);

  const loadMasterModules = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/master-modules`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch master modules: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ok && data.modules) {
        setAvailableModules(data.modules);
      } else {
        console.error('Unexpected response format:', data);
        setAvailableModules([]);
      }
    } catch (error) {
      console.error('Error loading master modules:', error);
      alert('Failed to load system modules. Please try refreshing the page.');
      setAvailableModules([]);
    }
  };

  const loadSuperAdmins = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/super-admins`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch super admins: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ok && data.superAdmins) {
        setSuperAdmins(data.superAdmins);
        setFilteredAdmins(data.superAdmins);
      } else {
        console.error('Unexpected response format:', data);
        // Fallback to empty array
        setSuperAdmins([]);
        setFilteredAdmins([]);
      }
    } catch (error) {
      console.error('Error loading super admins:', error);
      // Show user-friendly error
      alert('Failed to load super admins. Please try refreshing the page.');
      setSuperAdmins([]);
      setFilteredAdmins([]);
    }
  };

  useEffect(() => {
    let filtered = superAdmins;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (admin) =>
          admin.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.businessName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter((admin) => admin.isActive === (filterRole === 'active'));
    }

    setFilteredAdmins(filtered);
  }, [searchQuery, filterRole, superAdmins]);

  const handleEditPermissions = (admin: SuperAdmin) => {
    setSelectedAdmin(admin);
    setShowPermissionModal(true);
    // Initialize expanded modules
    const expanded: { [key: string]: boolean } = {};
    admin.assignedModules.forEach((moduleId) => {
      expanded[moduleId] = true;
    });
    setExpandedModules(expanded);
  };

  const toggleModule = (moduleId: string) => {
    if (!selectedAdmin) return;

    const updatedModules = selectedAdmin.assignedModules.includes(moduleId)
      ? selectedAdmin.assignedModules.filter((id) => id !== moduleId)
      : [...selectedAdmin.assignedModules, moduleId];

    const updatedPermissions = { ...selectedAdmin.pagePermissions };
    if (!updatedModules.includes(moduleId)) {
      delete updatedPermissions[moduleId];
    } else if (!updatedPermissions[moduleId]) {
      updatedPermissions[moduleId] = [];
    }

    setSelectedAdmin({
      ...selectedAdmin,
      assignedModules: updatedModules,
      pagePermissions: updatedPermissions,
    });
  };

  const togglePage = (moduleId: string, pageId: string) => {
    if (!selectedAdmin) return;

    const currentPages = selectedAdmin.pagePermissions[moduleId] || [];
    const updatedPages = currentPages.includes(pageId)
      ? currentPages.filter((id) => id !== pageId)
      : [...currentPages, pageId];

    setSelectedAdmin({
      ...selectedAdmin,
      pagePermissions: {
        ...selectedAdmin.pagePermissions,
        [moduleId]: updatedPages,
      },
    });
  };

  const toggleAllPages = (moduleId: string) => {
    if (!selectedAdmin) return;

    const module = availableModules.find((m) => m.id === moduleId);
    if (!module) return;

    const currentPages = selectedAdmin.pagePermissions[moduleId] || [];
    const allPageIds = module.pages.map((p) => p.id);
    
    const updatedPages = currentPages.length === allPageIds.length ? [] : allPageIds;

    setSelectedAdmin({
      ...selectedAdmin,
      pagePermissions: {
        ...selectedAdmin.pagePermissions,
        [moduleId]: updatedPages,
      },
    });
  };

  const savePermissions = async () => {
    if (!selectedAdmin) return;

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${baseURL}/api/enterprise-admin/super-admins/${selectedAdmin.id}/permissions`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assignedModules: selectedAdmin.assignedModules,
            pagePermissions: selectedAdmin.pagePermissions,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update permissions: ${response.status}`);
      }

      const data = await response.json();

      if (data.ok) {
        // Update local state
        setSuperAdmins(
          superAdmins.map((admin) =>
            admin.id === selectedAdmin.id ? selectedAdmin : admin
          )
        );

        alert('Permissions updated successfully!');
        setShowPermissionModal(false);
        setSelectedAdmin(null);
      } else {
        throw new Error(data.message || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert(`Failed to save permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Super Admin Management
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage business super admins, assign modules, and configure permissions
              </p>
            </div>
            <button
              onClick={() => router.push('/enterprise-admin/dashboard')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Super Admins</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {superAdmins.length}
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
                  {superAdmins.filter((a) => a.isActive).length}
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
                  {superAdmins.filter((a) => !a.isActive).length}
                </p>
              </div>
              <FiXCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Modules</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {availableModules.length}
                </p>
              </div>
              <FiPackage className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or business..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Super Admins Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Business
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {admin.username}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {admin.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {admin.businessName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {admin.businessType}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {admin.assignedModules.slice(0, 2).map((moduleId) => (
                          <span
                            key={moduleId}
                            className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                          >
                            {availableModules.find((m) => m.id === moduleId)?.name || moduleId}
                          </span>
                        ))}
                        {admin.assignedModules.length > 2 && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            +{admin.assignedModules.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          admin.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditPermissions(admin)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                      >
                        <FiSettings className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permission Modal */}
        {showPermissionModal && selectedAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Manage Permissions
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {selectedAdmin.businessName} - {selectedAdmin.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowPermissionModal(false);
                      setSelectedAdmin(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <FiXCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {availableModules.map((module) => {
                    const isModuleAssigned = selectedAdmin.assignedModules.includes(module.id);
                    const assignedPages = selectedAdmin.pagePermissions[module.id] || [];
                    const allPagesSelected = assignedPages.length === module.pages.length;

                    return (
                      <div
                        key={module.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        {/* Module Header */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isModuleAssigned}
                                onChange={() => toggleModule(module.id)}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {module.name}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {module.description}
                                </p>
                              </div>
                            </div>
                            {isModuleAssigned && (
                              <button
                                onClick={() => toggleModuleExpansion(module.id)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                {expandedModules[module.id] ? (
                                  <FiChevronUp className="w-5 h-5" />
                                ) : (
                                  <FiChevronDown className="w-5 h-5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Page Permissions */}
                        {isModuleAssigned && expandedModules[module.id] && (
                          <div className="p-4 bg-white dark:bg-gray-800">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Page Permissions
                              </span>
                              <button
                                onClick={() => toggleAllPages(module.id)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {allPagesSelected ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {module.pages.map((page) => (
                                <label
                                  key={page.id}
                                  className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={assignedPages.includes(page.id)}
                                    onChange={() => togglePage(module.id, page.id)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {page.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {page.path}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowPermissionModal(false);
                      setSelectedAdmin(null);
                    }}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePermissions}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Permissions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
