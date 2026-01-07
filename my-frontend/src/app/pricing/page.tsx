'use client';

/**
 * Pricing Page - BISMAN ERP Subscription Plans
 * 
 * Features:
 * - 4 Plan Cards: Starter, Professional, Business, Enterprise
 * - Monthly/Yearly toggle with 20% discount
 * - Feature comparison table
 * - FAQ Section
 * - Trust & Security section
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Zap,
  Star,
  Crown,
  Building2,
  Users,
  Shield,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Server,
  FileCheck,
  Headphones,
  Phone,
  HelpCircle,
  Award,
  Timer,
  BadgeCheck,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// CONSTANTS - Plan Data with Exact Copy from Requirements
// ============================================================================

interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;
}

interface Plan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  priceLabel: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  borderColor: string;
  interface Plan {
    id: number;
    plan_code: string;
    name: string;
    description?: string;
    short_description?: string;
    price_monthly: number;
    price_yearly: number;
    currency: string;
    max_users: number;
    max_storage_gb: number;
    max_branches: number;
    is_popular?: boolean;
    is_enterprise?: boolean;
    cta_text?: string;
  }
  const PLANS: Plan[] = []; // Placeholder for dynamic fetching
      'Up to 25 users',
      'Advanced inventory & warehouse',
      'Custom reports & dashboards',
      'Priority email support (24hr)',
      'Advanced mobile features',
      '25GB storage',
      'All standard integrations',
      'Maker-Checker workflow',
      'Custom roles & permissions',
      'Audit trail',
    ],
    limits: {
      users: 25,
      storage: '25 GB',
      apiCalls: '50,000/month',
      integrations: 10,
    },
    cta: 'Start Free Trial',
    ctaNote: 'No credit card required',
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    tagline: 'For established businesses scaling up',
    monthlyPrice: 24999,
    yearlyPrice: 239990, // 20% off
    priceLabel: '₹24,999/month',
    icon: Crown,
    color: '#f59e0b', // amber-500
    bgGradient: 'from-amber-50 to-amber-100',
    borderColor: 'border-amber-200',
    features: [
      'Up to 100 users',
      'Multi-location support',
      'Advanced analytics & BI',
      'Phone & chat support (12hr)',
      'Offline mobile mode',
      '100GB storage',
      'Premium integrations + API access',
      'Automation rules',
      'Compliance module',
      'Report builder',
      'Real-time sync',
      'Dedicated account manager',
    ],
    limits: {
      users: 100,
      storage: '100 GB',
      apiCalls: '200,000/month',
      integrations: 25,
    },
    cta: 'Start Free Trial',
    ctaNote: 'Dedicated onboarding included',
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    tagline: 'For large organizations with custom needs',
    monthlyPrice: 0, // Custom pricing
    yearlyPrice: 0,
    priceLabel: 'Custom Pricing',
    icon: Building2,
    color: '#10b981', // emerald-500
    bgGradient: 'from-emerald-50 to-emerald-100',
    borderColor: 'border-emerald-200',
    features: [
      'Unlimited users',
      'Multi-entity support',
      'White-label options',
      '24/7 priority support + SLA',
      'On-premise deployment option',
      'Unlimited storage',
      'Custom integrations & API',
      'SSO & advanced security',
      'Dedicated infrastructure',
      'Custom training & onboarding',
      'Quarterly business reviews',
      'Early access to new features',
    ],
    limits: {
      users: Infinity,
      storage: 'Unlimited',
      apiCalls: 'Unlimited',
      integrations: Infinity,
    },
    cta: 'Contact Sales',
    ctaNote: 'Custom quote based on your requirements',
  },
];

// Feature comparison matrix
const FEATURE_CATEGORIES = [
  {
    name: 'Core Features',
    features: [
      { name: 'User limit', starter: '5', professional: '25', business: '100', enterprise: 'Unlimited' },
      { name: 'Storage', starter: '5 GB', professional: '25 GB', business: '100 GB', enterprise: 'Unlimited' },
      { name: 'Inventory management', starter: 'Basic', professional: 'Advanced', business: 'Advanced', enterprise: 'Advanced' },
      { name: 'Reports & Analytics', starter: 'Standard', professional: 'Custom', business: 'BI + Builder', enterprise: 'BI + Builder' },
      { name: 'Mobile access', starter: true, professional: true, business: true, enterprise: true },
    ],
  },
  {
    name: 'Advanced Features',
    features: [
      { name: 'Custom roles & permissions', starter: false, professional: true, business: true, enterprise: true },
      { name: 'Maker-Checker workflow', starter: false, professional: true, business: true, enterprise: true },
      { name: 'Automation rules', starter: false, professional: false, business: true, enterprise: true },
      { name: 'API access', starter: false, professional: false, business: true, enterprise: true },
      { name: 'Audit trail export', starter: false, professional: false, business: true, enterprise: true },
      { name: 'Real-time sync', starter: false, professional: false, business: true, enterprise: true },
    ],
  },
  {
    name: 'Enterprise Features',
    features: [
      { name: 'Multi-entity support', starter: false, professional: false, business: false, enterprise: true },
      { name: 'White-label / Custom branding', starter: false, professional: false, business: false, enterprise: true },
      { name: 'SSO (SAML/OAuth)', starter: false, professional: false, business: false, enterprise: true },
      { name: 'Compliance module', starter: false, professional: false, business: true, enterprise: true },
      { name: 'On-premise deployment', starter: false, professional: false, business: false, enterprise: true },
    ],
  },
  {
    name: 'Support & Services',
    features: [
      { name: 'Support type', starter: 'Email', professional: 'Priority Email', business: 'Phone & Chat', enterprise: '24/7 Priority' },
      { name: 'Response time', starter: '48 hours', professional: '24 hours', business: '12 hours', enterprise: '4 hours SLA' },
      { name: 'Dedicated account manager', starter: false, professional: false, business: true, enterprise: true },
      { name: 'Custom training', starter: false, professional: false, business: false, enterprise: true },
      { name: 'Business reviews', starter: false, professional: false, business: false, enterprise: 'Quarterly' },
    ],
  },
];

// FAQ data
const FAQ_ITEMS = [
  {
    question: 'How does the free trial work?',
    answer: 'Start with any paid plan for free. No credit card required. You get full access to all features of your chosen plan. You can upgrade, downgrade, or cancel with no obligations.',
  },
  {
    question: 'Can I switch plans anytime?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you get immediate access to new features and are charged the prorated difference. When downgrading, the new rate applies at your next billing cycle.',
  },
  {
    question: 'What happens when I exceed my user limit?',
    answer: 'We\'ll notify you when you\'re approaching your limit. You can either upgrade to a higher plan or remove inactive users. We never charge overage fees without warning.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use bank-grade encryption (AES-256), secure data centers, regular security audits, and comply with industry standards. Enterprise plans include additional security features like SSO and custom security policies.',
  },
  {
    question: 'Do you offer discounts for annual billing?',
    answer: 'Yes! Choose annual billing and save 20% compared to monthly payments. This applies to all paid plans.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit/debit cards, UPI, net banking, and bank transfers for annual plans. Enterprise customers can request custom payment terms including invoicing.',
  },
  {
    question: 'Can I get a refund if I\'m not satisfied?',
    answer: 'We offer a 30-day money-back guarantee for all new subscriptions. If you\'re not happy, contact us within 30 days of your first payment for a full refund.',
  },
  {
    question: 'How do I get started with Enterprise?',
    answer: 'Contact our sales team for a personalized demo and custom quote. We\'ll work with you to understand your needs and create a tailored solution, including custom implementation, training, and SLA terms.',
  },
];

// Trust badges
const TRUST_ITEMS = [
  { icon: Shield, title: 'Bank-Grade Security', desc: 'AES-256 encryption' },
  { icon: Server, title: '99.9% Uptime', desc: 'Enterprise SLA available' },
  { icon: FileCheck, title: 'GDPR Compliant', desc: 'Data privacy assured' },
  { icon: Headphones, title: 'Expert Support', desc: 'Help when you need it' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatPrice(amount: number): string {
  if (amount === 0) return 'Custom';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Billing Toggle Component
function BillingToggle({
  isYearly,
  onToggle,
}: {
  isYearly: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4 mb-12">
      <span className={`text-lg ${!isYearly ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
        Monthly
      </span>
      <button
        onClick={onToggle}
        className={`relative w-16 h-8 rounded-full transition-colors ${
          isYearly ? 'bg-emerald-500' : 'bg-gray-300'
        }`}
      >
        <motion.div
          className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
          animate={{ left: isYearly ? '34px' : '4px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
      <div className="flex items-center gap-2">
        <span className={`text-lg ${isYearly ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
          Yearly
        </span>
        <span className="bg-emerald-100 text-emerald-700 text-sm font-medium px-2 py-1 rounded-full">
          Save 20%
        </span>
      </div>
    </div>
  );
}

// Plan Card Component
function PlanCard({
  plan,
  isYearly,
  currentPlan,
  onSelect,
}: {
  plan: Plan;
  isYearly: boolean;
  currentPlan?: string;
  onSelect: (planId: string) => void;
}) {
  const Icon = plan.icon;
  const price = isYearly ? plan.yearlyPrice / 12 : plan.monthlyPrice;
  const isCurrentPlan = currentPlan === plan.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className={`relative bg-gradient-to-b ${plan.bgGradient} rounded-2xl border-2 ${
        plan.popular ? 'border-violet-400 shadow-xl shadow-violet-100' : plan.borderColor
      } p-6 flex flex-col h-full`}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-violet-500 text-white text-sm font-semibold px-4 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
          style={{ backgroundColor: `${plan.color}20` }}
        >
          <Icon className="w-7 h-7" style={{ color: plan.color }} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
        <p className="text-gray-600 mt-1">{plan.tagline}</p>
      </div>

      {/* Pricing */}
      <div className="text-center mb-6">
        {plan.monthlyPrice > 0 ? (
          <>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-gray-900">{formatPrice(price)}</span>
              <span className="text-gray-500">/month</span>
            </div>
            {isYearly && (
              <p className="text-sm text-gray-500 mt-1">
                Billed {formatPrice(plan.yearlyPrice)} yearly
              </p>
            )}
          </>
        ) : (
          <div className="text-3xl font-bold text-gray-900">Custom Pricing</div>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-grow">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div>
        <button
          onClick={() => onSelect(plan.id)}
          disabled={isCurrentPlan}
          className={`w-full py-3 px-6 rounded-xl font-semibold text-lg transition-all ${
            isCurrentPlan
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : plan.popular
              ? 'bg-violet-500 text-white hover:bg-violet-600 shadow-lg shadow-violet-200'
              : plan.id === 'ENTERPRISE'
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-white text-gray-900 border-2 border-gray-300 hover:border-gray-400'
          }`}
        >
          {isCurrentPlan ? 'Current Plan' : plan.cta}
        </button>
        {plan.ctaNote && (
          <p className="text-center text-sm text-gray-500 mt-2">{plan.ctaNote}</p>
        )}
      </div>
    </motion.div>
  );
}

// Feature Comparison Table
function FeatureComparison() {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Compare Plans</h2>
          <p className="text-gray-600 mt-2">See what&apos;s included in each plan</p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 mx-auto mb-8 text-violet-600 hover:text-violet-700 font-medium"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-5 h-5" />
              Hide comparison
            </>
          ) : (
            <>
              <ChevronDown className="w-5 h-5" />
              Show full comparison
            </>
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-x-auto"
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900 w-1/4">Feature</th>
                    {PLANS.map((plan) => (
                      <th key={plan.id} className="text-center py-4 px-4">
                        <span
                          className="font-semibold text-lg"
                          style={{ color: plan.color }}
                        >
                          {plan.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_CATEGORIES.map((category) => (
                    <React.Fragment key={category.name}>
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="py-3 px-4 font-semibold text-gray-700">
                          {category.name}
                        </td>
                      </tr>
                      {category.features.map((feature) => (
                        <tr key={feature.name} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-gray-700">{feature.name}</td>
                          {['starter', 'professional', 'business', 'enterprise'].map((planKey) => {
                            const value = feature[planKey as keyof typeof feature];
                            return (
                              <td key={planKey} className="text-center py-3 px-4">
                                {typeof value === 'boolean' ? (
                                  value ? (
                                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                                  ) : (
                                    <X className="w-5 h-5 text-gray-300 mx-auto" />
                                  )
                                ) : (
                                  <span className="text-gray-700">{value}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// FAQ Section
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <p className="text-gray-600 mt-2">Everything you need to know about our pricing</p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, idx) => (
            <motion.div
              key={idx}
              initial={false}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === idx ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-5 pb-5 text-gray-600 leading-relaxed">{item.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Trust & Security Section
function TrustSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Trusted by Businesses Everywhere</h2>
          <p className="text-gray-600 mt-2">Enterprise-grade security and reliability</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {TRUST_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center p-6"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-violet-100 mb-4">
                  <Icon className="w-7 h-7 text-violet-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Additional trust elements */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>256-bit SSL encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4" />
              <span>SOC 2 Type II compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              <span>30-day money-back guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>Rated 4.8/5 by customers</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  return (
    <section className="py-16 bg-gradient-to-r from-violet-600 to-indigo-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Ready to streamline your business?
        </h2>
        <p className="text-violet-100 text-lg mb-8 max-w-2xl mx-auto">
          Join thousands of businesses using BISMAN ERP to manage their operations.
          Start your free 14-day trial today.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-violet-600 font-semibold px-8 py-4 rounded-xl hover:bg-violet-50 transition-colors shadow-lg"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/contact-sales"
            className="inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-xl border-2 border-white/30 hover:bg-white/10 transition-colors"
          >
            <Phone className="w-5 h-5" />
            Contact Sales
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/subscriptions/plans')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.plans) setPlans(data.plans);
        else setError('Unable to load plans');
      })
      .catch(() => setError('Unable to load plans'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">Choose Your Plan</h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-10">Select a plan to get started with BISMAN ERP</p>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <span className="text-lg text-gray-500">Loading...</span>
          </div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border-2 p-6 bg-white dark:bg-gray-800 shadow-md flex flex-col items-center ${plan.is_popular ? 'ring-2 ring-violet-500' : ''}`}
              >
                <div className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{plan.name}</div>
                <div className="mb-2 text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">
                  {plan.price_monthly === 0 ? 'Free' : `₹${plan.price_monthly}/month`}
                </div>
                <div className="mb-2 text-gray-700 dark:text-gray-300 text-center text-sm min-h-[48px]">
                  {plan.short_description || plan.description}
                </div>
                <div className="flex-1" />
                <button className={`mt-4 w-full py-2 rounded-lg font-semibold transition-colors ${plan.price_monthly === 0 ? 'bg-gray-800 text-white hover:bg-gray-900' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  {plan.cta_text || (plan.price_monthly === 0 ? 'Start Free' : 'Select Plan')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
