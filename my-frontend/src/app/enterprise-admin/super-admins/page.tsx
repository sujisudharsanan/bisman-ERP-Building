'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FiUsers,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiShield,
  FiPackage,
  FiCheckCircle,
  FiXCircle,
  FiPlus,
  FiX,
  FiSave,
  FiChevronDown,
  FiChevronRight,
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePageRefresh } from '@/contexts/RefreshContext';

interface Module {
  id: string;
  name: string;
  description?: string;
  businessCategory?: string;
  pages?: Page[];
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
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);

  // Module assignment modal
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<SuperAdmin | null>(null);
  const [tempAssignedModules, setTempAssignedModules] = useState<string[]>([]);
  const [tempPagePermissions, setTempPagePermissions] = useState<{ [moduleId: string]: string[] }>({});
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Group modules by business category
  const businessERPModules = availableModules.filter((m) => m.businessCategory === 'Business ERP');
  const pumpManagementModules = availableModules.filter((m) => m.businessCategory === 'Pump Management');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsDataRefreshing(true);
    } else {
      setIsLoading(true);
    }
    await Promise.all([loadMasterModules(), loadSuperAdmins()]);
    setIsLoading(false);
    setIsDataRefreshing(false);
  }, []);

  // Register refresh handler
  usePageRefresh('enterprise-super-admins', () => loadData(true));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadData();
  }, [user, loading, router, loadData]);

  useEffect(() => {
    filterSuperAdmins();
  }, [searchQuery, superAdmins]);

  const loadMasterModules = async () => {
    try {
      // Use relative URL when NEXT_PUBLIC_API_URL is not set (same-origin in Railway)
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
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

    if (searchQuery) {
      filtered = filtered.filter(
        (admin) =>
          admin.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.businessName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAdmins(filtered);
  };

  const handleEditModules = (admin: SuperAdmin) => {
    setSelectedAdmin(admin);
    setTempAssignedModules(admin.assignedModules || []);
    setTempPagePermissions(admin.pagePermissions || {});
    setShowModuleModal(true);
  };

  const handleToggleModule = (moduleId: string) => {
    if (tempAssignedModules.includes(moduleId)) {
      // Remove module
      setTempAssignedModules(tempAssignedModules.filter((id) => id !== moduleId));
      const newPermissions = { ...tempPagePermissions };
      delete newPermissions[moduleId];
      setTempPagePermissions(newPermissions);
    } else {
      // Add module with all pages
      setTempAssignedModules([...tempAssignedModules, moduleId]);
      const module = availableModules.find((m) => m.id === moduleId);
      if (module && module.pages) {
        setTempPagePermissions({
          ...tempPagePermissions,
          [moduleId]: module.pages.map((p) => p.id),
        });
      }
    }
  };

  const handleTogglePage = (moduleId: string, pageId: string) => {
    const currentPages = tempPagePermissions[moduleId] || [];
    if (currentPages.includes(pageId)) {
      setTempPagePermissions({
        ...tempPagePermissions,
        [moduleId]: currentPages.filter((id) => id !== pageId),
      });
    } else {
      setTempPagePermissions({
        ...tempPagePermissions,
        [moduleId]: [...currentPages, pageId],
      });
    }
  };

  const handleSelectAllPages = (moduleId: string) => {
    const module = availableModules.find((m) => m.id === moduleId);
    if (module && module.pages) {
      setTempPagePermissions({
        ...tempPagePermissions,
        [moduleId]: module.pages.map((p) => p.id),
      });
    }
  };

  const handleDeselectAllPages = (moduleId: string) => {
    setTempPagePermissions({
      ...tempPagePermissions,
      [moduleId]: [],
    });
  };

  const handleSaveModuleAssignment = async () => {
    if (!selectedAdmin) return;

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/super-admins/${selectedAdmin.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedModules: tempAssignedModules,
          pagePermissions: tempPagePermissions,
        }),
      });

      if (!response.ok) throw new Error('Failed to update modules');

      alert('Module assignment updated successfully!');
      setShowModuleModal(false);
      loadSuperAdmins();
    } catch (error) {
      console.error('Error updating modules:', error);
      alert('Failed to update module assignment');
    }
  };

  const toggleExpandModule = (moduleId: string) => {
    if (expandedModules.includes(moduleId)) {
      setExpandedModules(expandedModules.filter((id) => id !== moduleId));
    } else {
      setExpandedModules([...expandedModules, moduleId]);
    }
  };

  const handleDeleteAdmin = async (admin: SuperAdmin) => {
    if (!confirm(`Are you sure you want to delete ${admin.username}?`)) return;

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/super-admins/${admin.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete super admin');

      alert('Super Admin deleted successfully!');
      loadSuperAdmins();
    } catch (error) {
      console.error('Error deleting super admin:', error);
      alert('Failed to delete Super Admin');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FiShield className="text-blue-600" />
              Super Admin Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage Super Admins and assign modules
            </p>
          </div>
          {/* Create Super Admin button removed as per requirement */}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Super Admins</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{superAdmins.length}</p>
              </div>
              <FiUsers className="text-3xl text-blue-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {superAdmins.filter((a) => a.isActive).length}
                </p>
              </div>
              <FiCheckCircle className="text-3xl text-green-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Business ERP Modules</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{businessERPModules.length}</p>
              </div>
              <FiPackage className="text-3xl text-purple-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pump Modules</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pumpManagementModules.length}</p>
              </div>
              <FiPackage className="text-3xl text-orange-600" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <div className="flex items-center gap-2">
            <FiSearch className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Super Admins Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase">
                  Super Admin
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase">
                  Business
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase">
                  Assigned Modules
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAdmins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                        {admin.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{admin.username}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{admin.businessName || 'N/A'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{admin.vertical || 'General'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {admin.assignedModules && admin.assignedModules.length > 0 ? (
                        admin.assignedModules.slice(0, 3).map((moduleId) => {
                          const module = availableModules.find((m) => m.id === moduleId);
                          return (
                            <span
                              key={moduleId}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded"
                            >
                              {module?.name || moduleId}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">No modules assigned</span>
                      )}
                      {admin.assignedModules && admin.assignedModules.length > 3 && (
                        <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                          +{admin.assignedModules.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {admin.isActive ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <FiCheckCircle /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <FiXCircle /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditModules(admin)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        title="Edit Modules"
                      >
                        <FiEdit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(admin)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Module Assignment Modal */}
        {showModuleModal && selectedAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Assign Modules & Pages
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedAdmin.username} - {selectedAdmin.email}
                  </p>
                </div>
                <button
                  onClick={() => setShowModuleModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Business ERP Category */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiPackage className="text-purple-600" />
                    Business ERP
                  </h3>
                  <div className="space-y-3">
                    {businessERPModules.map((module) => {
                      const isModuleSelected = tempAssignedModules.includes(module.id);
                      const isExpanded = expandedModules.includes(module.id);
                      const selectedPages = tempPagePermissions[module.id] || [];
                      const totalPages = module.pages?.length || 0;

                      return (
                        <div
                          key={module.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                        >
                          {/* Module Header */}
                          <div
                            className={`p-4 ${
                              isModuleSelected
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'bg-white dark:bg-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isModuleSelected}
                                  onChange={() => handleToggleModule(module.id)}
                                  className="w-5 h-5 text-blue-600"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {module.name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {module.description} • {totalPages} pages
                                    {isModuleSelected && (
                                      <span className="ml-2 text-blue-600 dark:text-blue-400">
                                        ({selectedPages.length} selected)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isModuleSelected && (
                                <button
                                  onClick={() => toggleExpandModule(module.id)}
                                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                >
                                  {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Pages List */}
                          {isModuleSelected && isExpanded && module.pages && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex justify-end gap-2 mb-3">
                                <button
                                  onClick={() => handleSelectAllPages(module.id)}
                                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Select All
                                </button>
                                <button
                                  onClick={() => handleDeselectAllPages(module.id)}
                                  className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                  Deselect All
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {module.pages.map((page) => (
                                  <label
                                    key={page.id}
                                    className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedPages.includes(page.id)}
                                      onChange={() => handleTogglePage(module.id, page.id)}
                                      className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      {page.name}
                                    </span>
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

                {/* Pump Management Category */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiPackage className="text-orange-600" />
                    Pump Management
                  </h3>
                  <div className="space-y-3">
                    {pumpManagementModules.map((module) => {
                      const isModuleSelected = tempAssignedModules.includes(module.id);
                      const isExpanded = expandedModules.includes(module.id);
                      const selectedPages = tempPagePermissions[module.id] || [];
                      const totalPages = module.pages?.length || 0;

                      return (
                        <div
                          key={module.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                        >
                          {/* Module Header */}
                          <div
                            className={`p-4 ${
                              isModuleSelected
                                ? 'bg-orange-50 dark:bg-orange-900/20'
                                : 'bg-white dark:bg-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isModuleSelected}
                                  onChange={() => handleToggleModule(module.id)}
                                  className="w-5 h-5 text-orange-600"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {module.name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {module.description} • {totalPages} pages
                                    {isModuleSelected && (
                                      <span className="ml-2 text-orange-600 dark:text-orange-400">
                                        ({selectedPages.length} selected)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isModuleSelected && (
                                <button
                                  onClick={() => toggleExpandModule(module.id)}
                                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                >
                                  {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Pages List */}
                          {isModuleSelected && isExpanded && module.pages && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex justify-end gap-2 mb-3">
                                <button
                                  onClick={() => handleSelectAllPages(module.id)}
                                  className="text-xs px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
                                >
                                  Select All
                                </button>
                                <button
                                  onClick={() => handleDeselectAllPages(module.id)}
                                  className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                  Deselect All
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {module.pages.map((page) => (
                                  <label
                                    key={page.id}
                                    className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedPages.includes(page.id)}
                                      onChange={() => handleTogglePage(module.id, page.id)}
                                      className="w-4 h-4 text-orange-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      {page.name}
                                    </span>
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
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowModuleModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveModuleAssignment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <FiSave /> Save Assignment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
