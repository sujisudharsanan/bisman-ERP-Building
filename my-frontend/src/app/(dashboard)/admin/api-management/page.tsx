'use client';

import React, { useState, useMemo } from 'react';
import {
  Key,
  Plus,
  Search,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Activity,
  AlertTriangle,
  BarChart2,
  RefreshCw,
  Settings,
  Globe,
  Lock,
  Unlock
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface ApiKey {
  id: string;
  name: string;
  key: string;
  type: 'production' | 'sandbox' | 'development';
  status: 'active' | 'revoked' | 'expired';
  permissions: string[];
  rateLimit: number;
  requestsToday: number;
  requestsThisMonth: number;
  lastUsed: string;
  createdAt: string;
  expiresAt: string;
  ipWhitelist: string[];
  createdBy: string;
}

interface ApiUsage {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  calls: number;
  avgLatency: number;
  errorRate: number;
}

interface ApiStats {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  activeKeys: number;
  revokedKeys: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockApiKeys: ApiKey[] = [
  {
    id: 'API001',
    name: 'Production Web App',
    key: 'bsm_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    type: 'production',
    status: 'active',
    permissions: ['read:users', 'write:orders', 'read:inventory', 'write:inventory'],
    rateLimit: 1000,
    requestsToday: 15230,
    requestsThisMonth: 456000,
    lastUsed: '2024-01-15 16:45:30',
    createdAt: '2023-06-15',
    expiresAt: '2025-06-15',
    ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
    createdBy: 'admin@bisman.com'
  },
  {
    id: 'API002',
    name: 'Mobile App Integration',
    key: 'bsm_prod_q9w8e7r6t5y4u3i2o1p0a9s8d7f6g5h4',
    type: 'production',
    status: 'active',
    permissions: ['read:users', 'read:orders', 'read:inventory'],
    rateLimit: 500,
    requestsToday: 8456,
    requestsThisMonth: 234500,
    lastUsed: '2024-01-15 16:30:15',
    createdAt: '2023-09-01',
    expiresAt: '2024-09-01',
    ipWhitelist: [],
    createdBy: 'dev@bisman.com'
  },
  {
    id: 'API003',
    name: 'Third Party Webhook',
    key: 'bsm_prod_z1x2c3v4b5n6m7l8k9j0h1g2f3d4s5a6',
    type: 'production',
    status: 'active',
    permissions: ['write:webhooks', 'read:orders'],
    rateLimit: 100,
    requestsToday: 1250,
    requestsThisMonth: 38000,
    lastUsed: '2024-01-15 15:00:00',
    createdAt: '2023-11-15',
    expiresAt: '2024-11-15',
    ipWhitelist: ['203.0.113.0/24'],
    createdBy: 'integration@bisman.com'
  },
  {
    id: 'API004',
    name: 'Development Testing',
    key: 'bsm_dev_test1234567890abcdef',
    type: 'development',
    status: 'active',
    permissions: ['*'],
    rateLimit: 10000,
    requestsToday: 5000,
    requestsThisMonth: 150000,
    lastUsed: '2024-01-15 16:40:00',
    createdAt: '2024-01-01',
    expiresAt: '2024-12-31',
    ipWhitelist: [],
    createdBy: 'developer@bisman.com'
  },
  {
    id: 'API005',
    name: 'Sandbox Testing',
    key: 'bsm_sandbox_abcdef1234567890',
    type: 'sandbox',
    status: 'active',
    permissions: ['read:*', 'write:*'],
    rateLimit: 5000,
    requestsToday: 320,
    requestsThisMonth: 12000,
    lastUsed: '2024-01-14 10:20:00',
    createdAt: '2023-12-01',
    expiresAt: '2024-06-01',
    ipWhitelist: [],
    createdBy: 'qa@bisman.com'
  },
  {
    id: 'API006',
    name: 'Legacy Integration',
    key: 'bsm_prod_legacy123456789',
    type: 'production',
    status: 'revoked',
    permissions: ['read:orders'],
    rateLimit: 100,
    requestsToday: 0,
    requestsThisMonth: 0,
    lastUsed: '2023-11-30 12:00:00',
    createdAt: '2022-01-01',
    expiresAt: '2024-01-01',
    ipWhitelist: [],
    createdBy: 'admin@bisman.com'
  }
];

const mockApiUsage: ApiUsage[] = [
  { endpoint: '/api/v1/orders', method: 'GET', calls: 45000, avgLatency: 85, errorRate: 0.5 },
  { endpoint: '/api/v1/inventory', method: 'GET', calls: 38000, avgLatency: 120, errorRate: 0.3 },
  { endpoint: '/api/v1/users', method: 'GET', calls: 22000, avgLatency: 65, errorRate: 0.2 },
  { endpoint: '/api/v1/orders', method: 'POST', calls: 18000, avgLatency: 200, errorRate: 1.2 },
  { endpoint: '/api/v1/inventory', method: 'PUT', calls: 12000, avgLatency: 180, errorRate: 0.8 },
  { endpoint: '/api/v1/webhooks', method: 'POST', calls: 8000, avgLatency: 150, errorRate: 0.4 }
];

const mockStats: ApiStats = {
  totalRequests: 890256,
  successRate: 99.2,
  avgLatency: 125,
  activeKeys: 5,
  revokedKeys: 1
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: ApiKey['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    revoked: { label: 'Revoked', className: 'bg-red-100 text-red-700', icon: XCircle },
    expired: { label: 'Expired', className: 'bg-gray-100 text-gray-700', icon: Clock },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: ApiKey['type'] }) {
  const config = {
    production: { label: 'Production', className: 'bg-blue-100 text-blue-700' },
    sandbox: { label: 'Sandbox', className: 'bg-yellow-100 text-yellow-700' },
    development: { label: 'Development', className: 'bg-purple-100 text-purple-700' },
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function MethodBadge({ method }: { method: ApiUsage['method'] }) {
  const config = {
    GET: 'bg-green-100 text-green-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    DELETE: 'bg-red-100 text-red-700',
  }[method];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${config}`}>
      {method}
    </span>
  );
}

function ApiKeyRow({ apiKey, onView, onRevoke }: { 
  apiKey: ApiKey; 
  onView: () => void;
  onRevoke: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const maskedKey = apiKey.key.substring(0, 12) + '••••••••••••••••';

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-gray-900">{apiKey.name}</p>
          <p className="text-xs text-gray-500">{apiKey.id}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono max-w-[200px] truncate">
            {showKey ? apiKey.key : maskedKey}
          </code>
          <button 
            onClick={() => setShowKey(!showKey)}
            className="p-1 hover:bg-gray-100 rounded"
            title={showKey ? 'Hide' : 'Show'}
          >
            {showKey ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
          </button>
          <button 
            onClick={copyKey}
            className="p-1 hover:bg-gray-100 rounded"
            title="Copy"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <TypeBadge type={apiKey.type} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={apiKey.status} />
      </td>
      <td className="px-4 py-3 text-sm">
        <div>
          <p className="font-medium">{apiKey.requestsToday.toLocaleString()}</p>
          <p className="text-xs text-gray-500">of {apiKey.rateLimit.toLocaleString()}/min</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {apiKey.lastUsed}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button 
            onClick={onView}
            className="p-1 hover:bg-gray-100 rounded" 
            title="View Details"
          >
            <Eye className="w-4 h-4 text-blue-600" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
          {apiKey.status === 'active' ? (
            <button 
              onClick={onRevoke}
              className="p-1 hover:bg-red-100 rounded" 
              title="Revoke"
            >
              <Lock className="w-4 h-4 text-red-600" />
            </button>
          ) : (
            <button className="p-1 hover:bg-green-100 rounded" title="Restore">
              <Unlock className="w-4 h-4 text-green-600" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function CreateKeyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: unknown) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'production',
    rateLimit: 1000,
    permissions: [] as string[],
    expiresIn: '365'
  });

  const availablePermissions = [
    'read:users', 'write:users',
    'read:orders', 'write:orders',
    'read:inventory', 'write:inventory',
    'read:reports', 'write:webhooks'
  ];

  const togglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Create API Key</h2>
          <p className="text-sm text-gray-500">Generate a new API key for integrations</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Mobile App Integration"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="production">Production</option>
                <option value="sandbox">Sandbox</option>
                <option value="development">Development</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (req/min)</label>
              <input
                type="number"
                value={formData.rateLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires In</label>
            <select
              value={formData.expiresIn}
              onChange={(e) => setFormData(prev => ({ ...prev, expiresIn: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">6 months</option>
              <option value="365">1 year</option>
              <option value="never">Never</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {availablePermissions.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="rounded"
                  />
                  <code className="text-xs bg-gray-100 px-1 rounded">{perm}</code>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          <button 
            onClick={() => onCreate(formData)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Generate Key
          </button>
        </div>
      </div>
    </div>
  );
}

function ApiKeyDetailModal({ apiKey, onClose }: { apiKey: ApiKey; onClose: () => void }) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">{apiKey.name}</h2>
              <p className="text-sm text-gray-500">{apiKey.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <TypeBadge type={apiKey.type} />
              <StatusBadge status={apiKey.status} />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
            <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
              <code className="flex-1 text-sm font-mono break-all">
                {showKey ? apiKey.key : apiKey.key.substring(0, 12) + '••••••••••••••••'}
              </code>
              <button 
                onClick={() => setShowKey(!showKey)}
                className="p-2 hover:bg-gray-200 rounded"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => navigator.clipboard.writeText(apiKey.key)}
                className="p-2 hover:bg-gray-200 rounded"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Usage Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Requests Today</span>
                  <span className="font-medium">{apiKey.requestsToday.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Requests This Month</span>
                  <span className="font-medium">{apiKey.requestsThisMonth.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rate Limit</span>
                  <span className="font-medium">{apiKey.rateLimit.toLocaleString()}/min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Used</span>
                  <span className="font-medium">{apiKey.lastUsed}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Key Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="font-medium">{apiKey.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expires</span>
                  <span className="font-medium">{apiKey.expiresAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created By</span>
                  <span className="font-medium">{apiKey.createdBy}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Permissions</h3>
            <div className="flex flex-wrap gap-2">
              {apiKey.permissions.map((perm) => (
                <span key={perm} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                  {perm}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">IP Whitelist</h3>
            {apiKey.ipWhitelist.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {apiKey.ipWhitelist.map((ip) => (
                  <span key={ip} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">
                    {ip}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No IP restrictions (all IPs allowed)</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <button className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Revoke Key
          </button>
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ApiManagementPage() {
  const [activeTab, setActiveTab] = useState<'keys' | 'usage'>('keys');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);

  const filteredKeys = useMemo(() => {
    return mockApiKeys.filter(key => {
      const matchesSearch = key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           key.key.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || key.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, typeFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Management</h1>
            <p className="text-gray-500">Manage API keys and monitor usage</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Key
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(mockStats.totalRequests / 1000).toFixed(0)}K</p>
                <p className="text-sm text-gray-500">Total Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.successRate}%</p>
                <p className="text-sm text-gray-500">Success Rate</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.avgLatency}ms</p>
                <p className="text-sm text-gray-500">Avg Latency</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Key className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.activeKeys}</p>
                <p className="text-sm text-gray-500">Active Keys</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.revokedKeys}</p>
                <p className="text-sm text-gray-500">Revoked Keys</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'keys' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </span>
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'usage' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              Usage Analytics
            </span>
          </button>
        </div>

        {activeTab === 'keys' ? (
          <>
            {/* Filters */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search API keys..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg w-64"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="all">All Environments</option>
                  <option value="production">Production</option>
                  <option value="sandbox">Sandbox</option>
                  <option value="development">Development</option>
                </select>
              </div>
            </div>

            {/* API Keys Table */}
            <div className="bg-white rounded-lg border">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Key</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requests</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredKeys.map((key) => (
                    <ApiKeyRow 
                      key={key.id} 
                      apiKey={key}
                      onView={() => setSelectedKey(key)}
                      onRevoke={() => console.log('Revoke', key.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Usage Analytics */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Endpoint Usage (Last 30 Days)</h3>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Calls</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Latency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockApiUsage.map((usage, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <code className="text-sm font-mono">{usage.endpoint}</code>
                      </td>
                      <td className="px-4 py-3">
                        <MethodBadge method={usage.method} />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {usage.calls.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={usage.avgLatency > 150 ? 'text-yellow-600' : 'text-green-600'}>
                          {usage.avgLatency}ms
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={usage.errorRate > 1 ? 'text-red-600' : 'text-green-600'}>
                          {usage.errorRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {usage.errorRate > 1 ? (
                          <span className="flex items-center gap-1 text-yellow-600 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            Warning
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Healthy
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateKeyModal 
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => {
            console.log('Create key:', data);
            setShowCreateModal(false);
          }}
        />
      )}

      {selectedKey && (
        <ApiKeyDetailModal 
          apiKey={selectedKey}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </div>
  );
}
