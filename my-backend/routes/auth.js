const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    console.log(`🔐 Login attempt for: ${email}`);

    let user = null;
    let userType = null;
    let authData = null;

    // 1. Try Enterprise Admin first
    const enterpriseAdmin = await prisma.enterpriseAdmin.findUnique({
      where: { email }
    });

    if (enterpriseAdmin && enterpriseAdmin.is_active) {
      const isValidPassword = bcrypt.compareSync(password, enterpriseAdmin.password);
      
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
          message: 'Login successful',
          user: authData,
          accessToken,
          redirectPath: '/enterprise-admin/dashboard'
        });
      }
    }

    // 2. Try Super Admin
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { email }
    });

    if (superAdmin && superAdmin.is_active) {
      const isValidPassword = bcrypt.compareSync(password, superAdmin.password);
      
      if (isValidPassword) {
        console.log('✅ Authenticated as Super Admin');

        // Get assigned modules
        const moduleAssignments = await prisma.moduleAssignment.findMany({
          where: { super_admin_id: superAdmin.id },
          include: { module: true }
        });

        const assignedModules = moduleAssignments.map(ma => ma.module.module_name);

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
          message: 'Login successful',
          user: authData,
          accessToken,
          redirectPath: '/super-admin/dashboard'
        });
      }
    }

    // 3. Try Regular User
    const regularUser = await prisma.user.findUnique({
      where: { email }
    });

    if (regularUser) {
      const isValidPassword = bcrypt.compareSync(password, regularUser.password);
      
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
          message: 'Login successful',
          user: authData,
          accessToken,
          redirectPath
        });
      }
    }

    // If we reach here, credentials are invalid
    console.log('❌ Invalid credentials for:', email);
    return res.status(401).json({ 
      message: 'Invalid credentials' 
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ 
      message: 'An error occurred during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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
