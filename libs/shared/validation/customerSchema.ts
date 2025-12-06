/**
 * Customer Validation Schema
 *
 * Uses shared building blocks from commonSchemas.
 * This schema is used by both frontend (React Hook Form) and backend (Express validation).
 *
 * @module libs/shared/validation/customerSchema
 */

import { z } from 'zod';
import {
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
} from './commonSchemas';

// =============================================================================
// CUSTOMER CREATE SCHEMA
// =============================================================================

/**
 * Schema for creating a new customer
 */
export const customerCreateSchema = z
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

/**
 * Schema for updating a customer
 */
export const customerUpdateSchema = customerCreateSchema.partial().extend({
  id: z.number().int().positive(),
});

/**
 * Schema for customer list filters
 */
export const customerListFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  customerType: customerTypeSchema.optional(),
  status: statusSchema.optional(),
  hasGstin: z.boolean().optional(),
  minCreditLimit: z.number().min(0).optional(),
  maxCreditLimit: z.number().max(100000000).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'creditLimit', 'customerType']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Tenant-scoped customer create schema
 */
export const tenantCustomerCreateSchema = customerCreateSchema.extend({
  tenantId: tenantIdSchema,
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerListFilters = z.infer<typeof customerListFiltersSchema>;
export type TenantCustomerCreateInput = z.infer<typeof tenantCustomerCreateSchema>;

export default {
  customerCreateSchema,
  customerUpdateSchema,
  customerListFiltersSchema,
  tenantCustomerCreateSchema,
};
