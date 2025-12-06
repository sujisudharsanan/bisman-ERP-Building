/**
 * Common Validation Schemas for BISMAN ERP
 * 
 * Reusable validation building blocks for Indian ERP:
 * - GSTIN, PAN, Aadhaar validation
 * - Phone (Indian format), Email
 * - Amounts, quantities, dates
 * - Tenant-scoped IDs
 * 
 * These are used across frontend (React Hook Form) and backend (Express)
 */

import { z } from 'zod';

// =============================================================================
// BASIC STRING VALIDATORS
// =============================================================================

/** Non-empty required string with custom field name */
export const nonEmptyString = (fieldName: string) =>
  z.string().min(1, `${fieldName} is required`);

/** Optional string that converts empty string to undefined */
export const optionalString = z
  .string()
  .optional()
  .or(z.literal('').transform(() => undefined));

/** Code/identifier field (letters, numbers, underscore, hyphen) */
export const codeSchema = (fieldName: string) =>
  z
    .string()
    .min(2, `${fieldName} must be at least 2 characters`)
    .max(50, `${fieldName} too long`)
    .regex(/^[A-Za-z0-9_-]+$/, `${fieldName} can only contain letters, numbers, _ and -`);

// =============================================================================
// INDIAN IDENTITY VALIDATORS
// =============================================================================

/**
 * GSTIN (Goods and Services Tax Identification Number)
 * Format: 22AAAAA0000A1Z5
 * - 2 digits: State code (01-37)
 * - 10 chars: PAN
 * - 1 char: Entity number (1-9 or A-Z)
 * - 1 char: Z (default)
 * - 1 char: Checksum
 */
export const gstinSchema = z
  .string()
  .regex(
    /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/,
    'Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)'
  )
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * PAN (Permanent Account Number)
 * Format: AAAAA0000A
 * - 5 letters (first 3: random, 4th: entity type, 5th: name initial)
 * - 4 digits: sequential number
 * - 1 letter: checksum
 */
export const panSchema = z
  .string()
  .regex(
    /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    'Invalid PAN format (e.g., ABCDE1234F)'
  )
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Aadhaar Number (12 digits)
 * Format: XXXX XXXX XXXX (spaces optional)
 */
export const aadhaarSchema = z
  .string()
  .transform(v => v.replace(/\s/g, '')) // Remove spaces
  .refine(v => /^[0-9]{12}$/.test(v), {
    message: 'Aadhaar must be 12 digits',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * TAN (Tax Deduction Account Number)
 * Format: AAAA00000A
 */
export const tanSchema = z
  .string()
  .regex(
    /^[A-Z]{4}[0-9]{5}[A-Z]$/,
    'Invalid TAN format (e.g., ABCD12345E)'
  )
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// CONTACT VALIDATORS
// =============================================================================

/** Email with optional empty string handling */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .optional()
  .or(z.literal('').transform(() => undefined));

/** Required email */
export const emailRequiredSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address');

/**
 * Indian Phone Number
 * - 10 digits starting with 6-9
 * - Optional +91 or 0 prefix
 */
export const phoneSchema = z
  .string()
  .transform(v => v.replace(/[\s-]/g, '')) // Remove spaces and hyphens
  .refine(
    v => /^(\+91|91|0)?[6-9][0-9]{9}$/.test(v),
    { message: 'Invalid Indian phone number (10 digits starting with 6-9)' }
  )
  .optional()
  .or(z.literal('').transform(() => undefined));

/** Required phone number */
export const phoneRequiredSchema = z
  .string()
  .min(1, 'Phone number is required')
  .transform(v => v.replace(/[\s-]/g, ''))
  .refine(
    v => /^(\+91|91|0)?[6-9][0-9]{9}$/.test(v),
    { message: 'Invalid Indian phone number (10 digits starting with 6-9)' }
  );

/** Indian PIN Code (6 digits, first digit 1-9) */
export const pinCodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code (6 digits)')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// NUMERIC VALIDATORS
// =============================================================================

/** Amount in INR (non-negative, up to 2 decimal places) */
export const amountSchema = z
  .number()
  .min(0, 'Amount cannot be negative')
  .max(999999999999, 'Amount too large (max ₹999,999,999,999)');

/** Optional amount */
export const optionalAmountSchema = amountSchema.optional();

/** Quantity (whole number, non-negative) */
export const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .min(0, 'Quantity cannot be negative')
  .max(1000000, 'Quantity too large');

/** Percentage (0-100) */
export const percentageSchema = z
  .number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

/** Tax rate (common Indian rates: 0, 5, 12, 18, 28) */
export const taxRateSchema = z
  .number()
  .refine(
    v => [0, 5, 12, 18, 28].includes(v) || (v >= 0 && v <= 50),
    { message: 'Invalid tax rate (common: 0, 5, 12, 18, 28)' }
  );

/** Credit limit */
export const creditLimitSchema = z
  .number()
  .min(0, 'Credit limit cannot be negative')
  .max(100000000, 'Credit limit too high (max ₹10 crore)')
  .optional();

// =============================================================================
// DATE VALIDATORS
// =============================================================================

/** ISO date string (YYYY-MM-DD or full ISO) */
export const dateSchema = z
  .string()
  .refine(v => !Number.isNaN(Date.parse(v)), {
    message: 'Invalid date format',
  });

/** Optional date */
export const optionalDateSchema = z
  .string()
  .refine(v => !v || !Number.isNaN(Date.parse(v)), {
    message: 'Invalid date format',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

/** Financial year (format: 2024-25) */
export const financialYearSchema = z
  .string()
  .regex(/^20[0-9]{2}-[0-9]{2}$/, 'Invalid financial year (e.g., 2024-25)');

// =============================================================================
// UUID & ID VALIDATORS
// =============================================================================

/** UUID v4 */
export const uuidSchema = z
  .string()
  .uuid('Invalid ID format');

/** Tenant ID (UUID) */
export const tenantIdSchema = uuidSchema.describe('Tenant ID');

/** Optional UUID */
export const optionalUuidSchema = z
  .string()
  .uuid('Invalid ID format')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// BANK ACCOUNT VALIDATORS
// =============================================================================

/** IFSC Code (11 characters: 4 letters + 0 + 6 alphanumeric) */
export const ifscSchema = z
  .string()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code (e.g., SBIN0001234)')
  .optional()
  .or(z.literal('').transform(() => undefined));

/** Bank Account Number (9-18 digits) */
export const bankAccountSchema = z
  .string()
  .regex(/^[0-9]{9,18}$/, 'Bank account must be 9-18 digits')
  .optional()
  .or(z.literal('').transform(() => undefined));

/** UPI ID */
export const upiIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/, 'Invalid UPI ID (e.g., name@bank)')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// BUSINESS DOCUMENT VALIDATORS
// =============================================================================

/** Invoice number pattern */
export const invoiceNumberSchema = z
  .string()
  .min(1, 'Invoice number is required')
  .max(50, 'Invoice number too long')
  .regex(/^[A-Za-z0-9/-]+$/, 'Invoice number can only contain letters, numbers, / and -');

/** HSN Code (4, 6, or 8 digits) */
export const hsnCodeSchema = z
  .string()
  .regex(/^[0-9]{4}([0-9]{2})?([0-9]{2})?$/, 'HSN code must be 4, 6, or 8 digits')
  .optional()
  .or(z.literal('').transform(() => undefined));

/** SAC Code (6 digits for services) */
export const sacCodeSchema = z
  .string()
  .regex(/^[0-9]{6}$/, 'SAC code must be 6 digits')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// ADDRESS SCHEMA
// =============================================================================

export const addressSchema = z.object({
  line1: nonEmptyString('Address line 1'),
  line2: optionalString,
  city: nonEmptyString('City'),
  state: nonEmptyString('State'),
  pinCode: pinCodeSchema,
  country: z.string().default('India'),
});

export const optionalAddressSchema = z.object({
  line1: optionalString,
  line2: optionalString,
  city: optionalString,
  state: optionalString,
  pinCode: pinCodeSchema,
  country: z.string().optional().default('India'),
}).optional();

// =============================================================================
// STATUS ENUMS
// =============================================================================

export const activeStatusSchema = z.enum(['active', 'inactive', 'suspended']);
export const documentStatusSchema = z.enum(['draft', 'pending', 'approved', 'rejected', 'cancelled']);
export const paymentStatusSchema = z.enum(['unpaid', 'partial', 'paid', 'overdue']);
export const invoiceTypeSchema = z.enum(['sale', 'purchase', 'credit_note', 'debit_note']);

// =============================================================================
// PAGINATION SCHEMA
// =============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Address = z.infer<typeof addressSchema>;
export type OptionalAddress = z.infer<typeof optionalAddressSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type ActiveStatus = z.infer<typeof activeStatusSchema>;
export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type InvoiceType = z.infer<typeof invoiceTypeSchema>;
