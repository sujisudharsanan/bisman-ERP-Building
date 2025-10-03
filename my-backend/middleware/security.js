const rateLimit = require('express-rate-limit')
const validator = require('validator')
const bcrypt = require('bcryptjs')

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Password validation rules
const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' }
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
  }
  return { valid: true }
}

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    // Sanitize email
    if (req.body.email) {
      req.body.email = validator.escape(req.body.email.trim().toLowerCase())
      if (!validator.isEmail(req.body.email)) {
        return res.status(400).json({ error: 'Invalid email format' })
      }
    }
    
    // Validate password
    if (req.body.password) {
      const passwordValidation = validatePassword(req.body.password)
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.message })
      }
    }
  }
  next()
}

// Secure JWT token generation
const generateSecureToken = (payload) => {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret || jwtSecret === 'dev-secret' || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long')
  }
  
  return jwt.sign(payload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRY || '8h',
    algorithm: 'HS256',
    issuer: 'bisman-erp',
    audience: 'bisman-erp-users'
  })
}

// Secure password hashing
const hashPassword = async (password) => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
  return bcrypt.hash(password, rounds)
}

module.exports = {
  authLimiter,
  sanitizeInput,
  validatePassword,
  generateSecureToken,
  hashPassword
}
