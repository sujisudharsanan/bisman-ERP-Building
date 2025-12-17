'use client';

import React from 'react';
import { 
  useAuditHealth, 
  getHealthStatusColor, 
  getHealthStatusBgColor,
  formatCount,
  type HealthStatus
} from '@/hooks/useSecurityGovernance';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  Shield, 
  RefreshCw, 
  XCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Activity,
  BarChart3,
  AlertCircle,
  Info
} from 'lucide-react';

// ============================================
// SUB-COMPONENTS
// ============================================

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-24 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="p-8 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
      <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
        Failed to Load Audit Health
      </h3>
      <p className="text-red-600 dark:text-red-400 mb-4">{message}</p>
      <Button onClick={onRetry} className="border-red-300">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </Card>
  );
}

function HealthStatusBanner({ status }: { status: HealthStatus }) {
  const StatusIcon = status === 'HEALTHY' ? CheckCircle2 : 
                     status === 'WARNING' ? AlertTriangle : XCircle;
  
  const getMessage = (s: HealthStatus) => {
    switch (s) {
      case 'HEALTHY':
        return { 
          title: 'Audit System Healthy', 
          description: 'All audit logs are being recorded correctly with no integrity issues detected.' 
        };
      case 'WARNING':
        return { 
          title: 'Audit System Needs Attention', 
          description: 'Some minor issues detected with audit logging. Review the details below.' 
        };
      case 'CRITICAL':
        return { 
          title: 'Audit System Critical', 
          description: 'Serious issues detected with audit logging integrity. Immediate action required.' 
        };
      default:
        return { title: 'Unknown Status', description: '' };
    }
  };
  
  const { title, description } = getMessage(status);
  
  return (
    <div className={`p-4 rounded-lg border ${getHealthStatusBgColor(status)}`}>
      <div className="flex items-center gap-3">
        <StatusIcon className={`h-6 w-6 ${getHealthStatusColor(status)}`} />
        <div>
          <h2 className={`text-lg font-semibold ${getHealthStatusColor(status)}`}>
            {title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCards({ summary }: { 
  summary: {
    logsLast24h: number;
    logsLast7d: number;
    completenessRate: string;
    totalIssues: number;
  }
}) {
  const cards = [
    { 
      label: 'Logs (24h)', 
      value: formatCount(summary.logsLast24h), 
      icon: Clock,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20'
    },
    { 
      label: 'Logs (7d)', 
      value: formatCount(summary.logsLast7d), 
      icon: FileText,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20'
    },
    { 
      label: 'Completeness', 
      value: summary.completenessRate, 
      icon: Activity,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20'
    },
    { 
      label: 'Issues Found', 
      value: summary.totalIssues.toString(), 
      icon: AlertCircle,
      color: summary.totalIssues > 0 ? 'text-red-500' : 'text-gray-400',
      bg: summary.totalIssues > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className={`p-4 ${card.bg}`}>
          <div className="flex items-center gap-3">
            <card.icon className={`h-8 w-8 ${card.color}`} />
            <div>
              <p className={`text-2xl font-bold text-gray-900 dark:text-white`}>
                {card.value}
              </p>
              <p className={`text-sm ${card.color}`}>{card.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function IssuesSection({ issues }: { 
  issues: {
    missingUser: number;
    missingAction: number;
    futureTimestamp: number;
  }
}) {
  const hasIssues = issues.missingUser > 0 || issues.missingAction > 0 || issues.futureTimestamp > 0;
  
  if (!hasIssues) {
    return (
      <Card className="p-6">
        <div className="text-center py-4">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            No Issues Detected
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            All audit logs have complete and valid data.
          </p>
        </div>
      </Card>
    );
  }

  const issueItems = [
    { 
      label: 'Missing User ID', 
      count: issues.missingUser, 
      description: 'Logs without associated user identification',
      severity: issues.missingUser > 10 ? 'CRITICAL' : issues.missingUser > 0 ? 'WARNING' : 'HEALTHY'
    },
    { 
      label: 'Missing Action', 
      count: issues.missingAction, 
      description: 'Logs without action type specified',
      severity: issues.missingAction > 10 ? 'CRITICAL' : issues.missingAction > 0 ? 'WARNING' : 'HEALTHY'
    },
    { 
      label: 'Future Timestamp', 
      count: issues.futureTimestamp, 
      description: 'Logs with timestamps in the future (clock sync issue)',
      severity: issues.futureTimestamp > 0 ? 'CRITICAL' : 'HEALTHY'
    },
  ].filter(i => i.count > 0);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        Detected Issues
      </h3>
      <div className="space-y-4">
        {issueItems.map((issue) => (
          <div 
            key={issue.label}
            className={`p-4 rounded-lg border ${getHealthStatusBgColor(issue.severity as HealthStatus)}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900 dark:text-white">{issue.label}</span>
              <Badge className={`${
                issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                issue.severity === 'WARNING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
              }`}>
                {issue.count} occurrences
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{issue.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TopActionsSection({ topActions }: { topActions: Array<{ action: string; count: number }> }) {
  if (!topActions || topActions.length === 0) {
    return null;
  }
  
  const maxCount = Math.max(...topActions.map(a => a.count));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-purple-500" />
        Top Actions (Last 24h)
      </h3>
      <div className="space-y-3">
        {topActions.map((action) => (
          <div key={action.action}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {action.action}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatCount(action.count)}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(action.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ConfidenceSection({ confidence }: { 
  confidence: {
    isReliable: boolean;
    statement: string;
  }
}) {
  return (
    <Card className={`p-6 ${
      confidence.isReliable 
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    }`}>
      <div className="flex items-start gap-3">
        <Info className={`h-6 w-6 flex-shrink-0 ${
          confidence.isReliable ? 'text-green-500' : 'text-amber-500'
        }`} />
        <div>
          <h3 className={`font-semibold mb-1 ${
            confidence.isReliable 
              ? 'text-green-700 dark:text-green-300' 
              : 'text-amber-700 dark:text-amber-300'
          }`}>
            Confidence Assessment
          </h3>
          <p className={`text-sm ${
            confidence.isReliable 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {confidence.statement}
          </p>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AuditIntegrityDashboard() {
  const { data, isLoading, error, refetch } = useAuditHealth();

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <Shield className="h-7 w-7 text-green-500" />
          Audit Log Integrity
        </h1>
        <LoadingState />
      </div>
    );
  }

  if (error || !data?.ok) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <Shield className="h-7 w-7 text-green-500" />
          Audit Log Integrity
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
          <Shield className="h-7 w-7 text-green-500" />
          Audit Log Integrity
        </h1>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Health Status Banner */}
      <HealthStatusBanner status={data.status} />

      {/* Summary Cards */}
      <SummaryCards summary={data.summary} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IssuesSection issues={data.issues} />
        <TopActionsSection topActions={data.topActions} />
      </div>

      {/* Confidence Assessment */}
      <ConfidenceSection confidence={data.confidence} />
    </div>
  );
}
