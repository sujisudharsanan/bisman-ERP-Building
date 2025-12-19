/**
 * Contract Finance API Routes
 * Handles accounting operations for contracts
 * 
 * Endpoints:
 * POST   /api/finance/contracts/:id/activate-accounting    - Activate accounting for a contract
 * POST   /api/finance/contracts/:id/generate-payables      - Generate scheduled payables
 * POST   /api/finance/payables/:id/post                    - Post a payable (create journal entry)
 * POST   /api/finance/payables/:id/pay                     - Record payment for a payable
 * GET    /api/finance/contracts/:id/ledger-view            - Get ledger view for a contract
 * GET    /api/finance/contracts/:id/payables               - Get all payables for a contract
 * POST   /api/finance/contracts/:id/record-advance         - Record advance payment
 * GET    /api/finance/ledgers                              - Get all ledgers
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { getPrisma } = require('../../lib/prisma');
const contractAccountingService = require('../../services/contractAccountingService');

/**
 * POST /api/finance/contracts/:id/activate-accounting
 * Activate accounting for a contract (set up ledger mapping)
 */
router.post('/contracts/:id/activate-accounting', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;
    
    const result = await contractAccountingService.activateContractAccounting(id, userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Finance] Activate accounting error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/finance/contracts/:id/generate-payables
 * Generate scheduled payables for a contract
 */
router.post('/contracts/:id/generate-payables', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;
    
    const result = await contractAccountingService.generateScheduledPayables(id, userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Finance] Generate payables error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/finance/payables/:id/post
 * Post a payable (create accrual journal entry)
 */
router.post('/payables/:id/post', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;
    
    const result = await contractAccountingService.postPayable(id, userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Finance] Post payable error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/finance/payables/:id/pay
 * Record payment for a posted payable
 */
router.post('/payables/:id/pay', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;
    const { payment_mode, payment_reference } = req.body;
    
    const result = await contractAccountingService.payPayable(id, {
      payment_mode,
      payment_reference
    }, userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Finance] Pay payable error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/finance/contracts/:id/ledger-view
 * Get comprehensive ledger view for a contract
 */
router.get('/contracts/:id/ledger-view', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await contractAccountingService.getContractLedgerView(id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Finance] Ledger view error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/finance/contracts/:id/payables
 * Get all scheduled payables for a contract
 */
router.get('/contracts/:id/payables', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { status } = req.query;
    
    const where = { contract_id: id };
    if (status) {
      where.status = status;
    }
    
    const payables = await prisma.scheduledPayable.findMany({
      where,
      orderBy: { due_date: 'asc' },
      include: {
        journal_entry: true,
        payment_journal: true
      }
    });
    
    res.json({
      success: true,
      data: {
        payables,
        total: payables.length
      }
    });
  } catch (error) {
    console.error('[Finance] Get payables error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/finance/contracts/:id/record-advance
 * Record advance/security deposit payment
 */
router.post('/contracts/:id/record-advance', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;
    const { amount, payment_mode, payment_reference } = req.body;
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }
    
    const result = await contractAccountingService.recordAdvancePayment(id, amount, {
      payment_mode,
      payment_reference
    }, userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Finance] Record advance error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/finance/contracts/:id/can-terminate
 * Check if a contract can be terminated
 */
router.get('/contracts/:id/can-terminate', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await contractAccountingService.canTerminateContract(id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Finance] Can terminate check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/finance/ledgers
 * Get all ledgers (for mapping selection)
 */
router.get('/ledgers', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { type, active_only } = req.query;
    
    const where = {};
    if (type) {
      where.ledger_type = type;
    }
    if (active_only === 'true') {
      where.is_active = true;
    }
    
    const ledgers = await prisma.ledger.findMany({
      where,
      orderBy: [
        { ledger_type: 'asc' },
        { name: 'asc' }
      ]
    });
    
    res.json({
      success: true,
      data: {
        ledgers,
        total: ledgers.length
      }
    });
  } catch (error) {
    console.error('[Finance] Get ledgers error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/finance/journal-entries
 * Get journal entries with filters
 */
router.get('/journal-entries', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { 
      reference_type, 
      reference_id, 
      status, 
      from_date, 
      to_date,
      page = 1,
      limit = 50
    } = req.query;
    
    const where = {};
    
    if (reference_type) {
      where.reference_type = reference_type;
    }
    if (reference_id) {
      where.reference_id = reference_id;
    }
    if (status) {
      where.status = status;
    }
    if (from_date || to_date) {
      where.entry_date = {};
      if (from_date) where.entry_date.gte = new Date(from_date);
      if (to_date) where.entry_date.lte = new Date(to_date);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              ledger: true
            }
          }
        },
        orderBy: { entry_date: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.journalEntry.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        entries,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[Finance] Get journal entries error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
