/**
 * PII Encryption Utility
 * 
 * Provides AES-256-GCM encryption for sensitive PII data like:
 * - PAN numbers
 * - Aadhaar numbers
 * - Bank account numbers
 * 
 * Usage:
 *   const { encrypt, decrypt } = require('./lib/encryption');
 *   const encrypted = encrypt(panNumber);
 *   const decrypted = decrypt(encrypted.ciphertext, encrypted.iv);
 */

const crypto = require('crypto');

// Encryption key should be 32 bytes for AES-256
// Must be set via environment variable - never hardcode!
const ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Validate encryption key is properly configured
 */
function validateKey() {
  if (!ENCRYPTION_KEY) {
    throw new Error('PII_ENCRYPTION_KEY environment variable is not set. Cannot encrypt sensitive data.');
  }
  
  // Key should be 64 hex characters (32 bytes)
  if (ENCRYPTION_KEY.length !== 64 || !/^[a-fA-F0-9]+$/.test(ENCRYPTION_KEY)) {
    throw new Error('PII_ENCRYPTION_KEY must be 64 hexadecimal characters (256 bits).');
  }
  
  return Buffer.from(ENCRYPTION_KEY, 'hex');
}

/**
 * Encrypt sensitive PII data
 * 
 * @param {string} plaintext - The sensitive data to encrypt
 * @returns {Object} - { ciphertext: Buffer, iv: Buffer, authTag: Buffer }
 */
function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    return null;
  }

  const key = validateKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    ciphertext: Buffer.concat([encrypted, authTag]), // Append auth tag to ciphertext
    iv: iv
  };
}

/**
 * Decrypt sensitive PII data
 * 
 * @param {Buffer} ciphertext - The encrypted data (with auth tag appended)
 * @param {Buffer} iv - The initialization vector used for encryption
 * @returns {string} - The decrypted plaintext
 */
function decrypt(ciphertext, iv) {
  if (!ciphertext || !iv) {
    return null;
  }

  const key = validateKey();
  
  // Extract auth tag from end of ciphertext
  const authTag = ciphertext.slice(-AUTH_TAG_LENGTH);
  const encryptedData = ciphertext.slice(0, -AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

/**
 * Encrypt a PAN number and return object ready for DB storage
 * 
 * @param {string} panNumber - 10 character PAN number
 * @returns {Object} - { panEncrypted, panIv, panLast4 }
 */
function encryptPAN(panNumber) {
  if (!panNumber || panNumber.length < 4) {
    return { panEncrypted: null, panIv: null, panLast4: null };
  }
  
  const { ciphertext, iv } = encrypt(panNumber.toUpperCase());
  
  return {
    panEncrypted: ciphertext,
    panIv: iv,
    panLast4: panNumber.slice(-4).toUpperCase()
  };
}

/**
 * Decrypt a PAN number from DB storage
 * 
 * @param {Buffer} panEncrypted - Encrypted PAN
 * @param {Buffer} panIv - IV used for encryption
 * @returns {string} - Decrypted PAN number
 */
function decryptPAN(panEncrypted, panIv) {
  return decrypt(panEncrypted, panIv);
}

/**
 * Encrypt an Aadhaar number and return object ready for DB storage
 * 
 * @param {string} aadhaarNumber - 12 digit Aadhaar number
 * @returns {Object} - { aadhaarEncrypted, aadhaarIv, aadhaarLast4 }
 */
function encryptAadhaar(aadhaarNumber) {
  if (!aadhaarNumber || aadhaarNumber.length < 4) {
    return { aadhaarEncrypted: null, aadhaarIv: null, aadhaarLast4: null };
  }
  
  // Remove any spaces/dashes from Aadhaar
  const cleanAadhaar = aadhaarNumber.replace(/[\s-]/g, '');
  const { ciphertext, iv } = encrypt(cleanAadhaar);
  
  return {
    aadhaarEncrypted: ciphertext,
    aadhaarIv: iv,
    aadhaarLast4: cleanAadhaar.slice(-4)
  };
}

/**
 * Decrypt an Aadhaar number from DB storage
 */
function decryptAadhaar(aadhaarEncrypted, aadhaarIv) {
  return decrypt(aadhaarEncrypted, aadhaarIv);
}

/**
 * Encrypt a bank account number and return object ready for DB storage
 * 
 * @param {string} accountNumber - Bank account number
 * @returns {Object} - { accountNumberEncrypted, accountNumberIv, accountNumberLast4 }
 */
function encryptBankAccount(accountNumber) {
  if (!accountNumber || accountNumber.length < 4) {
    return { accountNumberEncrypted: null, accountNumberIv: null, accountNumberLast4: null };
  }
  
  const { ciphertext, iv } = encrypt(accountNumber);
  
  return {
    accountNumberEncrypted: ciphertext,
    accountNumberIv: iv,
    accountNumberLast4: accountNumber.slice(-4)
  };
}

/**
 * Decrypt a bank account number from DB storage
 */
function decryptBankAccount(accountNumberEncrypted, accountNumberIv) {
  return decrypt(accountNumberEncrypted, accountNumberIv);
}

/**
 * Mask sensitive data for display
 * Shows only last 4 characters with asterisks
 * 
 * @param {string} data - Sensitive data to mask
 * @returns {string} - Masked string like "****1234"
 */
function maskSensitiveData(data) {
  if (!data || data.length < 4) {
    return '****';
  }
  const last4 = data.slice(-4);
  const masked = '*'.repeat(data.length - 4);
  return masked + last4;
}

/**
 * Generate a new encryption key
 * Use this to generate PII_ENCRYPTION_KEY for .env
 * 
 * @returns {string} - 64 character hex string (256 bits)
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a session token using SHA-256
 * 
 * @param {string} token - Raw session token
 * @returns {Object} - { hash, prefix }
 */
function hashSessionToken(token) {
  if (!token) return { hash: null, prefix: null };
  
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const prefix = token.substring(0, 8);
  
  return { hash, prefix };
}

/**
 * Hash OTP for storage
 * 
 * @param {string} otp - Raw OTP code
 * @returns {string} - SHA-256 hash
 */
function hashOTP(otp) {
  if (!otp) return null;
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Verify OTP against stored hash
 * 
 * @param {string} otp - OTP to verify
 * @param {string} storedHash - Stored hash to compare against
 * @returns {boolean}
 */
function verifyOTP(otp, storedHash) {
  if (!otp || !storedHash) return false;
  const hash = hashOTP(otp);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

module.exports = {
  encrypt,
  decrypt,
  encryptPAN,
  decryptPAN,
  encryptAadhaar,
  decryptAadhaar,
  encryptBankAccount,
  decryptBankAccount,
  maskSensitiveData,
  generateEncryptionKey,
  hashSessionToken,
  hashOTP,
  verifyOTP
};
