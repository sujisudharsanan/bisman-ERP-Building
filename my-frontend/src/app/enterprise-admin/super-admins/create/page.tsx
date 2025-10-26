'use client';

import React, { useState, useEffect } from 'react';
import {
  FiUserPlus,
  FiArrowLeft,
  FiMail,
  FiLock,
  FiUser,
  FiBriefcase,
  FiPackage,
  FiCheckCircle,
  FiSave,
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Module {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category?: string;
  pages: Page[];
}

interface Page {
  id: string;
  name: string;
  path: string;
}

export default function CreateSuperAdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>({});

  // Form data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessType: '',
    vertical: '',
    isActive: true,
  });

  // Module and page permissions
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [pagePermissions, setPagePermissions] = useState<{ [moduleId: string]: string[] }>({});

  // Available business verticals
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

    loadMasterModules();
  }, [user, loading, router]);

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
      alert('Failed to load available modules');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const toggleModule = (moduleId: string) => {
    if (selectedModules.includes(moduleId)) {
      // Remove module
      setSelectedModules(selectedModules.filter((id) => id !== moduleId));
      const newPagePermissions = { ...pagePermissions };
      delete newPagePermissions[moduleId];
      setPagePermissions(newPagePermissions);
    } else {
      // Add module with all pages selected by default
      setSelectedModules([...selectedModules, moduleId]);
      const module = availableModules.find((m) => m.id === moduleId);
      if (module) {
        setPagePermissions({
          ...pagePermissions,
          [moduleId]: module.pages.map((p) => p.id),
        });
      }
    }
  };

  const togglePage = (moduleId: string, pageId: string) => {
    const currentPages = pagePermissions[moduleId] || [];
    if (currentPages.includes(pageId)) {
      setPagePermissions({
        ...pagePermissions,
        [moduleId]: currentPages.filter((id) => id !== pageId),
      });
    } else {
      setPagePermissions({
        ...pagePermissions,
        [moduleId]: [...currentPages, pageId],
      });
    }
  };

  const toggleAllPages = (moduleId: string) => {
    const module = availableModules.find((m) => m.id === moduleId);
    if (!module) return;

    const currentPages = pagePermissions[moduleId] || [];
    const allPageIds = module.pages.map((p) => p.id);

    if (currentPages.length === allPageIds.length) {
      // Deselect all
      setPagePermissions({
        ...pagePermissions,
        [moduleId]: [],
      });
    } else {
      // Select all
      setPagePermissions({
        ...pagePermissions,
        [moduleId]: allPageIds,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    if (selectedModules.length === 0) {
      alert('Please assign at least one module to this Super Admin!');
      return;
    }

    setIsSubmitting(true);

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/enterprise-admin/super-admins`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          businessName: formData.businessName,
          businessType: formData.businessType,
          vertical: formData.vertical,
          isActive: formData.isActive,
          assignedModules: selectedModules,
          pagePermissions: pagePermissions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create Super Admin');
      }

      const data = await response.json();
      if (data.ok) {
        alert('Super Admin created successfully!');
        router.push('/enterprise-admin/super-admins');
      } else {
        throw new Error(data.message || 'Failed to create Super Admin');
      }
    } catch (error: any) {
      console.error('Error creating super admin:', error);
      alert(error.message || 'Failed to create Super Admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/enterprise-admin/super-admins"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <FiUserPlus className="text-blue-600 dark:text-blue-400" />
                  Create New Super Admin
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Set up a new Super Admin account with module assignments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiUser className="text-blue-600" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter password (min 6 characters)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Confirm password"
                />
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiBriefcase className="text-blue-600" />
              Business/Vertical Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Type
                </label>
                <input
                  type="text"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Fuel Station, Transport"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vertical/Segment *
                </label>
                <select
                  name="vertical"
                  value={formData.vertical}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select vertical</option>
                  {verticals.map((vertical) => (
                    <option key={vertical} value={vertical}>
                      {vertical}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Module Assignment */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiPackage className="text-blue-600" />
              Assign Modules & Pages *
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Select modules and pages that this Super Admin can access. You can customize page-level permissions.
            </p>

            <div className="space-y-4">
              {availableModules.map((module) => {
                const isModuleSelected = selectedModules.includes(module.id);
                const selectedPages = pagePermissions[module.id] || [];
                const isExpanded = expandedModules[module.id];
                const allPagesSelected = selectedPages.length === module.pages.length;

                return (
                  <div
                    key={module.id}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      isModuleSelected
                        ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {/* Module Header */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-750">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isModuleSelected}
                          onChange={() => toggleModule(module.id)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {module.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {module.description} • {module.pages.length} pages
                          </p>
                        </div>
                      </div>
                      {isModuleSelected && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedModules({
                              ...expandedModules,
                              [module.id]: !isExpanded,
                            })
                          }
                          className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                        >
                          {isExpanded ? 'Collapse' : `Expand (${selectedPages.length}/${module.pages.length})`}
                        </button>
                      )}
                    </div>

                    {/* Page List */}
                    {isModuleSelected && isExpanded && (
                      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Select Pages:
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleAllPages(module.id)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {allPagesSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {module.pages.map((page) => (
                            <label
                              key={page.id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPages.includes(page.id)}
                                onChange={() => togglePage(module.id, page.id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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

          {/* Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiCheckCircle className="text-blue-600" />
              Account Status
            </h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Activate account immediately
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  If unchecked, the Super Admin won't be able to login until activated
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href="/enterprise-admin/super-admins"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
                  Create Super Admin
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
