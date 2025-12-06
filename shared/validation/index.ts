/**
 * Index file for shared validation schemas
 * Re-exports all schemas for easy importing
 */

// Common building blocks
export * from './commonSchemas';

// Module-specific schemas
export * from './customerSchemas';
export * from './invoiceSchemas';

// Add more module exports as you create them:
// export * from './itemSchemas';
// export * from './purchaseSchemas';
// export * from './paymentSchemas';
// export * from './inventorySchemas';
