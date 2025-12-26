/**
 * ============================================================================
 * BANK RECONCILIATION API ROUTES
 * ============================================================================
 * 
 * Enterprise-grade bank statement reconciliation API:
 * - Template management (Admin only)
 * - Statement upload and parsing
 * - Auto-matching and manual matching
 * - Batch management and finalization
 * 
 * ROLE PERMISSIONS:
 * - ADMIN: Full access including template management
 * - ACCOUNTANT: Upload, match, finalize
 * - CFO/AUDITOR/FINANCE_CONTROLLER: View only
 * 
 * @module routes/bankReconciliationRoutes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const {
  bankReconciliationService,
  BatchStatus,
  ReconciliationRoles
} = require('../services/BankReconciliationService');

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Attach user context and tenant
 */
function attachUserContext(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  req.userId = user.id;
  req.tenantId = user.tenantId || user.tenant_id || user.enterpriseId;
  req.userRole = user.role || user.roleName;
  
  // Build actor object for service calls
  req.actor = {
    id: user.id,
    tenant_id: req.tenantId,
    role: req.userRole,
    email: user.email,
    ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress
  };
  
  next();
}

/**
 * Check if user can perform action
 */
function requirePermission(permissionKey) {
  return (req, res, next) => {
    const allowedRoles = ReconciliationRoles[permissionKey] || [];
    
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles
      });
    }
    
    next();
  };
}

/**
 * Verify batch is not locked/finalized for write operations
 */
async function verifyBatchNotLocked(req, res, next) {
  const batchId = req.params.batchId || req.body.batchId;
  
  if (!batchId) {
    return next();
  }

  try {
    const batch = await bankReconciliationService.getBatchById(batchId, req.tenantId);
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
        code: 'NOT_FOUND'
      });
    }

    if (batch.status === BatchStatus.LOCKED || batch.status === BatchStatus.FINALIZED) {
      return res.status(403).json({
        success: false,
        error: 'Batch is locked or finalized. No modifications allowed.',
        code: 'BATCH_LOCKED'
      });
    }

    req.batch = batch;
    next();
  } catch (error) {
    next(error);
  }
}

// Apply auth middleware to all routes
router.use(attachUserContext);

// ============================================================================
// TEMPLATE MANAGEMENT (Admin Only)
// ============================================================================

/**
 * GET /templates - List all templates
 */
router.get('/templates', requirePermission('CAN_VIEW'), async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' && req.userRole === 'ADMIN';
    const templates = await bankReconciliationService.getTemplates(req.tenantId, includeInactive);
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /templates/:id - Get template details
 */
router.get('/templates/:id', requirePermission('CAN_VIEW'), async (req, res, next) => {
  try {
    const template = await bankReconciliationService.getTemplateById(req.params.id, req.tenantId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        code: 'NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /templates - Create new template (Admin only)
 */
router.post('/templates', requirePermission('CAN_MANAGE_TEMPLATES'), async (req, res, next) => {
  try {
    const template = await bankReconciliationService.createTemplate(req.body, req.actor);
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /templates/:id - Update template (Admin only)
 */
router.put('/templates/:id', requirePermission('CAN_MANAGE_TEMPLATES'), async (req, res, next) => {
  try {
    const template = await bankReconciliationService.updateTemplate(req.params.id, req.body, req.actor);
    
    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /templates/:id - Soft delete template (Admin only)
 */
router.delete('/templates/:id', requirePermission('CAN_MANAGE_TEMPLATES'), async (req, res, next) => {
  try {
    await bankReconciliationService.updateTemplate(
      req.params.id, 
      { is_active: false }, 
      req.actor
    );
    
    res.json({
      success: true,
      message: 'Template deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// STATEMENT MANAGEMENT
// ============================================================================

/**
 * GET /statements - List statements
 */
router.get('/statements', requirePermission('CAN_VIEW'), async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      bankAccountId: req.query.bankAccountId
    };

    const result = await bankReconciliationService.getStatements(req.tenantId, options);
    
    res.json({
      success: true,
      data: result.statements,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /statements/upload - Upload and parse statement
 */
router.post('/statements/upload', 
  requirePermission('CAN_UPLOAD'), 
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          code: 'NO_FILE'
        });
      }

      const { templateId, bankAccountId } = req.body;
      
      if (!templateId || !bankAccountId) {
        return res.status(400).json({
          success: false,
          error: 'templateId and bankAccountId are required',
          code: 'MISSING_PARAMS'
        });
      }

      const statement = await bankReconciliationService.uploadStatement(
        req.file.buffer,
        req.file.originalname,
        templateId,
        bankAccountId,
        req.actor
      );

      res.status(202).json({
        success: true,
        data: statement,
        message: 'Statement uploaded. Parsing in progress.'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /statements/:id - Get statement details
 */
router.get('/statements/:id', requirePermission('CAN_VIEW'), async (req, res, next) => {
  try {
    const prisma = bankReconciliationService.getPrisma();
    const statement = await prisma.bank_statements.findFirst({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: {
        template: { select: { bank_name: true, file_type: true } }
      }
    });

    if (!statement) {
      return res.status(404).json({
        success: false,
        error: 'Statement not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: statement
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /statements/:id/lines - Get statement lines with virtual scrolling support
 */
router.get('/statements/:id/lines', requirePermission('CAN_VIEW'), async (req, res, next) => {
  try {
    const options = {
      offset: parseInt(req.query.offset) || 0,
      limit: parseInt(req.query.limit) || 100,
      status: req.query.status,
      isCredit: req.query.isCredit === 'true' ? true : 
                req.query.isCredit === 'false' ? false : undefined
    };

    const result = await bankReconciliationService.getStatementLines(
      req.params.id,
      req.tenantId,
      options
    );

    res.json({
      success: true,
      data: result.lines,
      pagination: {
        offset: result.offset,
        limit: result.limit,
        total: result.total,
        hasMore: result.offset + result.limit < result.total
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /statements/:id/detect-template - Auto-detect template
 */
router.post('/statements/:id/detect-template', 
  requirePermission('CAN_UPLOAD'),
  async (req, res, next) => {
    try {
      const { fileContent, fileName } = req.body;
      
      const template = await bankReconciliationService.detectTemplate(
        fileContent,
        fileName,
        req.tenantId
      );

      res.json({
        success: true,
        data: template,
        detected: !!template
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// BATCH MANAGEMENT
// ============================================================================

/**
 * GET /batches - List reconciliation batches
 */
router.get('/batches', requirePermission('CAN_VIEW'), async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status
    };

    const result = await bankReconciliationService.getBatches(req.tenantId, options);

    res.json({
      success: true,
      data: result.batches,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /batches - Create new batch
 */
router.post('/batches', requirePermission('CAN_MATCH'), async (req, res, next) => {
  try {
    const { statementId } = req.body;
    
    if (!statementId) {
      return res.status(400).json({
        success: false,
        error: 'statementId is required',
        code: 'MISSING_PARAMS'
      });
    }

    const batch = await bankReconciliationService.createBatch(statementId, req.actor);

    res.status(201).json({
      success: true,
      data: batch,
      message: 'Batch created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /batches/:id - Get batch details with summary
 */
router.get('/batches/:id', requirePermission('CAN_VIEW'), async (req, res, next) => {
  try {
    const summary = await bankReconciliationService.getBatchSummary(req.params.id, req.tenantId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /batches/:id/matches - Get all matches in batch
 */
router.get('/batches/:id/matches', requirePermission('CAN_VIEW'), async (req, res, next) => {
  try {
    const batch = await bankReconciliationService.getBatchById(req.params.id, req.tenantId);
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: batch.matches
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /batches/:id/exceptions - Get unresolved exceptions
 */
router.get('/batches/:id/exceptions', requirePermission('CAN_VIEW'), async (req, res, next) => {
  try {
    const batch = await bankReconciliationService.getBatchById(req.params.id, req.tenantId);
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: batch.exceptions
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /batches/:id/status - Update batch status
 */
router.put('/batches/:id/status', requirePermission('CAN_FINALIZE'), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required',
        code: 'MISSING_PARAMS'
      });
    }

    const batch = await bankReconciliationService.updateBatchStatus(
      req.params.id,
      status,
      req.actor,
      notes
    );

    res.json({
      success: true,
      data: batch,
      message: `Batch status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /batches/:id/lock - Lock batch for finalization
 */
router.post('/batches/:id/lock', requirePermission('CAN_FINALIZE'), async (req, res, next) => {
  try {
    const batch = await bankReconciliationService.updateBatchStatus(
      req.params.id,
      BatchStatus.LOCKED,
      req.actor
    );

    res.json({
      success: true,
      data: batch,
      message: 'Batch locked successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /batches/:id/finalize - Finalize batch
 */
router.post('/batches/:id/finalize', requirePermission('CAN_FINALIZE'), async (req, res, next) => {
  try {
    const { notes } = req.body;
    
    const batch = await bankReconciliationService.updateBatchStatus(
      req.params.id,
      BatchStatus.FINALIZED,
      req.actor,
      notes
    );

    res.json({
      success: true,
      data: batch,
      message: 'Batch finalized successfully. All matched settlements are now marked as reconciled.'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// MATCHING OPERATIONS
// ============================================================================

/**
 * POST /batches/:batchId/auto-match - Run auto-matching
 */
router.post('/batches/:batchId/auto-match', 
  requirePermission('CAN_MATCH'),
  verifyBatchNotLocked,
  async (req, res, next) => {
    try {
      // Get statement from batch
      const batch = req.batch || await bankReconciliationService.getBatchById(req.params.batchId, req.tenantId);
      
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Batch not found',
          code: 'NOT_FOUND'
        });
      }

      const result = await bankReconciliationService.runAutoMatch(batch.statement_id, req.actor);

      res.json({
        success: true,
        data: result,
        message: `Auto-matching complete. Matched: ${result.results.exact + result.results.amountDate + result.results.fuzzy}, Unmatched: ${result.results.unmatched}`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /matches - Create manual match
 */
router.post('/matches', 
  requirePermission('CAN_MATCH'),
  verifyBatchNotLocked,
  async (req, res, next) => {
    try {
      const { batchId, lineId, settlementId, reason } = req.body;
      
      if (!batchId || !lineId || !settlementId || !reason) {
        return res.status(400).json({
          success: false,
          error: 'batchId, lineId, settlementId, and reason are required',
          code: 'MISSING_PARAMS'
        });
      }

      const match = await bankReconciliationService.createManualMatch(
        batchId,
        lineId,
        settlementId,
        reason,
        req.actor
      );

      res.status(201).json({
        success: true,
        data: match,
        message: 'Manual match created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /matches/:id - Unmatch (soft delete)
 */
router.delete('/matches/:id', 
  requirePermission('CAN_MATCH'),
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'reason is required for unmatch',
          code: 'MISSING_PARAMS'
        });
      }

      await bankReconciliationService.unmatch(req.params.id, reason, req.actor);

      res.json({
        success: true,
        message: 'Match removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// EXCEPTION MANAGEMENT
// ============================================================================

/**
 * POST /exceptions/:id/resolve - Resolve an exception
 */
router.post('/exceptions/:id/resolve', 
  requirePermission('CAN_MATCH'),
  async (req, res, next) => {
    try {
      const { resolution, action } = req.body;
      
      if (!resolution || !action) {
        return res.status(400).json({
          success: false,
          error: 'resolution and action are required',
          code: 'MISSING_PARAMS'
        });
      }

      const validActions = ['ignore', 'retry', 'manual_match'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          error: `action must be one of: ${validActions.join(', ')}`,
          code: 'INVALID_ACTION'
        });
      }

      await bankReconciliationService.resolveException(
        req.params.id,
        resolution,
        action,
        req.actor
      );

      res.json({
        success: true,
        message: 'Exception resolved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// SETTLEMENT QUERIES (for matching UI)
// ============================================================================

/**
 * GET /settlements/unreconciled - Get unreconciled settlements for matching
 */
router.get('/settlements/unreconciled', requirePermission('CAN_VIEW'), async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : undefined,
      maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : undefined
    };

    const result = await bankReconciliationService.getUnreconciledSettlements(req.tenantId, options);

    res.json({
      success: true,
      data: result.settlements,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * GET /audit/:entityType/:entityId - Get audit log for entity
 */
router.get('/audit/:entityType/:entityId', requirePermission('CAN_VIEW'), async (req, res, next) => {
  try {
    const validTypes = ['TEMPLATE', 'STATEMENT', 'BATCH', 'MATCH', 'EXCEPTION'];
    
    if (!validTypes.includes(req.params.entityType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `entityType must be one of: ${validTypes.join(', ')}`,
        code: 'INVALID_ENTITY_TYPE'
      });
    }

    const auditLog = await bankReconciliationService.getAuditLog(
      req.params.entityType.toUpperCase(),
      req.params.entityId,
      req.tenantId
    );

    res.json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

router.use((error, req, res, _next) => {
  console.error('[BankReconciliationRoutes] Error:', error);

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR'
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
});

module.exports = router;
