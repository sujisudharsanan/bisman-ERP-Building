/**
 * Invoice Validation Schemas for BISMAN ERP
 * 
 * Schemas for GST-compliant invoices with:
 * - Multiple line items with HSN/SAC codes
 * - Tax calculations (CGST, SGST, IGST)
 * - Payment terms and due dates
 * - E-invoice/E-way bill fields
 */

import { z } from 'zod';
import {
  nonEmptyString,
  optionalString,
  uuidSchema,
  tenantIdSchema,
  amountSchema,
  quantitySchema,
  percentageSchema,
  taxRateSchema,
  dateSchema,
  optionalDateSchema,
  invoiceNumberSchema,
  hsnCodeSchema,
  sacCodeSchema,
  gstinSchema,
  addressSchema,
  optionalAddressSchema,
  invoiceTypeSchema,
  documentStatusSchema,
  paymentStatusSchema,
  paginationSchema,
  financialYearSchema,
} from './commonSchemas';

// =============================================================================
// LINE ITEM SCHEMA
// =============================================================================

export const invoiceLineItemSchema = z.object({
  // Product/service reference
  itemId: uuidSchema.optional(), // Optional if entering name directly
  itemName: nonEmptyString('Item name').max(200),
  itemCode: optionalString,
  description: z.string().max(500).optional(),
  
  // HSN/SAC code for GST
  hsnCode: hsnCodeSchema,
  sacCode: sacCodeSchema,
  
  // Quantity and unit
  quantity: quantitySchema,
  unit: z.string().max(20).default('NOS'), // NOS, KGS, LTR, MTR, etc.
  
  // Pricing
  unitPrice: amountSchema,
  discountPercent: percentageSchema.optional().default(0),
  discountAmount: amountSchema.optional().default(0),
  
  // Tax rates (GST)
  taxRate: taxRateSchema.default(18), // Common: 0, 5, 12, 18, 28
  cgstRate: percentageSchema.optional(), // Auto-calculated if not provided
  sgstRate: percentageSchema.optional(),
  igstRate: percentageSchema.optional(),
  cessRate: percentageSchema.optional().default(0),
  
  // Calculated fields (can be sent or calculated on backend)
  taxableAmount: amountSchema.optional(),
  cgstAmount: amountSchema.optional(),
  sgstAmount: amountSchema.optional(),
  igstAmount: amountSchema.optional(),
  cessAmount: amountSchema.optional(),
  totalAmount: amountSchema.optional(),
});

// =============================================================================
// INVOICE CREATE SCHEMA
// =============================================================================

export const invoiceCreateSchema = z.object({
  // Invoice identification
  invoiceNumber: invoiceNumberSchema.optional(), // Auto-generated if not provided
  invoiceType: invoiceTypeSchema.default('sale'),
  
  // Dates
  invoiceDate: dateSchema,
  dueDate: optionalDateSchema,
  
  // Party details
  customerId: uuidSchema,
  customerName: nonEmptyString('Customer name'),
  customerGstin: gstinSchema,
  
  // Addresses
  billingAddress: addressSchema,
  shippingAddress: optionalAddressSchema,
  
  // Place of supply (for GST)
  placeOfSupply: z.string().min(2, 'Place of supply required'), // State code or name
  isInterState: z.boolean().default(false), // Determines IGST vs CGST+SGST
  
  // Line items
  lineItems: z.array(invoiceLineItemSchema)
    .min(1, 'At least one line item is required')
    .max(100, 'Too many line items (max 100)'),
  
  // Summary amounts
  subtotal: amountSchema.optional(),
  totalDiscount: amountSchema.optional().default(0),
  totalTaxableAmount: amountSchema.optional(),
  totalCgst: amountSchema.optional(),
  totalSgst: amountSchema.optional(),
  totalIgst: amountSchema.optional(),
  totalCess: amountSchema.optional().default(0),
  totalTax: amountSchema.optional(),
  roundOff: z.number().min(-10).max(10).optional().default(0),
  grandTotal: amountSchema,
  
  // Additional charges
  freightCharges: amountSchema.optional().default(0),
  packingCharges: amountSchema.optional().default(0),
  otherCharges: amountSchema.optional().default(0),
  
  // Payment terms
  paymentTerms: z.string().max(200).optional(),
  
  // E-invoice / E-way bill
  isEInvoice: z.boolean().default(false),
  irnNumber: z.string().max(100).optional(), // Invoice Reference Number
  acknowledgeNumber: z.string().max(50).optional(),
  acknowledgeDate: optionalDateSchema,
  qrCode: z.string().optional(),
  
  // E-way bill
  ewayBillNumber: z.string().max(20).optional(),
  ewayBillDate: optionalDateSchema,
  vehicleNumber: z.string().max(20).optional(),
  transporterId: z.string().max(50).optional(),
  transporterName: z.string().max(200).optional(),
  
  // Reference documents
  poNumber: z.string().max(50).optional(), // Purchase Order reference
  poDate: optionalDateSchema,
  challanNumber: z.string().max(50).optional(),
  challanDate: optionalDateSchema,
  
  // Status
  status: documentStatusSchema.default('draft'),
  
  // Notes
  notes: z.string().max(1000).optional(),
  termsAndConditions: z.string().max(2000).optional(),
  internalNotes: z.string().max(500).optional(),
});

// =============================================================================
// INVOICE UPDATE SCHEMA
// =============================================================================

export const invoiceUpdateSchema = invoiceCreateSchema.partial().extend({
  status: documentStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
});

// =============================================================================
// INVOICE QUERY SCHEMA
// =============================================================================

export const invoiceQuerySchema = paginationSchema.extend({
  invoiceType: invoiceTypeSchema.optional(),
  status: documentStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  customerId: uuidSchema.optional(),
  fromDate: optionalDateSchema,
  toDate: optionalDateSchema,
  financialYear: financialYearSchema.optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  isEInvoice: z.coerce.boolean().optional(),
  hasEwayBill: z.coerce.boolean().optional(),
});

// =============================================================================
// INVOICE PARAMS SCHEMA
// =============================================================================

export const invoiceParamsSchema = z.object({
  id: uuidSchema,
});

// =============================================================================
// PAYMENT RECORD SCHEMA
// =============================================================================

export const invoicePaymentSchema = z.object({
  invoiceId: uuidSchema,
  amount: amountSchema.refine(v => v > 0, 'Amount must be greater than 0'),
  paymentDate: dateSchema,
  paymentMethod: z.enum([
    'cash',
    'cheque',
    'bank_transfer',
    'upi',
    'card',
    'dd',
    'neft',
    'rtgs',
    'imps',
    'other'
  ]),
  referenceNumber: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;
export type InvoiceParams = z.infer<typeof invoiceParamsSchema>;
export type InvoicePaymentInput = z.infer<typeof invoicePaymentSchema>;
