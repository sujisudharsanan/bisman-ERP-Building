'use client';

import React, { useState, useCallback } from 'react';
import { 
  useRBACStructure, 
  getRoleScopeColor,
  type RBACNode,
  type RoleDefinition
} from '@/hooks/useSecurityGovernance';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  Users, 
  RefreshCw, 
  ChevronRight,
  ChevronDown,
  XCircle,
  Shield,
  Building2,
  User,
  Crown,
  Briefcase,
  Info,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

// ============================================
// SUB-COMPONENTS
// ============================================

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="p-8 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
      <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
        Failed to Load RBAC Structure
      </h3>
      <p className="text-red-600 dark:text-red-400 mb-4">{message}</p>
      <Button onClick={onRetry} className="border-red-300">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </Card>
  );
}

function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case 'SUPER_ADMIN':
      return <Crown className="h-4 w-4" />;
    case 'ENTERPRISE_ADMIN':
      return <Shield className="h-4 w-4" />;
    case 'HUB_INCHARGE':
      return <Building2 className="h-4 w-4" />;
    case 'BUSINESS_OWNER':
    case 'CLIENT_ADMIN':
      return <Briefcase className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
}

function RBACTreeNode({ 
  node, 
  level = 0,
  expandedNodes,
  onToggle 
}: { 
  node: RBACNode;
  level?: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const nodeId = `${node.role}-${node.moduleId || ''}-${node.clientId || ''}`;
  const isExpanded = expandedNodes.has(nodeId);
  
  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => hasChildren && onToggle(nodeId)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          )
        ) : (
          <div className="w-4" />
        )}
        
        <div className={`p-1.5 rounded ${getRoleScopeColor(node.scope)}`}>
          <RoleIcon role={node.role} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white truncate">
              {node.label}
            </span>
            {node.userCount !== undefined && node.userCount > 0 && (
              <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs">
                {node.userCount} user{node.userCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {node.moduleName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {node.moduleName}
            </p>
          )}
          {node.clientName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              Client: {node.clientName}
            </p>
          )}
        </div>
        
        <Badge className={getRoleScopeColor(node.scope)}>
          {node.scope}
        </Badge>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children!.map((child, idx) => (
            <RBACTreeNode 
              key={`${child.role}-${child.moduleId || ''}-${child.clientId || ''}-${idx}`}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RoleDefinitionCard({ role, definition }: { role: string; definition: RoleDefinition }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${getRoleScopeColor(definition.scope)}`}>
          <RoleIcon role={role} />
        </div>
        <h4 className="font-semibold text-gray-900 dark:text-white">{definition.label}</h4>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{definition.description}</p>
      <div className="flex flex-wrap gap-1">
        <Badge className={getRoleScopeColor(definition.scope)}>
          {definition.scope}
        </Badge>
      </div>
    </Card>
  );
}

function StatisticsSection({ statistics }: { 
  statistics: {
    totalModules: number;
    totalClients: number;
    roleDistribution: Record<string, number>;
  }
}) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Info className="h-5 w-5 text-blue-500" />
        Statistics
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {statistics.totalModules}
          </p>
          <p className="text-sm text-purple-600 dark:text-purple-400">Modules</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {statistics.totalClients}
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">Clients</p>
        </div>
      </div>
      
      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Role Distribution</h4>
      <div className="space-y-2">
        {Object.entries(statistics.roleDistribution).map(([role, count]) => (
          <div key={role} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">{role}</span>
            <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              {count}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExplanationSection({ explanation }: { 
  explanation: {
    title: string;
    paragraphs: string[];
    keyPoints: Array<{ icon: string; text: string }>;
  }
}) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {explanation.title}
      </h3>
      {explanation.paragraphs.map((p, idx) => (
        <p key={idx} className="text-gray-600 dark:text-gray-400 mb-3">
          {p}
        </p>
      ))}
      {explanation.keyPoints.length > 0 && (
        <div className="mt-4 space-y-2">
          {explanation.keyPoints.map((point, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span>{point.icon}</span>
              <span className="text-gray-700 dark:text-gray-300">{point.text}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RBACStructureViewer() {
  const { data, isLoading, error, refetch } = useRBACStructure();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  
  const toggleNode = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  const handleExpandAll = useCallback(() => {
    if (expandAll) {
      setExpandedNodes(new Set());
    } else {
      // Collect all node IDs
      const collectIds = (node: RBACNode): string[] => {
        const id = `${node.role}-${node.moduleId || ''}-${node.clientId || ''}`;
        const childIds = node.children?.flatMap(collectIds) || [];
        return [id, ...childIds];
      };
      if (data?.hierarchy) {
        setExpandedNodes(new Set(collectIds(data.hierarchy)));
      }
    }
    setExpandAll(!expandAll);
  }, [expandAll, data?.hierarchy]);

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <Users className="h-7 w-7 text-blue-500" />
          RBAC Structure
        </h1>
        <LoadingState />
      </div>
    );
  }

  if (error || !data?.ok) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <Users className="h-7 w-7 text-blue-500" />
          RBAC Structure
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
          <Users className="h-7 w-7 text-blue-500" />
          RBAC Structure
        </h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleExpandAll}>
            {expandAll ? <ZoomOut className="h-4 w-4 mr-1" /> : <ZoomIn className="h-4 w-4 mr-1" />}
            {expandAll ? 'Collapse All' : 'Expand All'}
          </Button>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Scope indicator */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          <span className="text-blue-700 dark:text-blue-300">
            Viewing: <strong>{data.scope.type}</strong> scope
            {data.scope.moduleId && ` (Module: ${data.scope.moduleId})`}
          </span>
        </div>
      </Card>

      {/* Hierarchy Tree */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-500" />
          Role Hierarchy
        </h3>
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
          <RBACTreeNode 
            node={data.hierarchy}
            expandedNodes={expandedNodes}
            onToggle={toggleNode}
          />
        </div>
      </Card>

      {/* Statistics & Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatisticsSection statistics={data.statistics} />
        <ExplanationSection explanation={data.explanation} />
      </div>

      {/* Role Definitions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Role Definitions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data.roleDefinitions).map(([role, def]) => (
            <RoleDefinitionCard key={role} role={role} definition={def} />
          ))}
        </div>
      </div>
    </div>
  );
}
