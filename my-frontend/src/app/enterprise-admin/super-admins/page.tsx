'use client';

/**
 * 🛡️ Global Super Admin Control Center
 * BISMAN ERP - Enterprise Admin
 * 
 * Professional dashboard to provision, monitor, and scale 
 * cross-module Super Admin access for BISMAN internal staff
 * managing client deployments.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Users,
  Building2,
  AlertTriangle,
  Activity,
  Search,
  Filter,
  Plus,
  Download,
  RefreshCw,
  MoreVertical,
  Eye,
  Edit,
  UserX,
  UserCheck,
  Clock,
  Mail,
  Phone,
  ChevronRight,
  X,
  Briefcase,
  Globe,
  TrendingUp,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

interface SuperAdmin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  staffId?: string;
  role: string;
  status: 'active' | 'suspended' | 'pending';
  module: 'business_erp' | 'petrol_pump' | 'all';
  clientsCount: number;
  lastActiveAt: string;
  createdAt: string;
  workloadPercent: number;
  criticalAlerts: number;
  warningAlerts: number;
  deploymentHealth: 'green' | 'yellow' | 'red';
}

interface Stats {
  totalSuperAdmins: number;
  totalClientsManaged: number;
  activeDeployments: number;
  criticalAlerts: number;
  avgClientsPerAdmin: number;
  systemLoad: 'normal' | 'elevated' | 'high';
}

// ============================================================================
// Main Component
// ============================================================================

export default function SuperAdminControlCenter() {
  const { user } = useAuth();
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAdmin, setSelectedAdmin] = useState<SuperAdmin | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalSuperAdmins: 0,
    totalClientsManaged: 0,
    activeDeployments: 0,
    criticalAlerts: 0,
    avgClientsPerAdmin: 0,
    systemLoad: 'normal',
  });

  // Fetch Super Admins
  const fetchSuperAdmins = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/enterprise-admin/super-admins', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch super admins');
      }

      const data = await response.json();
      const admins = data.data?.superAdmins || data.superAdmins || [];
      
      // Transform API data to our format
      const transformedAdmins: SuperAdmin[] = admins.map((admin: any) => ({
        id: admin.id || admin.user_id,
        name: admin.name || admin.full_name || `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Unknown',
        email: admin.email || '',
        phone: admin.phone || admin.phone_number || '',
        staffId: admin.staff_id || `SA-${String(admin.id).padStart(4, '0')}`,
        role: admin.role || 'SUPER_ADMIN',
        status: admin.status || (admin.is_active ? 'active' : 'suspended'),
        module: admin.module || admin.product_type || 'business_erp',
        clientsCount: admin.clients_count || admin.clientsCount || 0,
        lastActiveAt: admin.last_active_at || admin.lastActiveAt || admin.updated_at || new Date().toISOString(),
        createdAt: admin.created_at || admin.createdAt || new Date().toISOString(),
        workloadPercent: admin.workload_percent || Math.min(100, (admin.clients_count || 0) * 10),
        criticalAlerts: admin.critical_alerts || 0,
        warningAlerts: admin.warning_alerts || 0,
        deploymentHealth: admin.deployment_health || 'green',
      }));

      setSuperAdmins(transformedAdmins);

      // Calculate stats
      const totalClients = transformedAdmins.reduce((sum, a) => sum + a.clientsCount, 0);
      const criticalCount = transformedAdmins.reduce((sum, a) => sum + a.criticalAlerts, 0);
      
      setStats({
        totalSuperAdmins: transformedAdmins.length,
        totalClientsManaged: totalClients,
        activeDeployments: transformedAdmins.filter(a => a.status === 'active').length,
        criticalAlerts: criticalCount,
        avgClientsPerAdmin: transformedAdmins.length > 0 ? Math.round(totalClients / transformedAdmins.length) : 0,
        systemLoad: criticalCount > 5 ? 'high' : criticalCount > 2 ? 'elevated' : 'normal',
      });

    } catch (err: any) {
      console.error('Error fetching super admins:', err);
      setError(err.message || 'Failed to load super admins');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuperAdmins();
  }, [fetchSuperAdmins]);

  // Filter admins
  const filteredAdmins = superAdmins.filter(admin => {
    const matchesSearch = !searchQuery || 
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.staffId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesModule = moduleFilter === 'all' || admin.module === moduleFilter;
    const matchesStatus = statusFilter === 'all' || admin.status === statusFilter;
    
    return matchesSearch && matchesModule && matchesStatus;
  });

  // Module counts for tabs
  const moduleCounts = {
    all: superAdmins.length,
    business_erp: superAdmins.filter(a => a.module === 'business_erp').length,
    petrol_pump: superAdmins.filter(a => a.module === 'petrol_pump').length,
  };

  // Get relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Workload color
  const getWorkloadColor = (percent: number) => {
    if (percent < 40) return 'bg-green-500';
    if (percent < 70) return 'bg-yellow-500';
    if (percent < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getWorkloadLabel = (percent: number) => {
    if (percent < 40) return 'Low';
    if (percent < 70) return 'Medium';
    if (percent < 90) return 'High';
    return 'Overloaded';
  };

  // Health indicator
  const getHealthIndicator = (health: string) => {
    switch (health) {
      case 'green': return <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />;
      case 'yellow': return <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />;
      case 'red': return <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />;
      default: return <div className="w-3 h-3 rounded-full bg-gray-500" />;
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Active</span>;
      case 'suspended':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Suspended</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Pending</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">Unknown</span>;
    }
  };

  // Module badge
  const getModuleBadge = (module: string) => {
    switch (module) {
      case 'business_erp':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Business ERP</span>;
      case 'petrol_pump':
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">Petrol Pump</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">All Modules</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-500" />
              Global Super Admin Control Center
            </h1>
            <p className="text-gray-400">
              Provision, monitor, and scale cross-module Super Admin access for BISMAN internal staff managing client deployments.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={fetchSuperAdmins}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Provision Super Admin
            </button>
          </div>
        </div>

        {/* Module Tabs */}
        <div className="flex gap-2 mb-6 bg-[#12121a] p-2 rounded-xl border border-gray-800">
          {[
            { id: 'all', label: 'All Modules', count: moduleCounts.all },
            { id: 'business_erp', label: 'Business ERP', count: moduleCounts.business_erp },
            { id: 'petrol_pump', label: 'Petrol Pump', count: moduleCounts.petrol_pump },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setModuleFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                moduleFilter === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                moduleFilter === tab.id ? 'bg-white/20' : 'bg-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-[#12121a] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalSuperAdmins}</div>
            <div className="text-sm text-gray-400">Total Super Admins</div>
          </div>
          <div className="bg-[#12121a] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalClientsManaged}</div>
            <div className="text-sm text-gray-400">Clients Managed</div>
          </div>
          <div className="bg-[#12121a] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.activeDeployments}</div>
            <div className="text-sm text-gray-400">Active Deployments</div>
          </div>
          <div className="bg-[#12121a] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.criticalAlerts}</div>
            <div className="text-sm text-gray-400">Critical Alerts</div>
          </div>
          <div className="bg-[#12121a] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.avgClientsPerAdmin}</div>
            <div className="text-sm text-gray-400">Avg Clients/Admin</div>
          </div>
          <div className="bg-[#12121a] rounded-xl border border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div className={`text-2xl font-bold ${
              stats.systemLoad === 'normal' ? 'text-green-400' :
              stats.systemLoad === 'elevated' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {stats.systemLoad.charAt(0).toUpperCase() + stats.systemLoad.slice(1)}
            </div>
            <div className="text-sm text-gray-400">System Load</div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4 mb-6 bg-[#12121a] rounded-xl border border-gray-800 p-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, staff ID, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); setModuleFilter('all'); }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
            <button onClick={fetchSuperAdmins} className="ml-auto text-red-400 hover:text-red-300">
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredAdmins.length === 0 && (
          <div className="bg-[#12121a] rounded-xl border border-gray-800 p-12 text-center">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Super Admins Provisioned</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              No administrators are currently assigned to manage deployments for this module. 
              Provision a BISMAN staff member to begin client onboarding and monitoring.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Provision Super Admin
            </button>
          </div>
        )}

        {/* Data Table */}
        {!isLoading && !error && filteredAdmins.length > 0 && (
          <div className="bg-[#12121a] rounded-xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Super Admin</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Module</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Clients</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Health</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Alerts</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Last Active</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Workload</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr
                      key={admin.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedAdmin(admin)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-white">{admin.name}</div>
                            <div className="text-sm text-gray-500">{admin.staffId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getModuleBadge(admin.module)}</td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{admin.clientsCount}</span>
                        <span className="text-gray-500 text-sm ml-1">clients</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getHealthIndicator(admin.deploymentHealth)}
                          <span className="text-sm text-gray-400 capitalize">{admin.deploymentHealth}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {admin.criticalAlerts > 0 && (
                            <span className="text-red-400 text-sm">{admin.criticalAlerts} Critical</span>
                          )}
                          {admin.warningAlerts > 0 && (
                            <span className="text-yellow-400 text-sm">{admin.warningAlerts} Warning</span>
                          )}
                          {admin.criticalAlerts === 0 && admin.warningAlerts === 0 && (
                            <span className="text-green-400 text-sm">Clear</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-400" title={new Date(admin.lastActiveAt).toLocaleString()}>
                          {getRelativeTime(admin.lastActiveAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-24">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-400">{getWorkloadLabel(admin.workloadPercent)}</span>
                            <span className="text-gray-500">{admin.workloadPercent}%</span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getWorkloadColor(admin.workloadPercent)} transition-all`}
                              style={{ width: `${admin.workloadPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(admin.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedAdmin(admin); }}
                          className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Side Panel */}
        <AnimatePresence>
          {selectedAdmin && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setSelectedAdmin(null)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0a0a0f] border-l border-gray-800 z-50 overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Admin Details</h2>
                    <button
                      onClick={() => setSelectedAdmin(null)}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Profile Summary */}
                  <div className="bg-[#12121a] rounded-xl border border-gray-800 p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                        {selectedAdmin.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{selectedAdmin.name}</h3>
                        <p className="text-sm text-gray-400">{selectedAdmin.staffId}</p>
                        {getStatusBadge(selectedAdmin.status)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span>{selectedAdmin.email}</span>
                      </div>
                      {selectedAdmin.phone && (
                        <div className="flex items-center gap-3 text-gray-400">
                          <Phone className="w-4 h-4" />
                          <span>{selectedAdmin.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-gray-400">
                        <Briefcase className="w-4 h-4" />
                        {getModuleBadge(selectedAdmin.module)}
                      </div>
                    </div>
                  </div>

                  {/* Client Summary */}
                  <div className="bg-[#12121a] rounded-xl border border-gray-800 p-6 mb-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-4">Client Assignment</h4>
                    <div className="text-3xl font-bold text-white mb-2">{selectedAdmin.clientsCount}</div>
                    <p className="text-sm text-gray-400 mb-4">Total clients managed</p>
                    <button className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
                      View All Clients
                    </button>
                  </div>

                  {/* Health & Alerts */}
                  <div className="bg-[#12121a] rounded-xl border border-gray-800 p-6 mb-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-4">Health & Alerts</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          {getHealthIndicator(selectedAdmin.deploymentHealth)}
                          <span className="text-sm text-gray-400">Deployment</span>
                        </div>
                        <span className="text-white font-medium capitalize">{selectedAdmin.deploymentHealth}</span>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-sm text-gray-400 mb-1">Workload</div>
                        <span className="text-white font-medium">{selectedAdmin.workloadPercent}%</span>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <div className="text-sm text-gray-400 mb-1">Critical</div>
                        <span className="text-red-400 font-medium">{selectedAdmin.criticalAlerts}</span>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                        <div className="text-sm text-gray-400 mb-1">Warnings</div>
                        <span className="text-yellow-400 font-medium">{selectedAdmin.warningAlerts}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
                      <Eye className="w-4 h-4" />
                      View Full Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
                      <Edit className="w-4 h-4" />
                      Edit Permissions
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
                      <Users className="w-4 h-4" />
                      Reassign Clients
                    </button>
                    {selectedAdmin.status === 'active' ? (
                      <button className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors">
                        <UserX className="w-4 h-4" />
                        Suspend Admin
                      </button>
                    ) : (
                      <button className="w-full flex items-center gap-3 px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 transition-colors">
                        <UserCheck className="w-4 h-4" />
                        Activate Admin
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
