/**
 * Customer Validation Schema (CommonJS)
 *
 * Uses shared building blocks from commonSchemas.
 *
 * @module my-backend/schemas/customerSchema
 */

const { z } = require('zod');
const {
  nonEmptyString,
  emailSchema,
  phoneSchema,
  gstinSchema,
  panSchema,
  addressSchema,
  creditLimitSchema,
  creditDaysSchema,
  customerTypeSchema,
  statusSchema,
  notesSchema,
  optionalCodeSchema,
  tenantIdSchema,
  gstinPanStateRefinement,
} = require('./commonSchemas');

// =============================================================================
// CUSTOMER CREATE SCHEMA
// =============================================================================

const customerCreateSchema = z
  .object({
    // Basic Information
    name: nonEmptyString('Customer name').max(200, 'Name too long (max 200 characters)'),
    customerType: customerTypeSchema.default('business'),
    code: optionalCodeSchema('Customer code'),

    // Contact Information
    email: emailSchema,
    phone: phoneSchema,
    alternatePhone: phoneSchema,
    website: z.string().url().optional().or(z.literal('').transform(() => undefined)),

    // Tax Information
    gstin: gstinSchema,
    pan: panSchema,

    // Credit Terms
    creditLimit: creditLimitSchema,
    creditDays: creditDaysSchema,

    // Addresses
    billingAddress: addressSchema,
    shippingAddress: addressSchema.optional(),
    sameAsShipping: z.boolean().default(true),

    // Additional
    contactPerson: z.string().max(100).optional(),
    notes: notesSchema,
    tags: z.array(z.string().max(50)).max(20).optional(),

    // Status
    isActive: z.boolean().default(true),
  })
  .superRefine(gstinPanStateRefinement);

const customerUpdateSchema = customerCreateSchema.partial().extend({
  id: z.number().int().positive(),
});

const customerListFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  customerType: customerTypeSchema.optional(),
  status: statusSchema.optional(),
  hasGstin: z.boolean().optional(),
  minCreditLimit: z.number().min(0).optional(),
  maxCreditLimit: z.number().max(100000000).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'creditLimit', 'customerType']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const tenantCustomerCreateSchema = customerCreateSchema.extend({
  tenantId: tenantIdSchema,
});

// ID param schema for routes
const customerIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid customer ID'),
});

module.exports = {
  customerCreateSchema,
  customerUpdateSchema,
  customerListFiltersSchema,
  tenantCustomerCreateSchema,
  customerIdParamSchema,
};
