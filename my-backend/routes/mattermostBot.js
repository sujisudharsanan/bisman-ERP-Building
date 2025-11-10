/**
 * Mattermost Chatbot Integration API
 * Connects ERP Assistant chatbot to BISMAN ERP backend
 * Provides real-time data for chatbot responses
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPrisma } = require('../lib/prisma');

const prisma = getPrisma();

/**
 * ERP Query Endpoint - Main chatbot integration
 * POST /api/mattermost/query
 * 
 * Accepts natural language queries from Mattermost chatbot
 * Returns structured data from ERP database
 */
router.post('/query', authenticate, async (req, res) => {
  try {
    const { query, userId, intent, entities } = req.body;
    
    console.log('[Mattermost Bot] Query received:', {
      query,
      userId,
      intent,
      entityCount: entities?.length || 0
    });

    // Detect intent from query
    const detectedIntent = intent || detectIntent(query);
    
    // Route to appropriate handler
    let result;
    switch (detectedIntent) {
      case 'invoice_status':
        result = await handleInvoiceQuery(req.user, entities);
        break;
      case 'invoice_create':
        result = await handleInvoiceCreation(req.user);
        break;
      case 'leave_status':
        result = await handleLeaveQuery(req.user);
        break;
      case 'leave_apply':
        result = await handleLeaveApplication(req.user);
        break;
      case 'approval_pending':
        result = await handleApprovalQuery(req.user);
        break;
      case 'user_info':
        result = await handleUserInfo(req.user);
        break;
      case 'dashboard_stats':
        result = await handleDashboardStats(req.user);
        break;
      default:
        result = {
          type: 'info',
          message: 'I can help you with invoices, leaves, approvals, and more. What would you like to know?',
          suggestions: [
            'Show my recent invoices',
            'Check leave balance',
            'Pending approvals',
            'Create new invoice'
          ]
        };
    }

    // Response automatically compressed with Level 9 GZIP (from app.js)
    res.json({
      ok: true,
      intent: detectedIntent,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Mattermost Bot] Query error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to process query',
      message: error.message
    });
  }
});

/**
 * Invoice Query Handler
 * Returns user's recent invoices with status
 */
async function handleInvoiceQuery(user, entities) {
  try {
    // Get user's recent invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        user_id: user.id,
        ...(user.tenant_id && { tenant_id: user.tenant_id })
      },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        invoice_number: true,
        total_amount: true,
        status: true,
        due_date: true,
        created_at: true
      }
    });

    if (invoices.length === 0) {
      return {
        type: 'info',
        message: '📝 You have no invoices yet.',
        action: 'Would you like to create a new invoice?'
      };
    }

    // Calculate totals
    const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const paidCount = invoices.filter(inv => inv.status === 'paid').length;
    const pendingCount = invoices.filter(inv => inv.status === 'pending').length;

    return {
      type: 'invoice_list',
      message: `📊 **Your Recent Invoices**\n\nTotal: ${invoices.length} invoices | Paid: ${paidCount} | Pending: ${pendingCount}\nTotal Amount: ₹${totalAmount.toFixed(2)}`,
      invoices: invoices.map(inv => ({
        id: inv.id,
        number: inv.invoice_number,
        amount: `₹${parseFloat(inv.total_amount).toFixed(2)}`,
        status: inv.status,
        dueDate: inv.due_date?.toISOString().split('T')[0],
        createdAt: inv.created_at?.toISOString().split('T')[0]
      })),
      summary: {
        total: invoices.length,
        paid: paidCount,
        pending: pendingCount,
        totalAmount: totalAmount.toFixed(2)
      }
    };
  } catch (error) {
    console.error('[Invoice Query] Error:', error);
    return {
      type: 'error',
      message: '❌ Failed to fetch invoices. Please try again.'
    };
  }
}

/**
 * Invoice Creation Helper
 * Provides guidance for creating invoices
 */
async function handleInvoiceCreation(user) {
  return {
    type: 'guide',
    message: `📝 **Create New Invoice**\n\nHere's how to create an invoice:\n\n1. Go to Finance Module 💰\n2. Click "Billing" → "New Invoice"\n3. Fill in customer details\n4. Add line items\n5. Review and save\n\n**Quick Link:** [Create Invoice](${process.env.FRONTEND_URL}/finance/invoices/new)`,
    action: 'Open invoice creation form',
    url: '/finance/invoices/new'
  };
}

/**
 * Leave Query Handler
 * Returns user's leave balance and recent requests
 */
async function handleLeaveQuery(user) {
  try {
    // Get user's leave requests
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        user_id: user.id,
        ...(user.tenant_id && { tenant_id: user.tenant_id })
      },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        leave_type: true,
        start_date: true,
        end_date: true,
        status: true,
        days_count: true,
        created_at: true
      }
    });

    // Calculate leave balance (mock data - replace with actual logic)
    const leaveBalance = {
      total: 24,
      used: leaveRequests.filter(lr => lr.status === 'approved').reduce((sum, lr) => sum + (lr.days_count || 0), 0),
      pending: leaveRequests.filter(lr => lr.status === 'pending').length
    };
    leaveBalance.remaining = leaveBalance.total - leaveBalance.used;

    if (leaveRequests.length === 0) {
      return {
        type: 'leave_balance',
        message: `🏖️ **Your Leave Balance**\n\nTotal: ${leaveBalance.total} days\nUsed: ${leaveBalance.used} days\nRemaining: ${leaveBalance.remaining} days\n\nYou haven't applied for any leaves yet.`,
        balance: leaveBalance
      };
    }

    const approvedCount = leaveRequests.filter(lr => lr.status === 'approved').length;
    const pendingCount = leaveRequests.filter(lr => lr.status === 'pending').length;
    const rejectedCount = leaveRequests.filter(lr => lr.status === 'rejected').length;

    return {
      type: 'leave_list',
      message: `🏖️ **Your Leave Status**\n\nBalance: ${leaveBalance.remaining}/${leaveBalance.total} days remaining\n\nRecent Requests:\n✅ Approved: ${approvedCount} | ⏳ Pending: ${pendingCount} | ❌ Rejected: ${rejectedCount}`,
      requests: leaveRequests.map(lr => ({
        id: lr.id,
        type: lr.leave_type,
        startDate: lr.start_date?.toISOString().split('T')[0],
        endDate: lr.end_date?.toISOString().split('T')[0],
        days: lr.days_count,
        status: lr.status
      })),
      balance: leaveBalance
    };
  } catch (error) {
    console.error('[Leave Query] Error:', error);
    return {
      type: 'error',
      message: '❌ Failed to fetch leave data. Please try again.'
    };
  }
}

/**
 * Leave Application Helper
 */
async function handleLeaveApplication(user) {
  return {
    type: 'guide',
    message: `🏖️ **Apply for Leave**\n\nSteps to apply:\n\n1. Go to HR Module 👥\n2. Click "Leave" → "New Request"\n3. Select leave type (Casual/Sick/Vacation)\n4. Choose dates\n5. Add reason\n6. Submit for approval\n\n**Quick Link:** [Apply Leave](${process.env.FRONTEND_URL}/hr/leave/apply)`,
    action: 'Open leave application form',
    url: '/hr/leave/apply'
  };
}

/**
 * Approval Query Handler
 * Returns pending approvals for the user
 */
async function handleApprovalQuery(user) {
  try {
    // Get pending approvals (if user is approver)
    const pendingApprovals = await prisma.approval.findMany({
      where: {
        approver_id: user.id,
        status: 'pending',
        ...(user.tenant_id && { tenant_id: user.tenant_id })
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        approval_type: true,
        request_id: true,
        requester_id: true,
        amount: true,
        description: true,
        created_at: true
      }
    });

    if (pendingApprovals.length === 0) {
      return {
        type: 'info',
        message: '✅ **No Pending Approvals**\n\nYou have no pending approvals at the moment.',
        action: 'All caught up! 🎉'
      };
    }

    // Categorize by type
    const byType = {};
    pendingApprovals.forEach(approval => {
      const type = approval.approval_type || 'other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(approval);
    });

    const summary = Object.entries(byType).map(([type, items]) => 
      `${type}: ${items.length}`
    ).join(' | ');

    return {
      type: 'approval_list',
      message: `⏳ **Pending Approvals (${pendingApprovals.length})**\n\n${summary}\n\nPlease review and approve/reject.`,
      approvals: pendingApprovals.map(app => ({
        id: app.id,
        type: app.approval_type,
        requestId: app.request_id,
        amount: app.amount ? `₹${parseFloat(app.amount).toFixed(2)}` : null,
        description: app.description,
        createdAt: app.created_at?.toISOString().split('T')[0]
      })),
      summary: {
        total: pendingApprovals.length,
        byType: byType
      }
    };
  } catch (error) {
    console.error('[Approval Query] Error:', error);
    return {
      type: 'error',
      message: '❌ Failed to fetch approvals. Please try again.'
    };
  }
}

/**
 * User Info Handler
 */
async function handleUserInfo(user) {
  return {
    type: 'user_info',
    message: `👤 **Your Profile**\n\nName: ${user.username || user.email}\nEmail: ${user.email}\nRole: ${user.role}\n\nLast Login: ${new Date().toLocaleString()}`,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  };
}

/**
 * Dashboard Stats Handler
 */
async function handleDashboardStats(user) {
  try {
    // Get various counts
    const [invoiceCount, leaveCount, approvalCount] = await Promise.all([
      prisma.invoice.count({ where: { user_id: user.id } }),
      prisma.leaveRequest.count({ where: { user_id: user.id } }),
      prisma.approval.count({ where: { approver_id: user.id, status: 'pending' } })
    ]);

    return {
      type: 'dashboard',
      message: `📊 **Your Dashboard**\n\n📝 Invoices: ${invoiceCount}\n🏖️ Leave Requests: ${leaveCount}\n⏳ Pending Approvals: ${approvalCount}`,
      stats: {
        invoices: invoiceCount,
        leaves: leaveCount,
        approvals: approvalCount
      }
    };
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error);
    return {
      type: 'error',
      message: '❌ Failed to fetch dashboard stats.'
    };
  }
}

/**
 * Intent Detection Helper
 * Analyzes query to determine user intent
 */
function detectIntent(query) {
  const lowerQuery = query.toLowerCase();
  
  // Invoice related
  if (lowerQuery.includes('invoice') && (lowerQuery.includes('show') || lowerQuery.includes('list') || lowerQuery.includes('recent'))) {
    return 'invoice_status';
  }
  if (lowerQuery.includes('invoice') && (lowerQuery.includes('create') || lowerQuery.includes('new'))) {
    return 'invoice_create';
  }
  
  // Leave related
  if (lowerQuery.includes('leave') && (lowerQuery.includes('balance') || lowerQuery.includes('remaining') || lowerQuery.includes('status'))) {
    return 'leave_status';
  }
  if (lowerQuery.includes('leave') && (lowerQuery.includes('apply') || lowerQuery.includes('request'))) {
    return 'leave_apply';
  }
  
  // Approval related
  if (lowerQuery.includes('approval') || lowerQuery.includes('pending') || lowerQuery.includes('approve')) {
    return 'approval_pending';
  }
  
  // User info
  if (lowerQuery.includes('profile') || lowerQuery.includes('my info') || lowerQuery.includes('who am i')) {
    return 'user_info';
  }
  
  // Dashboard
  if (lowerQuery.includes('dashboard') || lowerQuery.includes('summary') || lowerQuery.includes('overview')) {
    return 'dashboard_stats';
  }
  
  return 'unknown';
}

/**
 * Webhook Endpoint for Mattermost Events
 * POST /api/mattermost/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const { event, user_id, channel_id, message } = req.body;
    
    console.log('[Mattermost Webhook] Event received:', {
      event,
      userId: user_id,
      channelId: channel_id,
      message: message?.substring(0, 50)
    });

    // Process webhook event
    // This can be used for real-time notifications, etc.
    
    res.json({ ok: true, processed: true });
  } catch (error) {
    console.error('[Mattermost Webhook] Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Health Check Endpoint
 * GET /api/mattermost/health
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Mattermost Bot Integration',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Invoice queries',
      'Leave management',
      'Approval tracking',
      'User information',
      'Dashboard stats'
    ]
  });
});

module.exports = router;
