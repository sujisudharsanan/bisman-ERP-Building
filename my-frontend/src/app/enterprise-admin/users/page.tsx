'use client';

import React, { useState, useEffect } from 'react';
import {
  FiUsers,
  FiPackage,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiMail,
  FiPlus,
  FiTrash2,
  FiX,
  FiAlertCircle,
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import EnterpriseAdminNavbar from '@/components/EnterpriseAdminNavbar';
import EnterpriseAdminSidebar from '@/components/EnterpriseAdminSidebar';

interface Module {
  id: number; // Changed from string to number (database ID)
  module_name?: string; // Added: module identifier
  display_name?: string; // Added: display name
  name: string;
  description: string;
  businessCategory?: string;
  icon?: string;
  pages?: Page[];
  productType?: string; // Added: BUSINESS_ERP or PUMP_ERP
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
  productType?: string;  // Added: BUSINESS_ERP or PUMP_ERP
  createdAt: string;
  isActive: boolean;
  assignedModules: number[]; // Changed from string[] to number[] (database IDs)
  totalClients?: number;
  pagePermissions?: Record<number, string[]>; // More flexible type for numeric keys
}

export default function EnterpriseAdminUsersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(''); // 'Business ERP' or 'Pump Management'
  const [selectedSuperAdminFilter, setSelectedSuperAdminFilter] = useState<number | null>(null); // Filter modules by Super Admin
  const [selectedModule, setSelectedModule] = useState<Module | null>(null); // Selected module for page management
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]); // Selected pages for assignment
  const [isSaving, setIsSaving] = useState(false);
  
  // Create Super Admin Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    username: '',
    email: '',
    password: '',
    productType: 'BUSINESS_ERP' as 'BUSINESS_ERP' | 'PUMP_ERP'
  });

  // Show ALL modules for both categories (no filtering by businessCategory)
  const businessERPModules = availableModules; // All modules available for Business ERP
  const pumpManagementModules = availableModules; // All modules available for Pump Management
  
  // Get modules for active category (both categories show all modules)
  let activeCategoryModules = activeCategory ? availableModules : [];
  
  // NOTE: Show ALL modules when Super Admin is selected, not just assigned ones
  // This allows Enterprise Admin to see which modules to assign/remove
  
  // Get Super Admins based on their productType matching the active category
  // Business ERP -> show only BUSINESS_ERP super admins
  // Pump Management -> show only PUMP_ERP super admins
  const superAdminsInCategory = activeCategory
    ? superAdmins.filter(admin => {
        const categoryToProductType = {
          'Business ERP': 'BUSINESS_ERP',
          'Pump Management': 'PUMP_ERP'
        };
        return admin.productType === categoryToProductType[activeCategory as keyof typeof categoryToProductType];
      })
    : [];

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
      console.log('🔵 Master modules loaded:', data.modules);
      if (data.ok && data.modules) {
        // Log pages for each module
        data.modules.forEach((module: Module) => {
          console.log(`Module: ${module.name} (ID: ${module.id}), Pages:`, module.pages?.length || 0, module.pages);
        });
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
      console.log('🔵 Super Admins loaded:', data.superAdmins);
      if (data.ok && data.superAdmins) {
        // Log page permissions for debugging
        data.superAdmins.forEach((admin: SuperAdmin) => {
          console.log(`Admin: ${admin.username}, Page Permissions:`, admin.pagePermissions);
        });
        setSuperAdmins(data.superAdmins);
      }
    } catch (error) {
      console.error('Error loading super admins:', error);
    }
  };

  const getSuperAdminsForModule = (moduleId: number) => {
    return superAdmins.filter((admin) => admin.assignedModules?.includes(moduleId));
  };

  const getModulePageCount = (moduleId: number, superAdmin: SuperAdmin) => {
    const module = availableModules.find((m) => m.id === moduleId);
    const totalPages = module?.pages?.length || 0;
    const assignedPages = superAdmin.pagePermissions?.[moduleId]?.length || 0;
    return { totalPages, assignedPages };
  };

  const handleModuleClick = (module: Module) => {
    console.log('🔵 Module clicked:', module.name, 'ID:', module.id, 'Type:', typeof module.id);
    setSelectedModule(module);
    // Load currently assigned pages for the selected Super Admin
    if (selectedSuperAdminFilter) {
      const admin = superAdmins.find(a => a.id === selectedSuperAdminFilter);
      console.log('🔵 Selected admin:', admin?.username);
      console.log('🔵 Admin page permissions object:', admin?.pagePermissions);
      console.log('🔵 All keys in pagePermissions:', admin?.pagePermissions ? Object.keys(admin.pagePermissions) : 'none');
      console.log('🔵 Looking for module ID:', module.id);
      console.log('🔵 Pages for this module (direct access):', admin?.pagePermissions?.[module.id]);
      
      // Try both numeric and string keys to debug
      if (admin?.pagePermissions) {
        const numericKey = admin.pagePermissions[module.id];
        const stringKey = (admin.pagePermissions as any)[module.id.toString()];
        console.log('🔵 Numeric key result:', numericKey);
        console.log('🔵 String key result:', stringKey);
      }
      
      if (admin && admin.pagePermissions?.[module.id]) {
        setSelectedPageIds(admin.pagePermissions[module.id]);
        console.log('✅ Set selected page IDs:', admin.pagePermissions[module.id]);
      } else {
        setSelectedPageIds([]);
        console.log('⚠️ No pages assigned for this module');
      }
    } else {
      setSelectedPageIds([]);
      console.log('⚠️ No super admin selected');
    }
  };

  const togglePageSelection = (pageId: string) => {
    if (selectedPageIds.includes(pageId)) {
      setSelectedPageIds(selectedPageIds.filter(id => id !== pageId));
    } else {
      setSelectedPageIds([...selectedPageIds, pageId]);
    }
  };

  const toggleSelectAllPages = () => {
    if (!selectedModule) return;
    const allPageIds = selectedModule.pages?.map(p => p.id) || [];
    if (selectedPageIds.length === allPageIds.length) {
      setSelectedPageIds([]);
    } else {
      setSelectedPageIds(allPageIds);
    }
  };

  const assignModuleToSuperAdmin = async () => {
    if (!selectedSuperAdminFilter || !selectedModule) {
      alert('Please select a Super Admin and Module');
      return;
    }

    setIsSaving(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${baseURL}/api/enterprise-admin/super-admins/${selectedSuperAdminFilter}/assign-module`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            moduleId: selectedModule.id,
            pageIds: selectedPageIds,
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to assign module');
      }

      alert('Module assigned successfully!');
      await loadSuperAdmins(); // Reload data
      setSelectedModule(null);
      setSelectedPageIds([]);
    } catch (error: any) {
      console.error('Error assigning module:', error);
      alert(error.message || 'Failed to assign module');
    } finally {
      setIsSaving(false);
    }
  };

  const unassignModuleFromSuperAdmin = async () => {
    if (!selectedSuperAdminFilter || !selectedModule) {
      alert('Please select a Super Admin and Module');
      return;
    }

    if (!confirm(`Remove ${selectedModule.name} access from this Super Admin?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${baseURL}/api/enterprise-admin/super-admins/${selectedSuperAdminFilter}/unassign-module`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            moduleId: selectedModule.id,
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to unassign module');
      }

      alert('Module unassigned successfully!');
      await loadSuperAdmins(); // Reload data
      setSelectedModule(null);
      setSelectedPageIds([]);
    } catch (error: any) {
      console.error('Error unassigning module:', error);
      alert(error.message || 'Failed to unassign module');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createFormData.username || !createFormData.email || !createFormData.password) {
      alert('Please fill all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/super-admins`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFormData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create super admin');
      }

      alert('Super Admin created successfully!');
      await loadSuperAdmins();
      setShowCreateModal(false);
      setCreateFormData({
        username: '',
        email: '',
        password: '',
        productType: 'BUSINESS_ERP'
      });
    } catch (error: any) {
      console.error('Error creating super admin:', error);
      alert(error.message || 'Failed to create super admin');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSuperAdmin = async (adminId: number, adminUsername: string) => {
    if (!confirm(`Are you sure you want to delete Super Admin "${adminUsername}"? This action cannot be undone.`)) {
      return;
    }

    setIsSaving(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/super-admins/${adminId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete super admin');
      }

      alert('Super Admin deleted successfully!');
      
      // Clear selection if deleted admin was selected
      if (selectedSuperAdminFilter === adminId) {
        setSelectedSuperAdminFilter(null);
        setSelectedModule(null);
      }
      
      await loadSuperAdmins();
    } catch (error: any) {
      console.error('Error deleting super admin:', error);
      alert(error.message || 'Failed to delete super admin');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Top Navigation */}
      <EnterpriseAdminNavbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 lg:hidden backdrop-blur-sm top-14"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-14 left-0 bottom-0 w-64 z-40 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <EnterpriseAdminSidebar className="h-full" />
      </aside>

      {/* Main Content */}
      <div className="pt-14 lg:pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <FiPackage className="text-blue-600" />
                Module Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                View modules on the left, Super Admins assigned to each module on the right
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center gap-2 font-medium shadow-sm"
            >
              <FiPlus size={18} />
              Create Super Admin
            </button>
          </div>
        </div>

        {/* Stats Cards - Reduced size */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Super Admins</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{superAdmins.length}</p>
              </div>
              <FiUsers className="text-2xl text-blue-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Modules</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{availableModules.length}</p>
              </div>
              <FiPackage className="text-2xl text-purple-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Business ERP</p>
                <p className="text-xl font-bold text-purple-600">{businessERPModules.length}</p>
              </div>
              <FiPackage className="text-2xl text-purple-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Pump Management</p>
                <p className="text-xl font-bold text-orange-600">{pumpManagementModules.length}</p>
              </div>
              <FiPackage className="text-2xl text-orange-600" />
            </div>
          </div>
        </div>

        {/* Main Content: Four-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* COLUMN 1: Category Selection - Compact */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow sticky top-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FiPackage className="text-blue-600" size={16} />
                Categories
              </h2>

              {/* Business ERP Category */}
              <button
                onClick={() => {
                  setActiveCategory('Business ERP');
                  setSelectedSuperAdminFilter(null);
                  setSelectedModule(null);
                }}
                className={`w-full text-left p-2.5 rounded-lg transition-all border-2 mb-3 ${
                  activeCategory === 'Business ERP'
                    ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 dark:border-purple-600 shadow-lg'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activeCategory === 'Business ERP'
                      ? 'bg-purple-600'
                      : 'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    <FiPackage className={`text-sm ${
                      activeCategory === 'Business ERP'
                        ? 'text-white'
                        : 'text-purple-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-xs truncate">
                      Business ERP
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                      {businessERPModules.length} Modules
                    </p>
                  </div>
                </div>
              </button>

              {/* Pump Management Category */}
              <button
                onClick={() => {
                  setActiveCategory('Pump Management');
                  setSelectedSuperAdminFilter(null);
                  setSelectedModule(null);
                }}
                className={`w-full text-left p-2.5 rounded-lg transition-all border-2 ${
                  activeCategory === 'Pump Management'
                    ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-500 dark:border-orange-600 shadow-lg'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activeCategory === 'Pump Management'
                      ? 'bg-orange-600'
                      : 'bg-orange-100 dark:bg-orange-900/30'
                  }`}>
                    <FiPackage className={`text-sm ${
                      activeCategory === 'Pump Management'
                        ? 'text-white'
                        : 'text-orange-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-xs truncate">
                      Pump Management
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                      {pumpManagementModules.length} Modules
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* COLUMN 2: Super Admin List - Compact */}
          <div className="lg:col-span-3">
            {activeCategory ? (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiShield className={activeCategory === 'Business ERP' ? 'text-purple-600' : 'text-orange-600'} size={16} />
                    Super Admins
                  </h2>
                  {selectedSuperAdminFilter && (
                    <button
                      onClick={() => {
                        setSelectedSuperAdminFilter(null);
                        setSelectedModule(null);
                      }}
                      className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                {superAdminsInCategory.length > 0 ? (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {superAdminsInCategory.map((admin) => {
                      const isSelected = selectedSuperAdminFilter === admin.id;
                      const isBusinessERP = activeCategory === 'Business ERP';
                      const categoryModules = isBusinessERP ? businessERPModules : pumpManagementModules;
                      const adminModuleCount = categoryModules.filter(m => 
                        admin.assignedModules?.includes(m.id)
                      ).length;
                      
                      return (
                        <button
                          key={admin.id}
                          onClick={() => {
                            setSelectedSuperAdminFilter(isSelected ? null : admin.id);
                            setSelectedModule(null);
                          }}
                          className={`w-full text-left p-3 rounded-lg transition-all border-2 ${
                            isSelected
                              ? isBusinessERP
                                ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 dark:border-purple-600 shadow-lg'
                                : 'bg-orange-100 dark:bg-orange-900/30 border-orange-500 dark:border-orange-600 shadow-lg'
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`p-1.5 rounded-lg ${
                              isSelected
                                ? isBusinessERP
                                  ? 'bg-purple-600'
                                  : 'bg-orange-600'
                                : isBusinessERP
                                  ? 'bg-purple-100 dark:bg-purple-900/30'
                                  : 'bg-orange-100 dark:bg-orange-900/30'
                            }`}>
                              <FiShield className={
                                isSelected 
                                  ? 'text-white' 
                                  : isBusinessERP 
                                    ? 'text-purple-600' 
                                    : 'text-orange-600'
                              } size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                                  {admin.username}
                                </span>
                                <FiCheckCircle className={admin.isActive ? 'text-green-600' : 'text-red-600'} size={12} />
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">
                                <FiMail size={10} />
                                <span className="truncate">{admin.email}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <FiPackage className={isBusinessERP ? 'text-purple-600' : 'text-orange-600'} size={10} />
                                <span className="text-gray-600 dark:text-gray-400">
                                  {adminModuleCount} Module{adminModuleCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FiShield size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No Super Admins in this category
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center">
                <FiShield size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select a category to view Super Admins
                </p>
              </div>
            )}
          </div>

          {/* COLUMN 3: Modules List - Compact + Clickable */}
          <div className="lg:col-span-3">
            {activeCategory ? (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className={`mb-4 pb-3 border-b-2 ${
                  activeCategory === 'Business ERP'
                    ? 'border-purple-200 dark:border-purple-800'
                    : 'border-orange-200 dark:border-orange-800'
                }`}>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiPackage className={activeCategory === 'Business ERP' ? 'text-purple-600' : 'text-orange-600'} size={16} />
                    {activeCategory}
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {selectedSuperAdminFilter 
                      ? `${activeCategoryModules.length} module${activeCategoryModules.length !== 1 ? 's' : ''} for ${superAdminsInCategory.find(a => a.id === selectedSuperAdminFilter)?.username}`
                      : `${activeCategoryModules.length} modules - Click to manage pages`
                    }
                  </p>
                </div>

                {activeCategoryModules.length > 0 ? (
                  <div className="space-y-2 max-h-[650px] overflow-y-auto">
                    {activeCategoryModules.map((module) => {
                      const superAdminsInModule = getSuperAdminsForModule(module.id);
                      const isBusinessERP = activeCategory === 'Business ERP';
                      const isSelected = selectedModule?.id === module.id;
                      const isAssigned = selectedSuperAdminFilter ? 
                        superAdmins.find(a => a.id === selectedSuperAdminFilter)?.assignedModules?.includes(module.id) 
                        : false;
                      
                      return (
                        <div
                          key={module.id}
                          className={`w-full p-2 rounded-md border transition-all ${
                            isSelected
                              ? isBusinessERP
                                ? 'border-purple-500 dark:border-purple-600 bg-purple-100 dark:bg-purple-900/30'
                                : 'border-orange-500 dark:border-orange-600 bg-orange-100 dark:bg-orange-900/30'
                              : isBusinessERP
                                ? 'border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10 hover:border-purple-400'
                                : 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10 hover:border-orange-400'
                          }`}
                        >
                          <button
                            onClick={() => handleModuleClick(module)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-2">
                              <div className={`p-1 rounded ${
                                isBusinessERP
                                  ? 'bg-purple-100 dark:bg-purple-900/30'
                                  : 'bg-orange-100 dark:bg-orange-900/30'
                              }`}>
                                <FiPackage className={
                                  isBusinessERP ? 'text-purple-600' : 'text-orange-600'
                                } size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <h3 className="font-semibold text-gray-900 dark:text-white text-xs truncate">
                                    {module.name}
                                  </h3>
                                  {selectedSuperAdminFilter && (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                      isAssigned 
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {isAssigned ? '✓ Assigned' : 'Not Assigned'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-1 line-clamp-1">
                                  {module.description}
                                </p>
                                <div className="flex items-center gap-2 text-[10px]">
                                  <div className="flex items-center gap-0.5">
                                    <FiUsers className="text-gray-400" size={9} />
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {superAdminsInModule.length} Admin{superAdminsInModule.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-0.5">
                                    <FiPackage className="text-gray-400" size={9} />
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {module.pages?.length || 0} Pages
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    <FiPackage size={40} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium mb-1">No Modules Available</p>
                    <p className="text-xs">This category has no modules yet</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-10 rounded-lg shadow text-center">
                <FiPackage size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  Select a Category
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Choose Business ERP or Pump Management to view modules
                </p>
              </div>
            )}
          </div>

          {/* COLUMN 4: Pages & Assignment Panel - NEW */}
          <div className="lg:col-span-4">
            {selectedModule ? (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="mb-4 pb-3 border-b-2 border-blue-200 dark:border-blue-800">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiCheckCircle className="text-blue-600" size={16} />
                    Page Management
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {selectedModule.name} - {selectedModule.pages?.length || 0} pages
                  </p>
                </div>

                {selectedSuperAdminFilter ? (
                  <>
                    {/* Check if module is assigned to the selected super admin */}
                    {(() => {
                      const selectedSuperAdmin = superAdmins.find(a => a.id === selectedSuperAdminFilter);
                      const isModuleAssigned = selectedSuperAdmin?.assignedModules?.includes(selectedModule.id);
                      
                      // Always show page list and action buttons
                      return (
                        <>
                          {/* Status Banner */}
                          {!isModuleAssigned && (
                            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                              <div className="flex items-start gap-2">
                                <FiAlertCircle className="text-yellow-600 dark:text-yellow-500 mt-0.5" size={16} />
                                <div>
                                  <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">
                                    Module Not Assigned
                                  </p>
                                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                                    Select pages below and click "Assign Selected Pages" to grant access to {selectedSuperAdmin?.username}.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 mb-4">
                            <button
                              onClick={toggleSelectAllPages}
                              className="flex-1 px-3 py-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium"
                            >
                              {selectedPageIds.length === (selectedModule.pages?.length || 0) ? 'Deselect All' : 'Select All'}
                            </button>
                            {isModuleAssigned && (
                              <button
                                onClick={unassignModuleFromSuperAdmin}
                                disabled={isSaving}
                                className="px-3 py-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 font-medium inline-flex items-center gap-1.5"
                              >
                                <FiXCircle size={14} />
                                {isSaving ? 'Removing...' : 'Remove Module'}
                              </button>
                            )}
                          </div>

                    {/* Pages List with Checkboxes */}
                    <div className="space-y-2 max-h-[500px] overflow-y-auto mb-4">
                      {selectedModule.pages && selectedModule.pages.length > 0 ? (
                        selectedModule.pages.map((page) => {
                          const isChecked = selectedPageIds.includes(page.id);
                          return (
                            <label
                              key={page.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
                                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePageSelection(page.id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {page.name}
                                  </span>
                                  {isChecked && (
                                    <FiCheckCircle className="text-green-600 flex-shrink-0" size={14} />
                                  )}
                                </div>
                                {page.path && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                                    {page.path}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <FiPackage size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="text-xs">No pages available in this module</p>
                        </div>
                      )}
                    </div>

                    {/* Save Button - Only show when pages are selected */}
                    {selectedPageIds.length > 0 && (
                      <button
                        onClick={assignModuleToSuperAdmin}
                        disabled={isSaving}
                        className={`w-full px-4 py-2.5 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium ${
                          isModuleAssigned 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            {isModuleAssigned ? 'Updating...' : 'Assigning...'}
                          </>
                        ) : (
                          <>
                            <FiCheckCircle size={16} />
                            {isModuleAssigned 
                              ? `Update ${selectedPageIds.length} Page${selectedPageIds.length !== 1 ? 's' : ''}`
                              : `Assign ${selectedPageIds.length} Selected Page${selectedPageIds.length !== 1 ? 's' : ''}`
                            }
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()}                    {/* Selection Info */}
                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                        Selected: <span className="font-bold text-blue-600">{selectedPageIds.length}</span> / {selectedModule.pages?.length || 0} pages
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <FiShield size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium mb-1">Select a Super Admin</p>
                    <p className="text-xs">Choose a Super Admin from Column 2 to manage page assignments</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-10 rounded-lg shadow text-center">
                <FiCheckCircle size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  Select a Module
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Click on a module from Column 3 to manage its pages
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
      
      {/* Create Super Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FiShield className="text-blue-600" />
                Create Super Admin
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateFormData({
                    username: '',
                    email: '',
                    password: '',
                    productType: 'BUSINESS_ERP'
                  });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSuperAdmin} className="p-6 space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createFormData.username}
                  onChange={(e) => setCreateFormData({ ...createFormData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter username"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 6 characters
                </p>
              </div>

              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={createFormData.productType}
                  onChange={(e) => setCreateFormData({ ...createFormData, productType: e.target.value as 'BUSINESS_ERP' | 'PUMP_ERP' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="BUSINESS_ERP">Business ERP</option>
                  <option value="PUMP_ERP">Pump Management</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateFormData({
                      username: '',
                      email: '',
                      password: '',
                      productType: 'BUSINESS_ERP'
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FiPlus size={16} />
                      Create
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
