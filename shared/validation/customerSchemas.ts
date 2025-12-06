/**
 * Customer Validation Schemas for BISMAN ERP
 * 
 * Schemas for customer/party master data with Indian ERP specifics:
 * - GSTIN, PAN validation
 * - Multiple addresses (billing, shipping)
 * - Credit management
 * - Bank details
 */

import { z } from 'zod';
import {
  nonEmptyString,
  optionalString,
  emailSchema,
  emailRequiredSchema,
  phoneSchema,
  phoneRequiredSchema,
  gstinSchema,
  panSchema,
  tanSchema,
  addressSchema,
  optionalAddressSchema,
  creditLimitSchema,
  ifscSchema,
  bankAccountSchema,
  upiIdSchema,
  uuidSchema,
  tenantIdSchema,
  activeStatusSchema,
  paginationSchema,
} from './commonSchemas';

// =============================================================================
// CUSTOMER CREATE SCHEMA
// =============================================================================

export const customerCreateSchema = z.object({
  // Required fields
  name: nonEmptyString('Customer name')
    .max(200, 'Name too long (max 200 characters)'),
  
  // Contact info
  email: emailSchema,
  phone: phoneSchema,
  alternatePhone: phoneSchema,
  website: optionalString,
  
  // Indian tax identifiers
  gstin: gstinSchema,
  pan: panSchema,
  tan: tanSchema,
  
  // Classification
  customerType: z.enum(['individual', 'business', 'government', 'ngo']).default('business'),
  creditRating: z.enum(['A', 'B', 'C', 'D']).optional(),
  
  // Credit management
  creditLimit: creditLimitSchema,
  creditDays: z.number().int().min(0).max(365).optional(),
  
  // Addresses
  billingAddress: addressSchema.optional(),
  shippingAddress: optionalAddressSchema,
  
  // Bank details for payments
  bankDetails: z.object({
    bankName: optionalString,
    accountNumber: bankAccountSchema,
    ifscCode: ifscSchema,
    branchName: optionalString,
    upiId: upiIdSchema,
  }).optional(),
  
  // Additional info
  notes: z.string().max(1000, 'Notes too long').optional(),
  tags: z.array(z.string()).max(20).optional(),
});

// =============================================================================
// CUSTOMER UPDATE SCHEMA
// =============================================================================

export const customerUpdateSchema = customerCreateSchema.partial().extend({
  status: activeStatusSchema.optional(),
});

// =============================================================================
// CUSTOMER QUERY SCHEMA (for GET /customers)
// =============================================================================

export const customerQuerySchema = paginationSchema.extend({
  status: activeStatusSchema.optional(),
  customerType: z.enum(['individual', 'business', 'government', 'ngo']).optional(),
  creditRating: z.enum(['A', 'B', 'C', 'D']).optional(),
  hasGstin: z.coerce.boolean().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

// =============================================================================
// CUSTOMER PARAMS SCHEMA
// =============================================================================

export const customerParamsSchema = z.object({
  id: uuidSchema,
});

// =============================================================================
// TYPE EXPORTS (inferred from schemas)
// =============================================================================

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
export type CustomerParams = z.infer<typeof customerParamsSchema>;
