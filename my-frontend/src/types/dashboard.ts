/**
 * Dashboard Types - ERP Dashboard Layout System
 * Defines types for role-based dashboard layouts
 */

import { ReactNode } from 'react';
import { IconType } from 'react-icons';

/**
 * Role types supported by ERP Dashboard
 * Super Admin has a dedicated dashboard, others use ERP_DashboardLayout
 */
export type DashboardRole = 
  | 'ADMIN' 
  | 'MANAGER' 
  | 'HUB_INCHARGE' 
  | 'AUDITOR' 
  | 'STAFF'
  | 'USER';

/**
 * Module/Page representation in dashboard
 */
export interface DashboardModule {
  /** Module identifier */
  id: string;
  /** Display name */
  name: string;
  /** Module description */
  description: string;
  /** Current value/count */
  value: number | string;
  /** Icon component from react-icons */
  icon: string; // Icon name reference (e.g., 'FaTruck', 'FaUsers')
  /** Link to module page */
  link: string;
  /** Optional badge (e.g., 'New', 'Updated') */
  badge?: string;
  /** Optional color theme */
  color?: string;
}

/**
 * Summary metrics for role dashboard
 */
export interface DashboardSummary {
  /** Total tasks/items */
  totalTasks?: number;
  /** Completed tasks */
  completed?: number;
  /** Pending tasks */
  pending?: number;
  /** Overdue items */
  overdue?: number;
  /** Custom metrics */
  [key: string]: number | undefined;
}

/**
 * Complete dashboard data structure
 */
export interface DashboardData {
  /** Role name */
  role: DashboardRole;
  /** Summary metrics */
  summary: DashboardSummary;
  /** Available modules */
  modules: DashboardModule[];
  /** Recent activities */
  recentActivities?: DashboardActivity[];
  /** Quick actions */
  quickActions?: DashboardQuickAction[];
  /** Active alerts */
  alerts?: DashboardAlert[];
}

/**
 * Recent activity item
 */
export interface DashboardActivity {
  id: string;
  title: string;
  description: string;
  timestamp: Date | string;
  type: 'success' | 'warning' | 'error' | 'info';
  icon?: string;
}

/**
 * Quick action button
 */
export interface DashboardQuickAction {
  id: string;
  label: string;
  icon: string;
  action: string | (() => void);
  color?: string;
}

/**
 * Dashboard alert/notification
 */
export interface DashboardAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  actionLabel?: string;
  actionLink?: string;
}

/**
 * Props for ERP_DashboardLayout component
 */
export interface ERPDashboardLayoutProps {
  /** Current user role */
  role: DashboardRole;
  /** Optional custom data fetcher */
  dataFetcher?: (role: DashboardRole) => Promise<DashboardData>;
  /** Optional custom greeting */
  greeting?: string;
  /** Optional custom title */
  title?: string;
}

/**
 * Props for DashboardBox component
 */
export interface DashboardBoxProps {
  /** Module data */
  module: DashboardModule;
  /** Click handler */
  onClick?: () => void;
  /** Loading state */
  isLoading?: boolean;
}
