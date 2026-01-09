const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// Apply authenticate middleware to all routes
router.use(authenticate);

router.post('/preferences', async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const userRole = (req.user?.role || req.user?.roleName || req.user?.userType || '').toUpperCase();
    const { theme } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // For SUPER_ADMIN, just return success without DB update (they don't have a users table entry)
    if (userRole === 'SUPER_ADMIN') {
      return res.json({
        success: true,
        theme: theme || 'bisman-default',
        _bypass: 'SUPER_ADMIN'
      });
    }

    const prisma = getPrisma();
    const updatedUser = await prisma.users_enhanced.update({
      where: { id: userId },
      data: {
        theme_preference: theme
      }
    });

    res.json({
      success: true,
      theme: updatedUser.theme_preference
    });

  } catch (error) {
    console.error('[UserPreferences] Error saving theme:', error);
    // Return success anyway with default theme to prevent blocking UI
    res.json({
      success: true,
      theme: req.body?.theme || 'bisman-default',
      _fallback: true
    });
  }
});

router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const userRole = (req.user?.role || req.user?.roleName || req.user?.userType || '').toUpperCase();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // For SUPER_ADMIN, return default theme without DB query
    if (userRole === 'SUPER_ADMIN') {
      return res.json({
        success: true,
        theme: 'bisman-default',
        _bypass: 'SUPER_ADMIN'
      });
    }

    const prisma = getPrisma();
    const user = await prisma.users_enhanced.findUnique({
      where: { id: userId },
      select: {
        theme_preference: true
      }
    });

    res.json({
      success: true,
      theme: user?.theme_preference || 'bisman-default'
    });

  } catch (error) {
    console.error('[UserPreferences] Error loading theme:', error);
    // Return default theme on error to prevent blocking UI
    res.json({
      success: true,
      error: 'Failed to load theme preference',
      theme: 'bisman-default',
      _fallback: true
    });
  }
});

module.exports = router;
