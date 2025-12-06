/**
 * Tenant Onboarding Routes
 * 
 * Self-serve tenant provisioning with:
 * - Idempotency key support
 * - Email uniqueness validation
 * - Default roles creation
 * - Trial period handling
 * - Background job enqueueing
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const onboardingService = require('../../services/onboarding/onboardingService');
const { createAdaptiveRateLimiter } = require('../../middleware/advancedRateLimiter');

// Rate limit: 10 onboarding attempts per IP per hour
const onboardingLimiter = createAdaptiveRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many signup attempts, please try again later' }
});

/**
 * POST /api/onboard
 * 
 * Create a new tenant with admin user
 */
router.post('/',
  onboardingLimiter,
  [
    body('companyName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Company name must be 2-100 characters'),
    body('adminEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('adminName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Admin name must be 2-100 characters'),
    body('plan')
      .isIn(['trial', 'free'])
      .withMessage('Plan must be "trial" or "free"'),
    body('idempotencyKey')
      .optional()
      .isUUID()
      .withMessage('Idempotency key must be a valid UUID'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Invalid phone number'),
    body('timezone')
      .optional()
      .isString()
      .withMessage('Timezone must be a string'),
    body('industry')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Industry must be max 50 characters'),
    body('adminPassword')
      .optional()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const {
        companyName,
        adminEmail,
        adminName,
        adminPassword,
        plan,
        idempotencyKey,
        phone,
        timezone,
        industry
      } = req.body;

      // Check idempotency - return cached result if exists
      if (idempotencyKey) {
        const cached = await onboardingService.checkIdempotency(idempotencyKey);
        if (cached) {
          console.log(`[Onboarding] Returning cached result for idempotency key: ${idempotencyKey}`);
          return res.status(200).json(cached);
        }
      }

      // Perform onboarding
      const result = await onboardingService.createTenant({
        companyName,
        adminEmail,
        adminName,
        adminPassword,
        plan,
        phone,
        timezone: timezone || 'UTC',
        industry,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        idempotencyKey
      });

      // Log successful onboarding
      console.log(`[Onboarding] New tenant created: ${result.tenantId} (${companyName})`);

      // Return success response
      const response = {
        success: true,
        tenantId: result.tenantId,
        adminUserId: result.adminUserId,
        loginUrl: result.loginUrl,
        message: adminPassword 
          ? 'Account created successfully. You can login now with your credentials.'
          : 'Tenant created successfully. Check your email for login instructions.',
        passwordSet: !!adminPassword
      };

      // Include temporary password only if auto-generated and in development
      if (!adminPassword && process.env.NODE_ENV !== 'production') {
        response.temporaryPassword = result.temporaryPassword;
      }

      // Include trial expiration if applicable
      if (result.trialExpiresAt) {
        response.trialExpiresAt = result.trialExpiresAt;
      }

      res.status(201).json(response);

    } catch (error) {
      console.error('[Onboarding] Error:', error);

      // Handle specific errors
      if (error.code === 'EMAIL_EXISTS') {
        return res.status(409).json({
          success: false,
          error: 'Email already registered',
          code: 'EMAIL_EXISTS'
        });
      }

      if (error.code === 'COMPANY_EXISTS') {
        return res.status(409).json({
          success: false,
          error: 'Company name already taken',
          code: 'COMPANY_EXISTS'
        });
      }

      if (error.code === 'RATE_LIMITED') {
        return res.status(429).json({
          success: false,
          error: 'Too many signup attempts',
          code: 'RATE_LIMITED'
        });
      }

      // Generic error
      res.status(500).json({
        success: false,
        error: 'Failed to create tenant',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * GET /api/onboard/check-email
 * 
 * Check if email is already registered
 */
router.get('/check-email',
  [
    body('email').isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const exists = await onboardingService.checkEmailExists(email);
      
      res.json({
        available: !exists,
        email
      });
    } catch (error) {
      console.error('[Onboarding] Check email error:', error);
      res.status(500).json({ error: 'Failed to check email' });
    }
  }
);

/**
 * GET /api/onboard/check-company
 * 
 * Check if company name is already taken
 */
router.get('/check-company', async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: 'Company name required' });
    }

    const exists = await onboardingService.checkCompanyExists(name);
    
    res.json({
      available: !exists,
      companyName: name
    });
  } catch (error) {
    console.error('[Onboarding] Check company error:', error);
    res.status(500).json({ error: 'Failed to check company name' });
  }
});

/**
 * POST /api/onboard/resend-welcome
 * 
 * Resend welcome email to tenant admin
 */
router.post('/resend-welcome',
  [
    body('email').isEmail().normalizeEmail(),
    body('tenantId').isUUID()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid request', details: errors.array() });
      }

      const { email, tenantId } = req.body;

      await onboardingService.resendWelcomeEmail(tenantId, email);

      res.json({
        success: true,
        message: 'Welcome email resent successfully'
      });
    } catch (error) {
      console.error('[Onboarding] Resend email error:', error);
      res.status(500).json({ error: 'Failed to resend email' });
    }
  }
);

/**
 * GET /api/onboard/status/:tenantId
 * 
 * Check onboarding/provisioning status
 */
router.get('/status/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const status = await onboardingService.getProvisioningStatus(tenantId);

    if (!status) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('[Onboarding] Status check error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

module.exports = router;
