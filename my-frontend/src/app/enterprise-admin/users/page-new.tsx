'use client';

import React, { useState, useEffect } from 'react';
import {
  FiUsers,
  FiSearch,
  FiPackage,
  FiChevronDown,
  FiChevronRight,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiMail,
  FiBriefcase,
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface Module {
  id: string;
  name: string;
  description: string;
  businessCategory?: string;
  icon?: string;
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

export default function EnterpriseAdminUsersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Group modules by business category
  const businessERPModules = availableModules.filter((m) => m.businessCategory === 'Business ERP');
  const pumpManagementModules = availableModules.filter((m) => m.businessCategory === 'Pump Management');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadData();
  }, [user, loading, router]);

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
      }
    } catch (error) {
      console.error('Error loading super admins:', error);
    }
  };

  const toggleExpandModule = (moduleId: string) => {
    if (expandedModules.includes(moduleId)) {
      setExpandedModules(expandedModules.filter((id) => id !== moduleId));
    } else {
      setExpandedModules([...expandedModules, moduleId]);
    }
  };

  const getSuperAdminsForModule = (moduleId: string) => {
    return superAdmins.filter((admin) => admin.assignedModules?.includes(moduleId));
  };

  const getModulePageCount = (moduleId: string, superAdmin: SuperAdmin) => {
    const module = availableModules.find((m) => m.id === moduleId);
    const totalPages = module?.pages?.length || 0;
    const assignedPages = superAdmin.pagePermissions?.[moduleId]?.length || 0;
    return { totalPages, assignedPages };
  };

  const filteredBusinessERPModules = businessERPModules.filter((module) =>
    searchQuery ? module.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const filteredPumpManagementModules = pumpManagementModules.filter((module) =>
    searchQuery ? module.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FiUsers className="text-blue-600" />
            Users by Module
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View Super Admins organized by assigned modules
          </p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Modules</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{availableModules.length}</p>
              </div>
              <FiPackage className="text-3xl text-purple-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Business ERP</p>
                <p className="text-2xl font-bold text-purple-600">{businessERPModules.length}</p>
              </div>
              <FiPackage className="text-3xl text-purple-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pump Management</p>
                <p className="text-2xl font-bold text-orange-600">{pumpManagementModules.length}</p>
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
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Business ERP Modules Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiPackage className="text-purple-600" />
            Business ERP Modules
          </h2>
          <div className="space-y-3">
            {filteredBusinessERPModules.map((module) => {
              const isExpanded = expandedModules.includes(module.id);
              const superAdminsInModule = getSuperAdminsForModule(module.id);
              const totalPages = module.pages?.length || 0;

              return (
                <div
                  key={module.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                  {/* Module Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors"
                    onClick={() => toggleExpandModule(module.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {isExpanded ? (
                          <FiChevronDown className="text-purple-600" size={20} />
                        ) : (
                          <FiChevronRight className="text-purple-600" size={20} />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white text-lg">
                            {module.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {module.description} • {totalPages} pages
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Super Admins
                          </div>
                          <div className="text-2xl font-bold text-purple-600">
                            {superAdminsInModule.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Super Admins List */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      {superAdminsInModule.length > 0 ? (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {superAdminsInModule.map((admin) => {
                            const { totalPages, assignedPages } = getModulePageCount(module.id, admin);
                            return (
                              <div
                                key={admin.id}
                                className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                                      {admin.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    {/* Info */}
                                    <div>
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {admin.username}
                                      </div>
                                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                          <FiMail size={14} />
                                          {admin.email}
                                        </span>
                                        {admin.businessName && (
                                          <span className="flex items-center gap-1">
                                            <FiBriefcase size={14} />
                                            {admin.businessName}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {/* Page Access */}
                                    <div className="text-right">
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Page Access
                                      </div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {assignedPages} / {totalPages} pages
                                      </div>
                                    </div>
                                    {/* Status */}
                                    <div>
                                      {admin.isActive ? (
                                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                          <FiCheckCircle /> Active
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                                          <FiXCircle /> Inactive
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <FiUsers size={48} className="mx-auto mb-2 opacity-50" />
                          <p>No Super Admins assigned to this module</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pump Management Modules Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiPackage className="text-orange-600" />
            Pump Management Modules
          </h2>
          <div className="space-y-3">
            {filteredPumpManagementModules.map((module) => {
              const isExpanded = expandedModules.includes(module.id);
              const superAdminsInModule = getSuperAdminsForModule(module.id);
              const totalPages = module.pages?.length || 0;

              return (
                <div
                  key={module.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                  {/* Module Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
                    onClick={() => toggleExpandModule(module.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {isExpanded ? (
                          <FiChevronDown className="text-orange-600" size={20} />
                        ) : (
                          <FiChevronRight className="text-orange-600" size={20} />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white text-lg">
                            {module.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {module.description} • {totalPages} pages
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Super Admins
                          </div>
                          <div className="text-2xl font-bold text-orange-600">
                            {superAdminsInModule.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Super Admins List */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      {superAdminsInModule.length > 0 ? (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {superAdminsInModule.map((admin) => {
                            const { totalPages, assignedPages } = getModulePageCount(module.id, admin);
                            return (
                              <div
                                key={admin.id}
                                className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-lg">
                                      {admin.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    {/* Info */}
                                    <div>
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {admin.username}
                                      </div>
                                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                          <FiMail size={14} />
                                          {admin.email}
                                        </span>
                                        {admin.businessName && (
                                          <span className="flex items-center gap-1">
                                            <FiBriefcase size={14} />
                                            {admin.businessName}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {/* Page Access */}
                                    <div className="text-right">
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Page Access
                                      </div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {assignedPages} / {totalPages} pages
                                      </div>
                                    </div>
                                    {/* Status */}
                                    <div>
                                      {admin.isActive ? (
                                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                          <FiCheckCircle /> Active
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                                          <FiXCircle /> Inactive
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <FiUsers size={48} className="mx-auto mb-2 opacity-50" />
                          <p>No Super Admins assigned to this module</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
