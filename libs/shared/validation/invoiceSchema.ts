/**
 * Invoice Validation Schema
 *
 * Uses shared building blocks from commonSchemas.
 * Supports Indian GST invoicing requirements.
 *
 * @module libs/shared/validation/invoiceSchema
 */

import { z } from 'zod';
import {
  nonEmptyString,
  documentNumberSchema,
  dateSchema,
  optionalDateSchema,
  amountSchema,
  coercedAmountSchema,
  quantitySchema,
  coercedQuantitySchema,
  percentageSchema,
  discountPercentSchema,
  gstRateSchema,
  uomSchema,
  documentStatusSchema,
  gstinSchema,
  requiredGstinSchema,
  addressSchema,
  notesSchema,
  tenantIdSchema,
  GST_STATE_CODES,
} from './commonSchemas';

// =============================================================================
// INVOICE ENUMS
// =============================================================================

export const invoiceTypeSchema = z.enum([
  'tax_invoice',
  'proforma',
  'credit_note',
  'debit_note',
  'bill_of_supply',
  'export_invoice',
], {
  errorMap: () => ({ message: 'Invalid invoice type' }),
});

export const supplyTypeSchema = z.enum(['B2B', 'B2C', 'B2CL', 'B2CS', 'EXPORT', 'SEZ'], {
  errorMap: () => ({ message: 'Invalid supply type' }),
});

export const placeOfSupplySchema = z.enum(Object.keys(GST_STATE_CODES) as [string, ...string[]], {
  errorMap: () => ({ message: 'Invalid place of supply' }),
});

// =============================================================================
// INVOICE LINE ITEM SCHEMA
// =============================================================================

export const invoiceLineItemSchema = z.object({
  // Item reference
  itemId: z.number().int().positive().optional(),
  itemName: nonEmptyString('Item name').max(200),
  itemCode: z.string().max(50).optional(),
  hsnSacCode: z.string().max(8).optional(),

  // Quantity & UOM
  quantity: coercedQuantitySchema.min(0.001, 'Quantity must be greater than 0'),
  uom: uomSchema.default('NOS'),

  // Pricing
  rate: coercedAmountSchema.min(0, 'Rate cannot be negative'),
  amount: coercedAmountSchema, // quantity * rate

  // Discount
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: coercedAmountSchema.default(0),

  // Tax
  gstRate: gstRateSchema.default('18'),
  cgstRate: z.number().min(0).max(14).default(0),
  cgstAmount: coercedAmountSchema.default(0),
  sgstRate: z.number().min(0).max(14).default(0),
  sgstAmount: coercedAmountSchema.default(0),
  igstRate: z.number().min(0).max(28).default(0),
  igstAmount: coercedAmountSchema.default(0),
  cessRate: z.number().min(0).max(100).default(0),
  cessAmount: coercedAmountSchema.default(0),

  // Totals
  taxableAmount: coercedAmountSchema,
  totalTax: coercedAmountSchema,
  lineTotal: coercedAmountSchema,

  // Additional
  description: z.string().max(500).optional(),
  serialNumbers: z.array(z.string().max(50)).optional(),
  batchNumber: z.string().max(50).optional(),
});

// =============================================================================
// INVOICE CREATE SCHEMA
// =============================================================================

/**
 * Schema for creating a new invoice
 */
export const invoiceCreateSchema = z
  .object({
    // Document Info
    invoiceNumber: documentNumberSchema.optional(), // Auto-generated if not provided
    invoiceDate: dateSchema,
    dueDate: optionalDateSchema,
    invoiceType: invoiceTypeSchema.default('tax_invoice'),

    // Customer
    customerId: z.number().int().positive(),
    customerName: nonEmptyString('Customer name').max(200),
    customerGstin: gstinSchema,
    customerAddress: addressSchema,

    // Seller Info (from tenant settings, can override)
    sellerGstin: gstinSchema,
    sellerAddress: addressSchema.optional(),

    // GST Details
    supplyType: supplyTypeSchema.default('B2B'),
    placeOfSupply: placeOfSupplySchema,
    isInterState: z.boolean().default(false),
    isReverseCharge: z.boolean().default(false),

    // Line Items
    lineItems: z.array(invoiceLineItemSchema).min(1, 'At least one line item required').max(100),

    // Totals (calculated, but validated)
    subtotal: coercedAmountSchema,
    totalDiscount: coercedAmountSchema.default(0),
    taxableAmount: coercedAmountSchema,
    totalCgst: coercedAmountSchema.default(0),
    totalSgst: coercedAmountSchema.default(0),
    totalIgst: coercedAmountSchema.default(0),
    totalCess: coercedAmountSchema.default(0),
    totalTax: coercedAmountSchema,
    roundOff: z.number().min(-1).max(1).default(0),
    grandTotal: coercedAmountSchema,

    // Payment
    amountPaid: coercedAmountSchema.default(0),
    balanceDue: coercedAmountSchema,
    paymentTerms: z.string().max(100).optional(),

    // E-Invoice (NIC)
    eInvoiceEnabled: z.boolean().default(false),
    irn: z.string().max(100).optional(), // Invoice Reference Number
    ackNumber: z.string().max(50).optional(),
    ackDate: optionalDateSchema,
    qrCode: z.string().optional(),

    // E-Way Bill
    eWayBillNumber: z.string().max(20).optional(),
    eWayBillDate: optionalDateSchema,
    transporterId: z.string().max(20).optional(),
    transporterName: z.string().max(100).optional(),
    vehicleNumber: z.string().max(20).optional(),

    // References
    poNumber: z.string().max(50).optional(),
    poDate: optionalDateSchema,
    salesOrderId: z.number().int().positive().optional(),
    deliveryNoteNumber: z.string().max(50).optional(),

    // Additional
    notes: notesSchema,
    termsAndConditions: z.string().max(2000).optional(),
    internalNotes: notesSchema,

    // Status
    status: documentStatusSchema.default('draft'),
  })
  .superRefine((data, ctx) => {
    // Validate inter-state logic
    if (data.isInterState && data.totalIgst === 0 && data.totalCgst > 0) {
      ctx.addIssue({
        path: ['totalIgst'],
        code: z.ZodIssueCode.custom,
        message: 'Inter-state invoice should have IGST, not CGST/SGST',
      });
    }

    if (!data.isInterState && data.totalIgst > 0) {
      ctx.addIssue({
        path: ['isInterState'],
        code: z.ZodIssueCode.custom,
        message: 'Intra-state invoice should have CGST/SGST, not IGST',
      });
    }

    // Validate totals
    const calculatedGrandTotal = data.taxableAmount + data.totalTax + data.roundOff;
    if (Math.abs(calculatedGrandTotal - data.grandTotal) > 1) {
      ctx.addIssue({
        path: ['grandTotal'],
        code: z.ZodIssueCode.custom,
        message: 'Grand total does not match calculated value',
      });
    }

    // Validate balance due
    const calculatedBalance = data.grandTotal - data.amountPaid;
    if (Math.abs(calculatedBalance - data.balanceDue) > 0.01) {
      ctx.addIssue({
        path: ['balanceDue'],
        code: z.ZodIssueCode.custom,
        message: 'Balance due does not match (grandTotal - amountPaid)',
      });
    }
  });

/**
 * Schema for updating an invoice (only draft status)
 */
export const invoiceUpdateSchema = invoiceCreateSchema.partial().extend({
  id: z.number().int().positive(),
});

/**
 * Schema for invoice list filters
 */
export const invoiceListFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  customerId: z.number().int().positive().optional(),
  invoiceType: invoiceTypeSchema.optional(),
  status: documentStatusSchema.optional(),
  supplyType: supplyTypeSchema.optional(),
  fromDate: optionalDateSchema,
  toDate: optionalDateSchema,
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().max(9999999999).optional(),
  hasBalance: z.boolean().optional(),
  hasIrn: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['invoiceNumber', 'invoiceDate', 'grandTotal', 'customerName', 'status']).default('invoiceDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Invoice payment schema
 */
export const invoicePaymentSchema = z.object({
  invoiceId: z.number().int().positive(),
  paymentDate: dateSchema,
  amount: coercedAmountSchema.min(0.01, 'Payment amount must be greater than 0'),
  paymentMode: z.enum(['cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other']),
  referenceNumber: z.string().max(50).optional(),
  bankAccountId: z.number().int().positive().optional(),
  notes: notesSchema,
});

/**
 * Tenant-scoped invoice create schema
 */
export const tenantInvoiceCreateSchema = invoiceCreateSchema.extend({
  tenantId: tenantIdSchema,
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type InvoiceType = z.infer<typeof invoiceTypeSchema>;
export type SupplyType = z.infer<typeof supplyTypeSchema>;
export type PlaceOfSupply = z.infer<typeof placeOfSupplySchema>;
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type InvoiceListFilters = z.infer<typeof invoiceListFiltersSchema>;
export type InvoicePayment = z.infer<typeof invoicePaymentSchema>;
export type TenantInvoiceCreateInput = z.infer<typeof tenantInvoiceCreateSchema>;

export default {
  invoiceTypeSchema,
  supplyTypeSchema,
  placeOfSupplySchema,
  invoiceLineItemSchema,
  invoiceCreateSchema,
  invoiceUpdateSchema,
  invoiceListFiltersSchema,
  invoicePaymentSchema,
  tenantInvoiceCreateSchema,
};
