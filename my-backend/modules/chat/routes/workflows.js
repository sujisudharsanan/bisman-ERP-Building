/**
 * =====================================================
 * WORKFLOW API ROUTES
 * Dynamic UI navigation and help system for chat
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'BISMAN',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });

/**
 * GET /api/workflows
 * Search workflows by query, tags, or module
 * Enforces RBAC - only returns workflows accessible to user's role
 */
router.get('/', async (req, res) => {
  try {
    const { query, module, tag, role, limit = 5 } = req.query;
    const userRole = role || req.headers['x-user-role'] || 'EMPLOYEE';
    
    let sql = `
      SELECT 
        w.id, w.slug, w.module, w.title, w.description,
        w.ui_path, w.ui_path_mobile, w.ui_steps,
        w.required_roles, w.frontend_route,
        w.tags, w.keywords, w.examples, w.priority,
        w.screenshot_url, w.video_url
      FROM workflows w
      WHERE w.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // RBAC: Filter by user's role
    sql += ` AND (w.required_roles @> $${paramIndex}::jsonb OR w.required_roles = '[]'::jsonb)`;
    params.push(JSON.stringify([userRole]));
    paramIndex++;
    
    // Search by query (title, keywords, tags)
    if (query) {
      sql += ` AND (
        w.title ILIKE $${paramIndex} 
        OR w.description ILIKE $${paramIndex}
        OR EXISTS (SELECT 1 FROM unnest(w.keywords) k WHERE k ILIKE $${paramIndex})
        OR EXISTS (SELECT 1 FROM unnest(w.tags) t WHERE t ILIKE $${paramIndex})
        OR w.slug ILIKE $${paramIndex}
      )`;
      params.push(`%${query}%`);
      paramIndex++;
    }
    
    // Filter by module
    if (module) {
      sql += ` AND w.module = $${paramIndex}`;
      params.push(module.toUpperCase());
      paramIndex++;
    }
    
    // Filter by tag
    if (tag) {
      sql += ` AND $${paramIndex} = ANY(w.tags)`;
      params.push(tag.toLowerCase());
      paramIndex++;
    }
    
    // Order by relevance and priority
    sql += ` ORDER BY 
      CASE WHEN w.slug = $${paramIndex} THEN 0 ELSE 1 END,
      w.priority DESC,
      w.title ASC
      LIMIT $${paramIndex + 1}
    `;
    params.push(query || '');
    params.push(parseInt(limit));
    
    const result = await pool.query(sql, params);
    
    res.json({
      success: true,
      count: result.rows.length,
      workflows: result.rows.map(w => ({
        ...w,
        ui_steps: w.ui_steps || [],
        required_roles: w.required_roles || [],
        examples: w.examples || [],
        tags: w.tags || [],
        keywords: w.keywords || []
      }))
    });
    
  } catch (error) {
    console.error('[Workflows API] Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/workflows/:slug
 * Get a specific workflow by slug
 * Enforces RBAC
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const userRole = req.query.role || req.headers['x-user-role'] || 'EMPLOYEE';
    
    const result = await pool.query(`
      SELECT 
        w.id, w.slug, w.module, w.title, w.description,
        w.ui_path, w.ui_path_mobile, w.ui_steps,
        w.required_roles, w.frontend_route,
        w.tags, w.keywords, w.examples, w.priority,
        w.screenshot_url, w.video_url
      FROM workflows w
      WHERE w.slug = $1 AND w.is_active = true
    `, [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Workflow not found' 
      });
    }
    
    const workflow = result.rows[0];
    
    // Check RBAC
    const allowedRoles = workflow.required_roles || [];
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Your role does not have access to this workflow',
        allowedRoles: allowedRoles
      });
    }
    
    res.json({
      success: true,
      workflow: {
        ...workflow,
        ui_steps: workflow.ui_steps || [],
        required_roles: workflow.required_roles || [],
        examples: workflow.examples || [],
        tags: workflow.tags || [],
        keywords: workflow.keywords || []
      }
    });
    
  } catch (error) {
    console.error('[Workflows API] Get error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/workflows/search
 * Advanced search with NLP-like matching
 * Used by chat engine
 */
router.post('/search', async (req, res) => {
  try {
    const { query, intent, tags, role, limit = 3 } = req.body;
    const userRole = role || req.headers['x-user-role'] || 'EMPLOYEE';
    
    // Build search query with text similarity
    const result = await pool.query(`
      WITH search_results AS (
        SELECT 
          w.*,
          -- Calculate relevance score
          (
            CASE WHEN w.slug = $1 THEN 100 ELSE 0 END +
            CASE WHEN w.title ILIKE '%' || $2 || '%' THEN 50 ELSE 0 END +
            CASE WHEN w.description ILIKE '%' || $2 || '%' THEN 20 ELSE 0 END +
            CASE WHEN EXISTS (SELECT 1 FROM unnest(w.keywords) k WHERE $2 ILIKE '%' || k || '%') THEN 40 ELSE 0 END +
            CASE WHEN EXISTS (SELECT 1 FROM unnest(w.tags) t WHERE t = ANY($3::text[])) THEN 30 ELSE 0 END +
            w.priority
          ) as relevance_score
        FROM workflows w
        WHERE w.is_active = true
          AND (w.required_roles @> $4::jsonb OR w.required_roles = '[]'::jsonb)
      )
      SELECT * FROM search_results
      WHERE relevance_score > 0
      ORDER BY relevance_score DESC
      LIMIT $5
    `, [
      intent || '',
      query || '',
      tags || [],
      JSON.stringify([userRole]),
      parseInt(limit)
    ]);
    
    res.json({
      success: true,
      count: result.rows.length,
      workflows: result.rows.map(w => ({
        id: w.id,
        slug: w.slug,
        module: w.module,
        title: w.title,
        description: w.description,
        ui_path: w.ui_path,
        ui_path_mobile: w.ui_path_mobile,
        ui_steps: w.ui_steps || [],
        frontend_route: w.frontend_route,
        required_roles: w.required_roles || [],
        examples: w.examples || [],
        relevance: w.relevance_score
      }))
    });
    
  } catch (error) {
    console.error('[Workflows API] Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/workflows/audit
 * Log workflow usage for compliance and analytics
 */
router.post('/audit', async (req, res) => {
  try {
    const { userId, workflowId, query, resolved, response, details } = req.body;
    const userRole = req.headers['x-user-role'] || 'EMPLOYEE';
    
    const result = await pool.query(`
      INSERT INTO workflow_audit (user_id, workflow_id, user_role, query, resolved, response, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      userId || 0,
      workflowId,
      userRole,
      query,
      resolved !== false,
      response,
      JSON.stringify(details || {})
    ]);
    
    res.json({
      success: true,
      auditId: result.rows[0].id
    });
    
  } catch (error) {
    console.error('[Workflows API] Audit error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/workflows/feedback
 * Record user feedback on workflow help
 */
router.post('/feedback', async (req, res) => {
  try {
    const { workflowId, userId, helpful, comment } = req.body;
    
    const result = await pool.query(`
      INSERT INTO workflow_feedback (workflow_id, user_id, helpful, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [workflowId, userId || 0, helpful, comment]);
    
    res.json({
      success: true,
      feedbackId: result.rows[0].id
    });
    
  } catch (error) {
    console.error('[Workflows API] Feedback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/workflows/modules/list
 * Get list of all modules with workflow counts
 */
router.get('/modules/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT module, COUNT(*) as workflow_count
      FROM workflows
      WHERE is_active = true
      GROUP BY module
      ORDER BY module
    `);
    
    res.json({
      success: true,
      modules: result.rows
    });
    
  } catch (error) {
    console.error('[Workflows API] Modules error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
