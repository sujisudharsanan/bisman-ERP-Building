/**
 * ============================================================================
 * BISMAN ERP - Asset Management Routes
 * ============================================================================
 * 
 * Provides CRUD operations for assets with:
 * - RBAC-based access control (permission: CREATE_ASSET, VIEW_ASSET, etc.)
 * - Multi-tenant isolation
 * - Subscription limit enforcement
 * - Approval workflow support
 * - Full audit logging
 * 
 * @module routes/assets
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { getPool } = require('../middleware/database');
const authMiddleware = require('../middleware/auth').authenticate;
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// CONSTANTS
// ============================================================================

const ASSET_STATUSES = ['draft', 'pending_approval', 'active', 'inactive', 'under_maintenance', 'retired', 'disposed', 'lost', 'sold'];
const ASSET_CONDITIONS = ['new', 'excellent', 'good', 'fair', 'poor', 'damaged'];
const FILE_CATEGORIES = ['invoice', 'warranty', 'manual', 'image', 'certificate', 'insurance', 'general'];

// Roles that can manage assets (used for logging, not authorization - auth is permission-based)
const ASSET_ADMIN_ROLES = ['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'ADMIN_OPS', 'OPERATIONS_MANAGER'];

// ============================================================================
// MIDDLEWARE: Check Asset Creation Limit
// ============================================================================

const checkAssetCreationLimit = () => {
  return async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        // Super admins without tenant bypass
        return next();
      }
      
      // Get subscription
      const subscription = await prisma.client_subscriptions.findUnique({
        where: { client_id: tenantId },
      });
      
      if (!subscription || !subscription.is_active) {
        return res.status(403).json({
          error: 'No active subscription',
          message: 'Your organization does not have an active subscription.',
          code: 'NO_SUBSCRIPTION',
        });
      }
      
      // Get asset count
      const pool = getPool();
      const countResult = await pool.query(`
        SELECT COUNT(*) as count FROM assets 
        WHERE tenant_id = $1 AND is_deleted = false AND status != 'disposed'
      `, [tenantId]);
      const assetCount = parseInt(countResult.rows[0]?.count || 0);
      
      // Check against plan limit
      const planSnapshot = subscription.plan_snapshot_json || {};
      const maxAssets = planSnapshot.max_assets || 100; // Default 100 if not set
      
      if (assetCount >= maxAssets) {
        return res.status(403).json({
          error: 'Asset limit reached',
          message: `Your plan allows ${maxAssets} assets. You currently have ${assetCount}. Please upgrade to add more assets.`,
          code: 'ASSET_LIMIT_REACHED',
          currentCount: assetCount,
          limit: maxAssets,
        });
      }
      
      // Attach limit info for frontend display
      req.assetLimits = {
        current: assetCount,
        max: maxAssets,
        remaining: maxAssets - assetCount,
      };
      
      next();
    } catch (error) {
      console.error('[checkAssetCreationLimit] Error:', error);
      next(); // Allow on error to not block operations
    }
  };
};

// ============================================================================
// MIDDLEWARE: Check Asset Permission
// ============================================================================

const checkAssetPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const pool = getPool();
      const userId = req.user?.legacy_id || req.user?.id;
      const userRole = (req.user?.role || '').toUpperCase();
      const tenantId = req.user?.tenant_id;
      
      // Platform admins have full access
      if (['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(userRole)) {
        return next();
      }
      
      // Check if role has the required permission via admin_page_assignments
      // The permission corresponds to page_code like ASSETS_ADD, ASSETS_LIST, etc.
      const permissionMap = {
        'CREATE_ASSET': 'ASSETS_ADD',
        'VIEW_ASSET': 'ASSETS_LIST',
        'EDIT_ASSET': 'ASSETS_LIST',
        'DELETE_ASSET': 'ASSETS_LIST',
        'APPROVE_ASSET': 'ASSETS_LIST',
      };
      
      const pageCode = permissionMap[requiredPermission] || requiredPermission;
      
      const result = await pool.query(`
        SELECT 1 FROM admin_page_assignments apa
        JOIN pages_master pm ON pm.id = apa.page_id
        WHERE apa.assignee_type = $1
          AND pm.page_code = $2
          AND apa.is_active = true
        LIMIT 1
      `, [userRole, pageCode]);
      
      if (result.rows.length === 0) {
        console.log(`[AssetPermission] DENIED: ${userRole} lacks ${requiredPermission} (${pageCode})`);
        return res.status(403).json({
          error: 'Permission denied',
          message: `You do not have permission to ${requiredPermission.toLowerCase().replace('_', ' ')}`,
          code: 'PERMISSION_DENIED',
        });
      }
      
      next();
    } catch (error) {
      console.error('[checkAssetPermission] Error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// ============================================================================
// HELPER: Log Asset Action
// ============================================================================

async function logAssetAction(pool, {
  assetId,
  tenantId,
  action,
  fieldName = null,
  oldValue = null,
  newValue = null,
  changesJson = null,
  performedBy,
  performedByName,
  performedByRole,
  ipAddress,
  userAgent,
  notes = null
}) {
  try {
    await pool.query(`
      INSERT INTO asset_history (
        id, asset_id, tenant_id, action, field_name, old_value, new_value,
        changes_json, performed_by, performed_by_name, performed_by_role,
        ip_address, user_agent, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      uuidv4(), assetId, tenantId, action, fieldName, oldValue, newValue,
      changesJson ? JSON.stringify(changesJson) : null,
      performedBy, performedByName, performedByRole, ipAddress, userAgent, notes
    ]);
  } catch (error) {
    console.error('[logAssetAction] Error:', error);
    // Don't throw - logging should not break the main operation
  }
}

// ============================================================================
// HELPER: Generate Asset Code
// ============================================================================

async function generateAssetCode(pool, tenantId, categoryCode) {
  const prefix = categoryCode ? categoryCode.substring(0, 3).toUpperCase() : 'AST';
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Get next sequence number for this tenant
  const result = await pool.query(`
    SELECT COUNT(*) + 1 as next_seq FROM assets WHERE tenant_id = $1
  `, [tenantId]);
  
  const seq = String(result.rows[0].next_seq).padStart(5, '0');
  return `${prefix}-${year}-${seq}`;
}

// ============================================================================
// HELPER: Validate Asset Data
// ============================================================================

function validateAssetData(data, isUpdate = false) {
  const errors = [];
  
  // Required fields for create
  if (!isUpdate) {
    if (!data.name || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Asset name is required' });
    }
  }
  
  // Name length
  if (data.name && data.name.length > 200) {
    errors.push({ field: 'name', message: 'Asset name must be less than 200 characters' });
  }
  
  // Asset code format (if provided)
  if (data.asset_code && !/^[A-Z0-9\-_]+$/i.test(data.asset_code)) {
    errors.push({ field: 'asset_code', message: 'Asset code can only contain letters, numbers, hyphens, and underscores' });
  }
  
  // Date validations
  if (data.purchase_date && data.warranty_expiry) {
    const purchaseDate = new Date(data.purchase_date);
    const warrantyExpiry = new Date(data.warranty_expiry);
    if (warrantyExpiry < purchaseDate) {
      errors.push({ field: 'warranty_expiry', message: 'Warranty expiry must be after purchase date' });
    }
  }
  
  // Cost validation
  if (data.purchase_cost !== undefined && data.purchase_cost !== null) {
    const cost = parseFloat(data.purchase_cost);
    if (isNaN(cost) || cost < 0) {
      errors.push({ field: 'purchase_cost', message: 'Purchase cost must be a positive number' });
    }
  }
  
  // Status validation
  if (data.status && !ASSET_STATUSES.includes(data.status)) {
    errors.push({ field: 'status', message: `Invalid status. Must be one of: ${ASSET_STATUSES.join(', ')}` });
  }
  
  // Condition validation
  if (data.condition && !ASSET_CONDITIONS.includes(data.condition)) {
    errors.push({ field: 'condition', message: `Invalid condition. Must be one of: ${ASSET_CONDITIONS.join(', ')}` });
  }
  
  return errors;
}

// ============================================================================
// GET /api/assets - List assets with filters
// ============================================================================

router.get('/', authMiddleware, checkAssetPermission('VIEW_ASSET'), async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.user?.tenant_id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }
    
    const {
      search = '',
      category = '',
      status = '',
      location = '',
      assigned_to = '',
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [tenantId];
    let paramIndex = 2;
    
    let whereClause = 'WHERE a.tenant_id = $1 AND a.is_deleted = false';
    
    if (search) {
      whereClause += ` AND (
        a.name ILIKE $${paramIndex} OR 
        a.asset_code ILIKE $${paramIndex} OR
        a.serial_number ILIKE $${paramIndex} OR
        a.description ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (category) {
      whereClause += ` AND a.category_id = $${paramIndex}`;
      params.push(parseInt(category));
      paramIndex++;
    }
    
    if (status) {
      whereClause += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (location) {
      whereClause += ` AND a.location_name ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }
    
    if (assigned_to) {
      whereClause += ` AND a.assigned_to_user_id = $${paramIndex}`;
      params.push(parseInt(assigned_to));
      paramIndex++;
    }
    
    // Validate sort column
    const validSortColumns = ['created_at', 'name', 'asset_code', 'status', 'purchase_cost', 'purchase_date'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    // Count query
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM assets a ${whereClause}
    `, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Data query
    const dataResult = await pool.query(`
      SELECT 
        a.*,
        ac.name as category_name,
        ac.code as category_code,
        u.first_name || ' ' || u.last_name as assigned_to_display_name
      FROM assets a
      LEFT JOIN asset_categories ac ON ac.id = a.category_id
      LEFT JOIN users_enhanced u ON u.legacy_id = a.assigned_to_user_id
      ${whereClause}
      ORDER BY a.${sortColumn} ${sortDir}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), offset]);
    
    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[GET /api/assets] Error:', error);
    res.status(500).json({ error: 'Failed to fetch assets', details: error.message });
  }
});

// ============================================================================
// GET /api/assets/limits - Get asset limits for current tenant
// ============================================================================

router.get('/limits', authMiddleware, async (req, res) => {
  try {
    const prisma = getPrisma();
    const pool = getPool();
    const tenantId = req.user?.tenant_id;
    
    if (!tenantId) {
      return res.json({
        success: true,
        data: { current: 0, max: -1, remaining: -1, unlimited: true },
      });
    }
    
    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: tenantId },
    });
    
    const countResult = await pool.query(`
      SELECT COUNT(*) as count FROM assets 
      WHERE tenant_id = $1 AND is_deleted = false AND status != 'disposed'
    `, [tenantId]);
    
    const current = parseInt(countResult.rows[0]?.count || 0);
    const planSnapshot = subscription?.plan_snapshot_json || {};
    const max = planSnapshot.max_assets || 100;
    
    res.json({
      success: true,
      data: {
        current,
        max,
        remaining: max - current,
        unlimited: max === -1,
        subscriptionActive: subscription?.is_active || false,
      },
    });
  } catch (error) {
    console.error('[GET /api/assets/limits] Error:', error);
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

// ============================================================================
// GET /api/assets/categories - Get asset categories
// ============================================================================

router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.user?.tenant_id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }
    
    const result = await pool.query(`
      SELECT id, code, name, description, icon, color_code, 
             depreciation_rate, useful_life_years, parent_id
      FROM asset_categories
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY name
    `, [tenantId]);
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('[GET /api/assets/categories] Error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============================================================================
// GET /api/assets/:id - Get single asset
// ============================================================================

router.get('/:id', authMiddleware, checkAssetPermission('VIEW_ASSET'), async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    
    const result = await pool.query(`
      SELECT 
        a.*,
        ac.name as category_name,
        ac.code as category_code,
        u.first_name || ' ' || u.last_name as assigned_to_display_name,
        creator.first_name || ' ' || creator.last_name as created_by_name
      FROM assets a
      LEFT JOIN asset_categories ac ON ac.id = a.category_id
      LEFT JOIN users_enhanced u ON u.legacy_id = a.assigned_to_user_id
      LEFT JOIN users_enhanced creator ON creator.legacy_id = a.created_by
      WHERE a.id = $1 AND a.tenant_id = $2 AND a.is_deleted = false
    `, [id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Get files
    const filesResult = await pool.query(`
      SELECT id, file_name, original_name, file_type, file_size, category, description, uploaded_at
      FROM asset_files
      WHERE asset_id = $1 AND is_deleted = false
      ORDER BY uploaded_at DESC
    `, [id]);
    
    // Get recent history
    const historyResult = await pool.query(`
      SELECT action, field_name, old_value, new_value, performed_by_name, 
             performed_by_role, performed_at, notes
      FROM asset_history
      WHERE asset_id = $1
      ORDER BY performed_at DESC
      LIMIT 10
    `, [id]);
    
    res.json({
      success: true,
      data: {
        ...result.rows[0],
        files: filesResult.rows,
        history: historyResult.rows,
      },
    });
  } catch (error) {
    console.error('[GET /api/assets/:id] Error:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// ============================================================================
// POST /api/assets - Create new asset
// ============================================================================

router.post('/', 
  authMiddleware, 
  checkAssetPermission('CREATE_ASSET'),
  checkAssetCreationLimit(),
  async (req, res) => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.legacy_id || req.user?.id;
      const userName = req.user?.name || req.user?.email || 'Unknown';
      const userRole = req.user?.role || 'Unknown';
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      if (!tenantId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Tenant context required' });
      }
      
      const data = req.body;
      
      // Validate
      const validationErrors = validateAssetData(data, false);
      if (validationErrors.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors,
        });
      }
      
      // Generate asset code if not provided
      let assetCode = data.asset_code;
      if (!assetCode) {
        const categoryResult = data.category_id ? await client.query(
          'SELECT code FROM asset_categories WHERE id = $1', [data.category_id]
        ) : null;
        const categoryCode = categoryResult?.rows[0]?.code || 'AST';
        assetCode = await generateAssetCode(pool, tenantId, categoryCode);
      }
      
      // Check for duplicate asset code
      const duplicateCheck = await client.query(
        'SELECT id FROM assets WHERE tenant_id = $1 AND asset_code = $2',
        [tenantId, assetCode]
      );
      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Duplicate asset code',
          message: `Asset code ${assetCode} already exists`,
          code: 'DUPLICATE_ASSET_CODE',
        });
      }
      
      // Determine if approval is required (based on cost threshold or settings)
      const requiresApproval = data.requires_approval || 
        (data.purchase_cost && parseFloat(data.purchase_cost) > 50000); // >50k requires approval
      
      const status = requiresApproval ? 'pending_approval' : (data.status || 'active');
      const approvalStatus = requiresApproval ? 'pending' : 'not_required';
      
      const assetId = uuidv4();
      
      // Insert asset
      await client.query(`
        INSERT INTO assets (
          id, tenant_id, asset_code, name, description, category_id, asset_type,
          serial_number, model_number, manufacturer, purchase_date, purchase_cost,
          current_value, salvage_value, warranty_expiry, vendor_name, vendor_contact,
          purchase_order_number, invoice_number, location_name, department,
          assigned_to_user_id, assigned_to_name, assigned_date, status, condition,
          requires_approval, approval_status, tags, custom_fields, notes, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
        )
      `, [
        assetId, tenantId, assetCode, data.name, data.description, data.category_id,
        data.asset_type, data.serial_number, data.model_number, data.manufacturer,
        data.purchase_date, data.purchase_cost, data.purchase_cost, // current_value = purchase_cost initially
        data.salvage_value || 0, data.warranty_expiry, data.vendor_name, data.vendor_contact,
        data.purchase_order_number, data.invoice_number, data.location_name, data.department,
        data.assigned_to_user_id, data.assigned_to_name, data.assigned_date, status, data.condition || 'good',
        requiresApproval, approvalStatus, data.tags || [], data.custom_fields || '{}', data.notes, userId
      ]);
      
      // Log creation
      await logAssetAction(pool, {
        assetId,
        tenantId,
        action: 'created',
        changesJson: { ...data, asset_code: assetCode },
        performedBy: userId,
        performedByName: userName,
        performedByRole: userRole,
        ipAddress,
        userAgent,
        notes: requiresApproval ? 'Pending approval due to cost threshold' : null,
      });
      
      // If assigned, create assignment record
      if (data.assigned_to_user_id) {
        await client.query(`
          INSERT INTO asset_assignments (
            id, asset_id, tenant_id, assigned_to_user_id, assigned_to_name,
            assigned_to_department, assigned_by, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          uuidv4(), assetId, tenantId, data.assigned_to_user_id, data.assigned_to_name,
          data.department, userId, 'Initial assignment on creation'
        ]);
        
        await logAssetAction(pool, {
          assetId,
          tenantId,
          action: 'assigned',
          fieldName: 'assigned_to_user_id',
          newValue: data.assigned_to_name || data.assigned_to_user_id,
          performedBy: userId,
          performedByName: userName,
          performedByRole: userRole,
          ipAddress,
          userAgent,
        });
      }
      
      await client.query('COMMIT');
      
      // Fetch created asset
      const createdAsset = await pool.query(`
        SELECT a.*, ac.name as category_name
        FROM assets a
        LEFT JOIN asset_categories ac ON ac.id = a.category_id
        WHERE a.id = $1
      `, [assetId]);
      
      res.status(201).json({
        success: true,
        message: requiresApproval 
          ? 'Asset created and pending approval'
          : 'Asset created successfully',
        data: createdAsset.rows[0],
        limits: req.assetLimits,
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[POST /api/assets] Error:', error);
      res.status(500).json({ error: 'Failed to create asset', details: error.message });
    } finally {
      client.release();
    }
  }
);

// ============================================================================
// PUT /api/assets/:id - Update asset
// ============================================================================

router.put('/:id', authMiddleware, checkAssetPermission('EDIT_ASSET'), async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.legacy_id || req.user?.id;
    const userName = req.user?.name || req.user?.email || 'Unknown';
    const userRole = req.user?.role || 'Unknown';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Check asset exists and belongs to tenant
    const existing = await client.query(
      'SELECT * FROM assets WHERE id = $1 AND tenant_id = $2 AND is_deleted = false',
      [id, tenantId]
    );
    
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    const oldAsset = existing.rows[0];
    
    // Check if pending approval - can't edit until approved/rejected
    if (oldAsset.approval_status === 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Asset pending approval',
        message: 'This asset is pending approval and cannot be edited.',
        code: 'PENDING_APPROVAL',
      });
    }
    
    const data = req.body;
    
    // Validate
    const validationErrors = validateAssetData(data, true);
    if (validationErrors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }
    
    // Track changes
    const changes = {};
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    const trackableFields = [
      'name', 'description', 'category_id', 'asset_type', 'serial_number',
      'model_number', 'manufacturer', 'purchase_date', 'purchase_cost',
      'current_value', 'salvage_value', 'warranty_expiry', 'vendor_name',
      'location_name', 'department', 'assigned_to_user_id', 'assigned_to_name',
      'status', 'condition', 'notes'
    ];
    
    for (const field of trackableFields) {
      if (data[field] !== undefined && data[field] !== oldAsset[field]) {
        changes[field] = { old: oldAsset[field], new: data[field] };
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(data[field]);
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No changes detected' });
    }
    
    // Add metadata
    updateFields.push(`updated_at = NOW()`);
    updateFields.push(`updated_by = $${paramIndex}`);
    updateValues.push(userId);
    paramIndex++;
    
    updateValues.push(id);
    updateValues.push(tenantId);
    
    await client.query(`
      UPDATE assets SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    `, updateValues);
    
    // Log update
    await logAssetAction(pool, {
      assetId: id,
      tenantId,
      action: 'updated',
      changesJson: changes,
      performedBy: userId,
      performedByName: userName,
      performedByRole: userRole,
      ipAddress,
      userAgent,
    });
    
    // Handle assignment change
    if (changes.assigned_to_user_id) {
      // Close old assignment
      await client.query(`
        UPDATE asset_assignments SET returned_at = NOW(), is_active = false
        WHERE asset_id = $1 AND is_active = true
      `, [id]);
      
      // Create new assignment
      if (data.assigned_to_user_id) {
        await client.query(`
          INSERT INTO asset_assignments (
            id, asset_id, tenant_id, assigned_to_user_id, assigned_to_name,
            assigned_to_department, assigned_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          uuidv4(), id, tenantId, data.assigned_to_user_id, data.assigned_to_name,
          data.department, userId
        ]);
      }
      
      await logAssetAction(pool, {
        assetId: id,
        tenantId,
        action: changes.assigned_to_user_id.old ? 'transferred' : 'assigned',
        fieldName: 'assigned_to_user_id',
        oldValue: changes.assigned_to_user_id.old?.toString(),
        newValue: changes.assigned_to_user_id.new?.toString(),
        performedBy: userId,
        performedByName: userName,
        performedByRole: userRole,
        ipAddress,
        userAgent,
      });
    }
    
    await client.query('COMMIT');
    
    // Fetch updated asset
    const updated = await pool.query(`
      SELECT a.*, ac.name as category_name
      FROM assets a
      LEFT JOIN asset_categories ac ON ac.id = a.category_id
      WHERE a.id = $1
    `, [id]);
    
    res.json({
      success: true,
      message: 'Asset updated successfully',
      data: updated.rows[0],
      changes: Object.keys(changes),
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[PUT /api/assets/:id] Error:', error);
    res.status(500).json({ error: 'Failed to update asset', details: error.message });
  } finally {
    client.release();
  }
});

// ============================================================================
// DELETE /api/assets/:id - Soft delete asset
// ============================================================================

router.delete('/:id', authMiddleware, checkAssetPermission('DELETE_ASSET'), async (req, res) => {
  const pool = getPool();
  
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.legacy_id || req.user?.id;
    const userName = req.user?.name || req.user?.email || 'Unknown';
    const userRole = req.user?.role || 'Unknown';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const result = await pool.query(`
      UPDATE assets SET 
        is_deleted = true, 
        deleted_at = NOW(), 
        deleted_by = $1,
        status = 'disposed'
      WHERE id = $2 AND tenant_id = $3 AND is_deleted = false
      RETURNING id, name, asset_code
    `, [userId, id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    await logAssetAction(pool, {
      assetId: id,
      tenantId,
      action: 'deleted',
      performedBy: userId,
      performedByName: userName,
      performedByRole: userRole,
      ipAddress,
      userAgent,
    });
    
    res.json({
      success: true,
      message: 'Asset deleted successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('[DELETE /api/assets/:id] Error:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// ============================================================================
// POST /api/assets/:id/approve - Approve pending asset
// ============================================================================

router.post('/:id/approve', authMiddleware, checkAssetPermission('APPROVE_ASSET'), async (req, res) => {
  const pool = getPool();
  
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.legacy_id || req.user?.id;
    const userName = req.user?.name || req.user?.email || 'Unknown';
    const userRole = req.user?.role || 'Unknown';
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const result = await pool.query(`
      UPDATE assets SET 
        status = 'active',
        approval_status = 'approved',
        approved_by = $1,
        approved_at = NOW(),
        approval_notes = $2,
        updated_at = NOW(),
        updated_by = $1
      WHERE id = $3 AND tenant_id = $4 AND approval_status = 'pending'
      RETURNING id, name, asset_code
    `, [userId, notes, id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found or not pending approval' });
    }
    
    await logAssetAction(pool, {
      assetId: id,
      tenantId,
      action: 'approved',
      fieldName: 'approval_status',
      oldValue: 'pending',
      newValue: 'approved',
      performedBy: userId,
      performedByName: userName,
      performedByRole: userRole,
      ipAddress,
      userAgent,
      notes,
    });
    
    res.json({
      success: true,
      message: 'Asset approved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('[POST /api/assets/:id/approve] Error:', error);
    res.status(500).json({ error: 'Failed to approve asset' });
  }
});

// ============================================================================
// POST /api/assets/:id/reject - Reject pending asset
// ============================================================================

router.post('/:id/reject', authMiddleware, checkAssetPermission('APPROVE_ASSET'), async (req, res) => {
  const pool = getPool();
  
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.legacy_id || req.user?.id;
    const userName = req.user?.name || req.user?.email || 'Unknown';
    const userRole = req.user?.role || 'Unknown';
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    if (!notes) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const result = await pool.query(`
      UPDATE assets SET 
        status = 'draft',
        approval_status = 'rejected',
        approved_by = $1,
        approved_at = NOW(),
        approval_notes = $2,
        updated_at = NOW(),
        updated_by = $1
      WHERE id = $3 AND tenant_id = $4 AND approval_status = 'pending'
      RETURNING id, name, asset_code
    `, [userId, notes, id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found or not pending approval' });
    }
    
    await logAssetAction(pool, {
      assetId: id,
      tenantId,
      action: 'rejected',
      fieldName: 'approval_status',
      oldValue: 'pending',
      newValue: 'rejected',
      performedBy: userId,
      performedByName: userName,
      performedByRole: userRole,
      ipAddress,
      userAgent,
      notes,
    });
    
    res.json({
      success: true,
      message: 'Asset rejected',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('[POST /api/assets/:id/reject] Error:', error);
    res.status(500).json({ error: 'Failed to reject asset' });
  }
});

// ============================================================================
// POST /api/assets/validate-code - Check if asset code is unique
// ============================================================================

router.post('/validate-code', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { asset_code, exclude_id } = req.body;
    const tenantId = req.user?.tenant_id;
    
    if (!asset_code) {
      return res.status(400).json({ error: 'Asset code is required' });
    }
    
    let query = 'SELECT id FROM assets WHERE tenant_id = $1 AND asset_code = $2 AND is_deleted = false';
    const params = [tenantId, asset_code];
    
    if (exclude_id) {
      query += ' AND id != $3';
      params.push(exclude_id);
    }
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      isUnique: result.rows.length === 0,
      message: result.rows.length === 0 ? 'Asset code is available' : 'Asset code already exists',
    });
  } catch (error) {
    console.error('[POST /api/assets/validate-code] Error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// ============================================================================
// GET /api/assets/:id/history - Get asset history
// ============================================================================

router.get('/:id/history', authMiddleware, checkAssetPermission('VIEW_ASSET'), async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const result = await pool.query(`
      SELECT * FROM asset_history
      WHERE asset_id = $1 AND tenant_id = $2
      ORDER BY performed_at DESC
      LIMIT $3 OFFSET $4
    `, [id, tenantId, parseInt(limit), offset]);
    
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM asset_history WHERE asset_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
      },
    });
  } catch (error) {
    console.error('[GET /api/assets/:id/history] Error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
