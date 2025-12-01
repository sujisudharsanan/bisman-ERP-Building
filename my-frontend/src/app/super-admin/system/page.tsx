'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { 
  Server, 
  Database, 
  Shield,
  Settings,
  Monitor,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Clock,
  Zap,
  Globe,
  Lock
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';
import PageDirectory from '@/components/settings/PageDirectory';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';

interface SystemMetric {
  name: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical';
  icon: LucideIcon;
  description: string;
}


// Breadcrumb Navigation Component
function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
          >
            <svg className="w-3 h-3 mr-2.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
            </svg>
            Dashboard
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              <svg className="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              {item.href ? (
                <Link
                  href={item.href}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2 dark:text-gray-400 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}


// Quick Links Component
function QuickLinks({ links }: { links: Array<{ label: string; href: string; icon?: React.ReactNode }> }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">Quick Links</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link, index) => (
          <Link
            key={index}
            href={link.href}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-white dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
          >
            {link.icon && <span className="mr-1.5">{link.icon}</span>}
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminSystemPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Role-based access control - only SUPER_ADMIN
      if (user.roleName !== 'SUPER_ADMIN') {
        router.push('/dashboard');
        return;
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading system dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.roleName !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access system administration.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Sample system metrics
  const systemMetrics: SystemMetric[] = [
    {
      name: 'Server Status',
      value: 'Online',
      status: 'healthy',
      icon: Server,
      description: 'All application servers are running normally'
    },
    {
      name: 'Database Health',
      value: '98.5%',
      status: 'healthy',
      icon: Database,
      description: 'Database performance is optimal'
    },
    {
      name: 'CPU Usage',
      value: '45%',
      status: 'healthy',
      icon: Cpu,
      description: 'CPU utilization within normal range'
    },
    {
      name: 'Memory Usage',
      value: '67%',
      status: 'warning',
      icon: MemoryStick,
      description: 'Memory usage is slightly elevated'
    },
    {
      name: 'Disk Space',
      value: '78%',
      status: 'warning',
      icon: HardDrive,
      description: 'Disk usage should be monitored'
    },
    {
      name: 'Network',
      value: 'Stable',
      status: 'healthy',
      icon: Network,
      description: 'Network connectivity is stable'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Monitor;
    }
  };

  const handleRefresh = () => {
    setLastRefresh(new Date());
    // In a real application, this would trigger actual system metrics refresh
  };

  return (
    <SuperAdminShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
              <p className="text-gray-600 mt-2">
                Monitor and manage system health, performance, and security
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <button
                onClick={handleRefresh}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {systemMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
            const StatusIcon = getStatusIcon(metric.status);
            
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-gray-50 mr-3">
                      <IconComponent className="h-6 w-6 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{metric.name}</h3>
                  </div>
                  <div className={`p-1 rounded-full ${getStatusColor(metric.status)}`}>
                    <StatusIcon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mb-2">
                  <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
                </div>
                <p className="text-sm text-gray-600">{metric.description}</p>
              </div>
            );
          })}
        </div>

        {/* System Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Monitoring */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Performance Monitoring
            </h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Server Performance Logs</span>
                  <span className="text-sm text-gray-500">View Details</span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Database Query Analysis</span>
                  <span className="text-sm text-gray-500">Analyze</span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Application Metrics</span>
                  <span className="text-sm text-gray-500">Dashboard</span>
                </div>
              </button>
            </div>
          </div>

          {/* Security & Maintenance */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-600" />
              Security & Maintenance
            </h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Security Audit Logs</span>
                  <span className="text-sm text-gray-500">Review</span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">System Backup Status</span>
                  <span className="text-sm text-gray-500">Verify</span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Maintenance Schedule</span>
                  <span className="text-sm text-gray-500">Configure</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Page Directory for System Settings */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3">Page Directory</h3>
          <PageDirectory />
        </div>

        {/* System Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-purple-600" />
            System Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Globe className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold">Environment</h4>
              <p className="text-sm text-gray-600">Production</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Zap className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold">Uptime</h4>
              <p className="text-sm text-gray-600">99.98%</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <h4 className="font-semibold">Last Restart</h4>
              <p className="text-sm text-gray-600">7 days ago</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Lock className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <h4 className="font-semibold">Security Level</h4>
              <p className="text-sm text-gray-600">High</p>
            </div>
          </div>
        </div>

        {/* Critical Actions */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-red-800">
              Critical System Actions
            </h3>
          </div>
          <p className="text-red-700 mb-4">
            These actions require extreme caution and should only be performed during maintenance windows.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-3 bg-white border border-red-300 rounded-lg hover:bg-red-50 text-red-700 font-medium">
              System Restart
            </button>
            <button className="p-3 bg-white border border-red-300 rounded-lg hover:bg-red-50 text-red-700 font-medium">
              Database Maintenance
            </button>
            <button className="p-3 bg-white border border-red-300 rounded-lg hover:bg-red-50 text-red-700 font-medium">
              Emergency Shutdown
            </button>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}