/**
 * Input Validators
 * 
 * Centralized validation for all ERP input fields:
 * - Name fields (blocks numbers, emojis, scripts)
 * - Email fields (RFC compliant, disposable blocking)
 * - Phone fields (E.164 format)
 * - Address fields (sanitized, length limited)
 */

// ============================================================================
// DISPOSABLE EMAIL DOMAINS
// ============================================================================
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'tempmail.com', 'guerrillamail.com',
  'yopmail.com', 'throwaway.email', 'temp-mail.org', 'fakeinbox.com',
  'trashmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
  'emailondeck.com', 'tempail.com', 'mytemp.email', 'getairmail.com',
  'mohmal.com', 'temp-mail.io', 'burnermail.io', 'mailsac.com'
]);

// ============================================================================
// NAME VALIDATION
// ============================================================================

/**
 * Validate a name field (first name, last name, company name)
 * 
 * @param {string} name - Name to validate
 * @param {Object} options - Configuration options
 * @returns {Object} { valid: boolean, error?: string, sanitized?: string }
 */
function validateName(name, options = {}) {
  const config = {
    minLength: 2,
    maxLength: 50,
    allowHyphens: true,
    allowApostrophes: true,
    allowSpaces: true,
    allowUnicode: true, // For international names
    fieldLabel: 'Name',
    ...options
  };

  if (!name || typeof name !== 'string') {
    return { valid: false, error: `${config.fieldLabel} is required` };
  }

  // Trim and normalize whitespace
  const trimmed = name.trim().replace(/\s+/g, ' ');

  // Length validation
  if (trimmed.length < config.minLength) {
    return { valid: false, error: `${config.fieldLabel} must be at least ${config.minLength} characters` };
  }

  if (trimmed.length > config.maxLength) {
    return { valid: false, error: `${config.fieldLabel} must not exceed ${config.maxLength} characters` };
  }

  // Block numbers
  if (/\d/.test(trimmed)) {
    return { valid: false, error: `${config.fieldLabel} cannot contain numbers` };
  }

  // Block emojis (Unicode emoji ranges)
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  if (emojiRegex.test(trimmed)) {
    return { valid: false, error: `${config.fieldLabel} cannot contain emojis` };
  }

  // Block script tags and HTML
  if (/<[^>]*>/.test(trimmed) || /[<>]/.test(trimmed)) {
    return { valid: false, error: `${config.fieldLabel} cannot contain HTML or special characters` };
  }

  // Block control characters (eslint-disable-line no-control-regex)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return { valid: false, error: `${config.fieldLabel} contains invalid characters` };
  }

  // Build allowed character regex
  let allowedChars = config.allowUnicode ? '\\p{L}\\p{M}' : 'a-zA-Z';
  if (config.allowSpaces) allowedChars += ' ';
  if (config.allowHyphens) allowedChars += '\\-';
  if (config.allowApostrophes) allowedChars += "'";

  const validCharsRegex = config.allowUnicode
    ? new RegExp(`^[${allowedChars}]+$`, 'u')
    : new RegExp(`^[${allowedChars}]+$`);

  if (!validCharsRegex.test(trimmed)) {
    return { valid: false, error: `${config.fieldLabel} contains invalid characters` };
  }

  return { valid: true, sanitized: trimmed };
}

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Validate email address
 * 
 * @param {string} email - Email to validate
 * @param {Object} options - Configuration options
 * @returns {Object} { valid: boolean, error?: string, normalized?: string }
 */
function validateEmail(email, options = {}) {
  const config = {
    blockDisposable: true,
    normalizeCase: true,
    fieldLabel: 'Email',
    ...options
  };

  if (!email || typeof email !== 'string') {
    return { valid: false, error: `${config.fieldLabel} is required` };
  }

  const trimmed = email.trim();

  // Basic format validation (RFC 5322 simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: `Invalid ${config.fieldLabel.toLowerCase()} format` };
  }

  // Check for valid TLD (at least 2 characters after last dot)
  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: `Invalid ${config.fieldLabel.toLowerCase()} format` };
  }

  const domain = parts[1].toLowerCase();
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];

  if (tld.length < 2) {
    return { valid: false, error: 'Email domain must have a valid TLD' };
  }

  // Block disposable emails
  if (config.blockDisposable && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, error: 'Disposable email addresses are not allowed' };
  }

  const normalized = config.normalizeCase ? trimmed.toLowerCase() : trimmed;

  return { valid: true, normalized };
}

// ============================================================================
// PHONE VALIDATION
// ============================================================================

/**
 * Validate phone number in E.164 format
 * 
 * @param {string} phone - Phone number to validate
 * @param {Object} options - Configuration options
 * @returns {Object} { valid: boolean, error?: string, normalized?: string }
 */
function validatePhone(phone, options = {}) {
  const config = {
    requireCountryCode: true,
    defaultCountryCode: '+91',
    fieldLabel: 'Phone number',
    ...options
  };

  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: `${config.fieldLabel} is required` };
  }

  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-().]/g, '');

  // E.164 format: +[country code][number] (max 15 digits total)
  const e164Regex = /^\+[1-9]\d{7,14}$/;

  // If no + prefix, try to add default country code
  if (!cleaned.startsWith('+')) {
    // Remove leading 0 or 00
    cleaned = cleaned.replace(/^0{1,2}/, '');
    
    // If it looks like a local number, add country code
    if (config.requireCountryCode && config.defaultCountryCode) {
      cleaned = config.defaultCountryCode + cleaned;
    }
  }

  if (!e164Regex.test(cleaned)) {
    return { 
      valid: false, 
      error: `${config.fieldLabel} must be in international format (e.g., +91 9876543210)` 
    };
  }

  return { valid: true, normalized: cleaned };
}

// ============================================================================
// ADDRESS VALIDATION
// ============================================================================

/**
 * Validate and sanitize address field
 * 
 * @param {string} address - Address to validate
 * @param {Object} options - Configuration options
 * @returns {Object} { valid: boolean, error?: string, sanitized?: string }
 */
function validateAddress(address, options = {}) {
  const config = {
    maxLength: 200,
    required: true,
    fieldLabel: 'Address',
    ...options
  };

  if (!address || typeof address !== 'string') {
    if (config.required) {
      return { valid: false, error: `${config.fieldLabel} is required` };
    }
    return { valid: true, sanitized: '' };
  }

  const trimmed = address.trim();

  if (config.required && trimmed.length === 0) {
    return { valid: false, error: `${config.fieldLabel} is required` };
  }

  if (trimmed.length > config.maxLength) {
    return { valid: false, error: `${config.fieldLabel} must not exceed ${config.maxLength} characters` };
  }

  // Strip HTML tags
  const stripped = trimmed.replace(/<[^>]*>/g, '');

  // Block control characters
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(stripped)) {
    return { valid: false, error: `${config.fieldLabel} contains invalid characters` };
  }

  // Block URLs in address
  if (/https?:\/\/|www\./i.test(stripped)) {
    return { valid: false, error: `${config.fieldLabel} cannot contain URLs` };
  }

  return { valid: true, sanitized: stripped };
}

// ============================================================================
// PINCODE/POSTAL CODE VALIDATION
// ============================================================================

/**
 * Validate postal code based on country
 * 
 * @param {string} code - Postal code to validate
 * @param {string} country - Country code (IN, US, UK, etc.)
 * @returns {Object} { valid: boolean, error?: string }
 */
function validatePostalCode(code, country = 'IN') {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Postal code is required' };
  }

  const cleaned = code.trim().replace(/\s/g, '');

  const patterns = {
    IN: /^[1-9][0-9]{5}$/, // India: 6 digits, cannot start with 0
    US: /^\d{5}(-\d{4})?$/, // USA: 5 digits or 5+4
    UK: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, // UK: complex format
    CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, // Canada: A1A 1A1
    AU: /^\d{4}$/, // Australia: 4 digits
  };

  const pattern = patterns[country.toUpperCase()];
  if (!pattern) {
    // Generic: 3-10 alphanumeric
    if (!/^[A-Z0-9]{3,10}$/i.test(cleaned)) {
      return { valid: false, error: 'Invalid postal code format' };
    }
    return { valid: true };
  }

  if (!pattern.test(cleaned)) {
    return { valid: false, error: `Invalid postal code for ${country}` };
  }

  return { valid: true };
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Express middleware for validating common input fields
 */
function inputValidationMiddleware(req, res, next) {
  const body = req.body;
  if (!body) return next();

  const errors = [];

  // Validate name fields
  const nameFields = ['name', 'firstName', 'lastName', 'first_name', 'last_name', 'adminName', 'username'];
  for (const field of nameFields) {
    if (body[field]) {
      const result = validateName(body[field], { fieldLabel: field });
      if (!result.valid) {
        errors.push({ field, error: result.error });
      } else {
        body[field] = result.sanitized;
      }
    }
  }

  // Validate email fields
  const emailFields = ['email', 'adminEmail', 'userEmail'];
  for (const field of emailFields) {
    if (body[field]) {
      const result = validateEmail(body[field], { fieldLabel: field });
      if (!result.valid) {
        errors.push({ field, error: result.error });
      } else {
        body[field] = result.normalized;
      }
    }
  }

  // Validate phone fields
  const phoneFields = ['phone', 'mobile', 'phoneNumber', 'mobileNumber'];
  for (const field of phoneFields) {
    if (body[field]) {
      const result = validatePhone(body[field], { fieldLabel: field, requireCountryCode: false });
      if (!result.valid) {
        errors.push({ field, error: result.error });
      } else {
        body[field] = result.normalized;
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

module.exports = {
  validateName,
  validateEmail,
  validatePhone,
  validateAddress,
  validatePostalCode,
  inputValidationMiddleware,
  DISPOSABLE_EMAIL_DOMAINS
};
