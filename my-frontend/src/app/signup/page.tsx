'use client';

/**
 * Tenant Self-Service Signup / Get Started Page
 * BISMAN ERP - Multi-step Onboarding Wizard
 *
 * Features:
 * - Company name input
 * - Admin name & email
 * - Password creation with validation
 * - Plan selection (Free / Pro / Enterprise)
 * - Trial start with 14-day period
 * - Email verification flow
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Zap,
  Users,
  HardDrive,
  Shield,
  Star,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Rocket,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FormData {
  companyName: string;
  adminName: string;
  email: string;
  password: string;
  confirmPassword: string;
  plan: 'free' | 'pro' | 'enterprise';
  agreeToTerms: boolean;
  phone?: string;
  industry?: string;
}

interface ValidationErrors {
  companyName?: string;
  adminName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  plan?: string;
  agreeToTerms?: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = [
  { id: 1, title: 'Company', icon: Building2 },
  { id: 2, title: 'Account', icon: User },
  { id: 3, title: 'Plan', icon: Star },
  { id: 4, title: 'Complete', icon: Rocket },
];

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: [
      '3 team members',
      '5,000 API calls/day',
      '1 GB storage',
      'Email support',
      'Basic analytics',
    ],
    quotas: {
      users: 3,
      apiCalls: '5K/day',
      storage: '1 GB',
    },
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: 49,
    description: 'For growing businesses',
    popular: true,
    features: [
      '25 team members',
      '50,000 API calls/day',
      '10 GB storage',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Custom integrations',
    ],
    quotas: {
      users: 25,
      apiCalls: '50K/day',
      storage: '10 GB',
    },
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: 199,
    description: 'For large organizations',
    features: [
      'Unlimited team members',
      '500,000 API calls/day',
      '100 GB storage',
      'Dedicated support',
      'Enterprise analytics',
      'SSO/SAML',
      'Custom SLA',
      'On-premise option',
    ],
    quotas: {
      users: 'Unlimited',
      apiCalls: '500K/day',
      storage: '100 GB',
    },
  },
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Transportation',
  'Energy',
  'Other',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function checkPasswordStrength(password: string): PasswordStrength {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(requirements).filter(Boolean).length;

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e'];

  return {
    score,
    label: labels[score - 1] || labels[0],
    color: colors[score - 1] || colors[0],
    requirements,
  };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Step indicator
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isCompleted
                    ? '#22c55e'
                    : isActive
                    ? '#8b5cf6'
                    : '#e5e7eb',
                }}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isCompleted || isActive ? 'text-white' : 'text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </motion.div>
              <span
                className={`text-xs mt-2 font-medium ${
                  isActive
                    ? 'text-violet-600 dark:text-violet-400'
                    : isCompleted
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                {step.title}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-16 h-1 mx-2 rounded ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Password requirements indicator
function PasswordRequirements({ strength }: { strength: PasswordStrength }) {
  const items = [
    { key: 'length', label: 'At least 8 characters' },
    { key: 'uppercase', label: 'One uppercase letter' },
    { key: 'lowercase', label: 'One lowercase letter' },
    { key: 'number', label: 'One number' },
    { key: 'special', label: 'One special character' },
  ];

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(strength.score / 5) * 100}%` }}
            className="h-full rounded-full"
            style={{ backgroundColor: strength.color }}
          />
        </div>
        <span className="text-xs font-medium" style={{ color: strength.color }}>
          {strength.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {items.map((item) => {
          const met = strength.requirements[item.key as keyof typeof strength.requirements];
          return (
            <div
              key={item.key}
              className={`flex items-center gap-1 text-xs ${
                met ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Plan card
function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: (typeof PLANS)[0];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative cursor-pointer rounded-xl border-2 p-5 transition-all ${
        selected
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-violet-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Most Popular
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {plan.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {plan.description}
          </p>
        </div>
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            selected
              ? 'border-violet-500 bg-violet-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {selected && <Check className="w-4 h-4 text-white" />}
        </div>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          ${plan.price}
        </span>
        <span className="text-gray-500 dark:text-gray-400">/month</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <Users className="w-3 h-3" />
          {plan.quotas.users}
        </div>
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <Zap className="w-3 h-3" />
          {plan.quotas.apiCalls}
        </div>
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <HardDrive className="w-3 h-3" />
          {plan.quotas.storage}
        </div>
      </div>

      <ul className="space-y-2">
        {plan.features.slice(0, 4).map((feature, idx) => (
          <li
            key={idx}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <Check className="w-4 h-4 text-green-500" />
            {feature}
          </li>
        ))}
        {plan.features.length > 4 && (
          <li className="text-sm text-violet-600 dark:text-violet-400">
            +{plan.features.length - 4} more features
          </li>
        )}
      </ul>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupResult, setSignupResult] = useState<{
    tenantId: string;
    trialExpiresAt?: string;
  } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: '',
    plan: 'pro',
    agreeToTerms: false,
    phone: '',
    industry: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const passwordStrength = checkPasswordStrength(formData.password);

  // Check email availability (debounced)
  const checkEmailAvailability = useCallback(
    debounce(async (email: string) => {
      if (!validateEmail(email)) {
        setEmailAvailable(null);
        return;
      }

      setIsCheckingEmail(true);
      try {
        const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(
          `${baseURL}/api/onboard/check-email?email=${encodeURIComponent(email)}`
        );
        const data = await response.json();
        setEmailAvailable(data.available);
      } catch (err) {
        console.error('Email check error:', err);
        setEmailAvailable(null);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500),
    []
  );

  // Update form data
  const updateForm = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));

    // Check email availability
    if (field === 'email' && value) {
      checkEmailAvailability(value);
    }
  };

  // Validate current step
  const validateStep = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (currentStep === 1) {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required';
      } else if (formData.companyName.length < 2) {
        newErrors.companyName = 'Company name must be at least 2 characters';
      }
    }

    if (currentStep === 2) {
      if (!formData.adminName.trim()) {
        newErrors.adminName = 'Your name is required';
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Invalid email address';
      } else if (emailAvailable === false) {
        newErrors.email = 'Email is already registered';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (passwordStrength.score < 3) {
        newErrors.password = 'Password is too weak';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (currentStep === 3) {
      if (!formData.agreeToTerms) {
        newErrors.agreeToTerms = 'You must agree to the terms';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < 3) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  // Handle previous step
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          adminEmail: formData.email,
          adminName: formData.adminName,
          adminPassword: formData.password,
          plan: formData.plan === 'free' ? 'free' : 'trial',
          phone: formData.phone,
          industry: formData.industry,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSignupResult({
          tenantId: data.tenantId,
          trialExpiresAt: data.trialExpiresAt,
        });
        setCurrentStep(4);
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-violet-600 dark:text-violet-400">
              BISMAN ERP
            </h1>
          </Link>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Start your free 14-day trial
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8"
        >
          {/* Step Indicator */}
          <StepIndicator currentStep={currentStep} />

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-700 dark:text-red-400">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {/* Step 1: Company Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Tell us about your company
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    We'll set up your workspace
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company Name *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => updateForm('companyName', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                        errors.companyName
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      }`}
                      placeholder="Acme Corporation"
                    />
                  </div>
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Industry (Optional)
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => updateForm('industry', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Step 2: Account Details */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Create your account
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    You'll be the admin of your workspace
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.adminName}
                      onChange={(e) => updateForm('adminName', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                        errors.adminName
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      }`}
                      placeholder="John Smith"
                    />
                  </div>
                  {errors.adminName && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      className={`w-full pl-10 pr-10 py-3 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                        errors.email
                          ? 'border-red-500'
                          : emailAvailable === false
                          ? 'border-red-500'
                          : emailAvailable === true
                          ? 'border-green-500'
                          : 'border-gray-300 dark:border-slate-600'
                      }`}
                      placeholder="john@company.com"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingEmail ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : emailAvailable === true ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : emailAvailable === false ? (
                        <X className="w-5 h-5 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => updateForm('password', e.target.value)}
                      className={`w-full pl-10 pr-10 py-3 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                        errors.password
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      }`}
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {formData.password && (
                    <PasswordRequirements strength={passwordStrength} />
                  )}
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => updateForm('confirmPassword', e.target.value)}
                      className={`w-full pl-10 pr-10 py-3 border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                        errors.confirmPassword
                          ? 'border-red-500'
                          : formData.confirmPassword && formData.password === formData.confirmPassword
                          ? 'border-green-500'
                          : 'border-gray-300 dark:border-slate-600'
                      }`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Plan Selection */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Choose your plan
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Start with a 14-day free trial of Pro features
                  </p>
                </div>

                <div className="grid gap-4">
                  {PLANS.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      selected={formData.plan === plan.id}
                      onSelect={() => updateForm('plan', plan.id)}
                    />
                  ))}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-300">
                        14-Day Free Trial
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {formData.plan === 'free'
                          ? 'Start with Free plan features immediately'
                          : 'Try all Pro features free for 14 days. No credit card required.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={(e) => updateForm('agreeToTerms', e.target.checked)}
                    className="mt-1 w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                  />
                  <label
                    htmlFor="agreeToTerms"
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    I agree to the{' '}
                    <a href="/terms" className="text-violet-600 hover:underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-violet-600 hover:underline">
                      Privacy Policy
                    </a>
                  </label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-sm text-red-600">{errors.agreeToTerms}</p>
                )}
              </motion.div>
            )}

            {/* Step 4: Success */}
            {currentStep === 4 && signupResult && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </motion.div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome to BISMAN ERP!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your workspace for <strong>{formData.companyName}</strong> is ready.
                </p>

                {signupResult.trialExpiresAt && (
                  <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4 mb-6 inline-block">
                    <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                      <Star className="w-5 h-5" />
                      <span>
                        Pro trial active until{' '}
                        {new Date(signupResult.trialExpiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    We've sent login instructions to <strong>{formData.email}</strong>
                  </p>

                  <button
                    onClick={() => router.push('/auth/login')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Go to Login <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentStep === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                onClick={handleNext}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : currentStep === 3 ? (
                  <>
                    Start Free Trial <Rocket className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>

        {/* Login Link */}
        <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-violet-600 hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
