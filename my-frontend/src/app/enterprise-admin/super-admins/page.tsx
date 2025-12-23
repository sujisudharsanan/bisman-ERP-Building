'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FiUsers,
  FiSearch,
  FiShield,
  FiPackage,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiSave,
  FiChevronDown,
  FiChevronRight,
  FiKey,
  FiMail,
  FiCalendar,
  FiUser,
  FiPlus,
  FiLock,
  FiBriefcase,
  FiLoader,
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

interface AssignedModule {
  module_id: string;
  module_name: string;
  assigned_pages: string[];
}

interface SuperAdmin {
  id: number;
  username: string;
  name?: string;
  email: string;
  businessName?: string;
  businessType?: string;
  productType?: string;
  vertical?: string;
  role: string;
  createdAt: string;
  status?: string;
  isActive: boolean;
  assignedModules: string[];
  assignedModulesData?: AssignedModule[];
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

  // Profile view modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<SuperAdmin | null>(null);
  const [adminClients, setAdminClients] = useState<{
    id: string;
    name: string;
    clientCode: string | null;
    email: string | null;
    phone: string | null;
    clientType: string | null;
    industry: string | null;
    status: string | null;
    isActive: boolean;
    subscriptionPlan: string;
    subscriptionStatus: string;
    onboardingStatus: string | null;
    createdAt: string | null;
  }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Password reset modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Create super admin modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    productType: 'BUSINESS_ERP',
  });

  // Module assignment modal (keeping for backward compatibility)
  const [showModuleModal, setShowModuleModal] = useState(false);
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
        // Transform API response to match frontend interface
        const transformedAdmins: SuperAdmin[] = data.superAdmins.map((admin: {
          id: number;
          name?: string;
          username?: string;
          email: string;
          productType?: string;
          businessName?: string;
          status?: string;
          is_active?: boolean;
          assignedModules?: Array<{ module_id: string; module_name: string; assigned_pages: string[] }> | string[];
          created_at?: string;
          createdAt?: string;
        }) => ({
          ...admin,
          // Map 'name' to 'username' if username is not provided
          username: admin.username || admin.name || admin.email?.split('@')[0] || 'Unknown',
          // Map 'status' to 'isActive' boolean
          isActive: admin.status === 'active' || admin.is_active === true,
          // Extract module IDs if assignedModules contains objects
          assignedModules: Array.isArray(admin.assignedModules)
            ? admin.assignedModules.map((m: string | { module_id: string }) =>
                typeof m === 'string' ? m : m.module_id
              )
            : [],
          // Store the full module data for display
          assignedModulesData: Array.isArray(admin.assignedModules)
            ? admin.assignedModules.filter((m): m is { module_id: string; module_name: string; assigned_pages: string[] } => typeof m !== 'string')
            : [],
          createdAt: admin.createdAt || admin.created_at || new Date().toISOString(),
          businessName: admin.businessName || admin.productType || 'N/A',
        }));
        setSuperAdmins(transformedAdmins);
        setFilteredAdmins(transformedAdmins);
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
          (admin.username || admin.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (admin.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (admin.businessName || '').toLowerCase().includes(searchQuery.toLowerCase())
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

  // View profile handler
  const handleViewProfile = async (admin: SuperAdmin) => {
    setSelectedAdmin(admin);
    setAdminClients([]);
    setShowProfileModal(true);
    
    // Fetch clients for this super admin
    setIsLoadingClients(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/super-admins/${admin.id}/clients`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.clients) {
          setAdminClients(data.clients);
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Password reset handlers
  const handleOpenPasswordReset = (admin: SuperAdmin) => {
    setSelectedAdmin(admin);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!selectedAdmin) return;
    
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsResettingPassword(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/super-admins/${selectedAdmin.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }

      alert('Password reset successfully!');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Create super admin handler
  const handleCreateSuperAdmin = async () => {
    if (!createForm.name.trim()) {
      alert('Name is required');
      return;
    }
    if (!createForm.email.trim() || !createForm.email.includes('@')) {
      alert('Valid email is required');
      return;
    }
    if (createForm.password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsCreating(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/super-admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          productType: createForm.productType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create super admin');
      }

      alert('Super Admin created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        productType: 'BUSINESS_ERP',
      });
      loadSuperAdmins();
    } catch (error) {
      console.error('Error creating super admin:', error);
      alert(error instanceof Error ? error.message : 'Failed to create super admin');
    } finally {
      setIsCreating(false);
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
      <div className="w-full">
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
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-colors"
          >
            <FiPlus size={18} />
            Create Super Admin
          </button>
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
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase">
                  Business
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
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                        {(admin.username || admin.name || 'NA').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{admin.username || admin.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">ID: {admin.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <FiMail className="text-gray-400" size={14} />
                      {admin.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{admin.businessName || admin.productType || 'N/A'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{admin.vertical || 'General'}</div>
                  </td>
                  <td className="px-6 py-4">
                    {admin.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm rounded-full">
                        <FiCheckCircle size={14} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-full">
                        <FiXCircle size={14} /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewProfile(admin)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-sm font-medium transition-colors"
                        title="View Profile"
                      >
                        <FiUser size={14} />
                        Profile
                      </button>
                      <button
                        onClick={() => handleOpenPasswordReset(admin)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg text-sm font-medium transition-colors"
                        title="Reset Password"
                      >
                        <FiKey size={14} />
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Profile View Modal */}
        {showProfileModal && selectedAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center font-bold text-2xl">
                      {(selectedAdmin.username || selectedAdmin.name || 'NA').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedAdmin.username || selectedAdmin.name || 'Unknown'}</h2>
                      <p className="text-blue-100 text-sm">Super Admin</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <FiMail className="text-gray-400" size={18} />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Email</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedAdmin.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <FiShield className="text-gray-400" size={18} />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Business / Product Type</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedAdmin.businessName || selectedAdmin.productType || 'N/A'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <FiCalendar className="text-gray-400" size={18} />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Created At</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedAdmin.createdAt ? new Date(selectedAdmin.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {selectedAdmin.isActive ? (
                    <>
                      <FiCheckCircle className="text-green-500" size={18} />
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                        <div className="text-sm font-medium text-green-600">Active</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <FiXCircle className="text-red-500" size={18} />
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                        <div className="text-sm font-medium text-red-600">Inactive</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Clients Section */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FiBriefcase size={16} />
                      Clients ({adminClients.length})
                    </h3>
                  </div>
                  
                  {isLoadingClients ? (
                    <div className="flex items-center justify-center py-8">
                      <FiLoader className="animate-spin text-blue-500" size={24} />
                      <span className="ml-2 text-gray-500">Loading clients...</span>
                    </div>
                  ) : adminClients.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <FiUsers className="mx-auto text-gray-400" size={32} />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No clients assigned yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {adminClients.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-medium text-sm">
                              {(client.name || 'C').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{client.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {client.clientCode || client.email || 'No code'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              client.isActive 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {client.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              {client.subscriptionPlan || 'Free'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    handleOpenPasswordReset(selectedAdmin);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                >
                  <FiKey size={16} />
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {showPasswordModal && selectedAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {selectedAdmin.username || selectedAdmin.name} ({selectedAdmin.email})
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 8 characters long.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={isResettingPassword || !newPassword || !confirmPassword}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {isResettingPassword ? (
                    <>Resetting...</>
                  ) : (
                    <>
                      <FiKey size={16} />
                      Reset Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Super Admin Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <FiPlus size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Create Super Admin</h2>
                      <p className="text-blue-100 text-sm">Add a new super admin to the system</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiUser className="inline mr-2" size={14} />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiMail className="inline mr-2" size={14} />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="Enter email address"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiPackage className="inline mr-2" size={14} />
                    Product Type *
                  </label>
                  <select
                    value={createForm.productType}
                    onChange={(e) => setCreateForm({ ...createForm, productType: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="BUSINESS_ERP">Business ERP</option>
                    <option value="PUMP_MANAGEMENT">Pump Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiLock className="inline mr-2" size={14} />
                    Password *
                  </label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Enter password (min 8 characters)"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiLock className="inline mr-2" size={14} />
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                    placeholder="Confirm password"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  * All fields are required. Password must be at least 8 characters.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSuperAdmin}
                  disabled={isCreating || !createForm.name || !createForm.email || !createForm.password}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {isCreating ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <FiPlus size={16} />
                      Create Super Admin
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Module Assignment Modal */}
        {showModuleModal && selectedAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Assign Modules & Pages
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedAdmin.username || selectedAdmin.name || 'Admin'} - {selectedAdmin.email}
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
