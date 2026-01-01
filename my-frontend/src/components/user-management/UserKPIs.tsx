'use client';

import React from 'react';
import { Users, UserCheck, AlertTriangle, Clock } from 'lucide-react';

export interface UserKPIData {
  totalUsers: number;
  activeUsers: number;
  overLimitUsers: number;
  idleUsers: number;
}

export interface UserKPIsProps {
  data: UserKPIData;
  loading?: boolean;
}

/**
 * UserKPIs Component
 * 
 * Displays high-level user statistics:
 * - Total Users: Created
 * - Active Users: Enabled
 * - Over-Limit Users: Pressure creators
 * - Idle Users: Underutilized
 */
export function UserKPIs({ data, loading = false }: UserKPIsProps) {
  const kpis = [
    {
      label: 'Total Users',
      value: data.totalUsers,
      description: 'Created',
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Active Users',
      value: data.activeUsers,
      description: 'Enabled',
      icon: UserCheck,
      color: 'green',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Over-Limit Users',
      value: data.overLimitUsers,
      description: 'Pressure creators',
      icon: AlertTriangle,
      color: 'amber',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Idle Users',
      value: data.idleUsers,
      description: 'Underutilized',
      icon: Clock,
      color: 'gray',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      textColor: 'text-gray-600 dark:text-gray-400',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {kpi.label}
              </span>
              <div className={`w-10 h-10 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${kpi.textColor}`} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${kpi.textColor}`}>
                {kpi.value.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {kpi.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default UserKPIs;
