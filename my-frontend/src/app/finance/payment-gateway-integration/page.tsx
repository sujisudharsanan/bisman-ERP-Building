'use client';

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  Settings,
  Download,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Globe,
  Shield,
  Link2,
  Zap,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Activity,
  MoreVertical,
  ExternalLink
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface PaymentGateway {
  id: string;
  name: string;
  provider: string;
  type: 'card' | 'bank' | 'wallet' | 'bnpl' | 'crypto';
  status: 'active' | 'inactive' | 'testing' | 'error';
  environment: 'production' | 'sandbox';
  supportedCurrencies: string[];
  transactionFee: string;
  monthlyVolume: number;
  successRate: number;
  lastTransaction?: string;
  integrationDate: string;
  webhookStatus: 'healthy' | 'degraded' | 'offline';
}

interface TransactionSummary {
  gateway: string;
  today: number;
  week: number;
  month: number;
  successCount: number;
  failedCount: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockGateways: PaymentGateway[] = [
  {
    id: 'GW001',
    name: 'Primary Card Processor',
    provider: 'Stripe',
    type: 'card',
    status: 'active',
    environment: 'production',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    transactionFee: '2.9% + $0.30',
    monthlyVolume: 1250000,
    successRate: 98.5,
    lastTransaction: '2024-01-20 14:32:15',
    integrationDate: '2022-03-15',
    webhookStatus: 'healthy'
  },
  {
    id: 'GW002',
    name: 'ACH Payments',
    provider: 'Plaid',
    type: 'bank',
    status: 'active',
    environment: 'production',
    supportedCurrencies: ['USD'],
    transactionFee: '0.8% (max $5)',
    monthlyVolume: 890000,
    successRate: 99.1,
    lastTransaction: '2024-01-20 13:45:00',
    integrationDate: '2022-06-20',
    webhookStatus: 'healthy'
  },
  {
    id: 'GW003',
    name: 'PayPal Checkout',
    provider: 'PayPal',
    type: 'wallet',
    status: 'active',
    environment: 'production',
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    transactionFee: '3.49% + $0.49',
    monthlyVolume: 450000,
    successRate: 97.8,
    lastTransaction: '2024-01-20 12:18:45',
    integrationDate: '2022-03-15',
    webhookStatus: 'degraded'
  },
  {
    id: 'GW004',
    name: 'Klarna BNPL',
    provider: 'Klarna',
    type: 'bnpl',
    status: 'testing',
    environment: 'sandbox',
    supportedCurrencies: ['USD', 'EUR'],
    transactionFee: '3.29% + $0.30',
    monthlyVolume: 0,
    successRate: 0,
    integrationDate: '2024-01-10',
    webhookStatus: 'healthy'
  },
  {
    id: 'GW005',
    name: 'Backup Processor',
    provider: 'Square',
    type: 'card',
    status: 'inactive',
    environment: 'production',
    supportedCurrencies: ['USD'],
    transactionFee: '2.6% + $0.10',
    monthlyVolume: 0,
    successRate: 0,
    integrationDate: '2023-08-01',
    webhookStatus: 'offline'
  }
];

const stats = {
  totalVolume: 2590000,
  activeGateways: 3,
  avgSuccessRate: 98.5,
  pendingSettlements: 125000
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: PaymentGateway['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: XCircle },
    testing: { label: 'Testing', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    error: { label: 'Error', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function WebhookBadge({ status }: { status: PaymentGateway['webhookStatus'] }) {
  const config = {
    healthy: { label: 'Healthy', className: 'text-green-600 dark:text-green-400' },
    degraded: { label: 'Degraded', className: 'text-yellow-600 dark:text-yellow-400' },
    offline: { label: 'Offline', className: 'text-red-600 dark:text-red-400' }
  }[status];

  return (
    <span className={`flex items-center gap-1 text-xs ${config.className}`}>
      <span className={`w-2 h-2 rounded-full ${
        status === 'healthy' ? 'bg-green-500' : status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
      }`} />
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: PaymentGateway['type'] }) {
  const config = {
    card: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    bank: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    wallet: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    bnpl: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    crypto: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  }[type];

  const labels = {
    card: 'Card',
    bank: 'Bank',
    wallet: 'Wallet',
    bnpl: 'BNPL',
    crypto: 'Crypto'
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config}`}>
      {labels[type]}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function PaymentGatewayIntegrationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredGateways = useMemo(() => {
    return mockGateways.filter(gateway => {
      const matchesSearch =
        gateway.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gateway.provider.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || gateway.status === statusFilter;
      const matchesType = typeFilter === 'all' || gateway.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, statusFilter, typeFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Gateway Integration</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage and monitor payment processor connections</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <RefreshCw className="w-4 h-4" />
              Sync All
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Add Gateway
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalVolume)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Volume</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeGateways}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Gateways</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgSuccessRate}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Success Rate</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.pendingSettlements)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Settlements</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search gateways..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="testing">Testing</option>
            <option value="error">Error</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="card">Card</option>
            <option value="bank">Bank</option>
            <option value="wallet">Wallet</option>
            <option value="bnpl">BNPL</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>

        {/* Gateway Cards */}
        <div className="grid grid-cols-2 gap-4">
          {filteredGateways.map((gateway) => (
            <div
              key={gateway.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <CreditCard className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{gateway.name}</h3>
                      <TypeBadge type={gateway.type} />
                    </div>
                    <p className="text-sm text-gray-500">{gateway.provider}</p>
                  </div>
                </div>
                <StatusBadge status={gateway.status} />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Volume</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(gateway.monthlyVolume)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{gateway.successRate > 0 ? `${gateway.successRate}%` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fee</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{gateway.transactionFee}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {gateway.supportedCurrencies.map(currency => (
                  <span key={currency} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                    {currency}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className={`px-2 py-0.5 rounded ${gateway.environment === 'production' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                    {gateway.environment}
                  </span>
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Webhook: <WebhookBadge status={gateway.webhookStatus} />
                  </span>
                </div>
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                    <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Settings">
                    <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Dashboard">
                    <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredGateways.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No payment gateways found</p>
          </div>
        )}
      </div>
    </div>
  );
}
