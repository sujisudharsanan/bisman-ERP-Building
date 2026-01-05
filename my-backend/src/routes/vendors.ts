/**
 * Vendor (Non-Privileged User) API Routes
 * Handles CRUD operations for vendors, building owners, and creditors
 * 
 * Routes:
 * - POST   /api/vendors              - Create new vendor
 * - GET    /api/vendors              - List vendors with filters
 * - GET    /api/vendors/:id          - Get vendor details
 * - PUT    /api/vendors/:id          - Update vendor
 * - DELETE /api/vendors/:id          - Soft delete vendor
 * - GET    /api/vendors/search       - Search vendors for autocomplete
 * - GET    /api/vendors/banks        - Get Indian bank list
 * - GET    /api/vendors/ifsc/:code   - Get bank details by IFSC code
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Type definitions
interface AuthenticatedUser {
  id: string;
  role: string;
  tenant_id?: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

interface VendorRecord {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// FILE UPLOAD CONFIGURATION
// ==========================================

const VENDOR_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'vendors');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure upload directory exists
if (!fs.existsSync(VENDOR_UPLOAD_DIR)) {
  fs.mkdirSync(VENDOR_UPLOAD_DIR, { recursive: true });
}

const vendorStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VENDOR_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    cb(null, `${timestamp}-${randomStr}-${baseName}${ext}`);
  },
});

const vendorFileFilter = (req: Request, file: multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
    return cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'));
  }
  cb(null, true);
};

const vendorUpload = multer({
  storage: vendorStorage,
  limits: { fileSize: MAX_FILE_SIZE, files: 3 },
  fileFilter: vendorFileFilter,
});

// Upload fields for vendor creation
const vendorDocFields = vendorUpload.fields([
  { name: 'pan_file', maxCount: 1 },
  { name: 'supporting_doc', maxCount: 1 },
  { name: 'gst_certificate', maxCount: 1 },
]);

// Indian Bank List for autocomplete
const INDIAN_BANKS = [
  { name: 'State Bank of India', code: 'SBIN' },
  { name: 'HDFC Bank', code: 'HDFC' },
  { name: 'ICICI Bank', code: 'ICIC' },
  { name: 'Axis Bank', code: 'UTIB' },
  { name: 'Kotak Mahindra Bank', code: 'KKBK' },
  { name: 'IndusInd Bank', code: 'INDB' },
  { name: 'Yes Bank', code: 'YESB' },
  { name: 'Punjab National Bank', code: 'PUNB' },
  { name: 'Bank of Baroda', code: 'BARB' },
  { name: 'Canara Bank', code: 'CNRB' },
  { name: 'Union Bank of India', code: 'UBIN' },
  { name: 'Bank of India', code: 'BKID' },
  { name: 'Indian Bank', code: 'IDIB' },
  { name: 'Central Bank of India', code: 'CBIN' },
  { name: 'Indian Overseas Bank', code: 'IOBA' },
  { name: 'UCO Bank', code: 'UCBA' },
  { name: 'Bank of Maharashtra', code: 'MAHB' },
  { name: 'Punjab & Sind Bank', code: 'PSIB' },
  { name: 'IDBI Bank', code: 'IBKL' },
  { name: 'Federal Bank', code: 'FDRL' },
  { name: 'South Indian Bank', code: 'SIBL' },
  { name: 'Karur Vysya Bank', code: 'KVBL' },
  { name: 'City Union Bank', code: 'CIUB' },
  { name: 'Tamilnad Mercantile Bank', code: 'TMBL' },
  { name: 'DCB Bank', code: 'DCBL' },
  { name: 'RBL Bank', code: 'RATN' },
  { name: 'Bandhan Bank', code: 'BDBL' },
  { name: 'IDFC First Bank', code: 'IDFB' },
  { name: 'Jammu & Kashmir Bank', code: 'JAKA' },
  { name: 'Karnataka Bank', code: 'KARB' },
  { name: 'Lakshmi Vilas Bank', code: 'LAVB' },
  { name: 'Nainital Bank', code: 'NTBL' },
  { name: 'CSB Bank', code: 'CSBK' },
  { name: 'Dhanlaxmi Bank', code: 'DLXB' },
  { name: 'ESAF Small Finance Bank', code: 'ESAF' },
  { name: 'Equitas Small Finance Bank', code: 'ESFB' },
  { name: 'Ujjivan Small Finance Bank', code: 'UJVN' },
  { name: 'AU Small Finance Bank', code: 'AUBL' },
  { name: 'Jana Small Finance Bank', code: 'JSFB' },
  { name: 'Suryoday Small Finance Bank', code: 'SURY' },
  { name: 'Fincare Small Finance Bank', code: 'FSFB' },
  { name: 'Paytm Payments Bank', code: 'PYTM' },
  { name: 'Airtel Payments Bank', code: 'AIRP' },
  { name: 'India Post Payments Bank', code: 'IPOS' },
  { name: 'Fino Payments Bank', code: 'FINO' },
];

// Indian States for address
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

/**
 * Get Indian bank list for autocomplete
 * GET /api/vendors/banks
 */
router.get('/banks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { search = '' } = req.query;
    
    let banks = INDIAN_BANKS;
    
    if (search) {
      const searchLower = (search as string).toLowerCase();
      banks = INDIAN_BANKS.filter(bank => 
        bank.name.toLowerCase().includes(searchLower) ||
        bank.code.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({
      success: true,
      data: banks,
    });
  } catch (error: unknown) {
    console.error('Get banks error:', error);
    res.status(500).json({
      error: 'Failed to fetch bank list',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get Indian states for address
 * GET /api/vendors/states
 */
router.get('/states', authMiddleware, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: INDIAN_STATES,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Get states error:', err);
    res.status(500).json({
      error: 'Failed to fetch states list',
      details: err.message,
    });
  }
});

/**
 * Get bank details by IFSC code (using Razorpay IFSC API)
 * GET /api/vendors/ifsc/:code
 */
router.get('/ifsc/:code', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    // Validate IFSC format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(code.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid IFSC code format',
      });
    }
    
    // Use Razorpay's free IFSC API
    const response = await fetch(`https://ifsc.razorpay.com/${code.toUpperCase()}`);
    
    if (!response.ok) {
      return res.status(404).json({
        error: 'IFSC code not found',
      });
    }
    
    const data = await response.json() as {
      BANK: string;
      BRANCH: string;
      ADDRESS: string;
      CITY: string;
      DISTRICT: string;
      STATE: string;
      CONTACT: string | null;
      IFSC: string;
      MICR: string | null;
      SWIFT?: string;
      UPI: boolean;
    };
    
    res.json({
      success: true,
      data: {
        bank: data.BANK,
        branch: data.BRANCH,
        address: data.ADDRESS,
        city: data.CITY,
        district: data.DISTRICT,
        state: data.STATE,
        contact: data.CONTACT,
        ifsc: data.IFSC,
        micr: data.MICR,
        swift: data.SWIFT || null,
        upi: data.UPI,
      },
    });
  } catch (error) {
    console.error('IFSC lookup error:', error);
    res.status(500).json({
      error: 'Failed to lookup IFSC code',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Search vendors for autocomplete
 * GET /api/vendors/search
 */
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { q = '', limit = '10' } = req.query;
    
    if (!q || (q as string).length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Search in non_privileged_users table
    const vendors = await prisma.$queryRaw`
      SELECT 
        id,
        full_name,
        business_name,
        role_type,
        bank_name,
        account_number,
        ifsc_code,
        pan_number,
        contact_number,
        email,
        status
      FROM non_privileged_users
      WHERE deleted_at IS NULL
        AND status = 'approved'
        AND (
          full_name ILIKE ${`%${q}%`}
          OR business_name ILIKE ${`%${q}%`}
          OR account_number ILIKE ${`%${q}%`}
        )
      ORDER BY full_name ASC
      LIMIT ${parseInt(limit as string)}
    `;

    res.json({
      success: true,
      data: vendors,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Vendor search error:', err);
    res.status(500).json({
      error: 'Failed to search vendors',
      details: err.message,
    });
  }
});

/**
 * List vendors with filters
 * GET /api/vendors
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      search = '',
      role_type,
      status,
      page = '1',
      limit = '20',
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitNum = parseInt(limit as string);

    // Build WHERE conditions
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(full_name ILIKE $${paramIndex} OR business_name ILIKE $${paramIndex} OR pan_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role_type && role_type !== 'all') {
      conditions.push(`role_type = $${paramIndex}`);
      params.push(role_type as string);
      paramIndex++;
    }

    if (status && status !== 'all') {
      conditions.push(`status = $${paramIndex}`);
      params.push(status as string);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM non_privileged_users WHERE ${whereClause}`,
      ...params
    );
    const total = Number(countResult[0]?.count || 0);

    // Get vendors
    const vendors = await prisma.$queryRawUnsafe(
      `SELECT 
        id, full_name, business_name, role_type, gst_type, service_type,
        address, city, state, pincode, contact_number, email,
        bank_holder_name, bank_name, account_number, ifsc_code, upi_id,
        pan_number, gst_number, remarks, is_recurring,
        recurring_start_date, recurring_end_date, recurring_amount, recurring_frequency,
        uploaded_files, status, created_at, updated_at
      FROM non_privileged_users 
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${orderDirection}
      LIMIT ${limitNum} OFFSET ${offset}`,
      ...params
    );

    res.json({
      success: true,
      data: vendors,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('List vendors error:', err);
    res.status(500).json({
      error: 'Failed to fetch vendors',
      details: err.message,
    });
  }
});

/**
 * Get vendor by ID
 * GET /api/vendors/:id
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.user?.tenant_id;

    // SECURITY FIX: Add tenant isolation filter
    const vendors = await prisma.$queryRaw`
      SELECT * FROM non_privileged_users 
      WHERE id = ${id}::uuid 
        AND deleted_at IS NULL
        AND (${tenantId}::text IS NULL OR tenant_id = ${tenantId}::uuid)
    `;

    const vendor = (vendors as VendorRecord[])[0];

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Get vendor error:', err);
    res.status(500).json({
      error: 'Failed to fetch vendor',
      details: err.message,
    });
  }
});

/**
 * Create new vendor
 * POST /api/vendors
 */
router.post('/', authMiddleware, vendorDocFields, async (req: Request, res: Response) => {
  // Track uploaded files for cleanup
  let uploadedFilePaths: string[] = [];
  
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get uploaded files - type assertion for multer fields
    interface MulterFiles {
      pan_file?: multer.File[];
      supporting_doc?: multer.File[];
      gst_certificate?: multer.File[];
    }
    interface MulterRequest extends Request {
      files?: MulterFiles;
    }
    const files = (req as MulterRequest).files;
    const panFile = files?.pan_file?.[0];
    const supportingDoc = files?.supporting_doc?.[0];
    const gstCertificate = files?.gst_certificate?.[0];
    
    // Track file paths for cleanup on error
    if (panFile) uploadedFilePaths.push(panFile.path);
    if (supportingDoc) uploadedFilePaths.push(supportingDoc.path);
    if (gstCertificate) uploadedFilePaths.push(gstCertificate.path);

    const {
      full_name,
      business_name,
      role_type,
      gst_type,
      service_type,
      address,
      city,
      state,
      pincode,
      contact_number,
      email,
      bank_holder_name,
      bank_name,
      account_number,
      ifsc_code,
      upi_id,
      pan_number,
      aadhaar_number,
      gst_number,
      remarks,
      is_recurring = false,
      recurring_start_date,
      recurring_end_date,
      recurring_amount,
      recurring_frequency,
      has_supporting_document = false,
    } = req.body;

    // Validation
    const errors: Record<string, string> = {};

    if (!full_name?.trim()) errors.full_name = 'Full name is required';
    if (!role_type) errors.role_type = 'Role type is required';
    if (!gst_type) errors.gst_type = 'GST type is required';
    if (!service_type) errors.service_type = 'Service type is required';
    if (!address?.trim()) errors.address = 'Address is required';
    if (!city?.trim()) errors.city = 'City is required';
    if (!state?.trim()) errors.state = 'State is required';
    if (!pincode?.trim()) errors.pincode = 'Pincode is required';
    if (!contact_number?.trim()) errors.contact_number = 'Contact number is required';
    if (!bank_holder_name?.trim()) errors.bank_holder_name = 'Bank holder name is required';
    if (!bank_name?.trim()) errors.bank_name = 'Bank name is required';
    if (!account_number?.trim()) errors.account_number = 'Account number is required';
    if (!ifsc_code?.trim()) errors.ifsc_code = 'IFSC code is required';
    if (!pan_number?.trim()) errors.pan_number = 'PAN number is required';

    // PAN validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (pan_number && !panRegex.test(pan_number.toUpperCase())) {
      errors.pan_number = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    // IFSC validation
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (ifsc_code && !ifscRegex.test(ifsc_code.toUpperCase())) {
      errors.ifsc_code = 'Invalid IFSC format (e.g., HDFC0001234)';
    }

    // GST validation
    if (gst_type === 'with_gst') {
      if (!gst_number?.trim()) {
        errors.gst_number = 'GST number is required for "With GST"';
      } else {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(gst_number.toUpperCase())) {
          errors.gst_number = 'Invalid GST format';
        }
      }
    }

    // Aadhaar validation (optional)
    if (aadhaar_number) {
      const aadhaarRegex = /^\d{12}$/;
      if (!aadhaarRegex.test(aadhaar_number)) {
        errors.aadhaar_number = 'Invalid Aadhaar format (12 digits)';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    // Build uploaded_files JSON with file paths
    const uploadedFiles = {
      aadhaar_number: aadhaar_number || null,
      has_supporting_document: has_supporting_document === 'true' || has_supporting_document === true,
      pan_file: panFile ? {
        filename: panFile.filename,
        originalName: panFile.originalname,
        path: panFile.path,
        size: panFile.size,
        mimeType: panFile.mimetype,
        uploadedAt: new Date().toISOString(),
      } : null,
      supporting_doc: supportingDoc ? {
        filename: supportingDoc.filename,
        originalName: supportingDoc.originalname,
        path: supportingDoc.path,
        size: supportingDoc.size,
        mimeType: supportingDoc.mimetype,
        uploadedAt: new Date().toISOString(),
      } : null,
      gst_certificate: gstCertificate ? {
        filename: gstCertificate.filename,
        originalName: gstCertificate.originalname,
        path: gstCertificate.path,
        size: gstCertificate.size,
        mimeType: gstCertificate.mimetype,
        uploadedAt: new Date().toISOString(),
      } : null,
    };

    // Create vendor
    const result = await prisma.$queryRaw`
      INSERT INTO non_privileged_users (
        full_name, business_name, role_type, gst_type, service_type,
        address, city, state, pincode, contact_number, email,
        bank_holder_name, bank_name, account_number, ifsc_code, upi_id,
        pan_number, gst_number, remarks, is_recurring,
        recurring_start_date, recurring_end_date, recurring_amount, recurring_frequency,
        uploaded_files, hub_manager_id, created_by, status
      ) VALUES (
        ${full_name}, ${business_name || null}, ${role_type}::user_role_type, 
        ${gst_type}::gst_type, ${service_type}::service_type,
        ${address}, ${city}, ${state}, ${pincode}, ${contact_number}, ${email || null},
        ${bank_holder_name}, ${bank_name}, ${account_number}, ${ifsc_code.toUpperCase()}, ${upi_id || null},
        ${pan_number.toUpperCase()}, ${gst_number?.toUpperCase() || null}, ${remarks || null}, ${is_recurring === 'true' || is_recurring === true},
        ${recurring_start_date || null}::date, ${recurring_end_date || null}::date, 
        ${recurring_amount || null}::decimal, ${recurring_frequency || null},
        ${JSON.stringify(uploadedFiles)}::jsonb, ${userId}::uuid, ${userId}::uuid, 'pending_manager_approval'::approval_status
      )
      RETURNING *
    `;

    const vendor = (result as VendorRecord[])[0];

    res.status(201).json({
      success: true,
      data: vendor,
      message: 'Vendor created successfully. Pending approval.',
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('Create vendor error:', err);
    
    // Clean up uploaded files on error
    uploadedFilePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch { /* ignore cleanup errors */ }
    });
    
    res.status(500).json({
      error: 'Failed to create vendor',
      details: err.message,
    });
  }
});

/**
 * Update vendor
 * PUT /api/vendors/:id
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const tenantId = authReq.user?.tenant_id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updates = req.body;

    // SECURITY FIX: Check if vendor exists AND belongs to tenant
    const existingVendors = await prisma.$queryRaw`
      SELECT * FROM non_privileged_users 
      WHERE id = ${id}::uuid 
        AND deleted_at IS NULL
        AND (${tenantId}::text IS NULL OR tenant_id = ${tenantId}::uuid)
    `;

    if ((existingVendors as VendorRecord[]).length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Build update query dynamically
    const allowedFields = [
      'full_name', 'business_name', 'role_type', 'gst_type', 'service_type',
      'address', 'city', 'state', 'pincode', 'contact_number', 'email',
      'bank_holder_name', 'bank_name', 'account_number', 'ifsc_code', 'upi_id',
      'pan_number', 'gst_number', 'remarks', 'is_recurring',
      'recurring_start_date', 'recurring_end_date', 'recurring_amount', 'recurring_frequency',
      'uploaded_files'
    ];

    const updateParts: string[] = ['updated_at = NOW()'];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateParts.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (values.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);

    const result = await prisma.$queryRawUnsafe(
      `UPDATE non_privileged_users 
       SET ${updateParts.join(', ')} 
       WHERE id = $${paramIndex}::uuid AND deleted_at IS NULL
       RETURNING *`,
      ...values
    );

    const vendor = (result as VendorRecord[])[0];

    res.json({
      success: true,
      data: vendor,
      message: 'Vendor updated successfully',
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Update vendor error:', err);
    res.status(500).json({
      error: 'Failed to update vendor',
      details: err.message,
    });
  }
});

/**
 * Soft delete vendor
 * DELETE /api/vendors/:id
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await prisma.$queryRaw`
      UPDATE non_privileged_users 
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${id}::uuid AND deleted_at IS NULL
      RETURNING id
    `;

    if ((result as VendorRecord[]).length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({
      success: true,
      message: 'Vendor deleted successfully',
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Delete vendor error:', err);
    res.status(500).json({
      error: 'Failed to delete vendor',
      details: err.message,
    });
  }
});

/**
 * Check if vendor exists by account number
 * GET /api/vendors/check-account/:accountNumber
 */
router.get('/check-account/:accountNumber', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { accountNumber } = req.params;

    const vendors = await prisma.$queryRaw`
      SELECT id, full_name, business_name, bank_name, account_number, ifsc_code, status
      FROM non_privileged_users 
      WHERE account_number = ${accountNumber} AND deleted_at IS NULL
      LIMIT 1
    `;

    const vendor = (vendors as VendorRecord[])[0];

    res.json({
      success: true,
      exists: !!vendor,
      data: vendor || null,
      isFirstTime: !vendor,
      requiresProof: !vendor, // First-time vendors need supporting documents
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Check account error:', err);
    res.status(500).json({
      error: 'Failed to check account',
      details: err.message,
    });
  }
});

export default router;
