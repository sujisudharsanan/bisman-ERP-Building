/**
 * 🎯 BISMAN ERP – Support Playbooks API
 * 
 * Provides CRUD operations for support playbooks.
 * 
 * Access:
 * - READ: All BISMAN staff roles
 * - CREATE/UPDATE/DELETE: ENTERPRISE_ADMIN only
 * 
 * Routes:
 * - GET    /api/internal/playbooks       - List all playbooks
 * - GET    /api/internal/playbooks/:id   - Get single playbook
 * - POST   /api/internal/playbooks       - Create playbook (ENTERPRISE_ADMIN)
 * - PUT    /api/internal/playbooks/:id   - Update playbook (ENTERPRISE_ADMIN)
 * - DELETE /api/internal/playbooks/:id   - Delete playbook (ENTERPRISE_ADMIN)
 */

const express = require('express');
const router = express.Router();

// ============================================
// MIDDLEWARE
// ============================================

const { authenticateToken } = require('../middleware/auth');

// BISMAN staff roles that can view playbooks
const BISMAN_STAFF_ROLES = [
  'BISMAN_FINANCE',
  'BISMAN_BILLING', 
  'BISMAN_SUPPORT',
  'BISMAN_ENGINEERING',
  'BISMAN_CUSTOMER_CARE',
  'ENTERPRISE_ADMIN',
];

// Only ENTERPRISE_ADMIN can manage playbooks
const ADMIN_ROLES = ['ENTERPRISE_ADMIN'];

/**
 * Middleware: Require BISMAN staff role
 */
function requireBismanStaff(req, res, next) {
  const userRole = req.user?.role;
  
  if (!userRole || !BISMAN_STAFF_ROLES.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'This resource is only accessible to BISMAN staff',
    });
  }
  
  next();
}

/**
 * Middleware: Require ENTERPRISE_ADMIN role
 */
function requireEnterpriseAdmin(req, res, next) {
  const userRole = req.user?.role;
  
  if (!userRole || !ADMIN_ROLES.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Only ENTERPRISE_ADMIN can manage playbooks',
    });
  }
  
  next();
}

// ============================================
// DEFAULT PLAYBOOKS DATA
// ============================================

// In-memory storage (in production, use database)
const playbooks = [
  {
    id: 'client-access-issue',
    title: 'Client Access Issue',
    category: 'access',
    situation: 'A customer reports they cannot log in or access their account.',
    steps: [
      { step: 1, action: 'Verify customer identity', auditRequired: true },
      { step: 2, action: 'Check account status', auditRequired: true },
      { step: 3, action: 'Review recent login attempts', auditRequired: false },
      { step: 4, action: 'Identify root cause', auditRequired: false },
      { step: 5, action: 'Apply appropriate fix', auditRequired: true },
      { step: 6, action: 'Confirm access restored', auditRequired: true },
      { step: 7, action: 'Document resolution', auditRequired: true },
    ],
    rules: [
      { type: 'do', text: 'Always verify customer identity before making changes' },
      { type: 'do', text: 'Document every action in the support ticket' },
      { type: 'dont', text: 'Never share passwords verbally or via email' },
      { type: 'dont', text: 'Never skip identity verification' },
    ],
    auditNotes: [
      'Every password reset must be logged with reason',
      'Account unlocks must include lockout cause',
    ],
    relatedLinks: ['Support Sessions', 'Audit Logs'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  },
  {
    id: 'billing-dispute',
    title: 'Billing Dispute',
    category: 'billing',
    situation: 'A customer disputes a charge or claims overcharge.',
    steps: [
      { step: 1, action: 'Listen and acknowledge', auditRequired: false },
      { step: 2, action: 'Verify customer identity', auditRequired: true },
      { step: 3, action: 'Pull up transaction history', auditRequired: true },
      { step: 4, action: 'Compare against subscription', auditRequired: false },
      { step: 5, action: 'Identify if error occurred', auditRequired: false },
      { step: 6, action: 'Escalate to Finance if needed', auditRequired: true },
      { step: 7, action: 'Communicate resolution timeline', auditRequired: true },
    ],
    rules: [
      { type: 'do', text: 'Always pull up actual transaction data' },
      { type: 'do', text: 'Escalate to Finance for refunds over $100' },
      { type: 'dont', text: 'Never promise refund without Finance approval' },
      { type: 'dont', text: 'Never modify billing records directly' },
    ],
    auditNotes: [
      'All billing inquiries must be logged with amount',
      'Refund requests must include approval chain',
    ],
    relatedLinks: ['Audit Logs', 'Support Sessions'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  },
  {
    id: 'support-session-initiation',
    title: 'Support Session Initiation',
    category: 'support',
    situation: 'You need to access a customer account to investigate an issue.',
    steps: [
      { step: 1, action: 'Confirm valid support ticket', auditRequired: true },
      { step: 2, action: 'Explain what you will do', auditRequired: true },
      { step: 3, action: 'Start time-limited session', auditRequired: true },
      { step: 4, action: 'Perform only necessary actions', auditRequired: false },
      { step: 5, action: 'Document what you viewed/changed', auditRequired: true },
      { step: 6, action: 'End session promptly', auditRequired: true },
      { step: 7, action: 'Update support ticket', auditRequired: true },
    ],
    rules: [
      { type: 'do', text: 'Always explain what you are doing' },
      { type: 'do', text: 'Keep sessions as short as possible' },
      { type: 'dont', text: 'Never start session without valid ticket' },
      { type: 'dont', text: 'Never access unrelated data' },
    ],
    auditNotes: [
      'Session start/end times are automatically logged',
      'Every action during session is recorded',
    ],
    relatedLinks: ['Support Sessions', 'Audit Logs'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  },
];

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/internal/playbooks
 * List all playbooks
 */
router.get('/', authenticateToken, requireBismanStaff, async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let filtered = [...playbooks];
    
    // Filter by category
    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }
    
    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.situation.toLowerCase().includes(searchLower)
      );
    }
    
    // Log access
    console.log(`[Playbooks] User ${req.user?.id} viewed playbooks list`);
    
    res.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error('[Playbooks] Error listing playbooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch playbooks',
    });
  }
});

/**
 * GET /api/internal/playbooks/:id
 * Get single playbook
 */
router.get('/:id', authenticateToken, requireBismanStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const playbook = playbooks.find(p => p.id === id);
    
    if (!playbook) {
      return res.status(404).json({
        success: false,
        error: 'Playbook not found',
      });
    }
    
    // Log access
    console.log(`[Playbooks] User ${req.user?.id} viewed playbook: ${id}`);
    
    res.json({
      success: true,
      data: playbook,
    });
  } catch (error) {
    console.error('[Playbooks] Error fetching playbook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch playbook',
    });
  }
});

/**
 * POST /api/internal/playbooks
 * Create new playbook (ENTERPRISE_ADMIN only)
 */
router.post('/', authenticateToken, requireEnterpriseAdmin, async (req, res) => {
  try {
    const { title, category, situation, steps, rules, auditNotes, relatedLinks } = req.body;
    
    // Validate required fields
    if (!title || !category || !situation || !steps) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, category, situation, steps',
      });
    }
    
    // Generate ID from title
    const id = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Check for duplicate
    if (playbooks.find(p => p.id === id)) {
      return res.status(409).json({
        success: false,
        error: 'Playbook with this title already exists',
      });
    }
    
    const newPlaybook = {
      id,
      title,
      category,
      situation,
      steps,
      rules: rules || [],
      auditNotes: auditNotes || [],
      relatedLinks: relatedLinks || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user?.id || 'unknown',
    };
    
    playbooks.push(newPlaybook);
    
    // Log creation
    console.log(`[Playbooks] User ${req.user?.id} created playbook: ${id}`);
    
    res.status(201).json({
      success: true,
      data: newPlaybook,
      message: 'Playbook created successfully',
    });
  } catch (error) {
    console.error('[Playbooks] Error creating playbook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create playbook',
    });
  }
});

/**
 * PUT /api/internal/playbooks/:id
 * Update playbook (ENTERPRISE_ADMIN only)
 */
router.put('/:id', authenticateToken, requireEnterpriseAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const playbookIndex = playbooks.findIndex(p => p.id === id);
    
    if (playbookIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Playbook not found',
      });
    }
    
    const { title, category, situation, steps, rules, auditNotes, relatedLinks } = req.body;
    
    const updatedPlaybook = {
      ...playbooks[playbookIndex],
      title: title || playbooks[playbookIndex].title,
      category: category || playbooks[playbookIndex].category,
      situation: situation || playbooks[playbookIndex].situation,
      steps: steps || playbooks[playbookIndex].steps,
      rules: rules || playbooks[playbookIndex].rules,
      auditNotes: auditNotes || playbooks[playbookIndex].auditNotes,
      relatedLinks: relatedLinks || playbooks[playbookIndex].relatedLinks,
      updatedAt: new Date().toISOString(),
    };
    
    playbooks[playbookIndex] = updatedPlaybook;
    
    // Log update
    console.log(`[Playbooks] User ${req.user?.id} updated playbook: ${id}`);
    
    res.json({
      success: true,
      data: updatedPlaybook,
      message: 'Playbook updated successfully',
    });
  } catch (error) {
    console.error('[Playbooks] Error updating playbook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update playbook',
    });
  }
});

/**
 * DELETE /api/internal/playbooks/:id
 * Delete playbook (ENTERPRISE_ADMIN only)
 */
router.delete('/:id', authenticateToken, requireEnterpriseAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const playbookIndex = playbooks.findIndex(p => p.id === id);
    
    if (playbookIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Playbook not found',
      });
    }
    
    playbooks.splice(playbookIndex, 1);
    
    // Log deletion
    console.log(`[Playbooks] User ${req.user?.id} deleted playbook: ${id}`);
    
    res.json({
      success: true,
      message: 'Playbook deleted successfully',
    });
  } catch (error) {
    console.error('[Playbooks] Error deleting playbook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete playbook',
    });
  }
});

/**
 * GET /api/internal/playbooks/categories
 * Get available categories
 */
router.get('/meta/categories', authenticateToken, requireBismanStaff, (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'access', label: 'Access Issues' },
      { id: 'billing', label: 'Billing' },
      { id: 'permissions', label: 'Permissions' },
      { id: 'support', label: 'Support Sessions' },
      { id: 'security', label: 'Security' },
    ],
  });
});

module.exports = router;
