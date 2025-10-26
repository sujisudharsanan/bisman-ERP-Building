'use client';

import React, { useState, useEffect } from 'react';
import {
  FiArrowLeft,
  FiSave,
  FiAlertCircle,
  FiCheckCircle,
  FiCheck,
  FiX,
  FiSettings,
  FiPackage,
  FiShoppingCart,
  FiTruck,
  FiDollarSign,
  FiUsers,
  FiBarChart2,
} from 'react-icons/fi';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Module {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon: string;
  is_enabled: boolean;
  permissions: {
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
    can_export: boolean;
    can_import: boolean;
  };
}

interface SuperAdmin {
  id: string;
  business_name: string;
  business_type: string;
  admin_name: string;
}

const categoryIcons: Record<string, any> = {
  core: FiSettings,
  sales: FiShoppingCart,
  operations: FiTruck,
  inventory: FiPackage,
  finance: FiDollarSign,
  hr: FiUsers,
  reports: FiBarChart2,
};

export default function ModuleAssignmentPage() {
  const params = useParams();
  const superAdminId = params.id as string;

  const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Mock data
  const mockSuperAdmin: SuperAdmin = {
    id: superAdminId,
    business_name: 'Rajesh Petrol Pump - Highway 44',
    business_type: 'Petrol Pump',
    admin_name: 'Rajesh Kumar',
  };

  const mockModules: Module[] = [
    // Core Modules (always enabled)
    {
      id: '1',
      name: 'Dashboard',
      slug: 'dashboard',
      category: 'core',
      description: 'Main overview and analytics',
      icon: 'dashboard',
      is_enabled: true,
      permissions: { can_create: false, can_read: true, can_update: false, can_delete: false, can_export: false, can_import: false },
    },
    {
      id: '2',
      name: 'Users',
      slug: 'users',
      category: 'core',
      description: 'User management',
      icon: 'users',
      is_enabled: true,
      permissions: { can_create: true, can_read: true, can_update: true, can_delete: true, can_export: true, can_import: false },
    },
    {
      id: '3',
      name: 'Settings',
      slug: 'settings',
      category: 'core',
      description: 'System configuration',
      icon: 'settings',
      is_enabled: true,
      permissions: { can_create: false, can_read: true, can_update: true, can_delete: false, can_export: false, can_import: false },
    },

    // Petrol Pump Specific
    {
      id: '4',
      name: 'Fuel Sales',
      slug: 'fuel-sales',
      category: 'sales',
      description: 'Track fuel transactions',
      icon: 'fuel',
      is_enabled: true,
      permissions: { can_create: true, can_read: true, can_update: true, can_delete: false, can_export: true, can_import: false },
    },
    {
      id: '5',
      name: 'Tank Inventory',
      slug: 'tank-inventory',
      category: 'inventory',
      description: 'Fuel tank level monitoring',
      icon: 'tank',
      is_enabled: true,
      permissions: { can_create: false, can_read: true, can_update: true, can_delete: false, can_export: true, can_import: false },
    },
    {
      id: '6',
      name: 'Nozzle Management',
      slug: 'nozzle-management',
      category: 'operations',
      description: 'Manage pump nozzles',
      icon: 'nozzle',
      is_enabled: false,
      permissions: { can_create: true, can_read: true, can_update: true, can_delete: true, can_export: false, can_import: false },
    },
    {
      id: '7',
      name: 'Shift Management',
      slug: 'shift-management',
      category: 'operations',
      description: 'Employee shift tracking',
      icon: 'clock',
      is_enabled: true,
      permissions: { can_create: true, can_read: true, can_update: true, can_delete: false, can_export: true, can_import: false },
    },
    {
      id: '8',
      name: 'Payments',
      slug: 'payments',
      category: 'finance',
      description: 'Payment tracking',
      icon: 'payment',
      is_enabled: true,
      permissions: { can_create: true, can_read: true, can_update: false, can_delete: false, can_export: true, can_import: false },
    },
    {
      id: '9',
      name: 'Credit Sales',
      slug: 'credit-sales',
      category: 'finance',
      description: 'Credit customer management',
      icon: 'credit',
      is_enabled: false,
      permissions: { can_create: true, can_read: true, can_update: true, can_delete: false, can_export: true, can_import: false },
    },
    {
      id: '10',
      name: 'Suppliers',
      slug: 'suppliers',
      category: 'operations',
      description: 'Fuel supplier management',
      icon: 'supplier',
      is_enabled: true,
      permissions: { can_create: true, can_read: true, can_update: true, can_delete: false, can_export: true, can_import: true },
    },
    {
      id: '11',
      name: 'Reports',
      slug: 'reports',
      category: 'reports',
      description: 'Business analytics',
      icon: 'chart',
      is_enabled: true,
      permissions: { can_create: false, can_read: true, can_update: false, can_delete: false, can_export: true, can_import: false },
    },
  ];

  useEffect(() => {
    // TODO: Fetch from API
    setTimeout(() => {
      setSuperAdmin(mockSuperAdmin);
      setModules(mockModules);
      setLoading(false);
    }, 500);
  }, [superAdminId]);

  const groupedModules = modules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, Module[]>);

  const toggleModuleEnabled = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, is_enabled: !m.is_enabled } : m
      )
    );
  };

  const togglePermission = (moduleId: string, permission: keyof Module['permissions']) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              permissions: {
                ...m.permissions,
                [permission]: !m.permissions[permission],
              },
            }
          : m
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      // TODO: Replace with actual API call
      console.log('Saving module assignments:', {
        superAdminId,
        modules: modules.map((m) => ({
          id: m.id,
          is_enabled: m.is_enabled,
          permissions: m.permissions,
        })),
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving modules:', error);
      setSaveError('Failed to save module assignments');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const enabledCount = modules.filter((m) => m.is_enabled).length;
  const totalCount = modules.length;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/enterprise-admin/super-admins"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Manage Modules
            </h1>
            {superAdmin && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {superAdmin.business_name} • {superAdmin.admin_name}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
            transition-colors flex items-center space-x-2 disabled:opacity-50"
        >
          <FiSave className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Enabled Modules</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {enabledCount} / {totalCount}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Business Type</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {superAdmin?.business_type}
            </p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Module assignments saved successfully!
            </p>
          </div>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{saveError}</p>
          </div>
        </div>
      )}

      {/* Module Categories */}
      <div className="space-y-6">
        {Object.entries(groupedModules).map(([category, categoryModules]) => {
          const Icon = categoryIcons[category] || FiPackage;
          return (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {category}
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({categoryModules.filter((m) => m.is_enabled).length}/{categoryModules.length})
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {categoryModules.map((module) => (
                  <div key={module.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3 flex-1">
                        <button
                          onClick={() => toggleModuleEnabled(module.id)}
                          className={`mt-1 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors
                            ${
                              module.is_enabled
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                        >
                          {module.is_enabled && <FiCheck className="w-4 h-4 text-white" />}
                        </button>
                        <div>
                          <h3 className="text-base font-medium text-gray-900 dark:text-white">
                            {module.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {module.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {module.is_enabled && (
                      <div className="ml-9 mt-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Permissions
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                          {Object.entries(module.permissions).map(([key, value]) => {
                            const label = key
                              .replace('can_', '')
                              .replace('_', ' ')
                              .split(' ')
                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                              .join(' ');

                            return (
                              <button
                                key={key}
                                onClick={() =>
                                  togglePermission(module.id, key as keyof Module['permissions'])
                                }
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors
                                  ${
                                    value
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
                                  }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Save Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
            transition-colors flex items-center space-x-2 disabled:opacity-50 font-medium"
        >
          <FiSave className="w-5 h-5" />
          <span>{saving ? 'Saving Changes...' : 'Save Module Assignments'}</span>
        </button>
      </div>
    </div>
  );
}
