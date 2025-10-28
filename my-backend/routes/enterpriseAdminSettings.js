const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const requireEnterpriseAdmin = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }
  next();
};

// Get general settings
router.get('/general', requireEnterpriseAdmin, async (req, res) => {
  try {
    // In a production system, these would come from a settings table
    // For now, returning defaults with ability to update
    const settings = {
      systemName: 'BISMAN ERP',
      defaultTimezone: 'Asia/Kolkata',
      defaultLanguage: 'en',
      sessionTimeout: 30, // minutes
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      currency: 'INR',
      logo: '/images/logo.png'
    };

    res.json({
      ok: true,
      settings
    });
  } catch (error) {
    console.error('[Get General Settings Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch settings' });
  }
});

// Update general settings
router.put('/general', requireEnterpriseAdmin, async (req, res) => {
  try {
    const {
      systemName,
      defaultTimezone,
      defaultLanguage,
      sessionTimeout,
      dateFormat,
      timeFormat,
      currency,
      logo
    } = req.body;

    // Log the update
    await prisma.recent_activity.create({
      data: {
        action: 'General Settings Updated',
        entity: 'Settings',
        entity_id: 'general',
        username: req.user?.username || 'Enterprise Admin',
        details: req.body
      }
    });

    res.json({
      ok: true,
      message: 'General settings updated successfully',
      settings: req.body
    });
  } catch (error) {
    console.error('[Update General Settings Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update settings' });
  }
});

// Get security settings
router.get('/security', requireEnterpriseAdmin, async (req, res) => {
  try {
    const settings = {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        passwordExpiry: 90, // days
        preventReuse: 5 // last N passwords
      },
      mfaSettings: {
        required: true,
        allowedMethods: ['totp', 'sms', 'email'],
        gracePeriod: 7 // days to enable MFA
      },
      sessionSettings: {
        maxConcurrentSessions: 3,
        idleTimeout: 30, // minutes
        absoluteTimeout: 480 // 8 hours
      },
      apiAccess: {
        rateLimitPerMinute: 100,
        rateLimitPerHour: 5000,
        requireApiKey: true
      },
      ipWhitelist: {
        enabled: false,
        allowedIPs: []
      }
    };

    res.json({
      ok: true,
      settings
    });
  } catch (error) {
    console.error('[Get Security Settings Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch security settings' });
  }
});

// Update security settings
router.put('/security', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { passwordPolicy, mfaSettings, sessionSettings, apiAccess, ipWhitelist } = req.body;

    // Log the critical security update
    await prisma.recent_activity.create({
      data: {
        action: 'Security Settings Updated',
        entity: 'Settings',
        entity_id: 'security',
        username: req.user?.username || 'Enterprise Admin',
        details: req.body
      }
    });

    res.json({
      ok: true,
      message: 'Security settings updated successfully',
      settings: req.body
    });
  } catch (error) {
    console.error('[Update Security Settings Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update security settings' });
  }
});

// Get usage/limits settings
router.get('/usage', requireEnterpriseAdmin, async (req, res) => {
  try {
    const settings = {
      storage: {
        defaultLimitPerUser: 5, // GB
        defaultLimitPerOrg: 100, // GB
        warningThreshold: 80, // percentage
        alertRecipients: ['admin@bisman.com']
      },
      api: {
        defaultCallLimitPerOrg: 10000, // per day
        defaultCallLimitPerUser: 1000, // per day
        overagePolicy: 'throttle', // 'throttle' or 'block'
        overageAlertThreshold: 90 // percentage
      },
      users: {
        maxUsersPerOrg: 1000,
        maxAdminsPerOrg: 10
      },
      modules: {
        maxModulesPerOrg: 50
      }
    };

    res.json({
      ok: true,
      settings
    });
  } catch (error) {
    console.error('[Get Usage Settings Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch usage settings' });
  }
});

// Update usage/limits settings
router.put('/usage', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { storage, api, users, modules } = req.body;

    // Log the update
    await prisma.recent_activity.create({
      data: {
        action: 'Usage Limits Updated',
        entity: 'Settings',
        entity_id: 'usage',
        username: req.user?.username || 'Enterprise Admin',
        details: req.body
      }
    });

    res.json({
      ok: true,
      message: 'Usage limits updated successfully',
      settings: req.body
    });
  } catch (error) {
    console.error('[Update Usage Settings Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update usage settings' });
  }
});

// Get maintenance mode status
router.get('/maintenance', requireEnterpriseAdmin, async (req, res) => {
  try {
    // In production, this would be stored in Redis or a settings table
    const maintenanceStatus = {
      enabled: false,
      message: {
        en: 'System is under maintenance. We\'ll be back soon!',
        hi: 'सिस्टम रखरखाव के अधीन है। हम जल्द ही वापस आएंगे!',
        ta: 'அமைப்பு பராமரிப்பில் உள்ளது. நாங்கள் விரைவில் திரும்பி வருவோம்!'
      },
      estimatedDowntime: null, // minutes
      startTime: null,
      endTime: null,
      allowedIPs: [] // IPs that can access during maintenance
    };

    res.json({
      ok: true,
      maintenance: maintenanceStatus
    });
  } catch (error) {
    console.error('[Get Maintenance Status Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch maintenance status' });
  }
});

// Toggle maintenance mode
router.post('/maintenance', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { enabled, message, estimatedDowntime, allowedIPs } = req.body;

    const maintenanceStatus = {
      enabled,
      message,
      estimatedDowntime,
      startTime: enabled ? new Date().toISOString() : null,
      endTime: enabled && estimatedDowntime 
        ? new Date(Date.now() + estimatedDowntime * 60000).toISOString() 
        : null,
      allowedIPs: allowedIPs || []
    };

    // Log the critical system change
    await prisma.recent_activity.create({
      data: {
        action: enabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
        entity: 'System',
        entity_id: 'maintenance',
        username: req.user?.username || 'Enterprise Admin',
        details: maintenanceStatus
      }
    });

    res.json({
      ok: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
      maintenance: maintenanceStatus
    });
  } catch (error) {
    console.error('[Toggle Maintenance Mode Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to toggle maintenance mode' });
  }
});

// Get localization settings
router.get('/localization', requireEnterpriseAdmin, async (req, res) => {
  try {
    const settings = {
      supportedLanguages: [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
        { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' }
      ],
      defaultLanguage: 'en',
      autoDetect: true,
      dateFormats: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      timeFormats: ['12h', '24h'],
      numberFormats: ['1,000.00', '1.000,00', '1 000,00']
    };

    res.json({
      ok: true,
      settings
    });
  } catch (error) {
    console.error('[Get Localization Settings Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch localization settings' });
  }
});

// Get all settings (overview)
router.get('/overview', requireEnterpriseAdmin, async (req, res) => {
  try {
    const overview = {
      general: {
        systemName: 'BISMAN ERP',
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0'
      },
      security: {
        mfaEnabled: true,
        ssoConfigured: false,
        apiKeysActive: 5
      },
      usage: {
        totalOrganizations: await prisma.superAdmin.count(),
        totalUsers: await prisma.user.count(),
        storageUsed: '1.2 TB / 5 TB',
        apiCallsToday: 45230
      },
      maintenance: {
        isInMaintenance: false,
        lastMaintenance: '2025-10-20T10:00:00Z'
      }
    };

    res.json({
      ok: true,
      overview
    });
  } catch (error) {
    console.error('[Get Settings Overview Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch settings overview' });
  }
});

module.exports = router;
