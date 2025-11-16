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

// Get all support tickets
router.get('/tickets', requireEnterpriseAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const status = req.query.status || '';
    const priority = req.query.priority || '';
    const organization = req.query.organization || '';

    // Mock tickets data - in production, this would come from a tickets table
    const allTickets = [
      {
        id: 'TKT-1001',
        subject: 'Unable to login to admin panel',
        organization: 'Petrol Pump Solutions Ltd',
        organizationId: 1,
        user: 'Rajesh Kumar',
        userEmail: 'rajesh@petrolpump.com',
        status: 'open',
        priority: 'high',
        category: 'access',
        assignedTo: 'Support Agent 1',
        createdAt: '2025-10-28T08:30:00Z',
        updatedAt: '2025-10-28T09:15:00Z',
        responseTime: 45, // minutes
        slaBreached: false,
        tags: ['login', 'admin', 'urgent']
      },
      {
        id: 'TKT-1002',
        subject: 'Data export feature not working',
        organization: 'Business ERP Solutions',
        organizationId: 2,
        user: 'Priya Sharma',
        userEmail: 'priya@businesserp.com',
        status: 'pending',
        priority: 'medium',
        category: 'feature',
        assignedTo: 'Support Agent 2',
        createdAt: '2025-10-27T14:20:00Z',
        updatedAt: '2025-10-28T10:00:00Z',
        responseTime: 30,
        slaBreached: false,
        tags: ['export', 'data']
      },
      {
        id: 'TKT-1003',
        subject: 'Request for additional user licenses',
        organization: 'City Fuel Station Network',
        organizationId: 3,
        user: 'Amit Patel',
        userEmail: 'amit@cityfuel.com',
        status: 'closed',
        priority: 'low',
        category: 'billing',
        assignedTo: 'Support Agent 1',
        createdAt: '2025-10-25T09:00:00Z',
        updatedAt: '2025-10-26T15:30:00Z',
        responseTime: 15,
        slaBreached: false,
        tags: ['license', 'billing']
      },
      {
        id: 'TKT-1004',
        subject: 'Critical: System not generating invoices',
        organization: 'Highway Petrol Services',
        organizationId: 4,
        user: 'Suresh Reddy',
        userEmail: 'suresh@highway.com',
        status: 'new',
        priority: 'critical',
        category: 'bug',
        assignedTo: null,
        createdAt: '2025-10-28T10:45:00Z',
        updatedAt: '2025-10-28T10:45:00Z',
        responseTime: 0,
        slaBreached: true,
        tags: ['invoice', 'critical', 'bug']
      },
      {
        id: 'TKT-1005',
        subject: 'How to configure email notifications?',
        organization: 'Metro Business Solutions',
        organizationId: 5,
        user: 'Anjali Singh',
        userEmail: 'anjali@metrobiz.com',
        status: 'open',
        priority: 'low',
        category: 'question',
        assignedTo: 'Support Agent 3',
        createdAt: '2025-10-27T11:30:00Z',
        updatedAt: '2025-10-27T16:20:00Z',
        responseTime: 120,
        slaBreached: false,
        tags: ['configuration', 'email']
      }
    ];

    // Apply filters
    let filteredTickets = allTickets;
    
    if (status) {
      filteredTickets = filteredTickets.filter(t => t.status === status);
    }
    
    if (priority) {
      filteredTickets = filteredTickets.filter(t => t.priority === priority);
    }
    
    if (organization) {
      filteredTickets = filteredTickets.filter(t => 
        t.organization.toLowerCase().includes(organization.toLowerCase())
      );
    }

    const total = filteredTickets.length;
    const paginatedTickets = filteredTickets.slice(skip, skip + limit);

    res.json({
      ok: true,
      tickets: paginatedTickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Get Tickets Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch tickets' });
  }
});

// Get ticket detail
router.get('/tickets/:ticketId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const ticketId = req.params.ticketId;

    // Mock ticket detail with conversation thread
    const ticket = {
      id: ticketId,
      subject: 'Unable to login to admin panel',
      description: 'I am unable to login to the admin panel. Getting "Invalid credentials" error even though I am using the correct password.',
      organization: 'Petrol Pump Solutions Ltd',
      organizationId: 1,
      user: {
        name: 'Rajesh Kumar',
        email: 'rajesh@petrolpump.com',
        role: 'ADMIN',
        phone: '+911234567890'
      },
      status: 'open',
      priority: 'high',
      category: 'access',
      assignedTo: {
        name: 'Support Agent 1',
        email: 'agent1@bisman.com'
      },
      createdAt: '2025-10-28T08:30:00Z',
      updatedAt: '2025-10-28T09:15:00Z',
      sla: {
        responseTime: 45, // minutes
        resolutionTime: null,
        targetResponseTime: 60, // minutes for high priority
        targetResolutionTime: 240, // 4 hours
        breached: false
      },
      tags: ['login', 'admin', 'urgent'],
      conversation: [
        {
          id: 1,
          type: 'comment',
          author: 'Rajesh Kumar',
          authorType: 'customer',
          message: 'I am unable to login to the admin panel. Getting "Invalid credentials" error even though I am using the correct password.',
          timestamp: '2025-10-28T08:30:00Z',
          attachments: []
        },
        {
          id: 2,
          type: 'note',
          author: 'Support Agent 1',
          authorType: 'agent',
          message: 'Checking user account status and recent login attempts.',
          timestamp: '2025-10-28T08:35:00Z',
          isInternal: true,
          attachments: []
        },
        {
          id: 3,
          type: 'comment',
          author: 'Support Agent 1',
          authorType: 'agent',
          message: 'Hello Rajesh, I checked your account. It seems your password was reset yesterday. Please check your email for the password reset link or use the "Forgot Password" option.',
          timestamp: '2025-10-28T09:15:00Z',
          attachments: []
        },
        {
          id: 4,
          type: 'comment',
          author: 'Rajesh Kumar',
          authorType: 'customer',
          message: 'Thank you! I found the email. Issue resolved.',
          timestamp: '2025-10-28T09:30:00Z',
          attachments: []
        }
      ],
      relatedTickets: ['TKT-0985', 'TKT-0892'],
      customFields: {
        systemVersion: '2.0.0',
        browser: 'Chrome 118',
        deviceType: 'Desktop'
      }
    };

    res.json({
      ok: true,
      ticket
    });
  } catch (error) {
    console.error('[Get Ticket Detail Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch ticket details' });
  }
});

// Update ticket
router.put('/tickets/:ticketId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const { status, priority, assignedTo, tags } = req.body;

    // Log the update
    await prisma.recent_activity.create({
      data: {
        action: 'Support Ticket Updated',
        entity: 'Support',
        entity_id: ticketId,
        username: req.user?.username || 'Enterprise Admin',
        details: { ticketId, status, priority, assignedTo, tags }
      }
    });

    res.json({
      ok: true,
      message: 'Ticket updated successfully',
      ticket: {
        id: ticketId,
        status,
        priority,
        assignedTo,
        tags,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Update Ticket Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update ticket' });
  }
});

// Add comment to ticket
router.post('/tickets/:ticketId/comments', requireEnterpriseAdmin, async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const { message, isInternal } = req.body;

    if (!message) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Message is required' 
      });
    }

    const newComment = {
      id: Date.now(),
      type: isInternal ? 'note' : 'comment',
      author: req.user?.username || 'Enterprise Admin',
      authorType: 'admin',
      message,
      timestamp: new Date().toISOString(),
      isInternal: isInternal || false,
      attachments: []
    };

    // Log the comment
    await prisma.recent_activity.create({
      data: {
        action: 'Ticket Comment Added',
        entity: 'Support',
        entity_id: ticketId,
        username: req.user?.username || 'Enterprise Admin',
        details: { ticketId, isInternal, messageLength: message.length }
      }
    });

    res.status(201).json({
      ok: true,
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('[Add Comment Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to add comment' });
  }
});

// Get support metrics/SLA dashboard
router.get('/metrics', requireEnterpriseAdmin, async (req, res) => {
  try {
    const metrics = {
      overview: {
        totalTickets: 1245,
        openTickets: 87,
        newTickets: 12,
        pendingTickets: 24,
        closedThisWeek: 145
      },
      sla: {
        averageFirstResponseTime: 35, // minutes
        averageResolutionTime: 245, // minutes
        breachedTickets: 3,
        breachRate: 2.4, // percentage
        withinSLA: 97.6 // percentage
      },
      byPriority: {
        critical: { open: 3, avgResolutionTime: 45 },
        high: { open: 15, avgResolutionTime: 120 },
        medium: { open: 42, avgResolutionTime: 240 },
        low: { open: 27, avgResolutionTime: 480 }
      },
      byCategory: {
        access: 24,
        bug: 18,
        feature: 15,
        billing: 12,
        question: 18
      },
      byAgent: [
        { name: 'Support Agent 1', assignedTickets: 35, resolvedTickets: 128, avgRating: 4.8 },
        { name: 'Support Agent 2', assignedTickets: 28, resolvedTickets: 145, avgRating: 4.9 },
        { name: 'Support Agent 3', assignedTickets: 24, resolvedTickets: 98, avgRating: 4.7 }
      ],
      customerSatisfaction: {
        avgRating: 4.7,
        totalResponses: 842,
        distribution: {
          5: 650,
          4: 145,
          3: 32,
          2: 10,
          1: 5
        }
      },
      trend: {
        thisWeek: 87,
        lastWeek: 94,
        percentChange: -7.4
      }
    };

    res.json({
      ok: true,
      metrics
    });
  } catch (error) {
    console.error('[Get Support Metrics Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch support metrics' });
  }
});

// Get ticket statistics
router.get('/stats', requireEnterpriseAdmin, async (req, res) => {
  try {
    const range = req.query.range || 'week'; // week, month, year

    // Mock statistics based on range
    const stats = {
      created: 145,
      resolved: 138,
      avgResolutionTime: 245, // minutes
      avgSatisfactionScore: 4.7,
      topIssues: [
        { issue: 'Login problems', count: 34 },
        { issue: 'Data export', count: 28 },
        { issue: 'Email notifications', count: 24 },
        { issue: 'Report generation', count: 18 },
        { issue: 'License activation', count: 15 }
      ],
      dailyTrend: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created: Math.floor(Math.random() * 30) + 10,
        resolved: Math.floor(Math.random() * 25) + 10
      }))
    };

    res.json({
      ok: true,
      stats
    });
  } catch (error) {
    console.error('[Get Ticket Stats Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch ticket statistics' });
  }
});

// Get agents list
router.get('/agents', requireEnterpriseAdmin, async (req, res) => {
  try {
    const agents = [
      {
        id: 1,
        name: 'Support Agent 1',
        email: 'agent1@bisman.com',
        status: 'online',
        assignedTickets: 35,
        avgResponseTime: 25, // minutes
        totalResolved: 845,
        rating: 4.8,
        availability: 'available'
      },
      {
        id: 2,
        name: 'Support Agent 2',
        email: 'agent2@bisman.com',
        status: 'online',
        assignedTickets: 28,
        avgResponseTime: 30,
        totalResolved: 756,
        rating: 4.9,
        availability: 'busy'
      },
      {
        id: 3,
        name: 'Support Agent 3',
        email: 'agent3@bisman.com',
        status: 'offline',
        assignedTickets: 24,
        avgResponseTime: 35,
        totalResolved: 624,
        rating: 4.7,
        availability: 'offline'
      }
    ];

    res.json({
      ok: true,
      agents
    });
  } catch (error) {
    console.error('[Get Agents Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch agents' });
  }
});

// Bulk assign tickets
router.post('/tickets/bulk-assign', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { ticketIds, agentId } = req.body;

    if (!ticketIds || !Array.isArray(ticketIds) || !agentId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Ticket IDs and agent ID are required' 
      });
    }

    // Log bulk assignment
    await prisma.recent_activity.create({
      data: {
        action: 'Bulk Ticket Assignment',
        entity: 'Support',
        entity_id: ticketIds.join(','),
        username: req.user?.username || 'Enterprise Admin',
        details: { ticketIds, agentId, count: ticketIds.length }
      }
    });

    res.json({
      ok: true,
      message: `Successfully assigned ${ticketIds.length} tickets`,
      affectedCount: ticketIds.length
    });
  } catch (error) {
    console.error('[Bulk Assign Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to bulk assign tickets' });
  }
});

module.exports = router;
