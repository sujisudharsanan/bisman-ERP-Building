/**
 * Schemas Index (CommonJS)
 *
 * Re-exports all validation schemas for easy importing.
 *
 * @module my-backend/schemas
 */

const commonSchemas = require('./commonSchemas');
const customerSchemas = require('./customerSchema');
const vendorSchemas = require('./vendorSchema');

module.exports = {
  ...commonSchemas,
  ...customerSchemas,
  ...vendorSchemas,
};
