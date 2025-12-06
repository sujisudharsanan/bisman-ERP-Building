/**
 * Item/Product Validation Schema
 *
 * Uses shared building blocks from commonSchemas.
 *
 * @module libs/shared/validation/itemSchema
 */

import { z } from 'zod';
import {
  nonEmptyString,
  skuSchema,
  optionalCodeSchema,
  hsnCodeSchema,
  sacCodeSchema,
  amountSchema,
  coercedAmountSchema,
  optionalAmountSchema,
  quantitySchema,
  coercedQuantitySchema,
  decimalQuantitySchema,
  gstRateSchema,
  uomSchema,
  statusSchema,
  notesSchema,
  shortDescriptionSchema,
  longDescriptionSchema,
  urlSchema,
  tagsSchema,
  tenantIdSchema,
} from './commonSchemas';

// =============================================================================
// ITEM TYPE ENUMS
// =============================================================================

export const itemTypeSchema = z.enum(['goods', 'service', 'raw_material', 'finished_goods', 'consumable', 'asset'], {
  errorMap: () => ({ message: 'Invalid item type' }),
});

export const inventoryMethodSchema = z.enum(['fifo', 'lifo', 'weighted_average', 'specific'], {
  errorMap: () => ({ message: 'Invalid inventory method' }),
});

// =============================================================================
// ITEM CREATE SCHEMA
// =============================================================================

/**
 * Schema for item pricing tiers
 */
export const pricingTierSchema = z.object({
  minQty: z.number().int().min(1),
  maxQty: z.number().int().min(1).optional(),
  price: amountSchema,
});

/**
 * Schema for creating a new item
 */
export const itemCreateSchema = z.object({
  // Basic Information
  name: nonEmptyString('Item name').max(200, 'Name too long (max 200 characters)'),
  sku: skuSchema,
  barcode: z.string().max(50).optional().or(z.literal('').transform(() => undefined)),
  itemType: itemTypeSchema.default('goods'),

  // Category & Classification
  categoryId: z.number().int().positive().optional(),
  subcategoryId: z.number().int().positive().optional(),
  brandId: z.number().int().positive().optional(),

  // Tax Classification (Indian)
  hsnCode: hsnCodeSchema,
  sacCode: sacCodeSchema,
  gstRate: gstRateSchema.default('18'),
  isTaxExempt: z.boolean().default(false),

  // Pricing
  purchasePrice: coercedAmountSchema.default(0),
  sellingPrice: coercedAmountSchema.default(0),
  mrp: optionalAmountSchema,
  minSellingPrice: optionalAmountSchema,
  pricingTiers: z.array(pricingTierSchema).max(10).optional(),

  // Inventory
  uom: uomSchema.default('NOS'),
  trackInventory: z.boolean().default(true),
  inventoryMethod: inventoryMethodSchema.default('fifo'),
  reorderLevel: coercedQuantitySchema.default(0),
  reorderQty: coercedQuantitySchema.default(0),
  minStockLevel: coercedQuantitySchema.default(0),
  maxStockLevel: coercedQuantitySchema.optional(),
  openingStock: coercedQuantitySchema.default(0),

  // Dimensions (for shipping)
  weight: z.number().min(0).optional(),
  weightUnit: z.enum(['kg', 'g', 'lb', 'oz']).default('kg'),
  length: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  dimensionUnit: z.enum(['cm', 'mm', 'in', 'm']).default('cm'),

  // Description
  shortDescription: shortDescriptionSchema,
  longDescription: longDescriptionSchema,

  // Media
  imageUrl: urlSchema,
  images: z.array(z.string().url()).max(10).optional(),

  // Additional
  notes: notesSchema,
  tags: tagsSchema,

  // Status
  isActive: z.boolean().default(true),
  isSellable: z.boolean().default(true),
  isPurchasable: z.boolean().default(true),
});

/**
 * Schema for updating an item
 */
export const itemUpdateSchema = itemCreateSchema.partial().extend({
  id: z.number().int().positive(),
});

/**
 * Schema for item list filters
 */
export const itemListFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  itemType: itemTypeSchema.optional(),
  categoryId: z.number().int().positive().optional(),
  brandId: z.number().int().positive().optional(),
  status: statusSchema.optional(),
  hasStock: z.boolean().optional(),
  belowReorderLevel: z.boolean().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().max(9999999999).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'sku', 'createdAt', 'sellingPrice', 'stock']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Stock adjustment schema
 */
export const stockAdjustmentSchema = z.object({
  itemId: z.number().int().positive(),
  warehouseId: z.number().int().positive().optional(),
  quantity: z.number().int(),
  adjustmentType: z.enum(['add', 'remove', 'set']),
  reason: nonEmptyString('Reason').max(255),
  referenceNumber: z.string().max(50).optional(),
  notes: notesSchema,
});

/**
 * Tenant-scoped item create schema
 */
export const tenantItemCreateSchema = itemCreateSchema.extend({
  tenantId: tenantIdSchema,
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ItemType = z.infer<typeof itemTypeSchema>;
export type InventoryMethod = z.infer<typeof inventoryMethodSchema>;
export type PricingTier = z.infer<typeof pricingTierSchema>;
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
export type ItemListFilters = z.infer<typeof itemListFiltersSchema>;
export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;
export type TenantItemCreateInput = z.infer<typeof tenantItemCreateSchema>;

export default {
  itemTypeSchema,
  inventoryMethodSchema,
  pricingTierSchema,
  itemCreateSchema,
  itemUpdateSchema,
  itemListFiltersSchema,
  stockAdjustmentSchema,
  tenantItemCreateSchema,
};
