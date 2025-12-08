'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  DollarSign, Users, Truck, Activity,
  ArrowUpRight, ArrowDownRight, Bell
} from 'lucide-react';

// ==================== TYPES ====================
interface KPIData {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
}

interface HealthMetric {
  name: string;
  value: string;
  status: 'on-track' | 'below-plan' | 'at-risk';
}

interface GainLeak {
  id: string;
  title: string;
  impact: number;
  type: 'gain' | 'leak';
  category: string;
  description: string;
}

interface Issue {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  context: string;
  actionLabel: string;
}

interface ChartDataPoint {
  label: string;
  revenue: number;
  grossProfit: number;
  netProfit: number;
}

interface FunnelStep {
  name: string;
  count: number;
  value: number;
  conversion: number;
}

// ==================== MOCK DATA ====================
const healthScore = 82;
const healthStatus = 'Stable';
const healthTrend = [75, 78, 76, 80, 79, 82, 81, 82];

const healthMetrics: HealthMetric[] = [
  { name: 'Profitability', value: 'On track', status: 'on-track' },
  { name: 'Cash', value: '9.2 months', status: 'on-track' },
  { name: 'Customers', value: 'Churn 1.8%', status: 'below-plan' },
  { name: 'Delivery', value: '92% on-time', status: 'on-track' },
];

const kpiData: KPIData[] = [
  { label: 'Net Profit', value: '₹12.4L', change: 18, changeLabel: 'vs last month', status: 'good', icon: <DollarSign className="w-4 h-4" /> },
  { label: 'Cash Runway', value: '9.2 months', change: 0, changeLabel: 'Risk if < 6 months', status: 'good', icon: <Activity className="w-4 h-4" /> },
  { label: 'Monthly Revenue', value: '₹34.7L', change: 7, changeLabel: 'vs last month', status: 'good', icon: <TrendingUp className="w-4 h-4" /> },
  { label: 'Customer Churn', value: '1.8%', change: 0.5, changeLabel: 'needs attention', status: 'warning', icon: <Users className="w-4 h-4" /> },
  { label: 'Project Delivery', value: '92%', change: -3, changeLabel: 'Target: 95%', status: 'warning', icon: <Truck className="w-4 h-4" /> },
  { label: 'Team Utilization', value: '78%', change: 0, changeLabel: 'Ideal: 70-85%', status: 'good', icon: <Activity className="w-4 h-4" /> },
];

const plTrendData: ChartDataPoint[] = [
  { label: 'Week 1', revenue: 850000, grossProfit: 340000, netProfit: 180000 },
  { label: 'Week 2', revenue: 920000, grossProfit: 380000, netProfit: 210000 },
  { label: 'Week 3', revenue: 780000, grossProfit: 310000, netProfit: 150000 },
  { label: 'Week 4', revenue: 980000, grossProfit: 420000, netProfit: 240000 },
];

const cashFlowData = [
  { label: 'Week 1', cashIn: 720000, cashOut: 580000 },
  { label: 'Week 2', cashIn: 850000, cashOut: 620000 },
  { label: 'Week 3', cashIn: 680000, cashOut: 710000 },
  { label: 'Week 4', cashIn: 920000, cashOut: 650000 },
];

const funnelData: FunnelStep[] = [
  { name: 'Leads', count: 245, value: 4500000, conversion: 100 },
  { name: 'Opportunities', count: 89, value: 2800000, conversion: 36 },
  { name: 'Proposals', count: 34, value: 1800000, conversion: 38 },
  { name: 'Won', count: 12, value: 980000, conversion: 35 },
];

const customerHealth = [
  { segment: 'Happy', count: 156, percentage: 68, color: 'bg-green-500' },
  { segment: 'Neutral', count: 52, percentage: 23, color: 'bg-yellow-500' },
  { segment: 'At Risk', count: 21, percentage: 9, color: 'bg-red-500' },
];

const atRiskCustomers = [
  { name: 'TechCorp Ltd', revenue: '₹4.2L/mo', risk: 'Low usage' },
  { name: 'Global Systems', revenue: '₹3.8L/mo', risk: 'Bad NPS' },
  { name: 'DataFlow Inc', revenue: '₹2.9L/mo', risk: 'Support tickets' },
];

const projectHealth = [
  { status: 'On Track', count: 18, color: 'bg-green-500' },
  { status: 'At Risk', count: 5, color: 'bg-yellow-500' },
  { status: 'Delayed', count: 3, color: 'bg-red-500' },
];

const teamUtilization = [
  { team: 'Sales', utilization: 72, status: 'balanced' },
  { team: 'Operations', utilization: 55, status: 'underloaded' },
  { team: 'Support', utilization: 96, status: 'overloaded' },
  { team: 'Tech', utilization: 81, status: 'balanced' },
];

const gains: GainLeak[] = [
  { id: '1', title: 'New contract - Client A', impact: 420000, type: 'gain', category: 'Revenue', description: 'Enterprise deal closed' },
  { id: '2', title: 'Pricing optimization - Product X', impact: 110000, type: 'gain', category: 'Pricing', description: 'Margin improvement' },
  { id: '3', title: 'Collection improvement', impact: 85000, type: 'gain', category: 'Cash', description: 'DSO reduced 45→28 days' },
  { id: '4', title: 'Process automation', impact: 65000, type: 'gain', category: 'Efficiency', description: 'Reduced manual work' },
];

const leaks: GainLeak[] = [
  { id: '1', title: 'Discounts on Product B', impact: -200000, type: 'leak', category: 'Pricing', description: 'Lost margin' },
  { id: '2', title: 'Customer churn (3 clients)', impact: -140000, type: 'leak', category: 'Churn', description: 'MRR loss' },
  { id: '3', title: 'Idle Team - Ops North', impact: -80000, type: 'leak', category: 'Utilization', description: 'Low billing' },
  { id: '4', title: 'Project Z delays', impact: -30000, type: 'leak', category: 'Delivery', description: 'Penalties' },
];

const issues: Issue[] = [
  { id: '1', severity: 'high', title: '10 invoices overdue > 30 days (₹3.4L)', context: 'Top 3: Client A, Client B, Client C', actionLabel: 'Review Invoices' },
  { id: '2', severity: 'high', title: 'Cash runway below 6 months in 45 days', context: 'If expenses unchanged', actionLabel: 'Plan Cash Flow' },
  { id: '3', severity: 'medium', title: '3 high-value clients flagged at-risk', context: 'Low usage + bad NPS', actionLabel: 'View Clients' },
  { id: '4', severity: 'medium', title: '2 key projects in red', context: 'Expected delay > 14 days', actionLabel: 'Check Projects' },
  { id: '5', severity: 'low', title: 'Support team overloaded 3 weeks', context: 'Avg response time ↑48%', actionLabel: 'Manage Team' },
  { id: '6', severity: 'low', title: 'GST payment due in 3 days', context: 'Estimate ₹2.8L', actionLabel: 'Pay Now' },
];

// ==================== HELPER COMPONENTS ====================
const StatusBadge = ({ status }: { status: 'good' | 'warning' | 'critical' | 'on-track' | 'below-plan' | 'at-risk' }) => {
  const colors: Record<string, string> = {
    'good': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'on-track': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'warning': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'below-plan': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'critical': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'at-risk': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>{status.replace('-', ' ')}</span>;
};

const MiniSparkline = ({ data, color = 'text-blue-500' }: { data: number[]; color?: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} className={color} />
    </svg>
  );
};

// ==================== SECTION COMPONENTS ====================

// Health Score Card
const HealthScoreCard = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Business Health Today</h3>
      <span className="text-xs text-gray-400">Last 30 days</span>
    </div>
    
    <div className="flex items-center gap-6">
      {/* Score Circle */}
      <div className="relative">
        <svg className="w-28 h-28 -rotate-90">
          <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-slate-700" />
          <circle 
            cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="8" 
            strokeDasharray={`${(healthScore / 100) * 301.6} 301.6`}
            className={healthScore >= 70 ? 'text-green-500' : healthScore >= 50 ? 'text-yellow-500' : 'text-red-500'}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">{healthScore}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      </div>
      
      {/* Status & Trend */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-lg font-semibold ${healthScore >= 70 ? 'text-green-600' : healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {healthStatus}
          </span>
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
        <div className="mb-3">
          <MiniSparkline data={healthTrend} color={healthScore >= 70 ? 'text-green-500' : 'text-yellow-500'} />
        </div>
        <div className="flex flex-wrap gap-2">
          {healthMetrics.map((m, i) => (
            <div key={i} className="flex items-center gap-1 text-xs">
              <span className="text-gray-500 dark:text-gray-400">{m.name}:</span>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// KPI Strip
const KPIStrip = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    {kpiData.map((kpi, i) => (
      <div 
        key={i} 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded ${kpi.status === 'good' ? 'bg-green-100 text-green-600' : kpi.status === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
            {kpi.icon}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</span>
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white">{kpi.value}</div>
        <div className="flex items-center gap-1 mt-1">
          {kpi.change !== 0 && (
            <>
              {kpi.change > 0 ? (
                <ArrowUpRight className={`w-3 h-3 ${kpi.status === 'good' ? 'text-green-500' : 'text-red-500'}`} />
              ) : (
                <ArrowDownRight className={`w-3 h-3 ${kpi.status === 'good' ? 'text-green-500' : 'text-red-500'}`} />
              )}
              <span className={`text-xs ${kpi.status === 'good' ? 'text-green-600' : kpi.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </span>
            </>
          )}
          <span className="text-xs text-gray-400">{kpi.changeLabel}</span>
        </div>
      </div>
    ))}
  </div>
);

// Money Block
const MoneyBlock = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
    <div className="flex items-center gap-2 mb-4">
      <DollarSign className="w-5 h-5 text-green-500" />
      <h3 className="font-semibold text-gray-900 dark:text-white">Money & Risk</h3>
    </div>
    
    {/* P&L Trend */}
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">P&L Trend</span>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Revenue</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Net Profit</span>
        </div>
      </div>
      <div className="h-24 flex items-end gap-2">
        {plTrendData.map((d, i) => (
          <div key={i} className="flex-1 flex gap-0.5">
            <div className="flex-1 bg-blue-200 dark:bg-blue-900 rounded-t" style={{ height: `${(d.revenue / 1000000) * 100}%` }} />
            <div className="flex-1 bg-green-500 rounded-t" style={{ height: `${(d.netProfit / 300000) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        {plTrendData.map((d, i) => <span key={i}>{d.label}</span>)}
      </div>
    </div>
    
    {/* Cash In vs Out */}
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Cash In vs Out</span>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> In</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Out</span>
        </div>
      </div>
      <div className="h-20 flex items-end gap-3">
        {cashFlowData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col gap-0.5">
            <div className="bg-green-500 rounded-t" style={{ height: `${(d.cashIn / 1000000) * 80}px` }} />
            <div className="bg-red-400 rounded-b" style={{ height: `${(d.cashOut / 1000000) * 80}px` }} />
          </div>
        ))}
      </div>
    </div>
    
    {/* Key Money KPIs */}
    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
      <div className="text-center">
        <div className="text-lg font-bold text-red-500">₹3.4L</div>
        <div className="text-xs text-gray-500">Overdue Invoices</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-gray-900 dark:text-white">32 days</div>
        <div className="text-xs text-gray-500">Avg DSO</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-green-500">Clear</div>
        <div className="text-xs text-gray-500">Statutory Dues</div>
      </div>
    </div>
  </div>
);

// Customers Block
const CustomersBlock = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
    <div className="flex items-center gap-2 mb-4">
      <TrendingUp className="w-5 h-5 text-blue-500" />
      <h3 className="font-semibold text-gray-900 dark:text-white">Customers & Growth</h3>
    </div>
    
    {/* Revenue Funnel */}
    <div className="mb-5">
      <span className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Revenue Funnel</span>
      <div className="space-y-2">
        {funnelData.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-20 text-xs text-gray-600 dark:text-gray-400">{step.name}</div>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-700 rounded overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-end pr-2"
                style={{ width: `${step.conversion}%` }}
              >
                <span className="text-xs text-white font-medium">{step.count}</span>
              </div>
            </div>
            <div className="w-16 text-xs text-gray-500 text-right">₹{(step.value / 100000).toFixed(1)}L</div>
          </div>
        ))}
      </div>
    </div>
    
    {/* Customer Health */}
    <div className="mb-5">
      <span className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Customer Health</span>
      <div className="flex gap-1 h-4 rounded overflow-hidden mb-2">
        {customerHealth.map((s, i) => (
          <div key={i} className={`${s.color}`} style={{ width: `${s.percentage}%` }} title={`${s.segment}: ${s.count}`} />
        ))}
      </div>
      <div className="flex justify-between text-xs">
        {customerHealth.map((s, i) => (
          <span key={i} className="text-gray-500">{s.segment}: {s.count}</span>
        ))}
      </div>
    </div>
    
    {/* At Risk Customers */}
    <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
      <span className="text-xs text-gray-500 mb-2 block">At Risk (Top Revenue)</span>
      <div className="space-y-2">
        {atRiskCustomers.map((c, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{c.revenue}</span>
              <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">{c.risk}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Delivery Block
const DeliveryBlock = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
    <div className="flex items-center gap-2 mb-4">
      <Truck className="w-5 h-5 text-purple-500" />
      <h3 className="font-semibold text-gray-900 dark:text-white">Delivery & Team</h3>
    </div>
    
    {/* Project Health */}
    <div className="mb-5">
      <span className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Project Health</span>
      <div className="flex gap-3">
        {projectHealth.map((p, i) => (
          <div key={i} className="flex-1 text-center">
            <div className={`text-2xl font-bold ${p.status === 'On Track' ? 'text-green-500' : p.status === 'At Risk' ? 'text-yellow-500' : 'text-red-500'}`}>
              {p.count}
            </div>
            <div className="text-xs text-gray-500">{p.status}</div>
          </div>
        ))}
      </div>
    </div>
    
    {/* SLA / Quality */}
    <div className="grid grid-cols-2 gap-4 mb-5">
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
        <div className="text-xl font-bold text-gray-900 dark:text-white">92%</div>
        <div className="text-xs text-gray-500">On-time Delivery</div>
        <div className="text-xs text-yellow-500">Target: 95%</div>
      </div>
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
        <div className="text-xl font-bold text-gray-900 dark:text-white">3.2%</div>
        <div className="text-xs text-gray-500">Defect/Return Rate</div>
        <div className="text-xs text-green-500">↓ 0.8%</div>
      </div>
    </div>
    
    {/* Team Utilization */}
    <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
      <span className="text-xs text-gray-500 mb-3 block">Team Utilization</span>
      <div className="space-y-2">
        {teamUtilization.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-16 text-xs text-gray-600 dark:text-gray-400">{t.team}</span>
            <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-700 rounded overflow-hidden">
              <div 
                className={`h-full ${t.status === 'balanced' ? 'bg-green-500' : t.status === 'overloaded' ? 'bg-red-500' : 'bg-yellow-500'}`}
                style={{ width: `${t.utilization}%` }}
              />
            </div>
            <span className={`text-xs w-14 text-right ${t.status === 'overloaded' ? 'text-red-500' : t.status === 'underloaded' ? 'text-yellow-500' : 'text-green-500'}`}>
              {t.utilization}%
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Gains vs Leaks
const GainsLeaksBoard = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Gains vs Leaks</h3>
    <div className="grid md:grid-cols-2 gap-6">
      {/* Gains */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-green-600">Biggest Gains</span>
        </div>
        <div className="space-y-2">
          {gains.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex-1">
                <div className="text-sm text-gray-800 dark:text-gray-200">{g.title}</div>
                <div className="text-xs text-gray-500">{g.description}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-600">+₹{(g.impact / 100000).toFixed(1)}L</div>
                <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">{g.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Leaks */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-red-600">Biggest Leaks</span>
        </div>
        <div className="space-y-2">
          {leaks.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex-1">
                <div className="text-sm text-gray-800 dark:text-gray-200">{l.title}</div>
                <div className="text-xs text-gray-500">{l.description}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-red-600">₹{(Math.abs(l.impact) / 100000).toFixed(1)}L</div>
                <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded">{l.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Issues Panel
const IssuesPanel = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
    <div className="flex items-center gap-2 mb-4">
      <AlertTriangle className="w-5 h-5 text-orange-500" />
      <h3 className="font-semibold text-gray-900 dark:text-white">Issues Needing Attention</h3>
      <span className="ml-auto text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full">
        {issues.length} items
      </span>
    </div>
    <div className="space-y-3">
      {issues.map((issue) => (
        <div key={issue.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
            issue.severity === 'high' ? 'bg-red-500' : issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
          }`} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{issue.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{issue.context}</div>
          </div>
          <button className="flex-shrink-0 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors">
            {issue.actionLabel}
          </button>
        </div>
      ))}
    </div>
  </div>
);

// ==================== MAIN DASHBOARD ====================
export default function AdminDashboardPage() {
  const [dateRange, setDateRange] = useState('This Month');
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Business Health Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Owner&apos;s Command Center</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Date Range Selector */}
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              {['Today', 'Last 7 days', 'This Month', 'This Quarter'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    dateRange === range 
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            
            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Section 1: Hero Row */}
        <div className="space-y-4">
          <HealthScoreCard />
          <KPIStrip />
        </div>
        
        {/* Section 2: Three Outcome Blocks */}
        <div className="grid lg:grid-cols-3 gap-6">
          <MoneyBlock />
          <CustomersBlock />
          <DeliveryBlock />
        </div>
        
        {/* Section 3: Gains, Losses & Issues */}
        <div className="grid lg:grid-cols-2 gap-6">
          <GainsLeaksBoard />
          <IssuesPanel />
        </div>
      </div>
    </div>
  );
}
