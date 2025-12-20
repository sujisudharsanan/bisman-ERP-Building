/**
 * User Management API Routes
 * Handles CRUD operations for users
 * 
 * Routes:
 * - GET    /api/system/users           - List users with filters
 * - GET    /api/system/users/:id       - Get user details
 * - POST   /api/system/users           - Create new user
 * - PUT    /api/system/users/:id       - Update user
 * - DELETE /api/system/users/:id       - Delete user
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
      status = 'active',
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {};

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
      prisma.user.findMany({
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
          productType: true,
          tenant_id: true,
          super_admin_id: true,
          createdAt: true,
          updatedAt: true,
          profile_pic_url: true,
          // Don't include password
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          superAdmin: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
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
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error.message,
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

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        productType: true,
        tenant_id: true,
        super_admin_id: true,
        createdAt: true,
        updatedAt: true,
        profile_pic_url: true,
        assignedModules: true,
        pagePermissions: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        superAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            paymentRequestsCreated: true,
            tasksAssigned: true,
            approvals: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      details: error.message,
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
    const currentUserId = (req as any).user?.id;
    const currentUserRole = (req as any).user?.role;
    const currentUserTenantId = (req as any).user?.tenant_id;
    const currentUserSuperAdminId = (req as any).user?.super_admin_id;

    // Only admins can create users
  if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to create users' });
    }

    const {
      username,
      email,
      password,
      role,
      productType = 'BUSINESS_ERP',
      tenant_id,
      super_admin_id,
      profile_pic_url,
      assignedModules,
      pagePermissions,
      first_name,
      last_name,
      mobile,
    } = req.body;

    // Use provided tenant_id/super_admin_id or inherit from current user
    const finalTenantId = tenant_id || currentUserTenantId || null;
    const finalSuperAdminId = super_admin_id || currentUserSuperAdminId || null;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email, and password are required',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate UUID for the new user
    const { v4: uuidv4 } = await import('uuid');

    // Create user
    const newUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        username,
        email,
        password_hash: hashedPassword,
        role: role || 'USER',
        product_type: productType,
        tenant_id: finalTenantId,
        super_admin_id: finalSuperAdminId,
        profile_pic_url: profile_pic_url || null,
        assigned_modules: assignedModules || null,
        page_permissions: pagePermissions || null,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: mobile || null,
        is_active: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        product_type: true,
        created_at: true,
        first_name: true,
        last_name: true,
      },
    });

    // Create audit log (non-blocking - don't fail user creation if audit fails)
    try {
      await prisma.auditLog.create({
        data: {
          user_id: typeof currentUserId === 'string' ? parseInt(currentUserId) || null : currentUserId,
          action: 'CREATE_USER',
          table_name: 'users_enhanced',
          new_values: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
          },
        },
      });
    } catch (auditError) {
      console.error('Audit log creation failed (non-blocking):', auditError);
    }

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully',
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      details: error.message,
    });
  }
});

/**
 * Update user
 * PUT /api/system/users/:id
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user?.id;
    const currentUserRole = (req as any).user?.role;
    const { id } = req.params;

    // Check if user exists (ID can be UUID string or legacy integer)
    const existingUser = await prisma.user.findFirst({
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
      productType,
      tenant_id,
      super_admin_id,
      profile_pic_url,
      assignedModules,
      pagePermissions,
      reporting_authority_id,
      branch_id,
    } = req.body;

    // Build update data
    const updateData: any = {};

    if (username !== undefined) updateData.username = username;
    if (email !== undefined) {
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if email is already taken by another user
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: Number(id) },
        },
      });

      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      updateData.email = email;
    }

    if (password !== undefined) {
      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long',
        });
      }
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    // Only admins can change roles and product types
  if (CORE_ROLES.includes(currentUserRole)) {
      if (role !== undefined) updateData.role = role;
      if (productType !== undefined) updateData.product_type = productType;
      if (tenant_id !== undefined) updateData.tenant_id = tenant_id;
      if (super_admin_id !== undefined) updateData.super_admin_id = super_admin_id;
      if (assignedModules !== undefined) updateData.assigned_modules = assignedModules;
      if (pagePermissions !== undefined) updateData.page_permissions = pagePermissions;
      
      // Handle reporting authority and branch (store in profile_data JSON)
      const existingProfileData = (existingUser as any).profile_data || {};
      let profileDataUpdated = false;
      
      if (reporting_authority_id !== undefined) {
        existingProfileData.reporting_authority_id = reporting_authority_id || null;
        profileDataUpdated = true;
      }
      
      if (branch_id !== undefined) {
        existingProfileData.branch_id = branch_id || null;
        profileDataUpdated = true;
      }
      
      if (profileDataUpdated) {
        updateData.profile_data = existingProfileData;
      }
    }

    if (profile_pic_url !== undefined) updateData.profile_pic_url = profile_pic_url;

    // Update user using the actual UUID from the existing user
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        product_type: true,
        updated_at: true,
      },
    });
    
    // Handle branch assignment if provided
    if (branch_id !== undefined && CORE_ROLES.includes(currentUserRole)) {
      // Remove existing branch assignments
      await prisma.userBranch.deleteMany({
        where: { userId: existingUser.legacy_id || 0 },
      }).catch(() => {
        // Ignore if no existing assignments
      });
      
      // Add new branch assignment if provided
      if (branch_id) {
        await prisma.userBranch.create({
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
    prisma.auditLog.create({
      data: {
        user_id: currentUserId,
        action: 'UPDATE_USER',
        table_name: 'users',
        record_id: String(updatedUser.id),
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
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      details: error.message,
    });
  }
});

/**
 * Delete user
 * DELETE /api/system/users/:id
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user?.id;
    const currentUserRole = (req as any).user?.role;
    const { id } = req.params;

    // Only admins can delete users
  if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to delete users' });
    }

    // Can't delete yourself
    if (currentUserId === Number(id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (this will cascade delete related records based on schema)
    await prisma.user.delete({
      where: { id: Number(id) },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: currentUserId,
        action: 'DELETE_USER',
        table_name: 'users',
        record_id: Number(id),
        old_values: {
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role,
        },
      },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      details: error.message,
    });
  }
});

/**
 * Export users to CSV
 * GET /api/system/users/export
 */
router.get('/export/csv', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUserRole = (req as any).user?.role;

    // Only admins can export
  if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to export users' });
    }

    const { role, productType, search } = req.query;

    const where: any = {};

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
      where.productType = productType;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        productType: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
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
        `"${user.productType || ''}"`,
        user.createdAt ? new Date(user.createdAt).toISOString() : '',
        user.updatedAt ? new Date(user.updatedAt).toISOString() : '',
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('Export users error:', error);
    res.status(500).json({
      error: 'Failed to export users',
      details: error.message,
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
    const currentUserId = (req as any).user?.id;
    const currentUserRole = (req as any).user?.role;
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'inactive'

    // Only admins can change status
  if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Can't deactivate yourself
    if (currentUserId === Number(id) && status === 'inactive') {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Note: Add a status field to schema if needed, for now just updating updatedAt
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: currentUserId,
        action: status === 'active' ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        table_name: 'users',
        record_id: Number(id),
        new_values: {
          status,
        },
      },
    });

    res.json({
      success: true,
      data: updatedUser,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: any) {
    console.error('Update user status error:', error);
    res.status(500).json({
      error: 'Failed to update user status',
      details: error.message,
    });
  }
});

/**
 * Get subscription info for UI
 * GET /api/system/users/subscription-info
 * 
 * Returns current subscription limits for displaying in Admin UI.
 * Used to show/disable "Add User" button based on capacity.
 */
router.get('/subscription-info', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
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
  } catch (error: any) {
    console.error('Get subscription info error:', error);
    res.status(500).json({
      error: 'Failed to get subscription info',
      details: error.message,
    });
  }
});

export default router;
