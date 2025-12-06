/**
 * Vendor Validation Schema
 *
 * Uses shared building blocks from commonSchemas.
 *
 * @module libs/shared/validation/vendorSchema
 */

import { z } from 'zod';
import {
  nonEmptyString,
  emailSchema,
  phoneSchema,
  gstinSchema,
  panSchema,
  tanSchema,
  addressSchema,
  creditDaysSchema,
  vendorTypeSchema,
  statusSchema,
  paymentTermsSchema,
  notesSchema,
  optionalCodeSchema,
  tenantIdSchema,
  ifscCodeSchema,
  bankAccountSchema,
  gstinPanStateRefinement,
} from './commonSchemas';

// =============================================================================
// VENDOR CREATE SCHEMA
// =============================================================================

/**
 * Bank details for vendor payments
 */
export const vendorBankDetailsSchema = z.object({
  accountHolderName: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  accountNumber: bankAccountSchema,
  ifscCode: ifscCodeSchema,
  branchName: z.string().max(100).optional(),
});

/**
 * Schema for creating a new vendor
 */
export const vendorCreateSchema = z
  .object({
    // Basic Information
    name: nonEmptyString('Vendor name').max(200, 'Name too long (max 200 characters)'),
    vendorType: vendorTypeSchema.default('distributor'),
    code: optionalCodeSchema('Vendor code'),

    // Contact Information
    email: emailSchema,
    phone: phoneSchema,
    alternatePhone: phoneSchema,
    website: z.string().url().optional().or(z.literal('').transform(() => undefined)),

    // Tax Information
    gstin: gstinSchema,
    pan: panSchema,
    tan: tanSchema,
    isMsme: z.boolean().default(false),
    msmeNumber: z.string().max(30).optional().or(z.literal('').transform(() => undefined)),

    // Payment Terms
    paymentTerms: paymentTermsSchema.default('net_30'),
    creditDays: creditDaysSchema,

    // Bank Details
    bankDetails: vendorBankDetailsSchema.optional(),

    // Addresses
    billingAddress: addressSchema,
    shippingAddress: addressSchema.optional(),

    // Additional
    contactPerson: z.string().max(100).optional(),
    notes: notesSchema,
    tags: z.array(z.string().max(50)).max(20).optional(),

    // TDS
    tdsApplicable: z.boolean().default(false),
    tdsSection: z.string().max(20).optional(),
    tdsRate: z.number().min(0).max(100).optional(),

    // Status
    isActive: z.boolean().default(true),
  })
  .superRefine(gstinPanStateRefinement);

/**
 * Schema for updating a vendor
 */
export const vendorUpdateSchema = vendorCreateSchema.partial().extend({
  id: z.number().int().positive(),
});

/**
 * Schema for vendor list filters
 */
export const vendorListFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  vendorType: vendorTypeSchema.optional(),
  status: statusSchema.optional(),
  hasGstin: z.boolean().optional(),
  isMsme: z.boolean().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'vendorType']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Tenant-scoped vendor create schema
 */
export const tenantVendorCreateSchema = vendorCreateSchema.extend({
  tenantId: tenantIdSchema,
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type VendorBankDetails = z.infer<typeof vendorBankDetailsSchema>;
export type VendorCreateInput = z.infer<typeof vendorCreateSchema>;
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;
export type VendorListFilters = z.infer<typeof vendorListFiltersSchema>;
export type TenantVendorCreateInput = z.infer<typeof tenantVendorCreateSchema>;

export default {
  vendorBankDetailsSchema,
  vendorCreateSchema,
  vendorUpdateSchema,
  vendorListFiltersSchema,
  tenantVendorCreateSchema,
};
