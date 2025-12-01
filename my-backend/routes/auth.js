const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Use shared Prisma getter to avoid crashing when DATABASE_URL is missing locally
const { getPrisma } = require('../lib/prisma');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/errorHandler');
// Rate limiter import removed - all rate limiting disabled for development

let prisma = null;
try {
  prisma = getPrisma();
} catch (e) {
  console.warn('[auth.routes] Prisma not available, will use dev fallback if enabled');
  prisma = null;
}

const router = express.Router();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'dev_access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

/**
 * Generate Access Token with multi-tenant fields
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
}

/**
 * Generate Refresh Token
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

/**
 * Multi-Tenant Login Endpoint
 * Handles: Enterprise Admin, Super Admin, and Regular Users
 * RATE LIMITER REMOVED - No rate limiting in development
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new AppError(
      'Email and password are required',
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      400
    );
  }

  console.log(`🔐 Login attempt for: ${email}`);

    let user = null;
    let userType = null;
    let authData = null;

    // Helper to run queries with timeout
    const withTimeout = (promise, timeoutMs = 3000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), timeoutMs)
        )
      ]);
    };

    // 1. Try Enterprise Admin first (if DB available)
    let enterpriseAdmin = null;
    if (prisma) {
      try {
        enterpriseAdmin = await withTimeout(
          prisma.enterpriseAdmin.findUnique({ where: { email } }),
          3000 // 3 second timeout
        );
      } catch (e) {
        console.warn('[auth.routes] enterpriseAdmin lookup failed/timeout, continuing:', e.message);
      }
    }

    if (enterpriseAdmin && enterpriseAdmin.is_active) {
      let isValidPassword = false;
      try {
        isValidPassword = typeof enterpriseAdmin.password === 'string' && enterpriseAdmin.password.length > 0 
          ? bcrypt.compareSync(password, enterpriseAdmin.password)
          : false;
      } catch (e) {
        console.warn('⚠️ Password compare failed for Enterprise Admin (likely missing/invalid hash)');
        isValidPassword = false;
      }
      
      if (isValidPassword) {
        console.log('✅ Authenticated as Enterprise Admin');
        
        authData = {
          id: enterpriseAdmin.id,
          email: enterpriseAdmin.email,
          name: enterpriseAdmin.name,
          role: 'ENTERPRISE_ADMIN',
          userType: 'ENTERPRISE_ADMIN',
          productType: 'ALL',
          tenant_id: null,
          super_admin_id: null,
          assignedModules: [], // Enterprise Admin has access to all modules
          profile_pic_url: enterpriseAdmin.profile_pic_url
        };

        const accessToken = generateAccessToken({
          id: enterpriseAdmin.id,
          email: enterpriseAdmin.email,
          role: 'ENTERPRISE_ADMIN',
          userType: 'ENTERPRISE_ADMIN',
          productType: 'ALL'
        });

        const refreshToken = generateRefreshToken({
          id: enterpriseAdmin.id,
          email: enterpriseAdmin.email,
          userType: 'ENTERPRISE_ADMIN'
        });

        // Set cookies
        setCookies(res, accessToken, refreshToken);

        return res.json({
          success: true,
          message: 'Login successful',
          user: authData,
          accessToken,
          redirectPath: '/enterprise-admin/dashboard'
        });
      }
    }

    // 2. Try Super Admin (if DB available)
    let superAdmin = null;
    if (prisma) {
      try {
        superAdmin = await withTimeout(
          prisma.superAdmin.findUnique({ where: { email } }),
          3000 // 3 second timeout
        );
      } catch (e) {
        console.warn('[auth.routes] superAdmin lookup failed/timeout, continuing:', e.message);
      }
    }

    if (superAdmin && superAdmin.is_active) {
      let isValidPassword = false;
      try {
        isValidPassword = typeof superAdmin.password === 'string' && superAdmin.password.length > 0 
          ? bcrypt.compareSync(password, superAdmin.password)
          : false;
      } catch (e) {
        console.warn('⚠️ Password compare failed for Super Admin (likely missing/invalid hash)');
        isValidPassword = false;
      }
      
      if (isValidPassword) {
        console.log('✅ Authenticated as Super Admin');

        // Get assigned modules with page permissions
        const moduleAssignments = await prisma.moduleAssignment.findMany({
          where: { super_admin_id: superAdmin.id },
          include: { module: true }
        });

        const assignedModules = moduleAssignments.map(ma => ma.module.module_name);
        
        // Build pagePermissions object: { moduleName: [pageIds] }
        const pagePermissions = {};
        moduleAssignments.forEach(ma => {
          const moduleName = ma.module.module_name;
          const pages = ma.page_permissions || [];
          pagePermissions[moduleName] = pages;
        });

        authData = {
          id: superAdmin.id,
          email: superAdmin.email,
          name: superAdmin.name,
          role: 'SUPER_ADMIN',
          userType: 'SUPER_ADMIN',
          productType: superAdmin.productType,
          tenant_id: null,
          super_admin_id: superAdmin.id,
          assignedModules: assignedModules,
          pagePermissions: pagePermissions,
          profile_pic_url: superAdmin.profile_pic_url
        };

        const accessToken = generateAccessToken({
          id: superAdmin.id,
          email: superAdmin.email,
          role: 'SUPER_ADMIN',
          userType: 'SUPER_ADMIN',
          productType: superAdmin.productType
        });

        const refreshToken = generateRefreshToken({
          id: superAdmin.id,
          email: superAdmin.email,
          userType: 'SUPER_ADMIN'
        });

        // Set cookies
        setCookies(res, accessToken, refreshToken);

        return res.json({
          success: true,
          message: 'Login successful',
          user: authData,
          accessToken,
          redirectPath: '/super-admin/dashboard'
        });
      }
    }

    // 3. Try Regular User (if DB available)
    let regularUser = null;
    if (prisma) {
      try {
        regularUser = await withTimeout(
          prisma.user.findUnique({ where: { email } }),
          3000 // 3 second timeout
        );
      } catch (e) {
        console.warn('[auth.routes] regularUser lookup failed/timeout, continuing:', e.message);
      }
    }

    if (regularUser) {
      let isValidPassword = false;
      try {
        isValidPassword = typeof regularUser.password === 'string' && regularUser.password.length > 0 
          ? bcrypt.compareSync(password, regularUser.password)
          : false;
      } catch (e) {
        console.warn('⚠️ Password compare failed for Regular User (likely missing/invalid hash)');
        isValidPassword = false;
      }
      
      if (isValidPassword) {
        console.log('✅ Authenticated as Regular User');

        authData = {
          id: regularUser.id,
          email: regularUser.email,
          username: regularUser.username,
          name: regularUser.username,
          role: regularUser.role,
          userType: 'USER',
          productType: regularUser.productType || 'BUSINESS_ERP',
          tenant_id: regularUser.tenant_id,
          super_admin_id: regularUser.super_admin_id,
          assignedModules: regularUser.assignedModules || [],
          pagePermissions: regularUser.pagePermissions || {},
          profile_pic_url: regularUser.profile_pic_url
        };

        const accessToken = generateAccessToken({
          id: regularUser.id,
          email: regularUser.email,
          role: regularUser.role,
          userType: 'USER',
          productType: regularUser.productType,
          tenant_id: regularUser.tenant_id
        });

        const refreshToken = generateRefreshToken({
          id: regularUser.id,
          email: regularUser.email,
          userType: 'USER'
        });

        // Persist refresh token for regular users
        try {
          const crypto = require('crypto');
          const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
          const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          await prisma.user_sessions.create({
            data: {
              session_token: hashedToken,
              user_id: regularUser.id,
              expires_at: expiryDate,
              created_at: new Date(),
              is_active: true,
            },
          });
        } catch (dbError) {
          console.error('Failed to persist session:', dbError);
        }

        // Set cookies
        setCookies(res, accessToken, refreshToken);

        // Determine redirect path based on role
        const redirectPath = getRedirectPath(regularUser.role);

        return res.json({
          success: true,
          message: 'Login successful',
          user: authData,
          accessToken,
          redirectPath
        });
      }
    }

    // Invalid credentials - no fallback, database is the single source of truth
    console.log('❌ Invalid credentials for:', email);
    throw new AppError(
      'Invalid email or password',
      ERROR_CODES.INVALID_CREDENTIALS,
      401
    );
}));

// Provide a lightweight GET /auth/login informational response to silence 404 noise
router.get('/login', (req, res) => {
  return res.status(200).json({
    success: true,
    method: 'POST required',
    message: 'Use POST /api/auth/login with { email, password } to obtain tokens',
    fields: ['email','password'],
  })
})


/**
 * Set HTTP-only cookies for tokens
 */
function setCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure = isProduction;
  const sameSitePolicy = isProduction ? 'none' : 'lax';
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

  const cookieOptions = {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: sameSitePolicy,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };

  res.cookie('access_token', accessToken, { 
    ...cookieOptions, 
    maxAge: 60 * 60 * 1000  // 1 hour
  });
  
  res.cookie('refresh_token', refreshToken, { 
    ...cookieOptions, 
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  });
}

/**
 * Get redirect path based on user role
 */
function getRedirectPath(role) {
  const redirectPaths = {
    'ENTERPRISE_ADMIN': '/enterprise-admin/dashboard',
    'SUPER_ADMIN': '/super-admin/dashboard',
    'ADMIN': '/admin',
    'MANAGER': '/operations-manager',
    'CFO': '/cfo-dashboard',
    'FINANCE_CONTROLLER': '/finance-controller',
    'TREASURY': '/treasury',
    'ACCOUNTS': '/accounts',
    'ACCOUNTS_PAYABLE': '/accounts-payable',
    'BANKER': '/banker',
    'PROCUREMENT_OFFICER': '/procurement-officer',
    'STORE_INCHARGE': '/store-incharge',
    'COMPLIANCE': '/compliance-officer',
    'LEGAL': '/legal',
    'HUB_INCHARGE': '/hub-incharge',
    'IT_ADMIN': '/it-admin'
  };

  return redirectPaths[role] || '/dashboard';
}

/**
 * Logout endpoint
 */
router.post('/logout', async (req, res) => {
  try {
  // Prefer modern snake_case cookie names; keep legacy camelCase fallback
  const refreshToken = req.cookies?.refresh_token || req.cookies?.refreshToken;

    if (refreshToken) {
      // Revoke refresh token from database
      const crypto = require('crypto');
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
      try {
        await prisma.user_sessions.updateMany({
          where: { session_token: hashedToken },
          data: { is_active: false }
        });
      } catch (e) {
        // Defensive: if user_sessions table doesn't exist yet in prod, don't crash logout
        console.warn('user_sessions.updateMany failed (likely missing table). Continuing logout.');
      }
    }

  // Clear cookies (both modern and legacy names)
  try { res.clearCookie('access_token', { path: '/' }); } catch (e) {}
  try { res.clearCookie('refresh_token', { path: '/' }); } catch (e) {}
  try { res.clearCookie('accessToken', { path: '/' }); } catch (e) {}
  try { res.clearCookie('refreshToken', { path: '/' }); } catch (e) {}

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error during logout' });
  }
});

/**
 * Get current user info
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

    // Fetch user based on userType
    let user = null;

    if (decoded.userType === 'ENTERPRISE_ADMIN') {
      user = await prisma.enterpriseAdmin.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          profile_pic_url: true,
          is_active: true
        }
      });

      if (user) {
        user.role = 'ENTERPRISE_ADMIN';
        user.productType = 'ALL';
        user.userType = 'ENTERPRISE_ADMIN';
      }
    } else if (decoded.userType === 'SUPER_ADMIN') {
      user = await prisma.superAdmin.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          productType: true,
          profile_pic_url: true,
          is_active: true
        }
      });

      if (user) {
        const moduleAssignments = await prisma.moduleAssignment.findMany({
          where: { super_admin_id: user.id },
          include: { module: true }
        });
        user.assignedModules = moduleAssignments.map(ma => ma.module.module_name);
        user.role = 'SUPER_ADMIN';
        user.userType = 'SUPER_ADMIN';
      }
    } else {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          productType: true,
          tenant_id: true,
          super_admin_id: true,
          assignedModules: true,
          pagePermissions: true,
          profile_pic_url: true
        }
      });

      if (user) {
        user.name = user.username;
        user.userType = 'USER';
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
