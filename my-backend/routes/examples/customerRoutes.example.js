/**
 * Customer Routes with Zod Validation
 * 
 * Example implementation showing how to use validateBody, validateQuery, validateParams
 * with the customer schemas for BISMAN ERP.
 * 
 * This file demonstrates:
 * - Schema-based request validation
 * - Consistent error responses
 * - Type-safe request handling
 * - Indian ERP patterns (GSTIN, PAN, credit limits)
 */

const express = require('express');
const router = express.Router();
const { z } = require('zod');

// Import validation middleware
const { validateBody, validateQuery, validateParams, validate } = require('../middleware/validate');

// Import auth middleware
const { authenticate } = require('../middleware/auth');

// Import Prisma
const { getPrisma } = require('../lib/prisma');

// =============================================================================
// SCHEMAS (inline for this example - in production, import from shared/validation)
// =============================================================================

// Common schemas
const uuidSchema = z.string().uuid('Invalid ID format');
const gstinSchema = z
  .string()
  .regex(/^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN format')
  .optional()
  .or(z.literal('').transform(() => undefined));

const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format')
  .optional()
  .or(z.literal('').transform(() => undefined));

const phoneSchema = z
  .string()
  .transform(v => v.replace(/[\s-]/g, ''))
  .refine(v => !v || /^(\+91|91|0)?[6-9][0-9]{9}$/.test(v), {
    message: 'Invalid Indian phone number',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

const emailSchema = z
  .string()
  .email('Invalid email address')
  .optional()
  .or(z.literal('').transform(() => undefined));

const creditLimitSchema = z
  .number()
  .min(0, 'Credit limit cannot be negative')
  .max(100000000, 'Credit limit too high (max ₹10 crore)')
  .optional();

// Customer Create Schema
const customerCreateSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(200, 'Name too long'),
  email: emailSchema,
  phone: phoneSchema,
  gstin: gstinSchema,
  pan: panSchema,
  customerType: z.enum(['individual', 'business', 'government', 'ngo']).default('business'),
  creditLimit: creditLimitSchema,
  creditDays: z.number().int().min(0).max(365).optional(),
  billingAddress: z.object({
    line1: z.string().min(1, 'Address line 1 required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City required'),
    state: z.string().min(1, 'State required'),
    pinCode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code').optional(),
    country: z.string().default('India'),
  }).optional(),
  notes: z.string().max(1000).optional(),
});

// Customer Update Schema (all fields optional)
const customerUpdateSchema = customerCreateSchema.partial();

// Customer Query Schema (for listing)
const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  customerType: z.enum(['individual', 'business', 'government', 'ngo']).optional(),
  hasGstin: z.coerce.boolean().optional(),
  sortBy: z.string().optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Customer Params Schema
const customerParamsSchema = z.object({
  id: uuidSchema,
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/customers
 * List customers with filtering and pagination
 */
router.get(
  '/',
  authenticate,
  validateQuery(customerQuerySchema),
  async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const tenantId = req.user.tenant_id;
      const { page, limit, search, status, customerType, hasGstin, sortBy, sortOrder } = req.query;

      // Build where clause
      const where = {
        tenant_id: tenantId,
        ...(status && { status }),
        ...(customerType && { customer_type: customerType }),
        ...(hasGstin !== undefined && {
          gstin: hasGstin ? { not: null } : null,
        }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { gstin: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Get total count
      const total = await prisma.customers.count({ where });

      // Get customers
      const customers = await prisma.customers.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          gstin: true,
          customer_type: true,
          credit_limit: true,
          status: true,
          created_at: true,
        },
      });

      res.json({
        success: true,
        data: customers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/customers/:id
 * Get single customer by ID
 */
router.get(
  '/:id',
  authenticate,
  validateParams(customerParamsSchema),
  async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const tenantId = req.user.tenant_id;
      const { id } = req.params;

      const customer = await prisma.customers.findFirst({
        where: {
          id,
          tenant_id: tenantId,
        },
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      res.json({
        success: true,
        data: customer,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/customers
 * Create new customer with validation
 */
router.post(
  '/',
  authenticate,
  validateBody(customerCreateSchema),
  async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const tenantId = req.user.tenant_id;
      const userId = req.user.id;

      const {
        name,
        email,
        phone,
        gstin,
        pan,
        customerType,
        creditLimit,
        creditDays,
        billingAddress,
        notes,
      } = req.body; // Already validated and typed!

      // Check for duplicate GSTIN within tenant
      if (gstin) {
        const existing = await prisma.customers.findFirst({
          where: {
            tenant_id: tenantId,
            gstin,
          },
        });

        if (existing) {
          return res.status(400).json({
            error: 'VALIDATION_ERROR',
            statusCode: 400,
            message: 'Customer with this GSTIN already exists',
            errors: [
              {
                field: 'gstin',
                code: 'DUPLICATE',
                message: 'Customer with this GSTIN already exists',
              },
            ],
          });
        }
      }

      // Create customer
      const customer = await prisma.customers.create({
        data: {
          tenant_id: tenantId,
          name,
          email,
          phone,
          gstin,
          pan,
          customer_type: customerType,
          credit_limit: creditLimit,
          credit_days: creditDays,
          billing_address: billingAddress,
          notes,
          status: 'active',
          created_by: userId,
          created_at: new Date(),
        },
      });

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/customers/:id
 * Update customer
 */
router.put(
  '/:id',
  authenticate,
  validate({
    params: customerParamsSchema,
    body: customerUpdateSchema,
  }),
  async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const tenantId = req.user.tenant_id;
      const { id } = req.params;

      // Check customer exists
      const existing = await prisma.customers.findFirst({
        where: { id, tenant_id: tenantId },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      // Check GSTIN uniqueness if changing
      if (req.body.gstin && req.body.gstin !== existing.gstin) {
        const duplicate = await prisma.customers.findFirst({
          where: {
            tenant_id: tenantId,
            gstin: req.body.gstin,
            id: { not: id },
          },
        });

        if (duplicate) {
          return res.status(400).json({
            error: 'VALIDATION_ERROR',
            statusCode: 400,
            message: 'Another customer with this GSTIN already exists',
            errors: [
              {
                field: 'gstin',
                code: 'DUPLICATE',
                message: 'Another customer with this GSTIN already exists',
              },
            ],
          });
        }
      }

      // Update customer
      const customer = await prisma.customers.update({
        where: { id },
        data: {
          ...req.body,
          updated_at: new Date(),
        },
      });

      res.json({
        success: true,
        data: customer,
        message: 'Customer updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/customers/:id
 * Soft delete customer
 */
router.delete(
  '/:id',
  authenticate,
  validateParams(customerParamsSchema),
  async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const tenantId = req.user.tenant_id;
      const { id } = req.params;

      const customer = await prisma.customers.findFirst({
        where: { id, tenant_id: tenantId },
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      // Soft delete
      await prisma.customers.update({
        where: { id },
        data: {
          status: 'inactive',
          deleted_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
