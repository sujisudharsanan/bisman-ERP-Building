'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FiUserPlus,
  FiArrowLeft,
  FiMail,
  FiLock,
  FiUser,
  FiBriefcase,
  FiCheckCircle,
  FiSave,
  FiPhone,
  FiMapPin,
  FiUsers,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiCheck,
  FiAlertTriangle,
  FiInfo,
  FiPlus,
  FiX,
  FiHome,
  FiGitBranch,
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
}

interface UsageLimits {
  users: { current: number; max: number; percentage: number };
  branches: { current: number; max: number; percentage: number };
  storage: { current: number; max: number; percentage: number };
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  roleId: string;
  employeeId: string;
  department: string;
  designation: string;
  reportingToId: string;
  primaryBranchId: string;
  additionalBranchIds: string[];
  sendWelcomeEmail: boolean;
  isActive: boolean;
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  roleId?: string;
  primaryBranchId?: string;
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
// BRANCH SELECTOR COMPONENT
// ============================================================================

function BranchSelector({
  branches,
  selectedIds,
  onSelect,
  disabled,
  excludeIds = [],
}: {
  branches: Branch[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  disabled?: boolean;
  excludeIds?: string[];
}) {
  const availableBranches = branches.filter((b) => !excludeIds.includes(b.id) && b.isActive);

  const toggleBranch = (branchId: string) => {
    if (selectedIds.includes(branchId)) {
      onSelect(selectedIds.filter((id) => id !== branchId));
    } else {
      onSelect([...selectedIds, branchId]);
    }
  };

  return (
    <div className="space-y-2">
      {availableBranches.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No additional branches available</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableBranches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              disabled={disabled}
              onClick={() => toggleBranch(branch.id)}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                selectedIds.includes(branch.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center ${
                  selectedIds.includes(branch.id)
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
                }`}
              >
                {selectedIds.includes(branch.id) && <FiCheck className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{branch.name}</p>
                <p className="text-xs text-gray-500">{branch.code}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateUserPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Data states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Form data
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    roleId: '',
    employeeId: '',
    department: '',
    designation: '',
    reportingToId: '',
    primaryBranchId: '',
    additionalBranchIds: [],
    sendWelcomeEmail: true,
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

  // Debounced email check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email && formData.email.includes('@')) {
        checkEmailAvailability(formData.email);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

      // Fetch branches, roles, users, and usage limits in parallel
      const [branchesRes, rolesRes, usersRes, usageRes] = await Promise.all([
        fetch(`${baseURL}/api/branches`, { credentials: 'include' }),
        fetch(`${baseURL}/api/roles`, { credentials: 'include' }),
        fetch(`${baseURL}/api/users/list-simple`, { credentials: 'include' }),
        fetch(`${baseURL}/api/subscription/usage`, { credentials: 'include' }),
      ]);

      // Process branches
      if (branchesRes.ok) {
        const branchData = await branchesRes.json();
        setBranches(branchData.branches || branchData.data || []);
      }

      // Process roles
      if (rolesRes.ok) {
        const roleData = await rolesRes.json();
        setRoles(roleData.roles || roleData.data || []);
      }

      // Process users for reporting structure
      if (usersRes.ok) {
        const userData = await usersRes.json();
        setUsers(userData.users || userData.data || []);
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

  const checkEmailAvailability = async (email: string) => {
    setCheckingEmail(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/users/check-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setEmailAvailable(data.available);
      if (!data.available) {
        setErrors((prev) => ({ ...prev, email: data.message || 'Email already exists' }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.email;
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setCheckingEmail(false);
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

    // Check user limit
    if (usageLimits && usageLimits.users.max !== -1 && usageLimits.users.current >= usageLimits.users.max) {
      setSubmitError('User limit reached for your subscription plan. Please upgrade to add more users.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/users/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          roleId: formData.roleId,
          employeeId: formData.employeeId || undefined,
          department: formData.department || undefined,
          designation: formData.designation || undefined,
          reportingToId: formData.reportingToId || undefined,
          primaryBranchId: formData.primaryBranchId,
          additionalBranchIds: formData.additionalBranchIds,
          sendWelcomeEmail: formData.sendWelcomeEmail,
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();

      if (data.ok || response.ok) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(data.error || data.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
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

    if (!formData.firstName || formData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName || formData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (emailAvailable === false) {
      errors.email = 'This email is already registered';
    }

    if (!formData.password || formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.roleId) {
      errors.roleId = 'Please select a role';
    }

    if (!formData.primaryBranchId) {
      errors.primaryBranchId = 'Please select a primary branch';
    }

    return errors;
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      roleId: '',
      employeeId: '',
      department: '',
      designation: '',
      reportingToId: '',
      primaryBranchId: '',
      additionalBranchIds: [],
      sendWelcomeEmail: true,
      isActive: true,
    });
    setErrors({});
    setSubmitSuccess(false);
    setSubmitError(null);
    setEmailAvailable(null);
  };

  // Check if user limit is reached
  const isUserLimitReached = Boolean(
    usageLimits && usageLimits.users.max !== -1 && usageLimits.users.current >= usageLimits.users.max
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">User Created Successfully!</h2>
            <p className="text-gray-600 mb-6">
              {formData.sendWelcomeEmail
                ? `A welcome email has been sent to ${formData.email}`
                : 'The user account has been created'}
            </p>

            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <h3 className="font-medium text-gray-900 mb-3">User Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">
                    {formData.firstName} {formData.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Primary Branch:</span>
                  <span className="font-medium">
                    {branches.find((b) => b.id === formData.primaryBranchId)?.name || '-'}
                  </span>
                </div>
                {formData.additionalBranchIds.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Additional Branches:</span>
                    <span className="font-medium">{formData.additionalBranchIds.length}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Link
                href="/admin/users"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Users
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FiUserPlus className="w-4 h-4" />
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
            href="/admin/users"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Users
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FiUserPlus className="w-8 h-8 text-blue-600" />
            Create New User
          </h1>
          <p className="mt-2 text-gray-600">
            Add a new user to your organization and assign them to branches
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

        {/* User Limit Warning */}
        {isUserLimitReached && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <FiAlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">User Limit Reached</p>
              <p className="text-sm text-red-700 mt-1">
                You have reached the maximum number of users for your subscription plan. Please
                upgrade your plan to add more users.
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
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FiUser className="w-5 h-5 text-blue-600" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="w-4 h-4" />
                    {errors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="w-4 h-4" />
                    {errors.lastName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.email
                        ? 'border-red-500'
                        : emailAvailable === true
                        ? 'border-green-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="john.doe@company.com"
                  />
                  {checkingEmail && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {!checkingEmail && emailAvailable === true && (
                    <FiCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                  )}
                  {!checkingEmail && emailAvailable === false && (
                    <FiAlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
                  )}
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="w-4 h-4" />
                    {errors.email}
                  </p>
                )}
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
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="w-4 h-4" />
                    {errors.password}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Min 8 characters, with uppercase, lowercase, and number
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff className="w-4 h-4" />
                    ) : (
                      <FiEye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="w-4 h-4" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Role & Organization */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FiBriefcase className="w-5 h-5 text-blue-600" />
              Role & Organization
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  name="roleId"
                  value={formData.roleId}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.roleId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {errors.roleId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="w-4 h-4" />
                    {errors.roleId}
                  </p>
                )}
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="EMP-001"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Engineering"
                />
              </div>

              {/* Designation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Senior Developer"
                />
              </div>

              {/* Reporting To */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reporting To</label>
                <select
                  name="reportingToId"
                  value={formData.reportingToId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Reporting Manager</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Branch Assignment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FiMapPin className="w-5 h-5 text-blue-600" />
              Branch Assignment
            </h2>

            {/* Primary Branch */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Branch *
              </label>
              <select
                name="primaryBranchId"
                value={formData.primaryBranchId}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.primaryBranchId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Primary Branch</option>
                {branches
                  .filter((b) => b.isActive)
                  .map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
              </select>
              {errors.primaryBranchId && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <FiAlertCircle className="w-4 h-4" />
                  {errors.primaryBranchId}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                The primary branch is where the user will be primarily assigned
              </p>
            </div>

            {/* Additional Branches */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Branches (Multi-branch access)
              </label>
              <BranchSelector
                branches={branches}
                selectedIds={formData.additionalBranchIds}
                onSelect={(ids) => setFormData((prev) => ({ ...prev, additionalBranchIds: ids }))}
                excludeIds={formData.primaryBranchId ? [formData.primaryBranchId] : []}
              />
              <p className="mt-2 text-xs text-gray-500">
                Select additional branches this user can access (based on your subscription plan)
              </p>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6">Settings</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="sendWelcomeEmail"
                  checked={formData.sendWelcomeEmail}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Send Welcome Email</span>
                  <p className="text-sm text-gray-500">
                    Send login credentials and welcome message to the user
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Active Account</span>
                  <p className="text-sm text-gray-500">
                    User can login immediately after creation
                  </p>
                </div>
              </label>
            </div>
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
              href="/admin/users"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || isUserLimitReached}
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
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
