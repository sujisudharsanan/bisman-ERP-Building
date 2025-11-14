/**
 * RBAC Service for Chat Engine
 * Handles role-based access control for chat intents
 */

import { Intent } from './intentService';

export type UserRole = 
  | 'super-admin'
  | 'admin'
  | 'manager'
  | 'employee'
  | 'accountant'
  | 'hr'
  | 'inventory-manager'
  | 'viewer';

export interface RBACPermission {
  intent: Intent;
  allowedRoles: UserRole[];
  requiresApproval?: boolean;
  customCheck?: (userId: number, context: any) => Promise<boolean>;
}

export interface UserContext {
  id: number;
  role: UserRole;
  department?: string;
  permissions?: string[];
}

// Define permissions for each intent
const INTENT_PERMISSIONS: RBACPermission[] = [
  // Task Management - Available to all authenticated users
  {
    intent: 'show_pending_tasks',
    allowedRoles: ['super-admin', 'admin', 'manager', 'employee', 'accountant', 'hr', 'inventory-manager', 'viewer'],
  },
  {
    intent: 'create_task',
    allowedRoles: ['super-admin', 'admin', 'manager', 'employee', 'accountant', 'hr', 'inventory-manager'],
  },
  
  // Payment Requests - Finance and Management only
  {
    intent: 'create_payment_request',
    allowedRoles: ['super-admin', 'admin', 'accountant', 'manager'],
    requiresApproval: true,
  },
  {
    intent: 'vendor_payments',
    allowedRoles: ['super-admin', 'admin', 'accountant', 'manager'],
  },
  
  // Inventory - Inventory managers and above
  {
    intent: 'check_inventory',
    allowedRoles: ['super-admin', 'admin', 'manager', 'inventory-manager', 'viewer'],
  },
  
  // HR Operations - HR and management
  {
    intent: 'check_attendance',
    allowedRoles: ['super-admin', 'admin', 'manager', 'employee', 'hr'], // Own attendance
  },
  {
    intent: 'request_leave',
    allowedRoles: ['super-admin', 'admin', 'manager', 'employee', 'hr'],
  },
  
  // Dashboard & Reports
  {
    intent: 'view_dashboard',
    allowedRoles: ['super-admin', 'admin', 'manager', 'employee', 'accountant', 'hr', 'inventory-manager', 'viewer'],
  },
  {
    intent: 'view_reports',
    allowedRoles: ['super-admin', 'admin', 'manager', 'accountant', 'hr', 'inventory-manager'],
  },
  
  // User Management - Admin and HR only
  {
    intent: 'search_user',
    allowedRoles: ['super-admin', 'admin', 'hr', 'manager'],
  },
  
  // Approval Status - Based on role
  {
    intent: 'get_approval_status',
    allowedRoles: ['super-admin', 'admin', 'manager', 'employee', 'accountant', 'hr'],
  },
  
  // Salary Information - Self only or HR/Admin
  {
    intent: 'salary_info',
    allowedRoles: ['super-admin', 'admin', 'hr', 'employee', 'accountant'],
    customCheck: async (userId: number, context: any) => {
      // Only allow viewing own salary unless admin/HR
      if (['super-admin', 'admin', 'hr'].includes(context.userRole)) {
        return true;
      }
      return context.targetUserId === userId;
    },
  },
  
  // Vehicle & Hub Info
  {
    intent: 'vehicle_info',
    allowedRoles: ['super-admin', 'admin', 'manager', 'inventory-manager'],
  },
  {
    intent: 'hub_info',
    allowedRoles: ['super-admin', 'admin', 'manager', 'inventory-manager', 'viewer'],
  },
  
  // Fuel Expenses
  {
    intent: 'fuel_expense',
    allowedRoles: ['super-admin', 'admin', 'manager', 'accountant'],
  },
  
  // Meeting & Notifications - All users
  {
    intent: 'schedule_meeting',
    allowedRoles: ['super-admin', 'admin', 'manager', 'employee', 'accountant', 'hr', 'inventory-manager'],
  },
  {
    intent: 'check_notifications',
    allowedRoles: ['super-admin', 'admin', 'manager', 'employee', 'accountant', 'hr', 'inventory-manager', 'viewer'],
  },
  
  // Profile Updates - Self only
  {
    intent: 'update_profile',
    allowedRoles: ['super-admin', 'admin', 'manager', 'employee', 'accountant', 'hr', 'inventory-manager', 'viewer'],
  },
];

export class RBACService {
  /**
   * Check if user has permission for an intent
   */
  async hasPermission(
    user: UserContext,
    intent: Intent,
    context?: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Unknown intent - deny
    if (intent === 'unknown') {
      return { allowed: true }; // Allow unknown to show help
    }

    // Find permission rule
    const permission = INTENT_PERMISSIONS.find(p => p.intent === intent);
    
    if (!permission) {
      // No specific rule - deny by default for security
      return {
        allowed: false,
        reason: 'This action requires specific permissions.',
      };
    }

    // Check role-based access
    if (!permission.allowedRoles.includes(user.role)) {
      return {
        allowed: false,
        reason: `This action requires one of the following roles: ${permission.allowedRoles.join(', ')}`,
      };
    }

    // Custom check if defined
    if (permission.customCheck) {
      const customAllowed = await permission.customCheck(user.id, {
        ...context,
        userRole: user.role,
      });
      
      if (!customAllowed) {
        return {
          allowed: false,
          reason: 'You do not have permission to perform this specific action.',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get allowed intents for a user role
   */
  getAllowedIntents(role: UserRole): Intent[] {
    return INTENT_PERMISSIONS
      .filter(p => p.allowedRoles.includes(role))
      .map(p => p.intent);
  }

  /**
   * Check if intent requires approval
   */
  requiresApproval(intent: Intent): boolean {
    const permission = INTENT_PERMISSIONS.find(p => p.intent === intent);
    return permission?.requiresApproval || false;
  }

  /**
   * Get permission details for an intent
   */
  getPermissionDetails(intent: Intent): RBACPermission | null {
    return INTENT_PERMISSIONS.find(p => p.intent === intent) || null;
  }

  /**
   * Filter intents based on user role
   */
  filterIntentsByRole(intents: Intent[], role: UserRole): Intent[] {
    const allowedIntents = this.getAllowedIntents(role);
    return intents.filter(intent => allowedIntents.includes(intent));
  }

  /**
   * Get role hierarchy level (higher = more permissions)
   */
  getRoleLevel(role: UserRole): number {
    const levels: Record<UserRole, number> = {
      'super-admin': 100,
      'admin': 90,
      'manager': 70,
      'accountant': 60,
      'hr': 60,
      'inventory-manager': 60,
      'employee': 40,
      'viewer': 10,
    };
    return levels[role] || 0;
  }

  /**
   * Check if user can perform action on target user
   */
  canActOnUser(actorRole: UserRole, targetRole: UserRole): boolean {
    return this.getRoleLevel(actorRole) > this.getRoleLevel(targetRole);
  }

  /**
   * Get user-friendly permission error message
   */
  getPermissionErrorMessage(intent: Intent, userRole: UserRole): string {
    const permission = this.getPermissionDetails(intent);
    
    if (!permission) {
      return 'You do not have permission to perform this action.';
    }

    const requiredRoles = permission.allowedRoles
      .map(r => r.replace(/-/g, ' '))
      .map(r => r.charAt(0).toUpperCase() + r.slice(1))
      .join(', ');

    return `⛔ Access Denied\n\nThis action requires one of the following roles:\n${requiredRoles}\n\nYour current role: ${userRole.replace(/-/g, ' ').toUpperCase()}`;
  }
}

export const rbacService = new RBACService();
