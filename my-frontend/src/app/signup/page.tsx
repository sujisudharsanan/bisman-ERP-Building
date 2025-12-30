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
  ArrowRight,
} from 'lucide-react';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const signupSchema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
  businessType: z.string().min(1, 'Please select a business type'),
  country: z.string().optional(),
  timezone: z.string().optional(),
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

// Auto-detect country using browser locale and timezone
async function detectCountry(): Promise<string> {
  // Method 1: Try browser locale
  try {
    const locale = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en-US';
    const regionMatch = locale.match(/-([A-Z]{2})$/);
    if (regionMatch) {
      const countryCode = regionMatch[1];
      if (COUNTRIES.find(c => c.code === countryCode)) {
        return countryCode;
      }
    }
  } catch {
    // Fallback to timezone detection
  }

  // Method 2: Fallback to timezone-based detection
  const timezone = detectTimezone();
  return detectCountryFromTimezone(timezone);
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
  const [detectedInfo, setDetectedInfo] = useState({ country: '', timezone: '', countryAutoDetected: false });

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
    const initDetection = async () => {
      const timezone = detectTimezone();
      const countryCode = await detectCountry();
      const country = COUNTRIES.find(c => c.code === countryCode);
      
      setDetectedInfo({ country: countryCode, timezone, countryAutoDetected: true });
      setFormData(prev => ({
        ...prev,
        timezone: timezone,
        country: countryCode,
      }));
    };
    initDetection();
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
            Your free trial has started. You can login immediately!
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
    <div 
      className="min-h-screen w-full relative"
      style={{
        backgroundImage: 'url(/brand/sighnup.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Logo in top-left corner */}
      <div className="absolute top-6 left-6 z-20">
        <img 
          src="/brand/logo-2.svg" 
          alt="BISMAN ERP" 
          className="h-10 md:h-12 w-auto"
        />
      </div>
      
      {/* Right side - Form */}
      <div className="min-h-screen w-full flex items-center justify-end p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl p-4 md:p-6 mr-0 lg:mr-8">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create Your Organization
            </h2>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Organization Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Organization Name *
            </label>
            <input
              type="text"
              value={formData.orgName}
              onChange={(e) => updateField('orgName', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
                fieldErrors.orgName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              }`}
              placeholder="Enter your company name"
            />
            {fieldErrors.orgName && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.orgName}</p>
            )}
          </div>

          {/* Business Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Business Type *
            </label>
            <select
              value={formData.businessType}
              onChange={(e) => updateField('businessType', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
                fieldErrors.businessType ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              }`}
            >
              <option value="">Select business type</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {fieldErrors.businessType && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.businessType}</p>
            )}
          </div>

          {/* Full Name + Email Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
                  fieldErrors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Your full name"
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
                  fieldErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="admin@company.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
              )}
            </div>
          </div>

          {/* Phone with Country Code */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <div className="flex gap-2">
              <select
                value={formData.country}
                onChange={(e) => updateField('country', e.target.value)}
                className="w-20 px-2 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.phoneCode}</option>
                ))}
              </select>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                placeholder="Phone number"
              />
            </div>
          </div>

          {/* Password + Confirm Password Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className={`w-full px-3 py-2 text-sm pr-10 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
                    fieldErrors.password ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Min 12 chars"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  className={`w-full px-3 py-2 text-sm pr-10 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
                    fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Re-enter"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Password Strength Indicator - Only shows when typing */}
          {formData.password.length > 0 && (
            <div className="space-y-1 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Password Requirements:</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <div className={`flex items-center gap-1 text-xs ${formData.password.length >= 12 ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex items-center justify-center ${formData.password.length >= 12 ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {formData.password.length >= 12 && <CheckCircle className="w-2 h-2 text-white" />}
                  </div>
                  <span>12+ chars</span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex items-center justify-center ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {/[A-Z]/.test(formData.password) && <CheckCircle className="w-2 h-2 text-white" />}
                  </div>
                  <span>Uppercase</span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex items-center justify-center ${/[a-z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {/[a-z]/.test(formData.password) && <CheckCircle className="w-2 h-2 text-white" />}
                  </div>
                  <span>Lowercase</span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex items-center justify-center ${/[0-9]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {/[0-9]/.test(formData.password) && <CheckCircle className="w-2 h-2 text-white" />}
                  </div>
                  <span>Number</span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex items-center justify-center ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) && <CheckCircle className="w-2 h-2 text-white" />}
                  </div>
                  <span>Special char</span>
                </div>
              </div>
            </div>
          )}

          {/* Terms Checkbox */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="acceptedTerms"
              checked={formData.acceptedTerms}
              onChange={(e) => updateField('acceptedTerms', e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
            />
            <label htmlFor="acceptedTerms" className="text-xs text-gray-600 dark:text-gray-400">
              I agree to the{' '}
              <Link href="/terms" className="text-yellow-600 hover:underline">Terms</Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-yellow-600 hover:underline">Privacy Policy</Link>
            </label>
          </div>
          {fieldErrors.acceptedTerms && (
            <p className="text-xs text-red-600">{fieldErrors.acceptedTerms}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Organization
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center mt-4 text-xs text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-yellow-600 hover:text-yellow-700 hover:underline font-semibold">
            Sign in
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
