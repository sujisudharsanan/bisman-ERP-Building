// Task Approver Management API Routes
// Handles CRUD operations for task approvers (approval chain configuration)

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { APPROVER_ROLES, APPROVAL_LEVELS } = require('../services/taskStateMachine');

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Only SUPER_ADMIN or ENTERPRISE_ADMIN can manage approvers
  if (req.user.userType !== 'SUPER_ADMIN' && req.user.userType !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

/**
 * GET /api/approvers
 * Get all approvers
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { is_active, approver_role } = req.query;
    let query = 'SELECT * FROM workflow_task_approvers';
    const conditions = [];
    
    if (is_active !== undefined) {
      conditions.push(`is_active = ${is_active === 'true'}`);
    }
    if (approver_role) {
      conditions.push(`approver_role = '${approver_role}'`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY approval_level ASC, created_at ASC';
    
    const approvers = await prisma.$queryRawUnsafe(query);
    res.json(approvers);
  } catch (error) {
    console.error('Error fetching approvers:', error);
    res.status(500).json({ error: 'Failed to fetch approvers' });
  }
});

/**
 * GET /api/approvers/chain
 * Get approval chain overview
 */
router.get('/chain', requireAdmin, async (req, res) => {
  try {
    const chain = await prisma.$queryRaw`
      SELECT 
        approval_level,
        approver_role,
        COUNT(*) as approver_count,
        array_agg(user_name) as approvers
      FROM workflow_task_approvers
      WHERE is_active = true
      GROUP BY approval_level, approver_role
      ORDER BY approval_level ASC
    `;
    
    res.json(chain);
  } catch (error) {
    console.error('Error fetching approval chain:', error);
    res.status(500).json({ error: 'Failed to fetch approval chain' });
  }
});

/**
 * POST /api/approvers
 * Add new approver
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      user_id,
      user_type,
      user_name,
      user_email,
      approver_role,
      approval_level,
      can_override
    } = req.body;

    // Validation
    if (!user_id || !user_type || !user_name || !user_email || !approver_role || !approval_level) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, user_type, user_name, user_email, approver_role, approval_level' 
      });
    }

    // Validate approver_role
    const validRoles = Object.values(APPROVER_ROLES);
    if (!validRoles.includes(approver_role)) {
      return res.status(400).json({ 
        error: `Invalid approver_role. Must be one of: ${validRoles.join(', ')}` 
      });
    }

    // Validate approval_level
    if (approval_level < 1 || approval_level > 4) {
      return res.status(400).json({ 
        error: 'Invalid approval_level. Must be between 1 and 4' 
      });
    }

    // Check if user already has this role
    const existing = await prisma.$queryRaw`
      SELECT * FROM workflow_task_approvers 
      WHERE user_id = ${user_id}::uuid 
      AND user_type = ${user_type} 
      AND approver_role = ${approver_role}
      LIMIT 1
    `;

    if (existing && existing.length > 0) {
      return res.status(409).json({ 
        error: 'User already has this approver role' 
      });
    }

    // Insert new approver
    const result = await prisma.$queryRaw`
      INSERT INTO workflow_task_approvers (
        user_id, user_type, user_name, user_email,
        approver_role, approval_level, can_override, is_active
      ) VALUES (
        ${user_id}::uuid, ${user_type}, ${user_name}, ${user_email},
        ${approver_role}, ${approval_level}, ${can_override || false}, true
      ) RETURNING *
    `;

    const approver = result[0];
    res.status(201).json(approver);
  } catch (error) {
    console.error('Error creating approver:', error);
    res.status(500).json({ error: 'Failed to create approver' });
  }
});

/**
 * PUT /api/approvers/:id
 * Update approver
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      user_name,
      user_email,
      approver_role,
      approval_level,
      can_override,
      is_active
    } = req.body;

    // Check if approver exists
    const existing = await prisma.$queryRaw`
      SELECT * FROM workflow_task_approvers WHERE id = ${id}::uuid LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Approver not found' });
    }

    // Build update query dynamically
    const updates = [];
    if (user_name !== undefined) updates.push(`user_name = '${user_name}'`);
    if (user_email !== undefined) updates.push(`user_email = '${user_email}'`);
    if (approver_role !== undefined) updates.push(`approver_role = '${approver_role}'`);
    if (approval_level !== undefined) updates.push(`approval_level = ${approval_level}`);
    if (can_override !== undefined) updates.push(`can_override = ${can_override}`);
    if (is_active !== undefined) updates.push(`is_active = ${is_active}`);
    
    updates.push('updated_at = now()');

    const result = await prisma.$queryRawUnsafe(`
      UPDATE workflow_task_approvers 
      SET ${updates.join(', ')}
      WHERE id = '${id}'::uuid
      RETURNING *
    `);

    const approver = result[0];
    res.json(approver);
  } catch (error) {
    console.error('Error updating approver:', error);
    res.status(500).json({ error: 'Failed to update approver' });
  }
});

/**
 * DELETE /api/approvers/:id
 * Delete approver (soft delete by setting is_active = false)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      // Hard delete
      await prisma.$queryRaw`
        DELETE FROM workflow_task_approvers WHERE id = ${id}::uuid
      `;
      res.json({ message: 'Approver permanently deleted' });
    } else {
      // Soft delete (deactivate)
      const result = await prisma.$queryRaw`
        UPDATE workflow_task_approvers 
        SET is_active = false, updated_at = now()
        WHERE id = ${id}::uuid
        RETURNING *
      `;
      
      if (!result || result.length === 0) {
        return res.status(404).json({ error: 'Approver not found' });
      }
      
      res.json({ message: 'Approver deactivated', approver: result[0] });
    }
  } catch (error) {
    console.error('Error deleting approver:', error);
    res.status(500).json({ error: 'Failed to delete approver' });
  }
});

/**
 * GET /api/approvers/available-users
 * Get list of users who can be assigned as approvers
 */
router.get('/available-users', requireAdmin, async (req, res) => {
  try {
    // Fetch all users (Hub Incharge and other roles)
    const users = await prisma.$queryRaw`
      SELECT id, email, name, role, 'USER' as user_type 
      FROM users 
      WHERE is_active = true
      ORDER BY name ASC
    `;
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({ error: 'Failed to fetch available users' });
  }
});

/**
 * POST /api/approvers/bulk-assign
 * Bulk assign approvers
 */
router.post('/bulk-assign', requireAdmin, async (req, res) => {
  try {
    const { approvers } = req.body;
    
    if (!Array.isArray(approvers) || approvers.length === 0) {
      return res.status(400).json({ error: 'approvers array is required' });
    }

    const results = [];
    const errors = [];

    for (const approver of approvers) {
      try {
        const {
          user_id,
          user_type,
          user_name,
          user_email,
          approver_role,
          approval_level
        } = approver;

        // Check if exists
        const existing = await prisma.$queryRaw`
          SELECT * FROM workflow_task_approvers 
          WHERE user_id = ${user_id}::uuid 
          AND user_type = ${user_type} 
          AND approver_role = ${approver_role}
          LIMIT 1
        `;

        if (existing && existing.length > 0) {
          // Update existing
          const updated = await prisma.$queryRaw`
            UPDATE workflow_task_approvers 
            SET is_active = true, 
                approval_level = ${approval_level},
                updated_at = now()
            WHERE id = ${existing[0].id}::uuid
            RETURNING *
          `;
          results.push(updated[0]);
        } else {
          // Insert new
          const inserted = await prisma.$queryRaw`
            INSERT INTO workflow_task_approvers (
              user_id, user_type, user_name, user_email,
              approver_role, approval_level, is_active
            ) VALUES (
              ${user_id}::uuid, ${user_type}, ${user_name}, ${user_email},
              ${approver_role}, ${approval_level}, true
            ) RETURNING *
          `;
          results.push(inserted[0]);
        }
      } catch (error) {
        errors.push({ approver, error: error.message });
      }
    }

    res.json({
      success: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error bulk assigning approvers:', error);
    res.status(500).json({ error: 'Failed to bulk assign approvers' });
  }
});

module.exports = router;
