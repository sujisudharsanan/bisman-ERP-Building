/**
 * Shared Validation Schemas - Index
 *
 * Re-exports all validation schemas for easy importing.
 *
 * Usage:
 *   import { customerCreateSchema, amountSchema } from '@/libs/shared/validation';
 *   // or
 *   import { customerCreateSchema } from '@/libs/shared/validation/customerSchema';
 *
 * @module libs/shared/validation
 */

// Common building blocks
export * from './commonSchemas';

// Entity schemas
export * from './customerSchema';
export * from './vendorSchema';
export * from './itemSchema';
export * from './invoiceSchema';

// Default export with all schemas grouped
import commonSchemas from './commonSchemas';
import customerSchemas from './customerSchema';
import vendorSchemas from './vendorSchema';
import itemSchemas from './itemSchema';
import invoiceSchemas from './invoiceSchema';

export default {
  ...commonSchemas,
  ...customerSchemas,
  ...vendorSchemas,
  ...itemSchemas,
  ...invoiceSchemas,
};
