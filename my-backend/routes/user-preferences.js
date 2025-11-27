const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const prisma = getPrisma();

router.post('/preferences', async (req, res) => {
  try {
    const userId = req.userId;
    const { theme } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const updatedUser = await prisma.users.update({
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
    res.status(500).json({
      success: false,
      error: 'Failed to save theme preference'
    });
  }
});

router.get('/preferences', async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const user = await prisma.users.findUnique({
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
    res.status(500).json({
      success: false,
      error: 'Failed to load theme preference',
      theme: 'bisman-default'
    });
  }
});

module.exports = router;
