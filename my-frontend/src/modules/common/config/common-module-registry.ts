/**
 * Common Module Registry
 * Defines all pages and components shared across all roles in the ERP system
 * These pages are automatically available to all authenticated users
 */

import { 
  User, 
  Key, 
  Bell, 
  HelpCircle, 
  Settings,
  Shield,
  FileText,
  MessageSquare,
  DollarSign,
  Calendar,
} from '@/lib/ssr-safe-icons';
import type { LucideIcon } from 'lucide-react';

export interface CommonPageMetadata {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  description: string;
  category: 'profile' | 'security' | 'support' | 'settings' | 'financial';
  order: number;
  isActive: boolean;
  requiresAuth: boolean;
  autoRegister: boolean; // Auto-register in database for all roles
}

/**
 * Common Module Pages
 * These pages are automatically accessible to ALL authenticated users
 * regardless of their role or custom permissions
 */
export const COMMON_PAGES: CommonPageMetadata[] = [
  // Profile Pages
  {
    id: 'common-about-me',
    name: 'About Me',
    path: '/common/about-me',
    icon: User,
    description: 'View and manage your profile information',
    category: 'profile',
    order: 1,
    isActive: true,
    requiresAuth: true,
    autoRegister: true,
  },
  
  // Security Pages
  {
    id: 'common-change-password',
    name: 'Change Password',
    path: '/common/change-password',
    icon: Key,
    description: 'Update your account password',
    category: 'security',
    order: 2,
    isActive: true,
    requiresAuth: true,
    autoRegister: true,
  },
  {
  // Removed per request
  id: 'common-security-settings',
  name: 'Security Settings',
  path: '/common/security-settings',
  icon: Shield,
  description: 'Manage your account security preferences',
  category: 'security',
  order: 3,
  isActive: false,
  requiresAuth: true,
  autoRegister: false,
  },
  
  // Communication Pages - Removed per request
  // {
  //   id: 'common-notifications',
  //   name: 'Notifications',
  //   path: '/common/notifications',
  //   icon: Bell,
  //   description: 'View and manage your notifications',
  //   category: 'settings',
  //   order: 4,
  //   isActive: false,
  //   requiresAuth: true,
  //   autoRegister: false,
  // },
  // {
  //   id: 'common-messages',
  //   name: 'Messages',
  //   path: '/common/messages',
  //   icon: MessageSquare,
  //   description: 'Internal messaging system',
  //   category: 'settings',
  //   order: 5,
  //   isActive: false,
  //   requiresAuth: true,
  //   autoRegister: false,
  // },
  
  // Support Pages
  {
  // Removed per request
  id: 'common-help-center',
  name: 'Help Center',
  path: '/common/help-center',
  icon: HelpCircle,
  description: 'Get help and support resources',
  category: 'support',
  order: 6,
  isActive: false,
  requiresAuth: true,
  autoRegister: false,
  },
  {
  // Removed per request
  id: 'common-documentation',
  name: 'Documentation',
  path: '/common/documentation',
  icon: FileText,
  description: 'System documentation and guides',
  category: 'support',
  order: 7,
  isActive: false,
  requiresAuth: true,
  autoRegister: false,
  },
  
  // Settings Pages
  {
    id: 'common-user-settings',
    name: 'User Settings',
    path: '/common/user-settings',
    icon: Settings,
    description: 'Customize your preferences and settings',
    category: 'settings',
    order: 8,
    isActive: true,
    requiresAuth: true,
    autoRegister: true,
  },
  
  // Financial Pages
  {
    id: 'common-payment-request',
    name: 'Payment Request',
    path: '/common/payment-request',
    icon: DollarSign,
    description: 'Submit and track payment requests',
    category: 'financial',
    order: 9,
    isActive: true,
    requiresAuth: true,
    autoRegister: true,
  },
  // Calendar Page - Removed per request
  // {
  //   id: 'common-calendar',
  //   name: 'Calendar',
  //   path: '/common/calendar',
  //   icon: Calendar,
  //   description: 'View personal and team events',
  //   category: 'settings',
  //   order: 10,
  //   isActive: false,
  //   requiresAuth: true,
  //   autoRegister: false,
  // },
];

/**
 * Get all active common pages
 */
export function getActiveCommonPages(): CommonPageMetadata[] {
  return COMMON_PAGES.filter(page => page.isActive);
}

/**
 * Get common pages by category
 */
export function getCommonPagesByCategory(category: CommonPageMetadata['category']): CommonPageMetadata[] {
  return COMMON_PAGES.filter(page => page.category === category && page.isActive);
}

/**
 * Get common page by ID
 */
export function getCommonPageById(id: string): CommonPageMetadata | undefined {
  return COMMON_PAGES.find(page => page.id === id);
}

/**
 * Get all common page IDs
 */
export function getCommonPageIds(): string[] {
  return COMMON_PAGES.map(page => page.id);
}

/**
 * Check if a page is a common page
 */
export function isCommonPage(pageId: string): boolean {
  return COMMON_PAGES.some(page => page.id === pageId);
}

/**
 * Get pages that should be auto-registered in database
 */
export function getAutoRegisterPages(): CommonPageMetadata[] {
  return COMMON_PAGES.filter(page => page.autoRegister && page.isActive);
}

/**
 * Common Module Configuration
 */
export const COMMON_MODULE_CONFIG = {
  name: 'Common',
  displayName: 'Common Pages',
  description: 'Pages and features available to all users',
  icon: User,
  color: 'gray',
  order: 999, // Show at bottom of sidebar
  alwaysVisible: true, // Always show to authenticated users
};

export default COMMON_PAGES;
