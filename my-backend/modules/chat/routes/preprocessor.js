/**
 * Preprocessor API Routes
 * Endpoints: /preprocess, /accept_corrections, /dictionary
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { 
  preprocess, 
  acceptCorrections, 
  addToDictionary, 
  addToUserDictionary,
  searchDictionary 
} = require('../../../services/chat/preprocessor');

// Database connection for user lookups
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Middleware to extract user from request (allows guest access)
 * Supports: JWT in cookies, Authorization header, x-user-id header
 */
const extractUser = async (req, res, next) => {
  try {
    let userId = null;
    let role = 'guest';
    
    // Try to extract from JWT in cookies
    if (req.cookies?.access_token) {
      try {
        const token = req.cookies.access_token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        userId = decoded.id || decoded.userId;
        role = decoded.role || 'guest';
      } catch (jwtError) {
        // Silent fail - continue as guest
      }
    }
    
    // Try Authorization header
    if (!userId && req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        userId = decoded.id || decoded.userId;
        role = decoded.role || 'guest';
      } catch (jwtError) {
        // Silent fail - continue as guest
      }
    }
    
    // Try x-user-id header (for internal calls)
    if (!userId && req.headers['x-user-id']) {
      userId = parseInt(req.headers['x-user-id']);
    }
    
    // Try request body userId
    if (!userId && req.body?.userId) {
      userId = parseInt(req.body.userId);
    }
    
    // Lookup user role from DB if we have userId but no role
    if (userId && role === 'guest') {
      try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (result.rows.length > 0) {
          role = result.rows[0].role;
        }
      } catch (dbError) {
        // Silent fail - use guest role
      }
    }
    
    // Set user on request
    req.user = { id: userId, role };
    next();
  } catch (error) {
    console.warn('[Preprocessor] User extraction failed:', error.message);
    req.user = { id: null, role: 'guest' };
    next();
  }
};

// Apply user extraction middleware to all routes
router.use(extractUser);

/**
 * POST /api/chat/preprocess
 * Main preprocessing endpoint
 * 
 * Request: { text, options: { autocorrect, rephrase } }
 * Response: { original, normalized, suggestions, rephraseOptions, finalText, auditId }
 */
router.post('/preprocess', async (req, res) => {
  try {
    const { text, options = {} } = req.body;
    const userId = req.user?.id || null;
    const role = req.user?.role || 'guest';

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Text is required' 
      });
    }

    // Limit text length for security
    const maxLength = 5000;
    const truncatedText = text.slice(0, maxLength);

    const result = await preprocess(truncatedText, userId, role, {
      autocorrect: options.autocorrect === true,
      rephrase: options.rephrase !== false // Default true
    });

    res.json({
      success: true,
      data: {
        original: result.original,
        normalized: result.normalized,
        finalText: result.finalText,
        suggestions: result.suggestions,
        rephraseOptions: result.rephraseOptions,
        protectedSpans: result.protectedSpans,
        languageDetected: result.languageDetected,
        auditId: result.auditId,
        hasSuggestions: result.suggestions.length > 0,
        suggestionCount: result.suggestions.length
      }
    });

  } catch (error) {
    console.error('[Preprocess API] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Preprocessing failed' 
    });
  }
});

/**
 * POST /api/chat/preprocess/accept
 * Accept corrections from suggestions
 * 
 * Request: { auditId, acceptedIndices: [0, 2, 3] }
 * Response: { finalText, acceptedCorrections }
 */
router.post('/preprocess/accept', async (req, res) => {
  try {
    const { auditId, acceptedIndices } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!auditId || !Array.isArray(acceptedIndices)) {
      return res.status(400).json({ 
        success: false, 
        error: 'auditId and acceptedIndices array required' 
      });
    }

    const result = await acceptCorrections(userId, auditId, acceptedIndices);

    if (result.error) {
      return res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[Accept Corrections API] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to accept corrections' 
    });
  }
});

/**
 * GET /api/chat/dictionary
 * Search the spelling dictionary
 * 
 * Query: ?query=bisman&limit=10
 */
router.get('/dictionary', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query must be at least 2 characters' 
      });
    }

    const results = await searchDictionary(query, parseInt(limit));

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('[Dictionary Search API] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Search failed' 
    });
  }
});

/**
 * POST /api/chat/dictionary
 * Add term to dictionary (admin only)
 * 
 * Request: { term, aliases, category }
 */
router.post('/dictionary', async (req, res) => {
  try {
    const { term, aliases = [], category = 'general' } = req.body;
    const userId = req.user?.id;
    const role = req.user?.role;

    // Check admin permission
    if (!['admin', 'super_admin', 'system_admin'].includes(role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    if (!term || term.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Term must be at least 2 characters' 
      });
    }

    const result = await addToDictionary(term, aliases, category, userId);

    if (result.error) {
      return res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }

    res.json({
      success: true,
      message: `Term "${term}" added to dictionary`
    });

  } catch (error) {
    console.error('[Add Dictionary API] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add term' 
    });
  }
});

/**
 * POST /api/chat/dictionary/personal
 * Add term to user's personal dictionary
 * 
 * Request: { term, replacement?, ignoreSpellcheck? }
 */
router.post('/dictionary/personal', async (req, res) => {
  try {
    const { term, replacement, ignoreSpellcheck = false } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!term || term.length < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Term is required' 
      });
    }

    const result = await addToUserDictionary(userId, term, replacement, ignoreSpellcheck);

    if (result.error) {
      return res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }

    res.json({
      success: true,
      message: ignoreSpellcheck 
        ? `"${term}" added to ignore list`
        : `"${term}" → "${replacement}" added to personal dictionary`
    });

  } catch (error) {
    console.error('[Personal Dictionary API] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add term' 
    });
  }
});

/**
 * POST /api/chat/dictionary/feedback
 * User feedback on wrong correction
 * 
 * Request: { auditId, correctionIndex, feedback: 'wrong'|'correct' }
 */
router.post('/dictionary/feedback', async (req, res) => {
  try {
    const { auditId, correctionIndex, feedback, originalTerm } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // If user says correction was wrong, add to their ignore list
    if (feedback === 'wrong' && originalTerm) {
      await addToUserDictionary(userId, originalTerm, null, true);
    }

    // Log feedback for quality monitoring
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    await pool.query(`
      UPDATE preprocessor_audit 
      SET corrections = corrections || $1::jsonb
      WHERE id = $2 AND user_id = $3
    `, [
      JSON.stringify({ feedbackIndex: correctionIndex, feedback }),
      auditId,
      userId
    ]);

    res.json({
      success: true,
      message: 'Feedback recorded'
    });

  } catch (error) {
    console.error('[Dictionary Feedback API] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to record feedback' 
    });
  }
});

/**
 * GET /api/chat/preprocess/settings
 * Get user's spellcheck settings
 */
router.get('/preprocess/settings', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Get user settings or global defaults
    const result = await pool.query(`
      SELECT * FROM spellcheck_settings 
      WHERE (owner_type = 'user' AND owner_id = $1)
         OR owner_type = 'global'
      ORDER BY owner_type DESC
      LIMIT 1
    `, [userId]);

    const settings = result.rows[0] || {
      autocorrect_enabled: false,
      autocorrect_threshold: 0.98,
      suggestion_threshold: 0.70,
      rephrase_enabled: true,
      show_corrections_inline: true
    };

    res.json({
      success: true,
      data: {
        autocorrectEnabled: settings.autocorrect_enabled,
        autocorrectThreshold: parseFloat(settings.autocorrect_threshold),
        suggestionThreshold: parseFloat(settings.suggestion_threshold),
        rephraseEnabled: settings.rephrase_enabled,
        showCorrectionsInline: settings.show_corrections_inline
      }
    });

  } catch (error) {
    console.error('[Settings API] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get settings' 
    });
  }
});

/**
 * PUT /api/chat/preprocess/settings
 * Update user's spellcheck settings
 */
router.put('/preprocess/settings', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { 
      autocorrectEnabled, 
      rephraseEnabled, 
      showCorrectionsInline 
    } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    await pool.query(`
      INSERT INTO spellcheck_settings (owner_type, owner_id, autocorrect_enabled, rephrase_enabled, show_corrections_inline)
      VALUES ('user', $1, $2, $3, $4)
      ON CONFLICT (owner_type, owner_id) DO UPDATE SET
        autocorrect_enabled = EXCLUDED.autocorrect_enabled,
        rephrase_enabled = EXCLUDED.rephrase_enabled,
        show_corrections_inline = EXCLUDED.show_corrections_inline,
        updated_at = now()
    `, [userId, autocorrectEnabled, rephraseEnabled, showCorrectionsInline]);

    res.json({
      success: true,
      message: 'Settings updated'
    });

  } catch (error) {
    console.error('[Update Settings API] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update settings' 
    });
  }
});

module.exports = router;
