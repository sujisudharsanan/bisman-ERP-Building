/**
 * Shared Validation Schemas for Bisman ERP
 *
 * Reusable Zod schemas for Indian ERP patterns.
 * Use these building blocks in all entity schemas (customer, vendor, item, invoice, etc.)
 * to ensure consistency across frontend and backend.
 *
 * @module libs/shared/validation/commonSchemas
 */

import { z } from 'zod';

// =============================================================================
// PRIMITIVE SCHEMAS
// =============================================================================

/**
 * Non-empty required string with custom field name
 */
export const nonEmptyString = (fieldName: string) =>
  z.string().min(1, `${fieldName} is required`);

/**
 * Optional string that transforms empty string to undefined
 */
export const optionalString = z
  .string()
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Trimmed string (removes leading/trailing whitespace)
 */
export const trimmedString = z.string().transform((v) => v.trim());

/**
 * Uppercase string (auto-transforms to uppercase)
 */
export const uppercaseString = z.string().transform((v) => v.toUpperCase());

// =============================================================================
// CONTACT SCHEMAS
// =============================================================================

/**
 * Email - optional, validates format, transforms empty to undefined
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Required email
 */
export const requiredEmailSchema = z.string().email('Invalid email address');

/**
 * Indian phone number - 10 digits starting with 6-9
 * Strips spaces, dashes, and optional country code
 */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s\-()]/g, ''))
  .refine((v) => !v || /^(\+91|91|0)?[6-9][0-9]{9}$/.test(v), {
    message: 'Invalid Indian phone number (10 digits starting with 6-9)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Required Indian phone number
 */
export const requiredPhoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s\-()]/g, ''))
  .refine((v) => /^(\+91|91|0)?[6-9][0-9]{9}$/.test(v), {
    message: 'Invalid Indian phone number (10 digits starting with 6-9)',
  });

/**
 * International phone (10-15 digits)
 */
export const internationalPhoneSchema = z
  .string()
  .regex(/^[0-9]{10,15}$/, 'Phone must be 10–15 digits')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// INDIAN COMPLIANCE SCHEMAS
// =============================================================================

/**
 * GST State Codes mapping
 */
export const GST_STATE_CODES: Record<string, string> = {
  'Jammu and Kashmir': '01',
  'Himachal Pradesh': '02',
  Punjab: '03',
  Chandigarh: '04',
  Uttarakhand: '05',
  Haryana: '06',
  Delhi: '07',
  Rajasthan: '08',
  'Uttar Pradesh': '09',
  Bihar: '10',
  Sikkim: '11',
  'Arunachal Pradesh': '12',
  Nagaland: '13',
  Manipur: '14',
  Mizoram: '15',
  Tripura: '16',
  Meghalaya: '17',
  Assam: '18',
  'West Bengal': '19',
  Jharkhand: '20',
  Odisha: '21',
  Chhattisgarh: '22',
  'Madhya Pradesh': '23',
  Gujarat: '24',
  'Dadra and Nagar Haveli and Daman and Diu': '26',
  Maharashtra: '27',
  Karnataka: '29',
  Goa: '30',
  Lakshadweep: '31',
  Kerala: '32',
  'Tamil Nadu': '33',
  Puducherry: '34',
  'Andaman and Nicobar Islands': '35',
  Telangana: '36',
  'Andhra Pradesh': '37',
  Ladakh: '38',
};

/**
 * Indian states list
 */
export const INDIAN_STATES = Object.keys(GST_STATE_CODES);

/**
 * GSTIN - 15 character GST Identification Number
 * Format: 22AAAAA0000A1Z5
 * - 2 digits: State code
 * - 10 chars: PAN
 * - 1 digit: Entity number
 * - 1 char: Z (default)
 * - 1 char: Check digit
 */
export const gstinSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => !v || /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(v), {
    message: 'Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Required GSTIN
 */
export const requiredGstinSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(v), {
    message: 'Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)',
  });

/**
 * PAN - 10 character Permanent Account Number
 * Format: ABCDE1234F
 * - 5 letters
 * - 4 digits
 * - 1 letter
 */
export const panSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v), {
    message: 'Invalid PAN format (e.g., ABCDE1234F)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Required PAN
 */
export const requiredPanSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v), {
    message: 'Invalid PAN format (e.g., ABCDE1234F)',
  });

/**
 * TAN - Tax Deduction Account Number (10 chars)
 * Format: AAAA99999A
 */
export const tanSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => !v || /^[A-Z]{4}[0-9]{5}[A-Z]$/.test(v), {
    message: 'Invalid TAN format (e.g., AAAA99999A)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Aadhaar - 12 digit unique identification
 */
export const aadhaarSchema = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => !v || /^[2-9][0-9]{11}$/.test(v), {
    message: 'Invalid Aadhaar number (12 digits, cannot start with 0 or 1)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * HSN Code - Harmonized System of Nomenclature (4-8 digits)
 */
export const hsnCodeSchema = z
  .string()
  .regex(/^[0-9]{4,8}$/, 'HSN code must be 4-8 digits')
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * SAC Code - Service Accounting Code (6 digits)
 */
export const sacCodeSchema = z
  .string()
  .regex(/^[0-9]{6}$/, 'SAC code must be 6 digits')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// ADDRESS SCHEMAS
// =============================================================================

/**
 * Indian PIN Code - 6 digits, cannot start with 0
 */
export const pinCodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code (6 digits)')
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Required PIN Code
 */
export const requiredPinCodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code (6 digits)');

/**
 * Indian state (validated against known states)
 */
export const indianStateSchema = z.enum(INDIAN_STATES as [string, ...string[]], {
  errorMap: () => ({ message: 'Invalid Indian state' }),
});

/**
 * Address schema - complete Indian address
 */
export const addressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required').max(255),
  line2: z.string().max(255).optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pinCode: pinCodeSchema,
  country: z.string().max(100).default('India'),
});

/**
 * Optional address schema
 */
export const optionalAddressSchema = addressSchema.partial();

// =============================================================================
// NUMERIC SCHEMAS
// =============================================================================

/**
 * Amount/Price - non-negative, max ₹99,99,99,999.99 (100 crore)
 */
export const amountSchema = z
  .number()
  .min(0, 'Amount cannot be negative')
  .max(9999999999.99, 'Amount too large (max ₹100 crore)');

/**
 * Coerced amount (from string input)
 */
export const coercedAmountSchema = z.coerce
  .number()
  .min(0, 'Amount cannot be negative')
  .max(9999999999.99, 'Amount too large (max ₹100 crore)');

/**
 * Optional amount
 */
export const optionalAmountSchema = z.coerce
  .number()
  .min(0)
  .max(9999999999.99)
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Quantity - non-negative integer
 */
export const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .min(0, 'Quantity cannot be negative')
  .max(99999999, 'Quantity too large');

/**
 * Coerced quantity
 */
export const coercedQuantitySchema = z.coerce
  .number()
  .int('Quantity must be a whole number')
  .min(0, 'Quantity cannot be negative')
  .max(99999999, 'Quantity too large');

/**
 * Decimal quantity (for weight, volume, etc.)
 */
export const decimalQuantitySchema = z
  .number()
  .min(0, 'Quantity cannot be negative')
  .max(99999999.999, 'Quantity too large');

/**
 * Percentage - 0 to 100
 */
export const percentageSchema = z
  .number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

/**
 * Discount percentage - 0 to 100
 */
export const discountPercentSchema = z
  .number()
  .min(0, 'Discount cannot be negative')
  .max(100, 'Discount cannot exceed 100%');

/**
 * GST rate - common Indian GST rates
 */
export const gstRateSchema = z.enum(['0', '0.25', '3', '5', '12', '18', '28'], {
  errorMap: () => ({ message: 'Invalid GST rate. Valid: 0, 0.25, 3, 5, 12, 18, 28' }),
});

/**
 * Credit limit - max ₹10 crore
 */
export const creditLimitSchema = z.coerce
  .number()
  .min(0, 'Credit limit cannot be negative')
  .max(100000000, 'Credit limit too high (max ₹10 crore)')
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Credit days - 0 to 365
 */
export const creditDaysSchema = z.coerce
  .number()
  .int('Credit days must be a whole number')
  .min(0, 'Credit days cannot be negative')
  .max(365, 'Credit days cannot exceed 365')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// DATE SCHEMAS
// =============================================================================

/**
 * Date string (ISO format)
 */
export const dateSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'Invalid date format',
  });

/**
 * Optional date
 */
export const optionalDateSchema = z
  .string()
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
    message: 'Invalid date format',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Date object or string
 */
export const dateOrStringSchema = z.union([z.date(), dateSchema]);

/**
 * Financial year (e.g., "2024-25")
 */
export const financialYearSchema = z
  .string()
  .regex(/^[0-9]{4}-[0-9]{2}$/, 'Financial year format: YYYY-YY (e.g., 2024-25)');

// =============================================================================
// CODE/IDENTIFIER SCHEMAS
// =============================================================================

/**
 * Generic code field - alphanumeric with underscore and hyphen
 */
export const codeSchema = (fieldName: string) =>
  z
    .string()
    .min(2, `${fieldName} must be at least 2 characters`)
    .max(50, `${fieldName} too long (max 50 characters)`)
    .regex(/^[A-Za-z0-9_-]+$/, `${fieldName} can only contain letters, numbers, _ and -`);

/**
 * SKU/Item code
 */
export const skuSchema = z
  .string()
  .min(1, 'SKU is required')
  .max(50, 'SKU too long (max 50 characters)')
  .regex(/^[A-Za-z0-9_-]+$/, 'SKU can only contain letters, numbers, _ and -');

/**
 * Optional code
 */
export const optionalCodeSchema = (fieldName: string) =>
  z
    .string()
    .max(50, `${fieldName} too long`)
    .regex(/^[A-Za-z0-9_-]*$/, `${fieldName} can only contain letters, numbers, _ and -`)
    .optional()
    .or(z.literal('').transform(() => undefined));

/**
 * Document number (invoice, PO, etc.)
 */
export const documentNumberSchema = z
  .string()
  .min(1, 'Document number is required')
  .max(50, 'Document number too long')
  .regex(/^[A-Za-z0-9/_-]+$/, 'Document number can only contain letters, numbers, /, _ and -');

/**
 * UUID
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Optional UUID
 */
export const optionalUuidSchema = z
  .string()
  .uuid('Invalid UUID format')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

/**
 * Customer types
 */
export const customerTypeSchema = z.enum(['individual', 'business', 'government', 'ngo'], {
  errorMap: () => ({ message: 'Invalid customer type' }),
});

/**
 * Vendor types
 */
export const vendorTypeSchema = z.enum(['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service_provider'], {
  errorMap: () => ({ message: 'Invalid vendor type' }),
});

/**
 * Entity status
 */
export const statusSchema = z.enum(['active', 'inactive', 'blocked', 'pending'], {
  errorMap: () => ({ message: 'Invalid status' }),
});

/**
 * Document status
 */
export const documentStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected', 'cancelled', 'posted'], {
  errorMap: () => ({ message: 'Invalid document status' }),
});

/**
 * Payment terms
 */
export const paymentTermsSchema = z.enum(['immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'custom'], {
  errorMap: () => ({ message: 'Invalid payment terms' }),
});

/**
 * Unit of measurement
 */
export const uomSchema = z.enum([
  'NOS', 'PCS', 'KGS', 'GMS', 'LTR', 'ML', 'MTR', 'CM', 'MM',
  'SQM', 'SQFT', 'CBM', 'BOX', 'CTN', 'SET', 'PAC', 'ROL', 'BAG', 'OTH'
], {
  errorMap: () => ({ message: 'Invalid unit of measurement' }),
});

// =============================================================================
// BANK SCHEMAS
// =============================================================================

/**
 * IFSC Code - 11 characters
 */
export const ifscCodeSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v), {
    message: 'Invalid IFSC code (e.g., SBIN0001234)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Bank account number (9-18 digits)
 */
export const bankAccountSchema = z
  .string()
  .regex(/^[0-9]{9,18}$/, 'Bank account must be 9-18 digits')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// UTILITY SCHEMAS
// =============================================================================

/**
 * Notes/Description - max 1000 chars
 */
export const notesSchema = z
  .string()
  .max(1000, 'Notes too long (max 1000 characters)')
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Short description - max 255 chars
 */
export const shortDescriptionSchema = z
  .string()
  .max(255, 'Description too long (max 255 characters)')
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Long description - max 5000 chars
 */
export const longDescriptionSchema = z
  .string()
  .max(5000, 'Description too long (max 5000 characters)')
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * URL
 */
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Tags array
 */
export const tagsSchema = z.array(z.string().max(50)).max(20, 'Too many tags (max 20)').optional();

// =============================================================================
// TENANT SCOPING
// =============================================================================

/**
 * Tenant ID (UUID)
 */
export const tenantIdSchema = z.string().uuid('Invalid tenant ID');

/**
 * Base schema with tenant scoping - extend this for multi-tenant entities
 */
export const tenantScopedSchema = z.object({
  tenantId: tenantIdSchema,
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract PAN from GSTIN
 */
export function extractPanFromGstin(gstin: string): string {
  return gstin.substring(2, 12);
}

/**
 * Extract state code from GSTIN
 */
export function extractStateCodeFromGstin(gstin: string): string {
  return gstin.substring(0, 2);
}

/**
 * Get state name from GSTIN
 */
export function getStateFromGstin(gstin: string): string | undefined {
  const code = extractStateCodeFromGstin(gstin);
  return Object.entries(GST_STATE_CODES).find(([, v]) => v === code)?.[0];
}

/**
 * Validate GSTIN state code matches address state
 */
export function validateGstinState(gstin: string, state: string): boolean {
  const gstStateCode = extractStateCodeFromGstin(gstin);
  const expectedCode = GST_STATE_CODES[state];
  return gstStateCode === expectedCode;
}

/**
 * Validate PAN matches GSTIN
 */
export function validatePanMatchesGstin(pan: string, gstin: string): boolean {
  return extractPanFromGstin(gstin) === pan;
}

// =============================================================================
// REFINEMENTS FOR CROSS-FIELD VALIDATION
// =============================================================================

/**
 * Create a superRefine for GSTIN-PAN-State cross validation
 */
export const gstinPanStateRefinement = <T extends { gstin?: string; pan?: string; billingAddress?: { state?: string } }>(
  data: T,
  ctx: z.RefinementCtx
) => {
  // If GSTIN present, validate state code
  if (data.gstin && data.billingAddress?.state) {
    if (!validateGstinState(data.gstin, data.billingAddress.state)) {
      ctx.addIssue({
        path: ['gstin'],
        code: z.ZodIssueCode.custom,
        message: `GSTIN state code does not match billing state (${data.billingAddress.state})`,
      });
    }
  }

  // If both GSTIN and PAN present, ensure they match
  if (data.gstin && data.pan) {
    if (!validatePanMatchesGstin(data.pan, data.gstin)) {
      ctx.addIssue({
        path: ['pan'],
        code: z.ZodIssueCode.custom,
        message: 'PAN does not match the PAN segment in GSTIN',
      });
    }
  }
};

export default {
  // Primitives
  nonEmptyString,
  optionalString,
  trimmedString,
  uppercaseString,
  // Contact
  emailSchema,
  requiredEmailSchema,
  phoneSchema,
  requiredPhoneSchema,
  internationalPhoneSchema,
  // Indian Compliance
  gstinSchema,
  requiredGstinSchema,
  panSchema,
  requiredPanSchema,
  tanSchema,
  aadhaarSchema,
  hsnCodeSchema,
  sacCodeSchema,
  GST_STATE_CODES,
  INDIAN_STATES,
  // Address
  pinCodeSchema,
  requiredPinCodeSchema,
  indianStateSchema,
  addressSchema,
  optionalAddressSchema,
  // Numeric
  amountSchema,
  coercedAmountSchema,
  optionalAmountSchema,
  quantitySchema,
  coercedQuantitySchema,
  decimalQuantitySchema,
  percentageSchema,
  discountPercentSchema,
  gstRateSchema,
  creditLimitSchema,
  creditDaysSchema,
  // Dates
  dateSchema,
  optionalDateSchema,
  dateOrStringSchema,
  financialYearSchema,
  // Codes
  codeSchema,
  skuSchema,
  optionalCodeSchema,
  documentNumberSchema,
  uuidSchema,
  optionalUuidSchema,
  // Enums
  customerTypeSchema,
  vendorTypeSchema,
  statusSchema,
  documentStatusSchema,
  paymentTermsSchema,
  uomSchema,
  // Bank
  ifscCodeSchema,
  bankAccountSchema,
  // Utility
  notesSchema,
  shortDescriptionSchema,
  longDescriptionSchema,
  urlSchema,
  tagsSchema,
  // Tenant
  tenantIdSchema,
  tenantScopedSchema,
  // Helpers
  extractPanFromGstin,
  extractStateCodeFromGstin,
  getStateFromGstin,
  validateGstinState,
  validatePanMatchesGstin,
  gstinPanStateRefinement,
};
