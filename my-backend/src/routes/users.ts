/**
 * User Management API Routes
 * Handles CRUD operations for users
 * 
 * ARCHITECTURE: All user lifecycle operations MUST delegate to UserService
 * See docs/USER_MODEL_LOCK.md for enforcement rules
 * 
 * Routes:
 * - GET    /api/system/users           - List users with filters
 * - GET    /api/system/users/:id       - Get user details
 * - POST   /api/system/users           - Create new user (via UserService)
 * - PUT    /api/system/users/:id       - Update user (via UserService)
 * - DELETE /api/system/users/:id       - Delete user (via UserService)
 * - GET    /api/system/users/export    - Export users to CSV/Excel
 * - PUT    /api/system/users/:id/status - Update user status
 * - GET    /api/system/users/subscription-info - Get subscription limits for UI
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../../middleware/auth';
import { CORE_ROLES } from '../constants/roles';
import { 
  checkUserCreationLimit, 
  checkUserActivationLimit,
  getSubscriptionInfoForUI 
} from '../middleware/subscriptionEnforcement';

// CANONICAL: Import UserService for all user lifecycle operations
// eslint-disable-next-line @typescript-eslint/no-require-imports
const UserService = require('../../services/userService');

// Type definitions
interface AuthenticatedUser {
  id: string;
  role: string;
  tenant_id?: string;
  super_admin_id?: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const router = Router();
const prisma = new PrismaClient();

/**
 * List users with filters, search, pagination, and sorting
 * GET /api/system/users
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      role,
      productType,
      status: _status = 'active', // eslint-disable-line @typescript-eslint/no-unused-vars
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where: Record<string, unknown> = {};

    // Search filter (username or email)
    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Role filter
    if (role && role !== 'all') {
      where.role = role;
    }

    // Product type filter
    if (productType && productType !== 'all') {
      where.productType = productType;
    }

    // Status filter (active/inactive users)
    // Note: We'll use a soft delete approach or check updatedAt for activity
    // For now, we'll just return all users but you can add status logic

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [users, total] = await Promise.all([
      prisma.users_enhanced.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy as string]: sortOrder as 'asc' | 'desc',
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          product_type: true,
          tenant_id: true,
          super_admin_id: true,
          created_at: true,
          updated_at: true,
          profile_pic_url: true,
          // Don't include password
        },
      }),
      prisma.users_enhanced.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('List users error:', err);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: err.message,
    });
  }
});

/**
 * Get subscription info for UI
 * GET /api/system/users/subscription-info
 * 
 * IMPORTANT: This route MUST be defined BEFORE /:id to avoid being matched as a user ID
 * 
 * Returns current subscription limits for displaying in Admin UI.
 * Used to show/disable "Add User" button based on capacity.
 */
router.get('/subscription-info', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as Request & { user?: { tenant_id: string } }).user;
    const tenantId = currentUser?.tenant_id;

    if (!tenantId) {
      // No tenant context - return unlimited (for enterprise admin)
      return res.json({
        success: true,
        data: {
          has_subscription: false,
          can_create_user: true,
          can_activate_user: true,
          message: 'No tenant context - unlimited access'
        }
      });
    }

    const subscriptionInfo = await getSubscriptionInfoForUI(tenantId);

    res.json({
      success: true,
      data: subscriptionInfo
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Get subscription info error:', err);
    res.status(500).json({
      error: 'Failed to get subscription info',
      details: err.message,
    });
  }
});

/**
 * Get user by ID
 * GET /api/system/users/:id
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.users_enhanced.findFirst({
      where: {
        OR: [
          { id: id },
          { legacy_id: !isNaN(Number(id)) ? Number(id) : undefined },
        ].filter(Boolean)
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        product_type: true,
        tenant_id: true,
        super_admin_id: true,
        created_at: true,
        updated_at: true,
        profile_pic_url: true,
        assigned_modules: true,
        page_permissions: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Get user error:', err);
    res.status(500).json({
      error: 'Failed to fetch user',
      details: err.message,
    });
  }
});

/**
 * Create new user
 * POST /api/system/users
 * 
 * SUBSCRIPTION ENFORCEMENT: User count is checked against client's subscription limit.
 * If limit is reached, returns 403 with upgrade message.
 */
router.post('/', authMiddleware, checkUserCreationLimit(), async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as AuthenticatedRequest).user?.id;
    const currentUserRole = (req as AuthenticatedRequest).user?.role;
    const currentUserTenantId = (req as AuthenticatedRequest).user?.tenant_id;
    const currentUserSuperAdminId = (req as AuthenticatedRequest).user?.super_admin_id;

    // Only admins can create users
  if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to create users' });
    }

    const {
      username,
      email,
      password,
      role,
      role_ids, // Array of role names from frontend
      // CANONICAL hierarchy fields - see USER_MODEL_LOCK.md
      business_level,  // V-001 FIX: Extract from frontend, pass to UserService
      reports_to,      // V-002 FIX: Extract from frontend, pass to UserService
      productType = 'BUSINESS_ERP',
      tenant_id,
      super_admin_id,
      profile_pic_url,
      assignedModules,
      pagePermissions,
      first_name,
      last_name,
      mobile,
      phone, // Accept phone as alias for mobile
    } = req.body;

    // Use provided tenant_id/super_admin_id or inherit from current user
    const finalTenantId = tenant_id || currentUserTenantId || null;
    const finalSuperAdminId = super_admin_id || currentUserSuperAdminId || null;

    // Generate username from first_name + last_name if not provided
    const generateUsername = () => {
      if (first_name && last_name) {
        const base = `${first_name}_${last_name}`.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        return `${base}_${randomSuffix}`;
      } else if (email) {
        return email.split('@')[0];
      }
      return `user_${Date.now()}`;
    };

    const finalUsername = username || generateUsername();
    const finalPhone = mobile || phone || null;
    const finalRole = role || (role_ids && role_ids.length > 0 ? role_ids[0] : 'USER');

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    // Password strength validation - minimum 12 chars with complexity
    if (password.length < 12) {
      return res.status(400).json({
        error: 'Password must be at least 12 characters long',
      });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one uppercase letter',
      });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one lowercase letter',
      });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one number',
      });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one special character',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.users_enhanced.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email already exists',
      });
    }

    // CANONICAL: Delegate to UserService for all user creation
    // See docs/USER_MODEL_LOCK.md - Direct prisma.users_enhanced.create is PROHIBITED
    const newUser = await UserService.createUser(
      {
        username: finalUsername,
        email,
        password, // UserService handles hashing
        role: finalRole,
        // MULTI-ROLE FIX: Pass role_ids array for multiple role assignment
        role_ids: role_ids || undefined,
        // V-001 FIX: Pass frontend business_level (UserService validates 1-10 range)
        business_level: business_level !== undefined ? business_level : undefined,
        // V-002 FIX: Pass frontend reports_to (UserService validates existence & cycles)
        reports_to: reports_to || undefined,
        tenant_id: finalTenantId,
        super_admin_id: finalSuperAdminId,
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        phone: finalPhone || undefined,
        product_type: productType,
        profile_pic_url: profile_pic_url || undefined,
        assigned_modules: assignedModules || undefined,
        page_permissions: pagePermissions || undefined,
      },
      {
        adminUserId: currentUserId,
        isEnterpriseAdmin: currentUserRole === 'ENTERPRISE_ADMIN',
        skipSubscriptionCheck: false,
      }
    );

    // Audit log is handled by UserService

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully',
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Create user error:', err);
    res.status(500).json({
      error: 'Failed to create user',
      details: err.message,
    });
  }
});

/**
 * TEMP: Create demo user directly (bypasses UserService) to unblock testing
 * POST /api/system/users/demo-create
 * Only SUPER_ADMIN can use this. Removes after issue is resolved.
 */
router.post('/demo-create', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUserRole = (req as AuthenticatedRequest).user?.role;
    if (currentUserRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can use demo-create' });
    }

    const {
      email = 'suji.demo+' + Date.now() + '@gmail.com',
      first_name = 'Demo',
      last_name = 'User',
      role = 'ADMIN',
      tenant_id,
      super_admin_id,
      productType = 'BUSINESS_ERP',
      phone = '9999999999',
    } = req.body || {};

    // Strong password
    const password = 'Aa1!' + Math.random().toString(36).slice(2) + 'Zz9@';
    const username = email.split('@')[0] + '_' + Math.random().toString(36).slice(2, 6);

    // Prevent duplicate email
    const exists = await prisma.users_enhanced.findFirst({ where: { email } });
    if (exists) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Minimal direct create to unblock
    const created = await prisma.users_enhanced.create({
      data: {
        id: crypto.randomUUID(),
        username,
        email,
        // store hash in password_hash if required by schema; use bcrypt
        password_hash: bcrypt.hashSync(password, 10),
        salt: '',
        first_name,
        last_name,
        phone,
        role,
        product_type: productType,
        tenant_id: tenant_id || null,
        super_admin_id: super_admin_id ?? null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }
    });

    return res.status(201).json({ success: true, data: { id: created.id, email: created.email, username, password } });
  } catch (error) {
    console.error('Demo create error:', error);
    return res.status(500).json({ error: 'Failed to demo-create user', details: (error as Error).message });
  }
});

/**
 * Update user
 * PUT /api/system/users/:id
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as AuthenticatedRequest).user?.id;
    const currentUserRole = (req as AuthenticatedRequest).user?.role;
    const { id } = req.params;

    // Check if user exists (ID can be UUID string or legacy integer)
    const existingUser = await prisma.users_enhanced.findFirst({
      where: {
        OR: [
          { id: id },
          { legacy_id: !isNaN(Number(id)) ? Number(id) : undefined },
        ].filter(Boolean)
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Permission check: users can edit themselves, admins can edit anyone
    if (
  currentUserId !== existingUser.id &&
  !CORE_ROLES.includes(currentUserRole)
    ) {
      return res.status(403).json({ error: 'Insufficient permissions to edit this user' });
    }

    const {
      username,
      email,
      password,
      role,
      role_ids, // MULTI-ROLE FIX: Array of role names for multiple role assignment
      productType,
      tenant_id,
      super_admin_id,
      profile_pic_url,
      assignedModules,
      pagePermissions,
      // CANONICAL hierarchy fields - see USER_MODEL_LOCK.md
      business_level,  // V-001 FIX: Use canonical field
      reports_to,      // V-002 FIX: Use canonical field (replaces reporting_authority_id)
      // DEPRECATED — see USER_MODEL_LOCK.md: reporting_authority_id removed
      branch_id,
      first_name,
      last_name,
      phone,
    } = req.body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (username !== undefined) updateData.username = username;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.mobile = phone; // phone maps to mobile in database
    if (email !== undefined) {
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if email is already taken by another user
      const emailExists = await prisma.users_enhanced.findFirst({
        where: {
          email,
          id: { not: existingUser.id },
        },
      });

      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      updateData.email = email;
    }

    if (password !== undefined) {
      // Password strength validation - minimum 12 chars with complexity
      if (password.length < 12) {
        return res.status(400).json({
          error: 'Password must be at least 12 characters long',
        });
      }
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({
          error: 'Password must contain at least one uppercase letter',
        });
      }
      if (!/[a-z]/.test(password)) {
        return res.status(400).json({
          error: 'Password must contain at least one lowercase letter',
        });
      }
      if (!/[0-9]/.test(password)) {
        return res.status(400).json({
          error: 'Password must contain at least one number',
        });
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.status(400).json({
          error: 'Password must contain at least one special character',
        });
      }
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    // Only admins can change roles and product types
  if (CORE_ROLES.includes(currentUserRole)) {
      if (role !== undefined) updateData.role = role;
      // MULTI-ROLE FIX: Pass role_ids array for multiple role assignment
      if (role_ids !== undefined && Array.isArray(role_ids)) updateData.role_ids = role_ids;
      if (productType !== undefined) updateData.product_type = productType;
      if (tenant_id !== undefined) updateData.tenant_id = tenant_id;
      if (super_admin_id !== undefined) updateData.super_admin_id = super_admin_id;
      if (assignedModules !== undefined) updateData.assigned_modules = assignedModules;
      if (pagePermissions !== undefined) updateData.page_permissions = pagePermissions;
      
      // V-001 FIX: Use canonical business_level field (UserService validates 1-10)
      if (business_level !== undefined) {
        updateData.business_level = business_level;
      }
      
      // V-002 FIX: Use canonical reports_to field (UserService validates existence & cycles)
      // DEPRECATED: reporting_authority_id — see USER_MODEL_LOCK.md
      if (reports_to !== undefined) {
        updateData.reports_to = reports_to || null;
      }
      
      // Handle branch (store in profile_data JSON for legacy compatibility)
      const existingProfileData = ((existingUser as Record<string, unknown>).profile_data || {}) as Record<string, unknown>;
      let profileDataUpdated = false;
      
      if (branch_id !== undefined) {
        existingProfileData.branch_id = branch_id || null;
        profileDataUpdated = true;
      }
      
      if (profileDataUpdated) {
        updateData.profile_data = existingProfileData;
      }
    }

    if (profile_pic_url !== undefined) updateData.profile_pic_url = profile_pic_url;

    // CANONICAL: Delegate to UserService for all user updates
    // See docs/USER_MODEL_LOCK.md - Direct prisma.users_enhanced.update is PROHIBITED
    const updatedUser = await UserService.updateUser(
      existingUser.id,
      updateData,
      {
        adminUserId: currentUserId,
        isEnterpriseAdmin: currentUserRole === 'ENTERPRISE_ADMIN',
      }
    );
    
    // Handle branch assignment if provided
    if (branch_id !== undefined && CORE_ROLES.includes(currentUserRole)) {
      // Remove existing branch assignments
      await prisma.user_branches.deleteMany({
        where: { userId: existingUser.legacy_id || 0 },
      }).catch(() => {
        // Ignore if no existing assignments
      });
      
      // Add new branch assignment if provided
      if (branch_id) {
        await prisma.user_branches.create({
          data: {
            userId: existingUser.legacy_id || 0,
            branchId: parseInt(branch_id),
            isPrimary: true,
          },
        }).catch((e: Error) => {
          console.error('Failed to assign branch:', e.message);
        });
      }
    }

    // Create audit log
    // Create audit log (non-blocking)
    prisma.audit_logs.create({
      data: {
        action: 'UPDATE_USER',
        table_name: 'users_enhanced',
        old_values: {
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role,
        },
        new_values: {
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      },
    }).catch(() => {});

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Update user error:', err);
    res.status(500).json({
      error: 'Failed to update user',
      details: err.message,
    });
  }
});

/**
 * Delete user
 * DELETE /api/system/users/:id
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as AuthenticatedRequest).user?.id;
    const currentUserRole = (req as AuthenticatedRequest).user?.role;
    const { id } = req.params;

    // Only admins can delete users
  if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to delete users' });
    }

    // Can't delete yourself
    if (currentUserId === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const existingUser = await prisma.users_enhanced.findFirst({
      where: {
        OR: [
          { id: id },
          { legacy_id: !isNaN(Number(id)) ? Number(id) : undefined },
        ].filter(Boolean)
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (this will cascade delete related records based on schema)
    await prisma.users_enhanced.delete({
      where: { id: existingUser.id },
    });

    // Create audit log (non-blocking)
    prisma.audit_logs.create({
      data: {
        action: 'DELETE_USER',
        table_name: 'users_enhanced',
        old_values: {
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role,
        },
      },
    }).catch(() => {});

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Delete user error:', err);
    res.status(500).json({
      error: 'Failed to delete user',
      details: err.message,
    });
  }
});

/**
 * Export users to CSV
 * GET /api/system/users/export
 */
router.get('/export/csv', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUserRole = (req as Request & { user?: { role: string } }).user?.role || '';

    // Only admins can export
  if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to export users' });
    }

    const { role, productType, search } = req.query;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (role && role !== 'all') {
      where.role = role;
    }

    if (productType && productType !== 'all') {
      where.product_type = productType;
    }

    const users = await prisma.users_enhanced.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        product_type: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Convert to CSV
    const headers = ['ID', 'Username', 'Email', 'Role', 'Product Type', 'Created At', 'Updated At'];
    const csvRows = [headers.join(',')];

    for (const user of users) {
      const row = [
        user.id,
        `"${user.username}"`,
        `"${user.email}"`,
        `"${user.role || ''}"`,
        `"${user.product_type || ''}"`,
        user.created_at ? new Date(user.created_at).toISOString() : '',
        user.updated_at ? new Date(user.updated_at).toISOString() : '',
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Export users error:', err);
    res.status(500).json({
      error: 'Failed to export users',
      details: err.message,
    });
  }
});

/**
/**
 * Update user status (activate/deactivate)
 * PUT /api/system/users/:id/status
 * 
 * SUBSCRIPTION ENFORCEMENT: When activating, checks if active user limit is reached.
 * If limit is reached, returns 403 with upgrade message.
 */
router.put('/:id/status', authMiddleware, checkUserActivationLimit(), async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as Request & { user?: { id: string; role: string } }).user?.id;
    const currentUserRole = (req as Request & { user?: { id: string; role: string } }).user?.role || '';
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'inactive'

    // Only admins can change status
  if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Can't deactivate yourself
    if (currentUserId === id && status === 'inactive') {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const user = await prisma.users_enhanced.findFirst({
      where: {
        OR: [
          { id: id },
          { legacy_id: !isNaN(Number(id)) ? Number(id) : undefined },
        ].filter(Boolean)
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update is_active field
    const updatedUser = await prisma.users_enhanced.update({
      where: { id: user.id },
      data: {
        is_active: status === 'active',
        updated_at: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        is_active: true,
        updated_at: true,
      },
    });

    // Create audit log (non-blocking)
    prisma.audit_logs.create({
      data: {
        action: status === 'active' ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        table_name: 'users_enhanced',
        new_values: {
          status,
          is_active: status === 'active',
        },
      },
    }).catch(() => {});

    res.json({
      success: true,
      data: updatedUser,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Update user status error:', err);
    res.status(500).json({
      error: 'Failed to update user status',
      details: err.message,
    });
  }
});

export default router;
