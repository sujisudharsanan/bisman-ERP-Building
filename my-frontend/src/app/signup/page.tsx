'use client';

/**
 * Tenant Self-Service Signup / Get Started Page
 * BISMAN ERP - Simple Two-Panel Design
 *
 * Features:
 * - Organization name, type, country, timezone (auto-detected)
 * - Admin name, email, phone
 * - Password creation with validation
 * - Terms acceptance
 * - 14-day trial with default subscription plan
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  Users,
  BarChart3,
  Shield,
  ArrowRight,
  Globe,
  Clock,
} from 'lucide-react';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const signupSchema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
  businessType: z.string().min(1, 'Please select a business type'),
  country: z.string().min(1, 'Please select a country'),
  timezone: z.string().min(1, 'Please select a timezone'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  acceptedTerms: z.boolean().refine(val => val === true, 'You must accept the terms'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

// ============================================================================
// CONSTANTS & MAPPINGS
// ============================================================================

const BUSINESS_TYPES = [
  'Sole Proprietorship',
  'Partnership',
  'Private Limited',
  'Public Limited',
  'LLP',
  'Non-Profit',
  'Other',
];

const COUNTRIES = [
  { code: 'IN', name: 'India', timezone: 'Asia/Kolkata', phoneCode: '+91' },
  { code: 'US', name: 'United States', timezone: 'America/New_York', phoneCode: '+1' },
  { code: 'GB', name: 'United Kingdom', timezone: 'Europe/London', phoneCode: '+44' },
  { code: 'CA', name: 'Canada', timezone: 'America/Toronto', phoneCode: '+1' },
  { code: 'AU', name: 'Australia', timezone: 'Australia/Sydney', phoneCode: '+61' },
  { code: 'SG', name: 'Singapore', timezone: 'Asia/Singapore', phoneCode: '+65' },
  { code: 'AE', name: 'UAE', timezone: 'Asia/Dubai', phoneCode: '+971' },
  { code: 'DE', name: 'Germany', timezone: 'Europe/Berlin', phoneCode: '+49' },
  { code: 'FR', name: 'France', timezone: 'Europe/Paris', phoneCode: '+33' },
  { code: 'JP', name: 'Japan', timezone: 'Asia/Tokyo', phoneCode: '+81' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'IST (India Standard Time)' },
  { value: 'America/New_York', label: 'EST (Eastern Time)' },
  { value: 'America/Los_Angeles', label: 'PST (Pacific Time)' },
  { value: 'America/Chicago', label: 'CST (Central Time)' },
  { value: 'America/Toronto', label: 'EST (Eastern Time - Canada)' },
  { value: 'Europe/London', label: 'GMT (Greenwich Mean Time)' },
  { value: 'Europe/Berlin', label: 'CET (Central European Time)' },
  { value: 'Europe/Paris', label: 'CET (Central European Time)' },
  { value: 'Asia/Singapore', label: 'SGT (Singapore Time)' },
  { value: 'Asia/Dubai', label: 'GST (Gulf Standard Time)' },
  { value: 'Asia/Tokyo', label: 'JST (Japan Standard Time)' },
  { value: 'Australia/Sydney', label: 'AEST (Australian Eastern Time)' },
];

const FEATURES = [
  { icon: Building2, text: 'Complete ERP solution for your business' },
  { icon: Users, text: 'Multi-user access with role-based permissions' },
  { icon: BarChart3, text: 'Real-time analytics and reporting' },
  { icon: Shield, text: 'Enterprise-grade security' },
];

// ============================================================================
// AUTO-DETECTION HELPERS
// ============================================================================

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Asia/Kolkata';
  }
}

function detectCountryFromTimezone(timezone: string): string {
  const mapping: Record<string, string> = {
    'Asia/Kolkata': 'IN',
    'Asia/Calcutta': 'IN',
    'America/New_York': 'US',
    'America/Los_Angeles': 'US',
    'America/Chicago': 'US',
    'America/Toronto': 'CA',
    'Europe/London': 'GB',
    'Europe/Berlin': 'DE',
    'Europe/Paris': 'FR',
    'Asia/Singapore': 'SG',
    'Asia/Dubai': 'AE',
    'Asia/Tokyo': 'JP',
    'Australia/Sydney': 'AU',
  };
  return mapping[timezone] || 'IN';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [detectedInfo, setDetectedInfo] = useState({ country: '', timezone: '' });

  const [formData, setFormData] = useState({
    orgName: '',
    businessType: '',
    country: '',
    timezone: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  });

  // Auto-detect country and timezone on mount
  useEffect(() => {
    const timezone = detectTimezone();
    const countryCode = detectCountryFromTimezone(timezone);
    const country = COUNTRIES.find(c => c.code === countryCode);
    
    setDetectedInfo({ country: countryCode, timezone });
    setFormData(prev => ({
      ...prev,
      timezone: timezone,
      country: countryCode,
    }));
  }, []);

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-update timezone when country changes
      if (field === 'country' && typeof value === 'string') {
        const selectedCountry = COUNTRIES.find(c => c.code === value);
        if (selectedCountry) {
          updated.timezone = selectedCountry.timezone;
        }
      }
      
      return updated;
    });
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate form
    const result = signupSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      const zodErrors = result.error.flatten().fieldErrors;
      Object.entries(zodErrors).forEach(([field, messages]) => {
        if (messages && messages.length > 0) {
          errors[field] = messages[0];
        }
      });
      // Handle form-level errors (like password mismatch)
      const formErrors = result.error.flatten().formErrors;
      if (formErrors.length > 0 && !errors.confirmPassword) {
        errors.confirmPassword = formErrors[0];
      }
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.orgName,
          adminEmail: formData.email,
          adminName: formData.fullName,
          adminPassword: formData.password,
          plan: 'trial',
          phone: formData.phone || undefined,
          timezone: formData.timezone,
          industry: formData.businessType,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to create organization. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to BISMAN ERP!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your organization <strong>{formData.orgName}</strong> has been created successfully.
          </p>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 text-left">
            <p className="font-semibold text-green-800 dark:text-green-300 mb-2">Your Login Credentials:</p>
            <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
              <p><strong>Email:</strong> {formData.email}</p>
              <p><strong>Password:</strong> (as you entered)</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Your 14-day trial has started. You can login immediately!
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
          >
            Go to Login <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 to-purple-700 p-12 flex-col justify-between overflow-hidden">
        <div>
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-white">BISMAN ERP</h1>
          </Link>
          <p className="text-violet-200 mt-2">Enterprise Resource Planning</p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Start your 14-day free trial
            </h2>
            <p className="text-violet-200 text-lg">
              No credit card required. Full access to all features.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span>{feature.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-violet-200 text-sm">
          © {new Date().getFullYear()} BISMAN ERP. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-lg my-auto py-4">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                BISMAN ERP
              </h1>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Start your free 14-day trial
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Create Your Organization
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Fill in the details to get started
            </p>

            {/* Error Banner */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Organization Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Organization Details
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={formData.orgName}
                    onChange={(e) => updateField('orgName', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors ${
                      fieldErrors.orgName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder="Enter organization name"
                  />
                  {fieldErrors.orgName && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.orgName}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Type *
                    </label>
                    <select
                      value={formData.businessType}
                      onChange={(e) => updateField('businessType', e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors ${
                        fieldErrors.businessType ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                    >
                      <option value="">Select type</option>
                      {BUSINESS_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {fieldErrors.businessType && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.businessType}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Country *
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => updateField('country', e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors ${
                        fieldErrors.country ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>{country.name}</option>
                      ))}
                    </select>
                    {fieldErrors.country && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.country}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Timezone * {detectedInfo.timezone && <span className="text-xs text-gray-400">(auto-detected)</span>}
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => updateField('timezone', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors ${
                      fieldErrors.timezone ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                  >
                    <option value="">Select timezone</option>
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                  {fieldErrors.timezone && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.timezone}</p>
                  )}
                </div>
              </div>

              {/* Admin Section */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Admin Account
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors ${
                      fieldErrors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {fieldErrors.fullName && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.fullName}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors ${
                        fieldErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                      placeholder="Enter email address"
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        className={`w-full px-4 py-2.5 pr-10 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors ${
                          fieldErrors.password ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        className={`w-full px-4 py-2.5 pr-10 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors ${
                          fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 12 characters with uppercase, lowercase, number, and special character.
                </p>
              </div>

              {/* Terms */}
              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptedTerms"
                    checked={formData.acceptedTerms}
                    onChange={(e) => updateField('acceptedTerms', e.target.checked)}
                    className="mt-1 w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                  />
                  <label htmlFor="acceptedTerms" className="text-sm text-gray-600 dark:text-gray-400">
                    I agree to the{' '}
                    <Link href="/terms" className="text-violet-600 hover:underline">Terms of Service</Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-violet-600 hover:underline">Privacy Policy</Link>
                  </label>
                </div>
                {fieldErrors.acceptedTerms && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.acceptedTerms}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Organization...
                  </>
                ) : (
                  <>
                    Create Your Organization
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-violet-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
