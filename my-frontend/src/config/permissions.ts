/**
 * Feature Keys for RBAC Permission System
 * Maps to route paths and actions in the database
 */

export const FEATURE_KEYS = {
  DASHBOARD: '/dashboard',
  USERS: '/users',
  ROLES: '/roles',
  FINANCE: '/finance',
  INVENTORY: '/inventory',
  REPORTS: '/finance/transactions', // Using transactions as reports feature
  SETTINGS: '/super-admin',
  SUPER_ADMIN: '/super-admin',
} as const;

export const ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
export type ActionType = (typeof ACTIONS)[keyof typeof ACTIONS];
