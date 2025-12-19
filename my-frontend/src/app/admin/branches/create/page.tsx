'use client';

import React, { useState, useEffect } from 'react';
import {
  FiArrowLeft,
  FiMapPin,
  FiCheckCircle,
  FiSave,
  FiPhone,
  FiMail,
  FiUsers,
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiHome,
  FiGitBranch,
  FiGlobe,
  FiClock,
  FiPlus,
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

interface UsageLimits {
  users: { current: number; max: number; percentage: number };
  branches: { current: number; max: number; percentage: number };
  storage: { current: number; max: number; percentage: number };
}

interface FormData {
  name: string;
  code: string;
  type: 'HEAD_OFFICE' | 'BRANCH' | 'WAREHOUSE' | 'RETAIL';
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  managerId: string;
  isActive: boolean;
}

interface ValidationErrors {
  name?: string;
  code?: string;
  type?: string;
  address?: string;
  city?: string;
  country?: string;
}

interface Manager {
  id: string;
  name: string;
  email: string;
}

// ============================================================================
// USAGE LIMIT INDICATOR COMPONENT
// ============================================================================

function UsageLimitIndicator({
  label,
  current,
  max,
  icon: Icon,
}: {
  label: string;
  current: number;
  max: number;
  icon: React.ElementType;
}) {
  const percentage = max === 0 ? 100 : Math.round((current / max) * 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isAtLimit
            ? 'bg-red-100 text-red-600'
            : isNearLimit
            ? 'bg-yellow-100 text-yellow-600'
            : 'bg-blue-100 text-blue-600'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-600">
            {current} / {max === -1 ? '∞' : max}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BRANCH TYPE CARD COMPONENT
// ============================================================================

function BranchTypeCard({
  type,
  label,
  description,
  icon: Icon,
  selected,
  onSelect,
}: {
  type: string;
  label: string;
  description: string;
  icon: React.ElementType;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{label}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// TIMEZONES
// ============================================================================

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const CURRENCIES = [
  { value: 'INR', label: '₹ Indian Rupee (INR)' },
  { value: 'USD', label: '$ US Dollar (USD)' },
  { value: 'EUR', label: '€ Euro (EUR)' },
  { value: 'GBP', label: '£ British Pound (GBP)' },
  { value: 'AED', label: 'د.إ UAE Dirham (AED)' },
  { value: 'SGD', label: 'S$ Singapore Dollar (SGD)' },
  { value: 'AUD', label: 'A$ Australian Dollar (AUD)' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateBranchPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  // Data states
  const [managers, setManagers] = useState<Manager[]>([]);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Form data
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    type: 'BRANCH',
    address: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    phone: '',
    email: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    managerId: '',
    isActive: true,
  });

  // Validation errors
  const [errors, setErrors] = useState<ValidationErrors>({});

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadInitialData();
  }, [user, authLoading, router]);

  // Debounced code check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.code && formData.code.length >= 2) {
        checkCodeAvailability(formData.code);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.code]);

  // Auto-generate code from name
  useEffect(() => {
    if (formData.name && !formData.code) {
      const autoCode = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);
      if (autoCode.length >= 2) {
        setFormData((prev) => ({ ...prev, code: autoCode }));
      }
    }
  }, [formData.name]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

      // Fetch managers and usage limits in parallel
      const [managersRes, usageRes] = await Promise.all([
        fetch(`${baseURL}/api/users/managers`, { credentials: 'include' }),
        fetch(`${baseURL}/api/subscription/usage`, { credentials: 'include' }),
      ]);

      // Process managers
      if (managersRes.ok) {
        const managerData = await managersRes.json();
        setManagers(managerData.managers || managerData.data || []);
      }

      // Process usage limits
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsageLimits(usageData.usage || null);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const checkCodeAvailability = async (code: string) => {
    setCheckingCode(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/branches/check-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      setCodeAvailable(data.available);
      if (!data.available) {
        setErrors((prev) => ({ ...prev, code: data.message || 'Branch code already exists' }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.code;
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Error checking code:', error);
    } finally {
      setCheckingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Check branch limit
    if (
      usageLimits &&
      usageLimits.branches.max !== -1 &&
      usageLimits.branches.current >= usageLimits.branches.max
    ) {
      setSubmitError(
        'Branch limit reached for your subscription plan. Please upgrade to add more branches.'
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/branches/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          type: formData.type,
          address: formData.address,
          city: formData.city,
          state: formData.state || undefined,
          country: formData.country,
          postalCode: formData.postalCode || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          timezone: formData.timezone,
          currency: formData.currency,
          managerId: formData.managerId || undefined,
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();

      if (data.ok || response.ok) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(data.error || data.message || 'Failed to create branch');
      }
    } catch (error) {
      console.error('Error creating branch:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Branch name must be at least 2 characters';
    }

    if (!formData.code || formData.code.trim().length < 2) {
      errors.code = 'Branch code must be at least 2 characters';
    }

    if (!/^[A-Z0-9-_]+$/.test(formData.code)) {
      errors.code = 'Code can only contain uppercase letters, numbers, hyphens, and underscores';
    }

    if (codeAvailable === false) {
      errors.code = 'This branch code already exists';
    }

    if (!formData.type) {
      errors.type = 'Please select a branch type';
    }

    if (!formData.address || formData.address.trim().length < 5) {
      errors.address = 'Please enter a valid address';
    }

    if (!formData.city || formData.city.trim().length < 2) {
      errors.city = 'Please enter a valid city';
    }

    if (!formData.country) {
      errors.country = 'Please select a country';
    }

    return errors;
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    let processedValue = value;
    if (name === 'code') {
      processedValue = value.toUpperCase().replace(/[^A-Z0-9-_]/g, '');
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue,
    }));

    // Clear error when user types
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof ValidationErrors];
        return newErrors;
      });
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      code: '',
      type: 'BRANCH',
      address: '',
      city: '',
      state: '',
      country: 'India',
      postalCode: '',
      phone: '',
      email: '',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      managerId: '',
      isActive: true,
    });
    setErrors({});
    setSubmitSuccess(false);
    setSubmitError(null);
    setCodeAvailable(null);
  };

  // Check if branch limit is reached
  const isBranchLimitReached = Boolean(
    usageLimits &&
    usageLimits.branches.max !== -1 &&
    usageLimits.branches.current >= usageLimits.branches.max
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  if (authLoading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Branch Created Successfully!</h2>
            <p className="text-gray-600 mb-6">The new branch has been added to your organization</p>

            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Branch Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Code:</span>
                  <span className="font-medium">{formData.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{formData.type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">
                    {formData.city}, {formData.country}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Link
                href="/admin/branches"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Branches
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Create Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/branches"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Branches
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FiMapPin className="w-8 h-8 text-blue-600" />
            Create New Branch
          </h1>
          <p className="mt-2 text-gray-600">
            Add a new branch location to your organization
          </p>
        </div>

        {/* Subscription Usage Alert */}
        {usageLimits && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <FiInfo className="w-4 h-4 text-blue-600" />
              Subscription Usage
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UsageLimitIndicator
                label="Users"
                current={usageLimits.users.current}
                max={usageLimits.users.max}
                icon={FiUsers}
              />
              <UsageLimitIndicator
                label="Branches"
                current={usageLimits.branches.current}
                max={usageLimits.branches.max}
                icon={FiGitBranch}
              />
              <UsageLimitIndicator
                label="Storage"
                current={usageLimits.storage.current}
                max={usageLimits.storage.max}
                icon={FiHome}
              />
            </div>
          </div>
        )}

        {/* Branch Limit Warning */}
        {isBranchLimitReached && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <FiAlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Branch Limit Reached</p>
              <p className="text-sm text-red-700 mt-1">
                You have reached the maximum number of branches for your subscription plan. Please
                upgrade your plan to add more branches.
              </p>
              <Link
                href="/admin/billing"
                className="inline-flex items-center gap-1 text-sm text-red-700 hover:text-red-900 font-medium mt-2"
              >
                Upgrade Plan →
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Branch Type */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6">Branch Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BranchTypeCard
                type="HEAD_OFFICE"
                label="Head Office"
                description="Main corporate office"
                icon={FiHome}
                selected={formData.type === 'HEAD_OFFICE'}
                onSelect={() => setFormData((prev) => ({ ...prev, type: 'HEAD_OFFICE' }))}
              />
              <BranchTypeCard
                type="BRANCH"
                label="Branch Office"
                description="Regional branch location"
                icon={FiGitBranch}
                selected={formData.type === 'BRANCH'}
                onSelect={() => setFormData((prev) => ({ ...prev, type: 'BRANCH' }))}
              />
              <BranchTypeCard
                type="WAREHOUSE"
                label="Warehouse"
                description="Storage and distribution"
                icon={FiMapPin}
                selected={formData.type === 'WAREHOUSE'}
                onSelect={() => setFormData((prev) => ({ ...prev, type: 'WAREHOUSE' }))}
              />
              <BranchTypeCard
                type="RETAIL"
                label="Retail Store"
                description="Customer-facing location"
                icon={FiUsers}
                selected={formData.type === 'RETAIL'}
                onSelect={() => setFormData((prev) => ({ ...prev, type: 'RETAIL' }))}
              />
            </div>
            {errors.type && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <FiAlertCircle className="w-4 h-4" />
                {errors.type}
              </p>
            )}
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branch Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Mumbai Office"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Branch Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Code *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    className={`w-full px-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase ${
                      errors.code
                        ? 'border-red-500'
                        : codeAvailable === true
                        ? 'border-green-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="MUM-01"
                    maxLength={10}
                  />
                  {checkingCode && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {!checkingCode && codeAvailable === true && (
                    <FiCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                  )}
                  {!checkingCode && codeAvailable === false && (
                    <FiAlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
                  )}
                </div>
                {errors.code && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="w-4 h-4" />
                    {errors.code}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Unique identifier for the branch (auto-generated from name)
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+91 22 1234 5678"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="mumbai@company.com"
                  />
                </div>
              </div>

              {/* Branch Manager */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Manager
                </label>
                <select
                  name="managerId"
                  value={formData.managerId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Branch Manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FiMapPin className="w-5 h-5 text-blue-600" />
              Address
            </h2>

            <div className="space-y-6">
              {/* Street Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="123 Business Park, Tower A, 5th Floor"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="w-4 h-4" />
                    {errors.address}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Mumbai"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <FiAlertCircle className="w-4 h-4" />
                      {errors.city}
                    </p>
                  )}
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State/Province
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Maharashtra"
                  />
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="400001"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.country ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                </select>
                {errors.country && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="w-4 h-4" />
                    {errors.country}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Regional Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FiGlobe className="w-5 h-5 text-blue-600" />
              Regional Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FiClock className="w-4 h-4 inline mr-1" />
                  Timezone
                </label>
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6">Settings</h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Active Branch</span>
                <p className="text-sm text-gray-500">
                  Branch is operational and users can be assigned to it
                </p>
              </div>
            </label>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4" />
                {submitError}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link
              href="/admin/branches"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || isBranchLimitReached}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  Create Branch
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
