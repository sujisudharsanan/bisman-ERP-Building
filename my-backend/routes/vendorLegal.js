/**
 * ============================================================================
 * BISMAN ERP - Vendor Legal Master API Routes
 * ============================================================================
 * 
 * Comprehensive vendor management API with:
 * - Full CRUD operations
 * - RBAC permission enforcement
 * - Multi-step onboarding
 * - Approval workflow
 * - Document management
 * - Risk assessment
 * - Audit logging
 * 
 * @module routes/vendorLegal
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../middleware/database');
const { authorizeAny } = require('../middleware/authorize');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// AUTHORIZATION: Page codes that grant access to vendor legal operations
// ============================================================================

// These page codes control access to vendor legal endpoints
// Users with ANY of these pages can access vendor operations
const VENDOR_VIEW_PAGES = [
  'COMPLIANCE_VENDOR_LEGAL',     // Dedicated vendor legal page
  'VENDOR_CUSTOMER_MASTER_LEGAL', // Alternative page code
  'COMPLIANCE_DASHBOARD',         // Compliance dashboard includes vendor view
  'PROCUREMENT_VENDOR_MASTER',    // Procurement vendor master
  'VENDOR_MASTER',                // Generic vendor master
  'ADMIN_DASHBOARD',              // Admins have full access
  'SYSTEM_ADMIN_DASHBOARD'        // System admins have full access
];

const VENDOR_EDIT_PAGES = [
  'COMPLIANCE_VENDOR_LEGAL',
  'VENDOR_CUSTOMER_MASTER_LEGAL',
  'PROCUREMENT_VENDOR_MASTER',
  'VENDOR_MASTER',
  'ADMIN_DASHBOARD',
  'SYSTEM_ADMIN_DASHBOARD'
];

// Roles that always have access (operations/admin roles)
const VENDOR_ALLOWED_ROLES = [
  'SUPER_ADMIN', 'ADMIN', 'ADMIN_OPS', 'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN',
  'OPERATIONS_MANAGER', 'PROCUREMENT_OFFICER', 'COMPLIANCE_OFFICER',
  'CFO', 'FINANCE_CONTROLLER', 'HUB_INCHARGE', 'BRANCH_MANAGER'
];

/**
 * Role-based authorization middleware for vendor operations
 * Allows access if user has any of the required pages OR is in allowed roles
 */
function authorizeVendor(operation = 'view') {
  return async (req, res, next) => {
    const userRole = req.user?.role?.toUpperCase();
    
    // Check if user is in allowed roles
    if (userRole && VENDOR_ALLOWED_ROLES.includes(userRole)) {
      console.log(`[VendorAuth] ALLOW: role=${userRole} has direct access`);
      return next();
    }
    
    // Fall back to page-based authorization
    const pages = operation === 'view' ? VENDOR_VIEW_PAGES : VENDOR_EDIT_PAGES;
    return authorizeAny(pages, operation)(req, res, next);
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/* eslint-disable no-unused-vars */
// These constants are kept for documentation and future expansion

const VENDOR_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BLACKLISTED: 'blacklisted',
  ARCHIVED: 'archived'
};

const APPROVAL_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  LEGAL_REVIEW: 'legal_review',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

const DOCUMENT_TYPES = {
  INCORPORATION_CERTIFICATE: { code: 'incorporation_certificate', mandatory: true },
  GST_CERTIFICATE: { code: 'gst_certificate', mandatory: true },
  PAN_CARD: { code: 'pan_card', mandatory: true },
  BANK_PROOF: { code: 'bank_proof', mandatory: true },
  NDA: { code: 'nda', mandatory: false },
  ISO_CERTIFICATE: { code: 'iso_certificate', mandatory: false },
  INSURANCE: { code: 'insurance', mandatory: false }
};

// ============================================================================
// FILE UPLOAD CONFIG
// ============================================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/vendors'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique vendor code
 */
async function generateVendorCode(pool, tenantId) {
  const result = await pool.query(`
    SELECT COUNT(*) + 1 as next_num 
    FROM vendor_legal 
    WHERE tenant_id = $1
  `, [tenantId]);
  
  const year = new Date().getFullYear().toString().slice(-2);
  const nextNum = result.rows[0].next_num.toString().padStart(5, '0');
  return `VND-${year}-${nextNum}`;
}

/**
 * Calculate risk level based on various factors
 * @deprecated Reserved for future AI-based risk scoring
 */
 
function calculateRiskLevel(vendorData, riskAssessment) {
  let score = 50; // Base score
  
  // GST verification
  if (vendorData.gst_number && vendorData.is_verified) score -= 10;
  
  // Document completeness
  if (riskAssessment?.document_count >= 4) score -= 10;
  
  // Background check
  if (riskAssessment?.background_check_status === 'completed') score -= 15;
  
  // Blacklist/Watchlist
  if (riskAssessment?.is_on_blacklist) score += 50;
  if (riskAssessment?.is_on_watchlist) score += 25;
  
  // Previous violations
  if (riskAssessment?.violation_count > 0) {
    score += riskAssessment.violation_count * 10;
  }
  
  // Determine level
  if (score <= 25) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 75) return 'high';
  return 'critical';
}

/**
 * Log audit event
 */
async function logAuditEvent(pool, data) {
  await pool.query(`
    INSERT INTO vendor_audit_logs (
      vendor_id, tenant_id, action, action_category,
      actor_id, actor_name, actor_role, actor_email,
      entity_type, entity_id, field_name, old_value, new_value,
      change_summary, ip_address, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
  `, [
    data.vendorId, data.tenantId, data.action, data.category || 'data',
    data.actorId, data.actorName, data.actorRole, data.actorEmail,
    data.entityType || 'vendor', data.entityId, data.fieldName,
    data.oldValue, data.newValue, JSON.stringify(data.changeSummary || {}),
    data.ipAddress, JSON.stringify(data.metadata || {})
  ]);
}

/**
 * Validate vendor data
 */
function validateVendorData(data, isUpdate = false) {
  const errors = [];
  
  if (!isUpdate) {
    if (!data.legal_name?.trim()) {
      errors.push({ field: 'legal_name', message: 'Legal name is required', code: 'REQUIRED' });
    }
  }
  
  if (data.legal_name && data.legal_name.length > 255) {
    errors.push({ field: 'legal_name', message: 'Legal name must be less than 255 characters', code: 'TOO_LONG' });
  }
  
  // GST validation (Indian format)
  if (data.gst_number) {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(data.gst_number)) {
      errors.push({ field: 'gst_number', message: 'Invalid GST format', code: 'INVALID_FORMAT' });
    }
  }
  
  // PAN validation
  if (data.pan_number) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(data.pan_number)) {
      errors.push({ field: 'pan_number', message: 'Invalid PAN format', code: 'INVALID_FORMAT' });
    }
  }
  
  // Email validation
  if (data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push({ field: 'email', message: 'Invalid email format', code: 'INVALID_FORMAT' });
    }
  }
  
  // Phone validation
  if (data.phone) {
    const phoneRegex = /^[+]?[0-9]{10,15}$/;
    if (!phoneRegex.test(data.phone.replace(/[\s-]/g, ''))) {
      errors.push({ field: 'phone', message: 'Invalid phone format', code: 'INVALID_FORMAT' });
    }
  }
  
  // Annual turnover
  if (data.annual_turnover && data.annual_turnover < 0) {
    errors.push({ field: 'annual_turnover', message: 'Annual turnover cannot be negative', code: 'NEGATIVE_VALUE' });
  }
  
  // Credit limit
  if (data.credit_limit && data.credit_limit < 0) {
    errors.push({ field: 'credit_limit', message: 'Credit limit cannot be negative', code: 'NEGATIVE_VALUE' });
  }
  
  // Credit days
  if (data.credit_days && (data.credit_days < 0 || data.credit_days > 365)) {
    errors.push({ field: 'credit_days', message: 'Credit days must be between 0 and 365', code: 'OUT_OF_RANGE' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// DASHBOARD & STATISTICS
// ============================================================================

/**
 * GET /stats/summary
 * Get vendor dashboard statistics
 */
router.get('/stats/summary', authorizeVendor('view'), async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.user.tenant_id;
    
    // Get counts by status
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_vendors,
        COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) AS active_vendors,
        COUNT(*) FILTER (WHERE approval_status = 'pending' AND deleted_at IS NULL) AS pending_verification,
        COUNT(*) FILTER (WHERE compliance_score < 50 AND deleted_at IS NULL) AS non_compliant_vendors,
        COUNT(*) FILTER (WHERE risk_level IN ('high', 'critical') AND deleted_at IS NULL) AS high_risk_vendors,
        COUNT(*) FILTER (WHERE status = 'suspended' AND deleted_at IS NULL) AS suspended_vendors,
        COUNT(*) FILTER (WHERE is_msme = true AND deleted_at IS NULL) AS msme_vendors,
        COUNT(*) FILTER (WHERE is_verified = true AND deleted_at IS NULL) AS verified_vendors
      FROM vendor_legal
      WHERE tenant_id = $1
    `, [tenantId]);
    
    // Get risk distribution
    const riskDist = await pool.query(`
      SELECT risk_level, COUNT(*) as count
      FROM vendor_legal
      WHERE tenant_id = $1 AND deleted_at IS NULL
      GROUP BY risk_level
    `, [tenantId]);
    
    // Get industry distribution (top 5)
    const industryDist = await pool.query(`
      SELECT ic.name as industry, COUNT(*) as count
      FROM vendor_legal v
      LEFT JOIN vendor_industry_categories ic ON ic.id = v.industry_id
      WHERE v.tenant_id = $1 AND v.deleted_at IS NULL AND ic.name IS NOT NULL
      GROUP BY ic.name
      ORDER BY count DESC
      LIMIT 5
    `, [tenantId]);
    
    // Get pending approvals by stage
    const pendingApprovals = await pool.query(`
      SELECT workflow_stage, COUNT(*) as count
      FROM vendor_approvals
      WHERE tenant_id = $1 AND is_current = true AND decision = 'pending'
      GROUP BY workflow_stage
    `, [tenantId]);
    
    // Get expiring documents (next 30 days)
    const expiringDocs = await pool.query(`
      SELECT COUNT(*) as count
      FROM vendor_documents
      WHERE tenant_id = $1 
        AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        AND is_active = true
    `, [tenantId]);
    
    res.json({
      success: true,
      data: {
        summary: stats.rows[0],
        riskDistribution: riskDist.rows.reduce((acc, r) => {
          acc[r.risk_level] = parseInt(r.count);
          return acc;
        }, {}),
        industryDistribution: industryDist.rows,
        pendingApprovals: pendingApprovals.rows,
        expiringDocuments: parseInt(expiringDocs.rows[0]?.count || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics', message: error.message });
  }
});

// ============================================================================
// LOOKUP DATA
// ============================================================================

/**
 * GET /lookups/business-types
 */
router.get('/lookups/business-types', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT id, code, name 
      FROM vendor_business_types 
      WHERE is_active = true 
      ORDER BY sort_order, name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching business types:', error);
    res.status(500).json({ error: 'Failed to fetch business types' });
  }
});

/**
 * GET /lookups/industries
 */
router.get('/lookups/industries', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT id, code, name, parent_id
      FROM vendor_industry_categories 
      WHERE is_active = true 
      ORDER BY sort_order, name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching industries:', error);
    res.status(500).json({ error: 'Failed to fetch industries' });
  }
});

// ============================================================================
// VENDOR CRUD OPERATIONS
// ============================================================================

/**
 * GET /
 * List vendors with filters, search, pagination
 */
router.get('/', authorizeVendor('view'), async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.user.tenant_id;
    const {
      search,
      status,
      approval_status,
      risk_level,
      industry_id,
      is_msme,
      is_verified,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [tenantId];
    let paramIndex = 2;
    
    // Build WHERE clause
    let whereClause = 'WHERE v.tenant_id = $1 AND v.deleted_at IS NULL';
    
    if (search) {
      whereClause += ` AND (
        v.legal_name ILIKE $${paramIndex} OR
        v.trade_name ILIKE $${paramIndex} OR
        v.vendor_code ILIKE $${paramIndex} OR
        v.gst_number ILIKE $${paramIndex} OR
        v.registration_number ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status) {
      whereClause += ` AND v.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (approval_status) {
      whereClause += ` AND v.approval_status = $${paramIndex}`;
      params.push(approval_status);
      paramIndex++;
    }
    
    if (risk_level) {
      whereClause += ` AND v.risk_level = $${paramIndex}`;
      params.push(risk_level);
      paramIndex++;
    }
    
    if (industry_id) {
      whereClause += ` AND v.industry_id = $${paramIndex}`;
      params.push(parseInt(industry_id));
      paramIndex++;
    }
    
    if (is_msme === 'true') {
      whereClause += ` AND v.is_msme = true`;
    }
    
    if (is_verified === 'true') {
      whereClause += ` AND v.is_verified = true`;
    }
    
    // Validate sort column
    const allowedSortColumns = ['created_at', 'legal_name', 'vendor_code', 'status', 'risk_level', 'compliance_score'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    // Count query
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM vendor_legal v
      ${whereClause}
    `, params);
    
    // Main query
    const result = await pool.query(`
      SELECT 
        v.id, v.vendor_code, v.legal_name, v.trade_name,
        v.gst_number, v.pan_number, v.registration_number,
        v.status, v.approval_status, v.risk_level, v.compliance_score,
        v.is_active, v.is_verified, v.is_msme, v.last_audit_date,
        v.created_at, v.updated_at,
        bt.name AS business_type,
        ic.name AS industry,
        (SELECT json_build_object('name', vc.name, 'email', vc.email, 'phone', vc.phone)
         FROM vendor_contacts vc 
         WHERE vc.vendor_id = v.id AND vc.is_primary = true 
         LIMIT 1) AS primary_contact,
        (SELECT va.city || ', ' || va.state
         FROM vendor_addresses va 
         WHERE va.vendor_id = v.id AND va.address_type = 'registered' 
         LIMIT 1) AS location,
        (SELECT COUNT(*) FROM vendor_documents vd WHERE vd.vendor_id = v.id AND vd.is_active = true) AS document_count
      FROM vendor_legal v
      LEFT JOIN vendor_business_types bt ON bt.id = v.business_type_id
      LEFT JOIN vendor_industry_categories ic ON ic.id = v.industry_id
      ${whereClause}
      ORDER BY v.${sortColumn} ${sortDir}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), offset]);
    
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listing vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors', message: error.message });
  }
});

/**
 * GET /:id
 * Get vendor details with all related data
 */
router.get('/:id', authorizeVendor('view'), async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    
    // Main vendor data
    const vendorResult = await pool.query(`
      SELECT v.*, 
        bt.name AS business_type_name, bt.code AS business_type_code,
        ic.name AS industry_name, ic.code AS industry_code
      FROM vendor_legal v
      LEFT JOIN vendor_business_types bt ON bt.id = v.business_type_id
      LEFT JOIN vendor_industry_categories ic ON ic.id = v.industry_id
      WHERE v.id = $1 AND v.tenant_id = $2 AND v.deleted_at IS NULL
    `, [id, tenantId]);
    
    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const vendor = vendorResult.rows[0];
    
    // Fetch related data in parallel
    const [contacts, addresses, documents, banks, riskAssessments, approvals, recentAudit] = await Promise.all([
      pool.query(`SELECT * FROM vendor_contacts WHERE vendor_id = $1 AND is_active = true ORDER BY is_primary DESC, created_at`, [id]),
      pool.query(`SELECT * FROM vendor_addresses WHERE vendor_id = $1 AND is_active = true ORDER BY is_primary DESC, created_at`, [id]),
      pool.query(`SELECT * FROM vendor_documents WHERE vendor_id = $1 AND is_active = true ORDER BY created_at DESC`, [id]),
      pool.query(`SELECT * FROM vendor_banks WHERE vendor_id = $1 AND is_active = true ORDER BY is_primary DESC, created_at`, [id]),
      pool.query(`SELECT * FROM vendor_risk_assessments WHERE vendor_id = $1 ORDER BY assessment_date DESC LIMIT 5`, [id]),
      pool.query(`SELECT * FROM vendor_approvals WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]),
      pool.query(`SELECT * FROM vendor_audit_logs WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 20`, [id])
    ]);
    
    res.json({
      success: true,
      data: {
        ...vendor,
        contacts: contacts.rows,
        addresses: addresses.rows,
        documents: documents.rows,
        banks: banks.rows,
        riskAssessments: riskAssessments.rows,
        approvals: approvals.rows,
        recentAudit: recentAudit.rows
      }
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor', message: error.message });
  }
});

/**
 * POST /
 * Create new vendor
 */
router.post('/', authorizeVendor('edit'), async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userName = req.user.name || req.user.email;
    const data = req.body;
    
    // Validate
    const validation = validateVendorData(data);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    // Check for duplicates
    if (data.gst_number) {
      const existingGst = await client.query(
        `SELECT id FROM vendor_legal WHERE tenant_id = $1 AND gst_number = $2 AND deleted_at IS NULL`,
        [tenantId, data.gst_number]
      );
      if (existingGst.rows.length > 0) {
        return res.status(400).json({ error: 'A vendor with this GST number already exists' });
      }
    }
    
    if (data.pan_number) {
      const existingPan = await client.query(
        `SELECT id FROM vendor_legal WHERE tenant_id = $1 AND pan_number = $2 AND deleted_at IS NULL`,
        [tenantId, data.pan_number]
      );
      if (existingPan.rows.length > 0) {
        return res.status(400).json({ error: 'A vendor with this PAN number already exists' });
      }
    }
    
    // Generate vendor code
    const vendorCode = await generateVendorCode(client, tenantId);
    
    // Insert vendor
    const insertResult = await client.query(`
      INSERT INTO vendor_legal (
        tenant_id, vendor_code, legal_name, trade_name, business_type_id,
        registration_number, gst_number, pan_number, cin_number, tin_number,
        incorporation_date, country, state, industry_id, services_products,
        annual_turnover, company_size, website, primary_market,
        is_msme, msme_number, msme_category,
        status, approval_status, risk_level,
        default_payment_terms, credit_limit, credit_days,
        tds_applicable, tds_section, tds_rate,
        notes, tags, custom_fields,
        created_by, created_by_name
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34, $35, $36
      )
      RETURNING id
    `, [
      tenantId, vendorCode, data.legal_name, data.trade_name, data.business_type_id,
      data.registration_number, data.gst_number, data.pan_number, data.cin_number, data.tin_number,
      data.incorporation_date, data.country || 'India', data.state, data.industry_id, data.services_products,
      data.annual_turnover, data.company_size, data.website, data.primary_market,
      data.is_msme || false, data.msme_number, data.msme_category,
      data.is_draft ? 'draft' : 'pending', 'pending', 'medium',
      data.default_payment_terms, data.credit_limit, data.credit_days || 30,
      data.tds_applicable || false, data.tds_section, data.tds_rate,
      data.notes, data.tags, JSON.stringify(data.custom_fields || {}),
      userId, userName
    ]);
    
    const vendorId = insertResult.rows[0].id;
    
    // Insert primary contact if provided
    if (data.primary_contact) {
      await client.query(`
        INSERT INTO vendor_contacts (
          vendor_id, tenant_id, contact_type, name, designation, email, phone, is_primary, created_by
        ) VALUES ($1, $2, 'primary', $3, $4, $5, $6, true, $7)
      `, [
        vendorId, tenantId, 
        data.primary_contact.name, data.primary_contact.designation,
        data.primary_contact.email, data.primary_contact.phone,
        userId
      ]);
    }
    
    // Insert registered address if provided
    if (data.registered_address) {
      await client.query(`
        INSERT INTO vendor_addresses (
          vendor_id, tenant_id, address_type, address_line1, address_line2,
          city, state, country, pincode, is_primary, created_by
        ) VALUES ($1, $2, 'registered', $3, $4, $5, $6, $7, $8, true, $9)
      `, [
        vendorId, tenantId,
        data.registered_address.address_line1, data.registered_address.address_line2,
        data.registered_address.city, data.registered_address.state,
        data.registered_address.country || 'India', data.registered_address.pincode,
        userId
      ]);
    }
    
    // Insert bank details if provided
    if (data.bank_details) {
      await client.query(`
        INSERT INTO vendor_banks (
          vendor_id, tenant_id, bank_name, branch_name, account_holder_name,
          account_number, account_type, ifsc_code, swift_code, upi_id, is_primary, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
      `, [
        vendorId, tenantId,
        data.bank_details.bank_name, data.bank_details.branch_name, data.bank_details.account_holder_name,
        data.bank_details.account_number, data.bank_details.account_type || 'current',
        data.bank_details.ifsc_code, data.bank_details.swift_code, data.bank_details.upi_id,
        userId
      ]);
    }
    
    // Create initial approval workflow entry
    if (!data.is_draft) {
      await client.query(`
        INSERT INTO vendor_approvals (
          vendor_id, tenant_id, workflow_stage, stage_order, request_type,
          requested_by, requested_by_name, decision, due_date
        ) VALUES ($1, $2, 'pending_review', 1, 'new', $3, $4, 'pending', NOW() + INTERVAL '7 days')
      `, [vendorId, tenantId, userId, userName]);
    }
    
    // Audit log
    await logAuditEvent(client, {
      vendorId,
      tenantId,
      action: 'created',
      category: 'data',
      actorId: userId,
      actorName: userName,
      actorRole: req.user.role,
      actorEmail: req.user.email,
      changeSummary: { vendor_code: vendorCode, legal_name: data.legal_name },
      ipAddress: req.ip
    });
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: data.is_draft 
        ? 'Vendor saved as draft' 
        : 'Vendor created and submitted for approval',
      data: { id: vendorId, vendor_code: vendorCode }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor', message: error.message });
  } finally {
    client.release();
  }
});

/**
 * PUT /:id
 * Update vendor
 */
router.put('/:id', authorizeVendor('edit'), async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userName = req.user.name || req.user.email;
    const data = req.body;
    
    // Check vendor exists
    const existingVendor = await client.query(
      `SELECT * FROM vendor_legal WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    
    if (existingVendor.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const oldVendor = existingVendor.rows[0];
    
    // Validate
    const validation = validateVendorData(data, true);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    // Check for duplicate GST/PAN with other vendors
    if (data.gst_number && data.gst_number !== oldVendor.gst_number) {
      const existingGst = await client.query(
        `SELECT id FROM vendor_legal WHERE tenant_id = $1 AND gst_number = $2 AND id != $3 AND deleted_at IS NULL`,
        [tenantId, data.gst_number, id]
      );
      if (existingGst.rows.length > 0) {
        return res.status(400).json({ error: 'A vendor with this GST number already exists' });
      }
    }
    
    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'legal_name', 'trade_name', 'business_type_id', 'registration_number',
      'gst_number', 'pan_number', 'cin_number', 'tin_number', 'incorporation_date',
      'country', 'state', 'industry_id', 'services_products', 'annual_turnover',
      'company_size', 'website', 'primary_market', 'is_msme', 'msme_number',
      'msme_category', 'default_payment_terms', 'credit_limit', 'credit_days',
      'tds_applicable', 'tds_section', 'tds_rate', 'notes', 'tags', 'risk_level'
    ];
    
    const changes = {};
    
    for (const field of allowedFields) {
      if (data[field] !== undefined && data[field] !== oldVendor[field]) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(data[field]);
        changes[field] = { old: oldVendor[field], new: data[field] };
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No changes to update' });
    }
    
    // Add updated_by fields
    updateFields.push(`updated_by = $${paramIndex}`, `updated_by_name = $${paramIndex + 1}`);
    updateValues.push(userId, userName);
    paramIndex += 2;
    
    // If vendor was approved and is being edited, reset to pending approval
    if (oldVendor.status === 'active' || oldVendor.status === 'approved') {
      updateFields.push(`approval_status = 'pending'`);
    }
    
    // Execute update
    updateValues.push(id, tenantId);
    await client.query(`
      UPDATE vendor_legal
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    `, updateValues);
    
    // Audit log
    await logAuditEvent(client, {
      vendorId: id,
      tenantId,
      action: 'updated',
      category: 'data',
      actorId: userId,
      actorName: userName,
      actorRole: req.user.role,
      actorEmail: req.user.email,
      changeSummary: changes,
      ipAddress: req.ip
    });
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Vendor updated successfully',
      changes: Object.keys(changes)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor', message: error.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE /:id
 * Soft delete vendor
 */
router.delete('/:id', authorizeVendor('delete'), async (req, res) => {
  const pool = getPool();
  
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userName = req.user.name || req.user.email;
    
    const result = await pool.query(`
      UPDATE vendor_legal
      SET deleted_at = NOW(), status = 'archived', is_active = false,
          updated_by = $3, updated_by_name = $4
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING id, vendor_code
    `, [id, tenantId, userId, userName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // Audit log
    await logAuditEvent(pool, {
      vendorId: id,
      tenantId,
      action: 'deleted',
      category: 'status',
      actorId: userId,
      actorName: userName,
      actorRole: req.user.role,
      actorEmail: req.user.email,
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      message: 'Vendor archived successfully'
    });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor', message: error.message });
  }
});

// ============================================================================
// WORKFLOW ACTIONS
// ============================================================================

/**
 * POST /:id/submit
 * Submit vendor for approval
 */
router.post('/:id/submit', authorizeVendor('edit'), async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userName = req.user.name || req.user.email;
    
    // Check vendor exists and is in draft status
    const vendor = await client.query(
      `SELECT * FROM vendor_legal WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    
    if (vendor.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    if (vendor.rows[0].status !== 'draft') {
      return res.status(400).json({ error: 'Only draft vendors can be submitted' });
    }
    
    // Update status
    await client.query(`
      UPDATE vendor_legal
      SET status = 'pending', approval_status = 'pending',
          updated_by = $3, updated_by_name = $4
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId, userId, userName]);
    
    // Create approval workflow entry
    await client.query(`
      INSERT INTO vendor_approvals (
        vendor_id, tenant_id, workflow_stage, stage_order, request_type,
        requested_by, requested_by_name, decision, due_date
      ) VALUES ($1, $2, 'pending_review', 1, 'new', $3, $4, 'pending', NOW() + INTERVAL '7 days')
    `, [id, tenantId, userId, userName]);
    
    // Audit log
    await logAuditEvent(client, {
      vendorId: id,
      tenantId,
      action: 'submitted',
      category: 'status',
      actorId: userId,
      actorName: userName,
      actorRole: req.user.role,
      actorEmail: req.user.email,
      oldValue: 'draft',
      newValue: 'pending',
      ipAddress: req.ip
    });
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Vendor submitted for approval'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting vendor:', error);
    res.status(500).json({ error: 'Failed to submit vendor', message: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /:id/approve
 * Approve vendor
 */
router.post('/:id/approve', authorizeVendor('edit'), async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { remarks } = req.body;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userName = req.user.name || req.user.email;
    
    // Check vendor exists
    const vendor = await client.query(
      `SELECT * FROM vendor_legal WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    
    if (vendor.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    if (vendor.rows[0].approval_status === 'approved') {
      return res.status(400).json({ error: 'Vendor is already approved' });
    }
    
    // Update vendor status
    await client.query(`
      UPDATE vendor_legal
      SET status = 'active', approval_status = 'approved', is_verified = true,
          updated_by = $3, updated_by_name = $4
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId, userId, userName]);
    
    // Update current approval workflow entry
    await client.query(`
      UPDATE vendor_approvals
      SET decision = 'approved', decision_date = NOW(), remarks = $4,
          approver_id = $5, approver_name = $6, is_completed = true
      WHERE vendor_id = $1 AND tenant_id = $2 AND is_current = true AND decision = 'pending'
    `, [id, tenantId, remarks, userId, userName]);
    
    // Audit log
    await logAuditEvent(client, {
      vendorId: id,
      tenantId,
      action: 'approved',
      category: 'approval',
      actorId: userId,
      actorName: userName,
      actorRole: req.user.role,
      actorEmail: req.user.email,
      oldValue: vendor.rows[0].approval_status,
      newValue: 'approved',
      metadata: { remarks },
      ipAddress: req.ip
    });
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Vendor approved and activated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving vendor:', error);
    res.status(500).json({ error: 'Failed to approve vendor', message: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /:id/reject
 * Reject vendor
 */
router.post('/:id/reject', authorizeVendor('edit'), async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { remarks } = req.body;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userName = req.user.name || req.user.email;
    
    if (!remarks?.trim()) {
      return res.status(400).json({ error: 'Rejection remarks are required' });
    }
    
    // Check vendor exists
    const vendor = await client.query(
      `SELECT * FROM vendor_legal WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    
    if (vendor.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // Update vendor status
    await client.query(`
      UPDATE vendor_legal
      SET approval_status = 'rejected',
          updated_by = $3, updated_by_name = $4
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId, userId, userName]);
    
    // Update approval workflow
    await client.query(`
      UPDATE vendor_approvals
      SET decision = 'rejected', decision_date = NOW(), remarks = $3,
          approver_id = $4, approver_name = $5, is_completed = true
      WHERE vendor_id = $1 AND tenant_id = $2 AND is_current = true AND decision = 'pending'
    `, [id, tenantId, remarks, userId, userName]);
    
    // Audit log
    await logAuditEvent(client, {
      vendorId: id,
      tenantId,
      action: 'rejected',
      category: 'approval',
      actorId: userId,
      actorName: userName,
      actorRole: req.user.role,
      actorEmail: req.user.email,
      oldValue: vendor.rows[0].approval_status,
      newValue: 'rejected',
      metadata: { remarks },
      ipAddress: req.ip
    });
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Vendor rejected'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting vendor:', error);
    res.status(500).json({ error: 'Failed to reject vendor', message: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /:id/suspend
 * Suspend vendor
 */
router.post('/:id/suspend', authorizeVendor('edit'), async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { reason } = req.body;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userName = req.user.name || req.user.email;
    
    if (!reason?.trim()) {
      return res.status(400).json({ error: 'Suspension reason is required' });
    }
    
    // Update vendor
    const result = await client.query(`
      UPDATE vendor_legal
      SET status = 'suspended', is_active = false,
          notes = COALESCE(notes, '') || E'\n[SUSPENDED] ' || $3,
          updated_by = $4, updated_by_name = $5
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING id, status
    `, [id, tenantId, reason, userId, userName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // Audit log
    await logAuditEvent(client, {
      vendorId: id,
      tenantId,
      action: 'suspended',
      category: 'status',
      actorId: userId,
      actorName: userName,
      actorRole: req.user.role,
      actorEmail: req.user.email,
      newValue: 'suspended',
      metadata: { reason },
      ipAddress: req.ip
    });
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Vendor suspended'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error suspending vendor:', error);
    res.status(500).json({ error: 'Failed to suspend vendor', message: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /:id/reactivate
 * Reactivate suspended vendor
 */
router.post('/:id/reactivate', authorizeVendor('edit'), async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { remarks } = req.body;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userName = req.user.name || req.user.email;
    
    // Update vendor
    const result = await client.query(`
      UPDATE vendor_legal
      SET status = 'active', is_active = true,
          updated_by = $3, updated_by_name = $4
      WHERE id = $1 AND tenant_id = $2 AND status = 'suspended' AND deleted_at IS NULL
      RETURNING id
    `, [id, tenantId, userId, userName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found or not suspended' });
    }
    
    // Audit log
    await logAuditEvent(client, {
      vendorId: id,
      tenantId,
      action: 'reactivated',
      category: 'status',
      actorId: userId,
      actorName: userName,
      actorRole: req.user.role,
      actorEmail: req.user.email,
      oldValue: 'suspended',
      newValue: 'active',
      metadata: { remarks },
      ipAddress: req.ip
    });
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Vendor reactivated'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reactivating vendor:', error);
    res.status(500).json({ error: 'Failed to reactivate vendor', message: error.message });
  } finally {
    client.release();
  }
});

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * POST /:id/documents
 * Upload vendor document
 */
router.post('/:id/documents', authorizeVendor('edit'), upload.single('file'), async (req, res) => {
  const pool = getPool();
  
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userName = req.user.name || req.user.email;
    const { document_type, document_name, document_number, issue_date, expiry_date } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!document_type) {
      return res.status(400).json({ error: 'Document type is required' });
    }
    
    // Verify vendor exists
    const vendor = await pool.query(
      `SELECT id FROM vendor_legal WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    
    if (vendor.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // Calculate file hash
    const fileBuffer = require('fs').readFileSync(req.file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Insert document record
    const result = await pool.query(`
      INSERT INTO vendor_documents (
        vendor_id, tenant_id, document_type, document_name, document_number,
        file_name, file_path, file_size, mime_type, file_hash,
        issue_date, expiry_date, is_mandatory,
        uploaded_by, uploaded_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
      id, tenantId, document_type, document_name || req.file.originalname, document_number,
      req.file.filename, req.file.path, req.file.size, req.file.mimetype, fileHash,
      issue_date, expiry_date,
      DOCUMENT_TYPES[document_type.toUpperCase()]?.mandatory || false,
      userId, userName
    ]);
    
    // Audit log
    await logAuditEvent(pool, {
      vendorId: id,
      tenantId,
      action: 'document_uploaded',
      category: 'document',
      actorId: userId,
      actorName: userName,
      actorRole: req.user.role,
      actorEmail: req.user.email,
      entityType: 'document',
      entityId: result.rows[0].id,
      metadata: { document_type, file_name: req.file.originalname },
      ipAddress: req.ip
    });
    
    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { id: result.rows[0].id }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document', message: error.message });
  }
});

/**
 * DELETE /:id/documents/:docId
 * Remove document
 */
router.delete('/:id/documents/:docId', authorizeVendor('edit'), async (req, res) => {
  const pool = getPool();
  
  try {
    const { id, docId } = req.params;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userName = req.user.name || req.user.email;
    
    const result = await pool.query(`
      UPDATE vendor_documents
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND vendor_id = $2 AND tenant_id = $3
      RETURNING id, document_type
    `, [docId, id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Audit log
    await logAuditEvent(pool, {
      vendorId: id,
      tenantId,
      action: 'document_deleted',
      category: 'document',
      actorId: userId,
      actorName: userName,
      actorRole: req.user.role,
      actorEmail: req.user.email,
      entityType: 'document',
      entityId: docId,
      metadata: { document_type: result.rows[0].document_type },
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      message: 'Document removed'
    });
  } catch (error) {
    console.error('Error removing document:', error);
    res.status(500).json({ error: 'Failed to remove document', message: error.message });
  }
});

// ============================================================================
// CONTACTS MANAGEMENT
// ============================================================================

/**
 * POST /:id/contacts
 * Add vendor contact
 */
router.post('/:id/contacts', authorizeVendor('edit'), async (req, res) => {
  const pool = getPool();
  
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const data = req.body;
    
    // Verify vendor exists
    const vendor = await pool.query(
      `SELECT id FROM vendor_legal WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    
    if (vendor.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // If this is primary, unset existing primary
    if (data.is_primary) {
      await pool.query(
        `UPDATE vendor_contacts SET is_primary = false WHERE vendor_id = $1`,
        [id]
      );
    }
    
    const result = await pool.query(`
      INSERT INTO vendor_contacts (
        vendor_id, tenant_id, contact_type, name, designation, department,
        email, phone, alternate_phone, is_primary, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      id, tenantId, data.contact_type || 'secondary',
      data.name, data.designation, data.department,
      data.email, data.phone, data.alternate_phone,
      data.is_primary || false, userId
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Contact added',
      data: { id: result.rows[0].id }
    });
  } catch (error) {
    console.error('Error adding contact:', error);
    res.status(500).json({ error: 'Failed to add contact', message: error.message });
  }
});

// ============================================================================
// ADDRESSES MANAGEMENT
// ============================================================================

/**
 * POST /:id/addresses
 * Add vendor address
 */
router.post('/:id/addresses', authorizeVendor('edit'), async (req, res) => {
  const pool = getPool();
  
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const data = req.body;
    
    // Verify vendor exists
    const vendor = await pool.query(
      `SELECT id FROM vendor_legal WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    
    if (vendor.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const result = await pool.query(`
      INSERT INTO vendor_addresses (
        vendor_id, tenant_id, address_type, address_line1, address_line2,
        landmark, city, district, state, country, pincode,
        latitude, longitude, is_primary, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
      id, tenantId, data.address_type || 'operational',
      data.address_line1, data.address_line2, data.landmark,
      data.city, data.district, data.state, data.country || 'India', data.pincode,
      data.latitude, data.longitude, data.is_primary || false, userId
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Address added',
      data: { id: result.rows[0].id }
    });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ error: 'Failed to add address', message: error.message });
  }
});

// ============================================================================
// BANKS MANAGEMENT
// ============================================================================

/**
 * POST /:id/banks
 * Add vendor bank account
 */
router.post('/:id/banks', authorizeVendor('edit'), async (req, res) => {
  const pool = getPool();
  
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const data = req.body;
    
    // Verify vendor exists
    const vendor = await pool.query(
      `SELECT id FROM vendor_legal WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    
    if (vendor.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // Validate required bank fields
    if (!data.bank_name || !data.account_holder_name || !data.account_number || !data.ifsc_code) {
      return res.status(400).json({ error: 'Bank name, account holder, account number, and IFSC are required' });
    }
    
    // If this is primary, unset existing primary
    if (data.is_primary) {
      await pool.query(
        `UPDATE vendor_banks SET is_primary = false WHERE vendor_id = $1`,
        [id]
      );
    }
    
    const result = await pool.query(`
      INSERT INTO vendor_banks (
        vendor_id, tenant_id, bank_name, branch_name, account_holder_name,
        account_number, account_type, ifsc_code, swift_code, micr_code,
        upi_id, is_primary, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      id, tenantId, data.bank_name, data.branch_name, data.account_holder_name,
      data.account_number, data.account_type || 'current', data.ifsc_code,
      data.swift_code, data.micr_code, data.upi_id,
      data.is_primary || false, userId
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Bank account added',
      data: { id: result.rows[0].id }
    });
  } catch (error) {
    console.error('Error adding bank account:', error);
    res.status(500).json({ error: 'Failed to add bank account', message: error.message });
  }
});

// ============================================================================
// VALIDATION ENDPOINTS
// ============================================================================

/**
 * POST /validate/gst
 * Validate GST number uniqueness
 */
router.post('/validate/gst', async (req, res) => {
  try {
    const pool = getPool();
    const { gst_number, vendor_id } = req.body;
    const tenantId = req.user.tenant_id;
    
    if (!gst_number) {
      return res.status(400).json({ error: 'GST number is required' });
    }
    
    let query = `
      SELECT id FROM vendor_legal 
      WHERE tenant_id = $1 AND gst_number = $2 AND deleted_at IS NULL
    `;
    const params = [tenantId, gst_number];
    
    if (vendor_id) {
      query += ` AND id != $3`;
      params.push(vendor_id);
    }
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      isUnique: result.rows.length === 0,
      message: result.rows.length === 0 ? 'GST number is available' : 'GST number already exists'
    });
  } catch (error) {
    console.error('Error validating GST:', error);
    res.status(500).json({ error: 'Validation failed', message: error.message });
  }
});

/**
 * POST /validate/pan
 * Validate PAN number uniqueness
 */
router.post('/validate/pan', async (req, res) => {
  try {
    const pool = getPool();
    const { pan_number, vendor_id } = req.body;
    const tenantId = req.user.tenant_id;
    
    if (!pan_number) {
      return res.status(400).json({ error: 'PAN number is required' });
    }
    
    let query = `
      SELECT id FROM vendor_legal 
      WHERE tenant_id = $1 AND pan_number = $2 AND deleted_at IS NULL
    `;
    const params = [tenantId, pan_number];
    
    if (vendor_id) {
      query += ` AND id != $3`;
      params.push(vendor_id);
    }
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      isUnique: result.rows.length === 0,
      message: result.rows.length === 0 ? 'PAN number is available' : 'PAN number already exists'
    });
  } catch (error) {
    console.error('Error validating PAN:', error);
    res.status(500).json({ error: 'Validation failed', message: error.message });
  }
});

// ============================================================================
// AUDIT HISTORY
// ============================================================================

/**
 * GET /:id/history
 * Get vendor audit history
 */
router.get('/:id/history', authorizeVendor('view'), async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const { page = 1, limit = 50 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const result = await pool.query(`
      SELECT * FROM vendor_audit_logs
      WHERE vendor_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `, [id, tenantId, parseInt(limit), offset]);
    
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM vendor_audit_logs
      WHERE vendor_id = $1 AND tenant_id = $2
    `, [id, tenantId]);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error fetching audit history:', error);
    res.status(500).json({ error: 'Failed to fetch history', message: error.message });
  }
});

// ============================================================================
// EXPORT
// ============================================================================

/**
 * GET /export
 * Export vendors to CSV
 */
router.get('/export', authorizeVendor('view'), async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.user.tenant_id;
    const { status, format = 'csv' } = req.query;
    
    let query = `
      SELECT 
        v.vendor_code, v.legal_name, v.trade_name,
        bt.name AS business_type, ic.name AS industry,
        v.gst_number, v.pan_number, v.registration_number,
        v.status, v.approval_status, v.risk_level, v.compliance_score,
        v.is_msme, v.annual_turnover, v.website,
        v.created_at, v.updated_at
      FROM vendor_legal v
      LEFT JOIN vendor_business_types bt ON bt.id = v.business_type_id
      LEFT JOIN vendor_industry_categories ic ON ic.id = v.industry_id
      WHERE v.tenant_id = $1 AND v.deleted_at IS NULL
    `;
    const params = [tenantId];
    
    if (status) {
      query += ` AND v.status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY v.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    if (format === 'json') {
      res.json({ success: true, data: result.rows });
    } else {
      // CSV format
      const headers = Object.keys(result.rows[0] || {}).join(',');
      const rows = result.rows.map(row => 
        Object.values(row).map(v => `"${v || ''}"`).join(',')
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=vendors-export-${Date.now()}.csv`);
      res.send(`${headers}\n${rows}`);
    }
  } catch (error) {
    console.error('Error exporting vendors:', error);
    res.status(500).json({ error: 'Failed to export vendors', message: error.message });
  }
});

module.exports = router;
