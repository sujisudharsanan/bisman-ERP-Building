/**
 * Shared Validation Schemas for Bisman ERP (CommonJS)
 *
 * Reusable Zod schemas for Indian ERP patterns.
 * Use these building blocks in all entity schemas.
 *
 * @module my-backend/schemas/commonSchemas
 */

const { z } = require('zod');

// =============================================================================
// PRIMITIVE SCHEMAS
// =============================================================================

const nonEmptyString = (fieldName) =>
  z.string().min(1, `${fieldName} is required`);

const optionalString = z
  .string()
  .optional()
  .or(z.literal('').transform(() => undefined));

const trimmedString = z.string().transform((v) => v.trim());

const uppercaseString = z.string().transform((v) => v.toUpperCase());

// =============================================================================
// CONTACT SCHEMAS
// =============================================================================

const emailSchema = z
  .string()
  .email('Invalid email address')
  .optional()
  .or(z.literal('').transform(() => undefined));

const requiredEmailSchema = z.string().email('Invalid email address');

const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s\-()]/g, ''))
  .refine((v) => !v || /^(\+91|91|0)?[6-9][0-9]{9}$/.test(v), {
    message: 'Invalid Indian phone number (10 digits starting with 6-9)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

const requiredPhoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s\-()]/g, ''))
  .refine((v) => /^(\+91|91|0)?[6-9][0-9]{9}$/.test(v), {
    message: 'Invalid Indian phone number (10 digits starting with 6-9)',
  });

// =============================================================================
// INDIAN COMPLIANCE SCHEMAS
// =============================================================================

const GST_STATE_CODES = {
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

const INDIAN_STATES = Object.keys(GST_STATE_CODES);

const gstinSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => !v || /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(v), {
    message: 'Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

const requiredGstinSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(v), {
    message: 'Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)',
  });

const panSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v), {
    message: 'Invalid PAN format (e.g., ABCDE1234F)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

const requiredPanSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v), {
    message: 'Invalid PAN format (e.g., ABCDE1234F)',
  });

const tanSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => !v || /^[A-Z]{4}[0-9]{5}[A-Z]$/.test(v), {
    message: 'Invalid TAN format (e.g., AAAA99999A)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

const hsnCodeSchema = z
  .string()
  .regex(/^[0-9]{4,8}$/, 'HSN code must be 4-8 digits')
  .optional()
  .or(z.literal('').transform(() => undefined));

const sacCodeSchema = z
  .string()
  .regex(/^[0-9]{6}$/, 'SAC code must be 6 digits')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// ADDRESS SCHEMAS
// =============================================================================

const pinCodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code (6 digits)')
  .optional()
  .or(z.literal('').transform(() => undefined));

const requiredPinCodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code (6 digits)');

const addressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required').max(255),
  line2: z.string().max(255).optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pinCode: pinCodeSchema,
  country: z.string().max(100).default('India'),
});

const optionalAddressSchema = addressSchema.partial();

// =============================================================================
// NUMERIC SCHEMAS
// =============================================================================

const amountSchema = z
  .number()
  .min(0, 'Amount cannot be negative')
  .max(9999999999.99, 'Amount too large (max ₹100 crore)');

const coercedAmountSchema = z.coerce
  .number()
  .min(0, 'Amount cannot be negative')
  .max(9999999999.99, 'Amount too large (max ₹100 crore)');

const optionalAmountSchema = z.coerce
  .number()
  .min(0)
  .max(9999999999.99)
  .optional()
  .or(z.literal('').transform(() => undefined));

const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .min(0, 'Quantity cannot be negative')
  .max(99999999, 'Quantity too large');

const coercedQuantitySchema = z.coerce
  .number()
  .int('Quantity must be a whole number')
  .min(0, 'Quantity cannot be negative')
  .max(99999999, 'Quantity too large');

const percentageSchema = z
  .number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

const discountPercentSchema = z
  .number()
  .min(0, 'Discount cannot be negative')
  .max(100, 'Discount cannot exceed 100%');

const gstRateSchema = z.enum(['0', '0.25', '3', '5', '12', '18', '28'], {
  errorMap: () => ({ message: 'Invalid GST rate. Valid: 0, 0.25, 3, 5, 12, 18, 28' }),
});

const creditLimitSchema = z.coerce
  .number()
  .min(0, 'Credit limit cannot be negative')
  .max(100000000, 'Credit limit too high (max ₹10 crore)')
  .optional()
  .or(z.literal('').transform(() => undefined));

const creditDaysSchema = z.coerce
  .number()
  .int('Credit days must be a whole number')
  .min(0, 'Credit days cannot be negative')
  .max(365, 'Credit days cannot exceed 365')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// DATE SCHEMAS
// =============================================================================

const dateSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'Invalid date format',
  });

const optionalDateSchema = z
  .string()
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
    message: 'Invalid date format',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// CODE/IDENTIFIER SCHEMAS
// =============================================================================

const codeSchema = (fieldName) =>
  z
    .string()
    .min(2, `${fieldName} must be at least 2 characters`)
    .max(50, `${fieldName} too long (max 50 characters)`)
    .regex(/^[A-Za-z0-9_-]+$/, `${fieldName} can only contain letters, numbers, _ and -`);

const skuSchema = z
  .string()
  .min(1, 'SKU is required')
  .max(50, 'SKU too long (max 50 characters)')
  .regex(/^[A-Za-z0-9_-]+$/, 'SKU can only contain letters, numbers, _ and -');

const optionalCodeSchema = (fieldName) =>
  z
    .string()
    .max(50, `${fieldName} too long`)
    .regex(/^[A-Za-z0-9_-]*$/, `${fieldName} can only contain letters, numbers, _ and -`)
    .optional()
    .or(z.literal('').transform(() => undefined));

const documentNumberSchema = z
  .string()
  .min(1, 'Document number is required')
  .max(50, 'Document number too long')
  .regex(/^[A-Za-z0-9/_-]+$/, 'Document number can only contain letters, numbers, /, _ and -');

const uuidSchema = z.string().uuid('Invalid UUID format');

const optionalUuidSchema = z
  .string()
  .uuid('Invalid UUID format')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

const customerTypeSchema = z.enum(['individual', 'business', 'government', 'ngo'], {
  errorMap: () => ({ message: 'Invalid customer type' }),
});

const vendorTypeSchema = z.enum(['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service_provider'], {
  errorMap: () => ({ message: 'Invalid vendor type' }),
});

const statusSchema = z.enum(['active', 'inactive', 'blocked', 'pending'], {
  errorMap: () => ({ message: 'Invalid status' }),
});

const documentStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected', 'cancelled', 'posted'], {
  errorMap: () => ({ message: 'Invalid document status' }),
});

const paymentTermsSchema = z.enum(['immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'custom'], {
  errorMap: () => ({ message: 'Invalid payment terms' }),
});

const uomSchema = z.enum([
  'NOS', 'PCS', 'KGS', 'GMS', 'LTR', 'ML', 'MTR', 'CM', 'MM',
  'SQM', 'SQFT', 'CBM', 'BOX', 'CTN', 'SET', 'PAC', 'ROL', 'BAG', 'OTH'
], {
  errorMap: () => ({ message: 'Invalid unit of measurement' }),
});

// =============================================================================
// BANK SCHEMAS
// =============================================================================

const ifscCodeSchema = z
  .string()
  .transform((v) => v.toUpperCase().trim())
  .refine((v) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v), {
    message: 'Invalid IFSC code (e.g., SBIN0001234)',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

const bankAccountSchema = z
  .string()
  .regex(/^[0-9]{9,18}$/, 'Bank account must be 9-18 digits')
  .optional()
  .or(z.literal('').transform(() => undefined));

// =============================================================================
// UTILITY SCHEMAS
// =============================================================================

const notesSchema = z
  .string()
  .max(1000, 'Notes too long (max 1000 characters)')
  .optional()
  .or(z.literal('').transform(() => undefined));

const shortDescriptionSchema = z
  .string()
  .max(255, 'Description too long (max 255 characters)')
  .optional()
  .or(z.literal('').transform(() => undefined));

const longDescriptionSchema = z
  .string()
  .max(5000, 'Description too long (max 5000 characters)')
  .optional()
  .or(z.literal('').transform(() => undefined));

const urlSchema = z
  .string()
  .url('Invalid URL')
  .optional()
  .or(z.literal('').transform(() => undefined));

const tagsSchema = z.array(z.string().max(50)).max(20, 'Too many tags (max 20)').optional();

// =============================================================================
// TENANT SCOPING
// =============================================================================

const tenantIdSchema = z.string().uuid('Invalid tenant ID');

const tenantScopedSchema = z.object({
  tenantId: tenantIdSchema,
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractPanFromGstin(gstin) {
  return gstin.substring(2, 12);
}

function extractStateCodeFromGstin(gstin) {
  return gstin.substring(0, 2);
}

function getStateFromGstin(gstin) {
  const code = extractStateCodeFromGstin(gstin);
  return Object.entries(GST_STATE_CODES).find(([, v]) => v === code)?.[0];
}

function validateGstinState(gstin, state) {
  const gstStateCode = extractStateCodeFromGstin(gstin);
  const expectedCode = GST_STATE_CODES[state];
  return gstStateCode === expectedCode;
}

function validatePanMatchesGstin(pan, gstin) {
  return extractPanFromGstin(gstin) === pan;
}

const gstinPanStateRefinement = (data, ctx) => {
  if (data.gstin && data.billingAddress?.state) {
    if (!validateGstinState(data.gstin, data.billingAddress.state)) {
      ctx.addIssue({
        path: ['gstin'],
        code: z.ZodIssueCode.custom,
        message: `GSTIN state code does not match billing state (${data.billingAddress.state})`,
      });
    }
  }

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

module.exports = {
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
  // Indian Compliance
  gstinSchema,
  requiredGstinSchema,
  panSchema,
  requiredPanSchema,
  tanSchema,
  hsnCodeSchema,
  sacCodeSchema,
  GST_STATE_CODES,
  INDIAN_STATES,
  // Address
  pinCodeSchema,
  requiredPinCodeSchema,
  addressSchema,
  optionalAddressSchema,
  // Numeric
  amountSchema,
  coercedAmountSchema,
  optionalAmountSchema,
  quantitySchema,
  coercedQuantitySchema,
  percentageSchema,
  discountPercentSchema,
  gstRateSchema,
  creditLimitSchema,
  creditDaysSchema,
  // Dates
  dateSchema,
  optionalDateSchema,
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
