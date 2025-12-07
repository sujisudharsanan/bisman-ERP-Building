/**
 * Integration Card Component
 * Displays a single integration with status, actions, and configuration options
 */

'use client';

import React from 'react';
import { 
  CreditCard, 
  MessageSquare, 
  Calculator, 
  HardDrive, 
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Play
} from 'lucide-react';
import type { Integration, IntegrationCategory, IntegrationStatus } from './types';
import { CATEGORY_COLORS, STATUS_COLORS } from './data';

interface IntegrationCardProps {
  integration: Integration;
  onConnect: (integration: Integration) => void;
  onConfigure: (integration: Integration) => void;
  onTest: (integration: Integration) => void;
}

const CategoryIcons: Record<IntegrationCategory, React.ElementType> = {
  Payment: CreditCard,
  Communication: MessageSquare,
  Accounting: Calculator,
  Storage: HardDrive,
  Automation: Zap,
};

const StatusIcons: Record<IntegrationStatus, React.ElementType> = {
  Connected: CheckCircle,
  'Not Connected': XCircle,
  'Action Required': AlertTriangle,
};

export default function IntegrationCard({
  integration,
  onConnect,
  onConfigure,
  onTest,
}: IntegrationCardProps) {
  const CategoryIcon = CategoryIcons[integration.category];
  const StatusIcon = StatusIcons[integration.status];
  const isConnected = integration.status === 'Connected';
  const needsAction = integration.status === 'Action Required';

  const handlePrimaryClick = () => {
    if (isConnected || needsAction) {
      onConfigure(integration);
    } else {
      onConnect(integration);
    }
  };

  const handleTestClick = () => {
    onTest(integration);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg transition-shadow duration-200">
      {/* Header: Icon + Name + Category */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Integration Icon Placeholder */}
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            isConnected 
              ? 'bg-blue-100 dark:bg-blue-900/30' 
              : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <CategoryIcon className={`w-6 h-6 ${
              isConnected 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {integration.name}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[integration.category]}`}>
              {integration.category}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {integration.description}
      </p>

      {/* Status Badge */}
      <div className="mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[integration.status]}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {integration.status}
        </span>
      </div>

      {/* Features Preview */}
      {integration.features && integration.features.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5">
            {integration.features.slice(0, 3).map((feature, idx) => (
              <span 
                key={idx}
                className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
              >
                {feature}
              </span>
            ))}
            {integration.features.length > 3 && (
              <span className="text-xs px-2 py-0.5 text-gray-500 dark:text-gray-500">
                +{integration.features.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Last Tested Info */}
      {integration.lastTested && (
        <div className={`mb-4 text-xs ${
          integration.lastTested.success 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          Last test: {formatTimeAgo(integration.lastTested.timestamp)} — {integration.lastTested.success ? 'Success' : 'Failed'}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
        <button
          onClick={handlePrimaryClick}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            isConnected || needsAction
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
          }`}
        >
          {isConnected || needsAction ? (
            <>
              <Settings className="w-4 h-4" />
              Configure
            </>
          ) : (
            'Connect'
          )}
        </button>
        <button
          onClick={handleTestClick}
          disabled={!isConnected && !needsAction}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            isConnected || needsAction
              ? 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              : 'border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          <Play className="w-4 h-4" />
          Test
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
