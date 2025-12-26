/**
 * Password Validator
 * 
 * Centralized password validation with:
 * - 12 character minimum
 * - Complexity requirements (upper, lower, number, special)
 * - Common password blocklist
 * - Sequential pattern detection
 * 
 * Use this in all password validation scenarios.
 */

// Common passwords blocklist - top 100 most common passwords
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'password!',
  '123456', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'qwertyuiop',
  'letmein', 'welcome', 'welcome1', 'welcome123',
  'admin', 'admin123', 'administrator',
  'login', 'login123',
  'abc123', 'abcd1234', 'abcdef',
  'monkey', 'dragon', 'master', 'sunshine', 'princess',
  'football', 'baseball', 'soccer', 'hockey',
  'iloveyou', 'trustno1', 'passw0rd',
  '111111', '000000', '123123', '654321',
  'michael', 'jennifer', 'jessica', 'ashley', 'daniel',
  'shadow', 'superman', 'batman', 'starwars',
  'demo@123', 'test@123', 'user@123',
  'changeme', 'changeme123',
  'welcome@123', 'admin@123', 'password@123'
]);

// Sequential patterns to block
const SEQUENTIAL_PATTERNS = [
  '012345', '123456', '234567', '345678', '456789', '567890',
  'abcdef', 'bcdefg', 'cdefgh', 'defghi', 'efghij',
  'qwerty', 'asdfgh', 'zxcvbn',
  '111111', '222222', '333333', '444444', '555555',
  '666666', '777777', '888888', '999999', '000000'
];

// Password configuration
const PASSWORD_CONFIG = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: '@$!%*?&#^()_+-=[]{}|;:,.<>',
  blockCommonPasswords: true,
  blockSequentialPatterns: true
};

/**
 * Validate password against security requirements
 * 
 * @param {string} password - Password to validate
 * @param {Object} options - Optional configuration overrides
 * @returns {Object} { valid: boolean, errors: string[], score: number }
 */
function validatePassword(password, options = {}) {
  const config = { ...PASSWORD_CONFIG, ...options };
  const errors = [];
  let score = 0;

  // Check if password exists
  if (!password || typeof password !== 'string') {
    return { 
      valid: false, 
      errors: ['Password is required'], 
      score: 0 
    };
  }

  // Length validation
  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  } else {
    score += 2;
    if (password.length >= 16) score += 1;
    if (password.length >= 20) score += 1;
  }

  if (password.length > config.maxLength) {
    errors.push(`Password must not exceed ${config.maxLength} characters`);
  }

  // Lowercase validation
  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 1;
  }

  // Uppercase validation
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 1;
  }

  // Number validation
  if (config.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/[0-9]/.test(password)) {
    score += 1;
  }

  // Special character validation
  const specialRegex = new RegExp(`[${config.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
  if (config.requireSpecial && !specialRegex.test(password)) {
    errors.push(`Password must contain at least one special character (${config.specialChars.slice(0, 10)}...)`);
  } else if (specialRegex.test(password)) {
    score += 1;
  }

  // Common password check
  if (config.blockCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.has(lowerPassword)) {
      errors.push('This password is too common. Please choose a stronger password');
      score = Math.max(0, score - 3);
    }
  }

  // Sequential pattern check
  if (config.blockSequentialPatterns) {
    const lowerPassword = password.toLowerCase();
    for (const pattern of SEQUENTIAL_PATTERNS) {
      if (lowerPassword.includes(pattern)) {
        errors.push('Password contains sequential or repeated characters');
        score = Math.max(0, score - 2);
        break;
      }
    }
  }

  // Repeating characters check (e.g., "aaaaa")
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password contains too many repeated characters');
    score = Math.max(0, score - 1);
  }

  return {
    valid: errors.length === 0,
    errors,
    score: Math.min(10, score), // Max score of 10
    strength: getStrengthLabel(score)
  };
}

/**
 * Get password strength label
 * @param {number} score 
 * @returns {string}
 */
function getStrengthLabel(score) {
  if (score <= 2) return 'Weak';
  if (score <= 4) return 'Fair';
  if (score <= 6) return 'Good';
  if (score <= 8) return 'Strong';
  return 'Very Strong';
}

/**
 * Check if password meets minimum requirements (fast check)
 * 
 * @param {string} password 
 * @returns {boolean}
 */
function isPasswordValid(password) {
  if (!password || password.length < PASSWORD_CONFIG.minLength) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[@$!%*?&#^()_+\-=[\]{}|;:,.<>]/.test(password)) return false;
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return false;
  return true;
}

/**
 * Password validation regex pattern (for form validation)
 * Matches: min 12 chars, 1 lowercase, 1 uppercase, 1 number, 1 special
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{}|;:,.<>])[A-Za-z\d@$!%*?&#^()_+\-=[\]{}|;:,.<>]{12,}$/;

/**
 * Generate a cryptographically secure random password
 * 
 * @param {number} length - Password length (default: 16)
 * @returns {string} Generated password
 */
function generateSecurePassword(length = 16) {
  const crypto = require('crypto');
  
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I, O to avoid confusion
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Removed i, l, o to avoid confusion
  const numbers = '23456789'; // Removed 0, 1 to avoid confusion
  const special = '@$!%*?&#';
  
  // Ensure at least one of each required character type
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];
  
  // Fill remaining characters
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = 4; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  // Shuffle the password
  const array = password.split('');
  for (let i = array.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  
  return array.join('');
}

module.exports = {
  validatePassword,
  isPasswordValid,
  generateSecurePassword,
  PASSWORD_REGEX,
  PASSWORD_CONFIG,
  COMMON_PASSWORDS
};
