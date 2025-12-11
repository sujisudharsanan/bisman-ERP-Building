// Mock for uuid module (ESM module that Jest can't parse without babel)
// This provides a simple mock implementation for testing

const crypto = require('crypto');

const v4 = () => {
  // Generate a proper UUID v4 format
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
};

const v1 = () => v4(); // Simplified mock
const v5 = () => v4(); // Simplified mock

const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const NIL = '00000000-0000-0000-0000-000000000000';

const validate = (uuid) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
};

const version = (uuid) => {
  if (!validate(uuid)) return null;
  return parseInt(uuid.charAt(14), 16);
};

module.exports = {
  v4,
  v1,
  v5,
  MAX,
  NIL,
  validate,
  version,
  default: { v4, v1, v5, MAX, NIL, validate, version }
};
