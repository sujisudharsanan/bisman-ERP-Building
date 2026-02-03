'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  DollarSign, Users, Truck, UserCheck, Settings, Bell,
  Search, ChevronDown, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, Activity, Clock, Target, Zap,
  AlertCircle, Calendar, Building2, RefreshCw
} from 'lucide-react';
import SubscriptionChooser from '@/components/subscription/SubscriptionChooser';

// Types
interface KPIData {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
}

interface GainLossItem {
  title: string;
  category: string;
  impact: number;
  type: 'gain' | 'loss';
}

interface IssueItem {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  context: string;
  action: string;
  actionLabel: string;
}

// Demo data
const healthScore = 82;
const healthTrend = [75, 78, 76, 80, 79, 82, 81, 83, 82, 82];

const kpiData: KPIData[] = [
  { label: 'Net Profit', value: '₹12.4L', change: 18, changeLabel: 'vs last month', status: 'good', icon: <DollarSign className="w-4 h-4" /> },
  { label: 'Cash Runway', value: '9.2 mo', change: 0, changeLabel: 'Risk if < 6mo', status: 'good', icon: <Clock className="w-4 h-4" /> },
  { label: 'Monthly Revenue', value: '₹34.7L', change: 7, changeLabel: 'vs last month', status: 'good', icon: <TrendingUp className="w-4 h-4" /> },
  { label: 'Customer Churn', value: '1.8%', change: 0.5, changeLabel: '↑ needs attention', status: 'warning', icon: <Users className="w-4 h-4" /> },
  { label: 'On-Time Delivery', value: '92%', change: -3, changeLabel: 'Target: 95%', status: 'warning', icon: <Truck className="w-4 h-4" /> },
  { label: 'Team Utilization', value: '78%', change: 5, changeLabel: 'Ideal: 70-85%', status: 'good', icon: <UserCheck className="w-4 h-4" /> },
];

const gains: GainLossItem[] = [
  { title: 'Client A - New contract signed', impact: 420000, category: 'Sales', type: 'gain' },
  { title: 'Pricing optimization Product X', impact: 110000, category: 'Pricing', type: 'gain' },
  { title: 'Improved collections Segment Y', impact: 85000, category: 'Collections', type: 'gain' },
  { title: 'Cost reduction in operations', impact: 65000, category: 'Operations', type: 'gain' },
  { title: 'New recurring revenue stream', impact: 55000, category: 'MRR', type: 'gain' },
];

const losses: GainLossItem[] = [
  { title: 'Discounts on Product B', impact: 200000, category: 'Pricing', type: 'loss' },
  { title: 'Churned: 3 enterprise customers', impact: 140000, category: 'Churn', type: 'loss' },
  { title: 'Idle Team - Ops North region', impact: 80000, category: 'Utilization', type: 'loss' },
  { title: 'Project Z penalties', impact: 30000, category: 'Delivery', type: 'loss' },
  { title: 'Refunds processed', impact: 25000, category: 'Quality', type: 'loss' },
];

const issues: IssueItem[] = [
  { id: '1', severity: 'high', title: '10 invoices overdue > 30 days (₹3.4L)', context: 'Top: Client A, Client B, Client C', action: '/admin/invoices', actionLabel: 'Review Invoices' },
  { id: '2', severity: 'high', title: 'Cash runway drops below 6mo in 45 days', context: 'If current expense rate continues', action: '/admin/cashflow', actionLabel: 'View Forecast' },
  { id: '3', severity: 'medium', title: '3 high-value clients flagged at-risk', context: 'Low usage + declining NPS scores', action: '/admin/customers', actionLabel: 'View Customers' },
  { id: '4', severity: 'medium', title: '2 projects in red - delay > 14 days', context: 'Project Alpha, Project Beta', action: '/admin/projects', actionLabel: 'View Projects' },
  { id: '5', severity: 'low', title: 'GST payment due in 3 days', context: 'Estimated: ₹2.1L', action: '/admin/compliance', actionLabel: 'View Details' },
];

// Revenue/P&L trend data
const plTrendData = [
  { month: 'Jul', revenue: 28, grossProfit: 18, netProfit: 8 },
  { month: 'Aug', revenue: 30, grossProfit: 19, netProfit: 9 },
  { month: 'Sep', revenue: 32, grossProfit: 21, netProfit: 10 },
  { month: 'Oct', revenue: 29, grossProfit: 18, netProfit: 7 },
  { month: 'Nov', revenue: 33, grossProfit: 22, netProfit: 11 },
  { month: 'Dec', revenue: 35, grossProfit: 23, netProfit: 12 },
];

// Cash flow data
const cashFlowData = [
  { week: 'W1', cashIn: 12, cashOut: 9 },
  { week: 'W2', cashIn: 8, cashOut: 11 },
  { week: 'W3', cashIn: 15, cashOut: 10 },
  { week: 'W4', cashIn: 11, cashOut: 8 },
];

// Funnel data
const funnelData = [
  { stage: 'Leads', count: 245, value: 42, conversion: 100 },
  { stage: 'Opportunities', count: 89, value: 28, conversion: 36 },
  { stage: 'Proposals', count: 34, value: 18, conversion: 38 },
  { stage: 'Won', count: 12, value: 8.5, conversion: 35 },
];

// Customer health
const customerHealth = { happy: 68, neutral: 22, atRisk: 10 };

// Project health
const projectHealth = { onTrack: 45, atRisk: 12, delayed: 8 };

// Team utilization
const teamUtilization = [
  { team: 'Sales', utilization: 72, status: 'balanced' },
  { team: 'Operations', utilization: 55, status: 'under' },
  { team: 'Support', utilization: 96, status: 'over' },
  { team: 'Tech', utilization: 81, status: 'balanced' },
];

// Helper Components
function Sparkline({ data, color = 'emerald' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-20 h-8" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color === 'emerald' ? '#10b981' : '#ef4444'}
        strokeWidth="3"
        points={points}
      />
    </svg>
  );
}

function MiniBarChart({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) {
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div 
            className={`w-full rounded-t ${item.color}`}
            style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: '4px' }}
          />
          <span className="text-[10px] text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ClientDashboardPage() {
  const [dateRange, setDateRange] = useState<'today' | '7days' | 'month' | 'quarter'>('month');
  const [selectedBusiness, setSelectedBusiness] = useState('All Businesses');
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

  // Check subscription status and show modal if needed
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        // Check subscription status from backend
        const response = await fetch(`${API_BASE}/api/subscriptions/my-subscription`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // If has active subscription or trial, don't show modal
          if (data.hasActiveSubscription || 
              data.subscription?.status === 'trial' || 
              data.subscription?.status === 'active' ||
              data.subscription?.status === 'TRIAL' ||
              data.subscription?.status === 'ACTIVE' ||
              data.status === 'active' ||
              data.status === 'trial') {
            setSubscriptionChecked(true);
            // Clear any dismissal tracking since subscription is now active
            localStorage.removeItem('subscription_modal_dismissed_at');
            setShowActivationModal(false);
            return;
          }
        }

        // Check if this is first login after registration (show only then)
        const isFirstLogin = localStorage.getItem('bisman_first_login_completed') !== 'true';
        if (!isFirstLogin) {
          // Not first login, don't show subscription modal
          setSubscriptionChecked(true);
          setShowActivationModal(false);
          return;
        }

        // Check if popup was recently dismissed (within 5 minutes)
        const dismissedAt = localStorage.getItem('subscription_modal_dismissed_at');
        if (dismissedAt) {
          const dismissedTime = parseInt(dismissedAt, 10);
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          
          if (now - dismissedTime < fiveMinutes) {
            // Was dismissed less than 5 minutes ago, don't show yet
            setSubscriptionChecked(true);
            
            // Schedule to show after remaining time
            const remainingTime = fiveMinutes - (now - dismissedTime);
            setTimeout(() => {
              setShowActivationModal(true);
            }, remainingTime);
            return;
          }
        }

        // No active subscription and either never dismissed or 5+ mins passed - show modal
        setShowActivationModal(true);
        setSubscriptionChecked(true);
        
      } catch (error) {
        console.error('Error checking subscription:', error);
        setSubscriptionChecked(true);
        
        // On error, check dismissal time
        const dismissedAt = localStorage.getItem('subscription_modal_dismissed_at');
        if (!dismissedAt) {
          setShowActivationModal(true);
        }
      }
    };

    checkSubscriptionStatus();
  }, [API_BASE]);

  const handleActivationSuccess = () => {
    setShowActivationModal(false);
    // Clear dismissal tracking since subscription is now active
    localStorage.removeItem('subscription_modal_dismissed_at');
    // Mark first login as complete so modal won't show again
    localStorage.setItem('bisman_first_login_completed', 'true');
    // Reload to refresh subscription status
    window.location.reload();
  };

  const handleModalClose = () => {
    // Store dismissal time so we can show again after 5 minutes
    localStorage.setItem('subscription_modal_dismissed_at', Date.now().toString());
    // Mark first login as complete so modal won't show on subsequent logins
    localStorage.setItem('bisman_first_login_completed', 'true');
    setShowActivationModal(false);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return 'Stable';
    if (score >= 60) return 'At Risk';
    return 'Critical';
  };

  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Business Selector */}
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
              <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{selectedBusiness}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Center: Date Range */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['today', '7days', 'month', 'quarter'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  dateRange === range
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {range === 'today' && 'Today'}
                {range === '7days' && 'Last 7 Days'}
                {range === 'month' && 'This Month'}
                {range === 'quarter' && 'This Quarter'}
              </button>
            ))}
          </div>

          {/* Right: Search, Notifications, Profile */}
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <Search className="w-5 h-5 text-gray-500" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition relative">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-6 max-w-[1800px] mx-auto">
        {/* ===== SECTION 1: Business Health Snapshot ===== */}
        <section className="space-y-4">
          {/* Health Score Card */}
          <div className={`rounded-2xl border-2 ${getHealthBgColor(healthScore)} p-6`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                {/* Score Circle */}
                <div className="relative">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700" />
                    <circle 
                      cx="56" cy="56" r="48" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      fill="none" 
                      strokeDasharray={`${(healthScore / 100) * 302} 302`}
                      className={getHealthColor(healthScore)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${getHealthColor(healthScore)}`}>{healthScore}</span>
                    <span className="text-xs text-gray-500">/100</span>
                  </div>
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business Health Today</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      healthScore >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      healthScore >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {getHealthStatus(healthScore)}
                    </span>
                    <Sparkline data={healthTrend} color="emerald" />
                    <span className="text-xs text-gray-500">30 day trend</span>
                  </div>
                </div>
              </div>

              {/* Sub-metrics */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full bg-white/50 dark:bg-gray-800/50 text-xs font-medium">
                  <span className="text-gray-500">Profitability:</span>{' '}
                  <span className="text-emerald-600">On track</span>
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/50 dark:bg-gray-800/50 text-xs font-medium">
                  <span className="text-gray-500">Cash:</span>{' '}
                  <span className="text-emerald-600">9.2 mo runway</span>
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/50 dark:bg-gray-800/50 text-xs font-medium">
                  <span className="text-gray-500">Customers:</span>{' '}
                  <span className="text-amber-600">Churn 1.8% ↑</span>
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/50 dark:bg-gray-800/50 text-xs font-medium">
                  <span className="text-gray-500">Delivery:</span>{' '}
                  <span className="text-emerald-600">92% on-time</span>
                </span>
              </div>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpiData.map((kpi, index) => (
              <button
                key={index}
                className="group p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${
                    kpi.status === 'good' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    kpi.status === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {kpi.icon}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</span>
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{kpi.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {kpi.change !== 0 && (
                    <>
                      {kpi.change > 0 ? (
                        <ArrowUpRight className={`w-3 h-3 ${kpi.status === 'good' ? 'text-emerald-500' : 'text-red-500'}`} />
                      ) : (
                        <ArrowDownRight className={`w-3 h-3 ${kpi.status === 'good' ? 'text-emerald-500' : 'text-red-500'}`} />
                      )}
                      <span className={`text-xs font-medium ${
                        kpi.status === 'good' ? 'text-emerald-600' : kpi.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {kpi.change > 0 ? '+' : ''}{kpi.change}%
                      </span>
                    </>
                  )}
                  <span className="text-xs text-gray-400">{kpi.changeLabel}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ===== SECTION 2: Three Outcome Blocks ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Money Block */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-xl">💰</span> Money & Risk
            </h3>
            
            {/* P&L Trend */}
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">P&L Trend</h4>
                <select className="text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 border-0">
                  <option>Monthly</option>
                  <option>Weekly</option>
                </select>
              </div>
              <div className="h-32 flex items-end gap-2">
                {plTrendData.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col gap-0.5" style={{ height: '100px' }}>
                      <div className="bg-blue-500 rounded-t" style={{ height: `${(item.revenue / 40) * 100}%` }} title={`Revenue: ₹${item.revenue}L`} />
                    </div>
                    <span className="text-[10px] text-gray-500">{item.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500" /> Revenue</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Net Profit</span>
              </div>
            </div>

            {/* Cash In vs Out */}
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Cash In vs Cash Out</h4>
              <div className="h-24 flex items-end gap-3">
                {cashFlowData.map((item, i) => (
                  <div key={i} className="flex-1 flex gap-1">
                    <div className="flex-1 flex flex-col justify-end">
                      <div className="bg-emerald-500 rounded-t" style={{ height: `${(item.cashIn / 16) * 80}px` }} />
                    </div>
                    <div className="flex-1 flex flex-col justify-end">
                      <div className="bg-red-400 rounded-t" style={{ height: `${(item.cashOut / 16) * 80}px` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {cashFlowData.map((item, i) => (
                  <span key={i} className="text-[10px] text-gray-500">{item.week}</span>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Cash In</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400" /> Cash Out</span>
              </div>
            </div>

            {/* Money KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="text-xs text-red-600 dark:text-red-400">Overdue Invoices</div>
                <div className="text-lg font-bold text-red-700 dark:text-red-300">₹3.4L</div>
                <div className="text-[10px] text-red-500">8 customers</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400">Avg Collection (DSO)</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">32 days</div>
                <div className="text-[10px] text-gray-500">↓ from 38 days</div>
              </div>
            </div>
          </div>

          {/* Customers & Growth Block */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-xl">📈</span> Customers & Growth
            </h3>

            {/* Revenue Funnel */}
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Revenue Funnel</h4>
              <div className="space-y-2">
                {funnelData.map((stage, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-gray-600 dark:text-gray-400">{stage.stage}</div>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded flex items-center justify-end pr-2"
                        style={{ width: `${stage.conversion}%` }}
                      >
                        <span className="text-[10px] text-white font-medium">{stage.count}</span>
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <div className="text-xs font-medium text-gray-900 dark:text-white">₹{stage.value}L</div>
                      <div className="text-[10px] text-gray-500">{stage.conversion}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Health */}
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Customer Health</h4>
              <div className="flex gap-1 h-4 rounded-full overflow-hidden mb-3">
                <div className="bg-emerald-500" style={{ width: `${customerHealth.happy}%` }} />
                <div className="bg-amber-400" style={{ width: `${customerHealth.neutral}%` }} />
                <div className="bg-red-500" style={{ width: `${customerHealth.atRisk}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Happy {customerHealth.happy}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Neutral {customerHealth.neutral}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  At Risk {customerHealth.atRisk}%
                </span>
              </div>
            </div>

            {/* Growth KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">New Customers</div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">+12</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] text-blue-600 dark:text-blue-400">Net New MRR</div>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300">₹2.1L</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="text-[10px] text-red-600 dark:text-red-400">Churned</div>
                <div className="text-lg font-bold text-red-700 dark:text-red-300">3</div>
              </div>
            </div>
          </div>

          {/* Delivery & Team Block */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-xl">🚚</span> Delivery & Team
            </h3>

            {/* Project Health */}
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Project Health</h4>
              <div className="flex gap-2 mb-4">
                <button className="flex-1 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-center hover:bg-emerald-100 transition">
                  <div className="text-2xl font-bold text-emerald-600">{projectHealth.onTrack}</div>
                  <div className="text-xs text-emerald-600">On Track</div>
                </button>
                <button className="flex-1 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-center hover:bg-amber-100 transition">
                  <div className="text-2xl font-bold text-amber-600">{projectHealth.atRisk}</div>
                  <div className="text-xs text-amber-600">At Risk</div>
                </button>
                <button className="flex-1 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-center hover:bg-red-100 transition">
                  <div className="text-2xl font-bold text-red-600">{projectHealth.delayed}</div>
                  <div className="text-xs text-red-600">Delayed</div>
                </button>
              </div>
            </div>

            {/* SLA / Quality */}
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">SLA & Quality</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">On-time Delivery</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">92%</span>
                    <Sparkline data={[88, 90, 89, 91, 93, 92]} color="emerald" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Defect/Return Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">3.2%</span>
                    <Sparkline data={[4.1, 3.8, 3.5, 3.4, 3.3, 3.2]} color="emerald" />
                  </div>
                </div>
              </div>
            </div>

            {/* Team Utilization */}
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Team Utilization</h4>
              <div className="space-y-3">
                {teamUtilization.map((team, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{team.team}</span>
                      <span className={`font-medium ${
                        team.status === 'over' ? 'text-red-500' : 
                        team.status === 'under' ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {team.utilization}%
                        {team.status === 'over' && ' (Overloaded)'}
                        {team.status === 'under' && ' (Underutilized)'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          team.status === 'over' ? 'bg-red-500' : 
                          team.status === 'under' ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${team.utilization}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION 3: Gains, Losses & Issues ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gains vs Leaks Board */}
          <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gains vs Leaks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gains */}
              <div>
                <h4 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Biggest Gains
                </h4>
                <div className="space-y-2">
                  {gains.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                      <div className="flex-1">
                        <div className="text-sm text-gray-800 dark:text-gray-200">{item.title}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-600">+{formatCurrency(item.impact)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Losses */}
              <div>
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" /> Biggest Leaks
                </h4>
                <div className="space-y-2">
                  {losses.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                      <div className="flex-1">
                        <div className="text-sm text-gray-800 dark:text-gray-200">{item.title}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-red-600">-{formatCurrency(item.impact)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Issues & Decisions Panel */}
          <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Issues Needing Attention
            </h3>
            <div className="space-y-3">
              {issues.map((issue) => (
                <div 
                  key={issue.id}
                  className={`p-3 rounded-lg border ${
                    issue.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                    issue.severity === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                    'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      issue.severity === 'high' ? 'text-red-500' :
                      issue.severity === 'medium' ? 'text-amber-500' : 'text-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{issue.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{issue.context}</div>
                      <button className="mt-2 px-3 py-1 text-xs font-medium rounded bg-gray-900 dark:bg-gray-600 text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition">
                        {issue.actionLabel}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Subscription Chooser - Full Page Overlay */}
      <SubscriptionChooser
        isOpen={showActivationModal}
        onClose={handleModalClose}
        onActivated={handleActivationSuccess}
      />
    </div>
  );
}
