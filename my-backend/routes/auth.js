const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Use shared Prisma getter to avoid crashing when DATABASE_URL is missing locally
const { getPrisma } = require('../lib/prisma');
const { AppError, ERROR_CODES, asyncHandler } = require('../middleware/errorHandler');
const { auditService } = require('../services/auditService');
// Security: Brute force protection with CAPTCHA
const { loginBruteForceProtection } = require('../middleware/bruteForceProtection');
// Rate limiter import removed - all rate limiting disabled for development
// Note: sanitizeInput not used on login - would break existing users with legacy passwords

let prisma = null;
try {
  prisma = getPrisma();
} catch {
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
 * Protected by brute force detection with CAPTCHA requirement when threshold exceeded
 */
router.post('/login', loginBruteForceProtection, asyncHandler(async (req, res) => {
  const { email: rawEmail, password } = req.body;

  // Validation
  if (!rawEmail || !password) {
    throw new AppError(
      'Email and password are required',
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      400
    );
  }

  // Normalize email to lowercase for case-insensitive lookup
  const email = rawEmail.toLowerCase().trim();
  
  console.log(`🔐 Login attempt for: ${email}`);

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
          prisma.enterprise_admins.findUnique({ where: { email } }),
          3000 // 3 second timeout
        );
      } catch (e) {
        console.warn('[auth.routes] enterpriseAdmin lookup failed/timeout, continuing:', e.message);
      }
    }

    if (enterpriseAdmin && enterpriseAdmin.is_active) {
      let isValidPassword = false;
      try {
        // Use password_hash column (renamed from password for clarity)
        const passwordHash = enterpriseAdmin.password_hash || enterpriseAdmin.password;
        isValidPassword = typeof passwordHash === 'string' && passwordHash.length > 0 
          ? bcrypt.compareSync(password, passwordHash)
          : false;
      } catch {
        console.warn('⚠️ Password compare failed for Enterprise Admin (likely missing/invalid hash)');
        isValidPassword = false;
      }
      
      if (isValidPassword) {
        console.log('✅ Authenticated as Enterprise Admin');
        
        // Log successful login
        auditService.logLoginAttempt(true, email, req.ip, {
          userType: 'ENTERPRISE_ADMIN',
          userId: enterpriseAdmin.id
        }).catch(() => {}); // Don't block on audit logging
        
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
          name: enterpriseAdmin.name,
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
          prisma.super_admins.findUnique({ where: { email } }),
          3000 // 3 second timeout
        );
      } catch (e) {
        console.warn('[auth.routes] superAdmin lookup failed/timeout, continuing:', e.message);
      }
    }

    if (superAdmin && superAdmin.is_active) {
      let isValidPassword = false;
      try {
        // Use password_hash column (renamed from password for clarity)
        const passwordHash = superAdmin.password_hash || superAdmin.password;
        isValidPassword = typeof passwordHash === 'string' && passwordHash.length > 0 
          ? bcrypt.compareSync(password, passwordHash)
          : false;
      } catch {
        console.warn('⚠️ Password compare failed for Super Admin (likely missing/invalid hash)');
        isValidPassword = false;
      }
      
      if (isValidPassword) {
        console.log('✅ Authenticated as Super Admin');

        // Log successful login
        auditService.logLoginAttempt(true, email, req.ip, {
          userType: 'SUPER_ADMIN',
          userId: superAdmin.id
        }).catch(() => {}); // Don't block on audit logging

        // Get assigned modules with page permissions
        let moduleAssignments = [];
        try {
          moduleAssignments = await prisma.module_assignments.findMany({
            where: { super_admin_id: superAdmin.id },
            include: { modules: true }
          });
        } catch (e) {
          console.warn('[auth.routes] Module assignments lookup failed:', e.message);
        }

        const assignedModules = moduleAssignments.map(ma => ma.modules?.module_name).filter(Boolean);
        
        // Build pagePermissions object: { moduleName: [pageIds] }
        const pagePermissions = {};
        moduleAssignments.forEach(ma => {
          const moduleName = ma.modules?.module_name;
          if (moduleName) {
            const pages = ma.page_permissions || [];
            pagePermissions[moduleName] = pages;
          }
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
          name: superAdmin.name,
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
    // CANONICAL: Only query users_enhanced table (see docs/CANONICAL_USER_RESOLUTION.md)
    // Legacy fallback REMOVED as of 2026-01-12 - see scripts/decommission/STEP5_AUTH_REFACTOR.md
    let regularUser = null;
    if (prisma) {
      try {
        // Use findFirst since email is not unique in multi-tenant schema (unique is tenant_id + email)
        regularUser = await withTimeout(
          prisma.users_enhanced.findFirst({ where: { email } }),
          3000 // 3 second timeout
        );
        
        if (regularUser) {
          console.log('[auth.routes] Found user in users_enhanced:', email);
        } else {
          // IMPORTANT: No fallback to legacy table!
          // If user not found, log structured warning for debugging
          console.warn('[auth.routes] User not found in users_enhanced:', email);
        }
      } catch (e) {
        console.error('[auth.routes] CRITICAL: users_enhanced lookup failed:', e.message);
        // Fail closed - do not try legacy table
        auditService.logLoginAttempt(false, email, req.ip, {
          error: 'database_error',
          message: e.message
        }).catch(() => {});
        
        return res.status(503).json({
          success: false,
          message: 'Authentication service temporarily unavailable. Please try again.',
          code: 'AUTH_DB_ERROR'
        });
      }
    }

    if (regularUser) {
      console.log('[auth.routes] Found regularUser:', regularUser.email, 'hasPasswordHash:', !!regularUser.password_hash);
      let isValidPassword = false;
      try {
        // Use password_hash column (renamed from password for clarity)
        const passwordHash = regularUser.password_hash || regularUser.password;
        console.log('[auth.routes] Password hash type:', typeof passwordHash, 'length:', passwordHash?.length || 0);
        isValidPassword = typeof passwordHash === 'string' && passwordHash.length > 0 
          ? bcrypt.compareSync(password, passwordHash)
          : false;
        console.log('[auth.routes] Password validation result:', isValidPassword);
      } catch (e) {
        console.warn('⚠️ Password compare failed for Regular User (likely missing/invalid hash):', e.message);
        isValidPassword = false;
      }
      
      if (isValidPassword) {
        // Ensure we have a stable user id for JWT (UUID). In some cases, id may be missing
        // if the lookup used a non-unique field after schema changes.
        let safeUserId = regularUser.id || null;
        try {
          if (!safeUserId && prisma?.users_enhanced) {
            const idLookup = await prisma.users_enhanced.findFirst({
              where: { email },
              select: { id: true }
            });
            if (idLookup?.id) safeUserId = idLookup.id;
          }
        } catch (e) {
          console.warn('[auth.routes] Fallback id lookup failed:', e.message);
        }
        // Final fallback: derive a surrogate id from email to avoid null in JWT
        if (!safeUserId && email) {
          safeUserId = `email:${email}`;
        }

        // Determine userType based on role - ADMIN users get userType: 'ADMIN'
        const userTypeValue = regularUser.role === 'ADMIN' ? 'ADMIN' : 'USER';
        console.log(`✅ Authenticated as ${userTypeValue} (role: ${regularUser.role})`);

        // Fetch tenant/client info for splash screen branding
        let tenantInfo = null;
        if (regularUser.tenant_id && prisma) {
          try {
            tenantInfo = await prisma.clients.findUnique({
              where: { id: regularUser.tenant_id },
              select: { 
                id: true, 
                name: true, 
                trade_name: true,
                logo: true,
                settings: true,
                client_code: true
              }
            });
          } catch (e) {
            console.warn('[auth.routes] Failed to fetch tenant info:', e.message);
          }
        }
        
        // Extract primary color from settings if available
        const clientSettings = tenantInfo?.settings || {};
        const primaryColor = clientSettings.primaryColor || clientSettings.themeColor || null;

        // Log successful login
        auditService.logLoginAttempt(true, email, req.ip, {
          userType: userTypeValue,
          userId: regularUser.id,
          role: regularUser.role,
          tenantId: regularUser.tenant_id
        }).catch(() => {}); // Don't block on audit logging

        authData = {
          id: safeUserId,
          email: regularUser.email,
          username: regularUser.username,
          name: regularUser.username,
          role: regularUser.role,
          userType: userTypeValue,
          productType: regularUser.productType || 'BUSINESS_ERP',
          tenant_id: regularUser.tenant_id,
          super_admin_id: regularUser.super_admin_id,
          assignedModules: regularUser.assignedModules || [],
          pagePermissions: regularUser.pagePermissions || {},
          profile_pic_url: regularUser.profile_pic_url,
          // Include tenant/client branding info for splash screen
          tenant_name: tenantInfo?.trade_name || tenantInfo?.name || null,
          clientName: tenantInfo?.trade_name || tenantInfo?.name || null,
          clientDisplayName: tenantInfo?.trade_name || tenantInfo?.name || null,
          clientLogo: tenantInfo?.logo || null,
          clientPrimaryColor: primaryColor
        };

        const accessToken = generateAccessToken({
          id: safeUserId,
          email: regularUser.email,
          name: regularUser.username,
          role: regularUser.role,
          userType: userTypeValue,
          productType: regularUser.productType,
          tenant_id: regularUser.tenant_id,
          super_admin_id: regularUser.super_admin_id
        });

        const refreshToken = generateRefreshToken({
          id: regularUser.id,
          email: regularUser.email,
          userType: userTypeValue
        });

        // Persist refresh token for regular users
        // Note: Skip session persistence for UUID users (user_sessions expects Int user_id)
        // Only legacy users with integer IDs can use the session table
        if (regularUser.isLegacyUser && typeof regularUser.id === 'number') {
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
    
    // Determine if user was found to provide specific error message
    const userFound = !!(enterpriseAdmin || superAdmin || regularUser);
    const errorMessage = userFound 
      ? 'Incorrect password. Please try again.'
      : 'No account found with this email address.';
    const errorCode = userFound ? 'INVALID_PASSWORD' : 'USER_NOT_FOUND';
    
    // Log failed login attempt
    auditService.logLoginAttempt(false, email, req.ip, {
      reason: errorMessage
    }).catch(() => {}); // Don't block on audit logging
    
    throw new AppError(
      errorMessage,
      errorCode,
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
  // SECURITY: Enforce strict cookie settings
  // - Secure: Always true in production (requires HTTPS)
  // - SameSite: Strict in production for CSRF protection, Lax in dev for cross-origin testing
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure = isProduction || process.env.FORCE_SECURE_COOKIES === 'true';
  const sameSitePolicy = isProduction ? 'strict' : 'lax';
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

  const cookieOptions = {
    httpOnly: true,           // Prevent XSS access to cookies
    secure: cookieSecure,     // Only send over HTTPS
    sameSite: sameSitePolicy, // CSRF protection
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
    'STORE_INCHARGE': '/dashboard',
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
      } catch {
        // Defensive: if user_sessions table doesn't exist yet in prod, don't crash logout
        console.warn('user_sessions.updateMany failed (likely missing table). Continuing logout.');
      }
    }

  // Clear cookies (both modern and legacy names)
  try { res.clearCookie('access_token', { path: '/' }); } catch { /* ignore */ }
  try { res.clearCookie('refresh_token', { path: '/' }); } catch { /* ignore */ }
  try { res.clearCookie('accessToken', { path: '/' }); } catch { /* ignore */ }
  try { res.clearCookie('refreshToken', { path: '/' }); } catch { /* ignore */ }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error during logout' });
  }
});

/**
 * Get current user's permissions (for sidebar)
 * Returns assigned modules and page permissions
 */
router.get('/me/permissions', async (req, res) => {
  try {
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    
    // Handle SUPER_ADMIN - BYPASS ALL DB QUERIES
    // SUPER_ADMIN is a platform-level role with unrestricted access
    if (decoded.userType === 'SUPER_ADMIN' || decoded.role === 'SUPER_ADMIN') {
      console.log('[me/permissions] SUPER_ADMIN detected - returning full access (no DB queries)');
      return res.json({
        success: true,
        user: {
          id: decoded.id,
          email: decoded.email || '',
          name: decoded.name || 'Super Admin',
          role: 'SUPER_ADMIN',
          userType: 'SUPER_ADMIN',
          permissions: {
            assignedModules: ['*'],
            pagePermissions: { '*': ['*'] },
            allPages: ['*']
          }
        },
        // Additional fields for compatibility
        role: 'SUPER_ADMIN',
        permissions: ['*'],
        modules: ['*'],
        allowedPages: ['*']
      });
    }
    
    // Handle ENTERPRISE_ADMIN
    if (decoded.userType === 'ENTERPRISE_ADMIN') {
      const enterpriseAdmin = await prisma.enterprise_admins.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
        }
      });

      if (!enterpriseAdmin) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Enterprise Admin has access to enterprise management module
      return res.json({
        success: true,
        user: {
          id: enterpriseAdmin.id,
          email: enterpriseAdmin.email,
          name: enterpriseAdmin.name,
          role: 'ENTERPRISE_ADMIN',
          userType: 'ENTERPRISE_ADMIN',
          permissions: {
            assignedModules: ['enterprise-management'],
            pagePermissions: {},
            allPages: []
          }
        }
      });
    }
    
    // Handle regular users
    const user = await prisma.users_enhanced.findFirst({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        assigned_modules: true,
        page_permissions: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Also fetch from rbac_user_permissions if available
    let rbacPages = [];
    try {
      const rbacPerms = await prisma.rbac_user_permissions.findMany({
        where: { user_id: user.id },
        select: { page_key: true }
      });
      rbacPages = rbacPerms.map(p => p.page_key);
    } catch {
      // Table might not exist
    }

    const allPages = [
      ...(user.pagePermissions || []),
      ...rbacPages
    ];

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.role,
        userType: 'USER',
        permissions: {
          assignedModules: user.assignedModules || [],
          pagePermissions: user.pagePermissions || {},
          allPages: [...new Set(allPages)]
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ message: 'Failed to fetch permissions', error: error.message });
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
      user = await prisma.enterprise_admins.findUnique({
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
      user = await prisma.super_admins.findUnique({
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
        let moduleAssignments = [];
        try {
          moduleAssignments = await prisma.module_assignments.findMany({
            where: { super_admin_id: user.id },
            include: { modules: true }
          });
        } catch (e) {
          console.warn('[auth/me] Module assignments lookup failed:', e.message);
        }
        user.assignedModules = moduleAssignments.map(ma => ma.modules?.module_name).filter(Boolean);
        user.role = 'SUPER_ADMIN';
        user.userType = 'SUPER_ADMIN';
      }
    } else {
      user = await prisma.users_enhanced.findFirst({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          product_type: true,
          tenant_id: true,
          super_admin_id: true,
          assigned_modules: true,
          page_permissions: true,
          profile_pic_url: true
        }
      });

      if (user) {
        user.name = user.username;
        user.userType = 'USER';
        
        // Fetch client branding info for splash screen
        if (user.tenant_id) {
          try {
            const client = await prisma.clients.findUnique({
              where: { id: user.tenant_id },
              select: {
                name: true,
                trade_name: true,
                logo: true,
                settings: true
              }
            });
            if (client) {
              const branding = client.settings?.branding || {};
              const clientSettings = client.settings || {};
              // Priority: settings.branding.display_name > trade_name > name
              user.clientDisplayName = branding.display_name || client.trade_name || client.name || null;
              user.clientName = user.clientDisplayName;
              user.tenant_name = user.clientDisplayName;
              user.clientLogo = branding.logo_url || client.logo || null;
              user.clientPrimaryColor = branding.theme_primary_color || clientSettings.primaryColor || clientSettings.themeColor || null;
            }
          } catch (clientErr) {
            console.warn('Failed to fetch client branding:', clientErr.message);
          }
        }
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
