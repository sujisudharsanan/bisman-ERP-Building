'use client';

import React from 'react';
import { 
  useSecurityOverview, 
  getHealthStatusColor, 
  getHealthStatusBgColor,
  formatCount,
  type SecurityCard,
  type HealthStatus 
} from '@/hooks/useSecurityGovernance';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Building2, 
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  Lock,
  Eye,
  FileWarning,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

// ============================================
// SUB-COMPONENTS
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        ))}
      </div>
      <div className="h-48 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="p-8 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
      <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
        Failed to Load Security Overview
      </h3>
      <p className="text-red-600 dark:text-red-400 mb-4">{message}</p>
      <Button onClick={onRetry} className="border-red-300">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </Card>
  );
}

function HealthStatusBanner({ status, label, description }: {
  status: HealthStatus;
  label: string;
  description: string;
}) {
  const StatusIcon = status === 'HEALTHY' ? CheckCircle2 : 
                     status === 'WARNING' ? AlertTriangle : XCircle;
  
  return (
    <div className={`p-4 rounded-lg border ${getHealthStatusBgColor(status)} mb-6`}>
      <div className="flex items-center gap-3">
        <StatusIcon className={`h-6 w-6 ${getHealthStatusColor(status)}`} />
        <div>
          <h2 className={`text-lg font-semibold ${getHealthStatusColor(status)}`}>
            {label}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SecurityStatusCard({ card }: { card: SecurityCard }) {
  const getCardIcon = (id: string) => {
    switch (id) {
      case 'systemHealth': return Shield;
      case 'moduleIsolation': return Building2;
      case 'clientIsolation': return Lock;
      case 'accessControl': return Eye;
      case 'auditLogs': return FileWarning;
      case 'activeUsers': return Users;
      default: return Activity;
    }
  };
  
  const Icon = getCardIcon(card.id);
  const statusColor = card.status === 'HEALTHY' ? 'text-green-500' :
                      card.status === 'WARNING' ? 'text-amber-500' : 'text-red-500';
  
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${
          card.status === 'HEALTHY' ? 'bg-green-100 dark:bg-green-900/30' :
          card.status === 'WARNING' ? 'bg-amber-100 dark:bg-amber-900/30' :
          'bg-red-100 dark:bg-red-900/30'
        }`}>
          <Icon className={`h-5 w-5 ${statusColor}`} />
        </div>
        <Badge className={`text-xs ${
          card.status === 'HEALTHY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
          card.status === 'WARNING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {card.status}
        </Badge>
      </div>
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{card.title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{card.value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{card.description}</p>
    </Card>
  );
}

function SummarySection({ summary }: { 
  summary: {
    totalUsers: number;
    activeModules: number;
    activeClients: number;
    recentDenials: number;
    recentViolations: number;
    auditLogCount: number;
  }
}) {
  const summaryItems = [
    { label: 'Total Users', value: summary.totalUsers, icon: Users },
    { label: 'Active Modules', value: summary.activeModules, icon: Building2 },
    { label: 'Active Clients', value: summary.activeClients, icon: Activity },
    { label: 'Recent Denials', value: summary.recentDenials, icon: XCircle, highlight: summary.recentDenials > 0 },
    { label: 'Recent Violations', value: summary.recentViolations, icon: AlertTriangle, highlight: summary.recentViolations > 0 },
    { label: 'Audit Logs (24h)', value: summary.auditLogCount, icon: FileWarning },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-blue-500" />
        System Summary
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryItems.map((item) => (
          <div 
            key={item.label} 
            className={`p-3 rounded-lg ${
              item.highlight 
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                : 'bg-gray-50 dark:bg-gray-800'
            }`}
          >
            <item.icon className={`h-4 w-4 mb-1 ${item.highlight ? 'text-red-500' : 'text-gray-400'}`} />
            <p className={`text-2xl font-bold ${item.highlight ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {formatCount(item.value)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function QuickLinksSection() {
  const links = [
    { href: '/governance/security-violations', label: 'View Violations Log', icon: AlertTriangle, color: 'text-amber-500' },
    { href: '/governance/rbac-structure', label: 'RBAC Structure', icon: Users, color: 'text-blue-500' },
    { href: '/governance/audit-integrity', label: 'Audit Health', icon: Shield, color: 'text-green-500' },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <ChevronRight className="h-5 w-5 text-purple-500" />
        Quick Actions
      </h3>
      <div className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="flex items-center gap-3">
              <link.icon className={`h-5 w-5 ${link.color}`} />
              <span className="text-gray-700 dark:text-gray-300">{link.label}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SecurityOverviewDashboard() {
  const { data, isLoading, error, refetch } = useSecurityOverview();

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <Shield className="h-7 w-7 text-purple-500" />
          Security Overview
        </h1>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data?.ok) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <Shield className="h-7 w-7 text-purple-500" />
          Security Overview
        </h1>
        <ErrorState 
          message={error?.message || 'Unknown error occurred'} 
          onRetry={() => refetch()} 
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Shield className="h-7 w-7 text-purple-500" />
          Security Overview
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </span>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status Banner */}
      <HealthStatusBanner 
        status={data.healthStatus.status}
        label={data.healthStatus.label}
        description={data.healthStatus.description}
      />

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.cards.map((card) => (
          <SecurityStatusCard key={card.id} card={card} />
        ))}
      </div>

      {/* Summary Section */}
      <SummarySection summary={data.summary} />

      {/* Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickLinksSection />
        
        {/* Scope Info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-indigo-500" />
            Current Scope
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Viewing as:</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.scope.type === 'ENTERPRISE' ? 'Enterprise Administrator' :
               data.scope.type === 'MODULE' ? `Module: ${data.scope.moduleId}` :
               'Unknown Scope'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {data.scope.type === 'ENTERPRISE' 
                ? 'Full visibility across all modules and clients'
                : 'Limited to your assigned module'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
