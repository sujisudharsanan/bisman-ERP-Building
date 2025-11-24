/**
 * 🔐 SECURE JWT TOKEN CONFIGURATION
 * 
 * CRITICAL SECURITY FIXES APPLIED:
 * 1. ✅ No weak default secrets - fail-fast validation
 * 2. ✅ Strong secret generation helpers
 * 3. ✅ Secret strength validation
 * 4. ✅ Secure token generation with proper algorithm enforcement
 * 
 * Compliance: OWASP A02, ISO 27001 A.10.1.1, NIST PR.DS-1
 */

const jwt = require('jsonwebtoken')
const crypto = require('crypto')

// ============================================================================
// 🔐 CRITICAL: JWT SECRET VALIDATION
// ============================================================================

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET

// Validate secrets at startup
function validateJWTSecrets() {
  const errors = []

  if (!ACCESS_TOKEN_SECRET || ACCESS_TOKEN_SECRET.length < 32) {
    errors.push('ACCESS_TOKEN_SECRET must be set and at least 32 characters')
  }

  if (!REFRESH_TOKEN_SECRET || REFRESH_TOKEN_SECRET.length < 32) {
    errors.push('REFRESH_TOKEN_SECRET must be set and at least 32 characters')
  }

  // Check for weak default patterns
  const weakPatterns = ['dev', 'test', 'secret', 'password', '123', 'changeme', 'default']
  
  if (ACCESS_TOKEN_SECRET) {
    const lowerSecret = ACCESS_TOKEN_SECRET.toLowerCase()
    for (const pattern of weakPatterns) {
      if (lowerSecret.includes(pattern)) {
        errors.push(`ACCESS_TOKEN_SECRET contains weak pattern: "${pattern}"`)
      }
    }
  }

  if (REFRESH_TOKEN_SECRET) {
    const lowerSecret = REFRESH_TOKEN_SECRET.toLowerCase()
    for (const pattern of weakPatterns) {
      if (lowerSecret.includes(pattern)) {
        errors.push(`REFRESH_TOKEN_SECRET contains weak pattern: "${pattern}"`)
      }
    }
  }

  if (errors.length > 0) {
    console.error('❌ JWT SECRET VALIDATION FAILED:')
    errors.forEach(err => console.error(`   - ${err}`))
    console.error('')
    console.error('🔧 SETUP INSTRUCTIONS:')
    console.error('   1. Generate secure secrets:')
    console.error('      openssl rand -base64 64')
    console.error('')
    console.error('   2. For Railway deployment:')
    console.error('      railway variables set ACCESS_TOKEN_SECRET="[generated-secret-1]"')
    console.error('      railway variables set REFRESH_TOKEN_SECRET="[generated-secret-2]"')
    console.error('')
    console.error('   3. For local development (.env file):')
    console.error(`      ACCESS_TOKEN_SECRET=${crypto.randomBytes(48).toString('base64')}`)
    console.error(`      REFRESH_TOKEN_SECRET=${crypto.randomBytes(48).toString('base64')}`)
    console.error('')
    
    process.exit(1) // Fail-fast
  }

  // Validate secret strength (warnings)
  validateSecretStrength(ACCESS_TOKEN_SECRET, 'ACCESS_TOKEN_SECRET')
  validateSecretStrength(REFRESH_TOKEN_SECRET, 'REFRESH_TOKEN_SECRET')

  console.log('✅ JWT secrets validated successfully')
}

function validateSecretStrength(secret, name) {
  const checks = {
    hasUppercase: /[A-Z]/.test(secret),
    hasLowercase: /[a-z]/.test(secret),
    hasNumbers: /[0-9]/.test(secret),
    hasSpecial: /[^A-Za-z0-9]/.test(secret),
    isLongEnough: secret.length >= 64
  }

  const failedChecks = Object.entries(checks)
    .filter(([_, passed]) => !passed)
    .map(([check]) => check)

  if (failedChecks.length > 0) {
    console.warn(`⚠️  ${name} strength warning:`)
    if (!checks.hasUppercase) console.warn('   - Missing uppercase letters')
    if (!checks.hasLowercase) console.warn('   - Missing lowercase letters')
    if (!checks.hasNumbers) console.warn('   - Missing numbers')
    if (!checks.hasSpecial) console.warn('   - Missing special characters')
    if (!checks.isLongEnough) console.warn('   - Should be at least 64 characters')
    console.warn('   Consider regenerating with: openssl rand -base64 64')
  }
}

// Run validation at module load
validateJWTSecrets()

// ============================================================================
// 🔐 SECURE TOKEN GENERATION
// ============================================================================

/**
 * Generate access token with proper security measures
 * @param {Object} payload - User data (id, email, role, userType)
 * @returns {string} JWT access token
 */
function generateAccessToken(payload) {
  // Add JTI (JWT ID) for revocation support
  const jti = crypto.randomBytes(16).toString('hex')
  
  // Add issued at timestamp
  const iat = Math.floor(Date.now() / 1000)
  
  const tokenPayload = {
    ...payload,
    jti,
    iat,
    type: 'access'
  }

  // Algorithm selection based on key type
  const signOptions = {
    expiresIn: '1h',
    algorithm: process.env.JWT_PRIVATE_KEY ? 'RS256' : 'HS512'
  }

  const secret = process.env.JWT_PRIVATE_KEY || ACCESS_TOKEN_SECRET

  return jwt.sign(tokenPayload, secret, signOptions)
}

/**
 * Generate refresh token with proper security measures
 * @param {Object} payload - User data (id, email)
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload) {
  // Refresh tokens should contain minimal data
  const minimalPayload = {
    id: payload.id,
    email: payload.email,
    type: 'refresh'
  }

  // Add JTI for revocation
  const jti = crypto.randomBytes(16).toString('hex')
  
  const tokenPayload = {
    ...minimalPayload,
    jti,
    iat: Math.floor(Date.now() / 1000)
  }

  const signOptions = {
    expiresIn: '7d',
    algorithm: process.env.JWT_PRIVATE_KEY ? 'RS256' : 'HS512'
  }

  const secret = process.env.JWT_PRIVATE_KEY || REFRESH_TOKEN_SECRET

  return jwt.sign(tokenPayload, secret, signOptions)
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT to verify
 * @param {string} type - 'access' or 'refresh'
 * @returns {Object} Decoded payload
 */
function verifyToken(token, type = 'access') {
  const secret = type === 'refresh' 
    ? (process.env.JWT_PUBLIC_KEY || REFRESH_TOKEN_SECRET)
    : (process.env.JWT_PUBLIC_KEY || ACCESS_TOKEN_SECRET)

  const verifyOptions = {
    algorithms: process.env.JWT_PUBLIC_KEY ? ['RS256'] : ['HS512', 'HS256']
  }

  try {
    const payload = jwt.verify(token, secret, verifyOptions)
    
    // Verify token type matches expected
    if (payload.type && payload.type !== type) {
      throw new Error(`Token type mismatch: expected ${type}, got ${payload.type}`)
    }

    return payload
  } catch (error) {
    console.error('[verifyToken] Verification failed:', error.message)
    throw error
  }
}

// ============================================================================
// 🔐 SECURE COOKIE CONFIGURATION
// ============================================================================

/**
 * Get secure cookie options for tokens
 * @param {number} maxAge - Cookie max age in milliseconds
 * @returns {Object} Cookie options
 */
function getSecureCookieOptions(maxAge = 3600000) { // 1 hour default
  const isProduction = 
    process.env.NODE_ENV === 'production' ||
    process.env.RAILWAY === '1' ||
    Boolean(process.env.PRODUCTION_MODE)

  return {
    httpOnly: true,        // ✅ Prevents JavaScript access (XSS protection)
    secure: isProduction,  // ✅ HTTPS only in production
    sameSite: 'lax',      // ✅ CSRF protection
    maxAge,                // ✅ Explicit expiration
    path: '/',             // ✅ Available site-wide
    ...(isProduction && { domain: process.env.COOKIE_DOMAIN }) // Set domain in production if needed
  }
}

/**
 * Set authentication cookies securely
 * @param {Object} res - Express response object
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 */
function setAuthCookies(res, accessToken, refreshToken) {
  // Access token cookie (1 hour)
  res.cookie('access_token', accessToken, getSecureCookieOptions(3600000))
  
  // Refresh token cookie (7 days)
  res.cookie('refresh_token', refreshToken, getSecureCookieOptions(7 * 24 * 3600000))
  
  // Legacy support - also set 'token' cookie
  res.cookie('token', accessToken, getSecureCookieOptions(3600000))
}

/**
 * Clear authentication cookies
 * @param {Object} res - Express response object
 */
function clearAuthCookies(res) {
  const clearOptions = { ...getSecureCookieOptions(0), maxAge: 0 }
  
  res.clearCookie('access_token', clearOptions)
  res.clearCookie('refresh_token', clearOptions)
  res.clearCookie('token', clearOptions) // Legacy
}

// ============================================================================
// 🔐 SECURITY UTILITIES
// ============================================================================

/**
 * Generate a cryptographically secure random secret
 * @param {number} length - Number of random bytes (default 48 = 64 chars base64)
 * @returns {string} Base64 encoded random secret
 */
function generateSecureSecret(length = 48) {
  return crypto.randomBytes(length).toString('base64')
}

/**
 * Hash a sensitive value (for logging/comparison)
 * @param {string} value - Value to hash
 * @returns {string} SHA256 hash (first 8 chars)
 */
function hashForLogging(value) {
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 8)
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Token generation
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  
  // Cookie management
  setAuthCookies,
  clearAuthCookies,
  getSecureCookieOptions,
  
  // Utilities
  generateSecureSecret,
  hashForLogging,
  
  // Secrets (validated)
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET
}
