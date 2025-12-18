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

// Generate unique ticket number
const generateTicketNumber = async () => {
  const date = new Date();
  const prefix = `TKT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const lastTicket = await prisma.supportTicket.findFirst({
    where: { ticket_number: { startsWith: prefix } },
    orderBy: { ticket_number: 'desc' }
  });
  const nextNum = lastTicket ? parseInt(lastTicket.ticket_number.slice(-4)) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
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

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (organization) {
      where.organization = { contains: organization, mode: 'insensitive' };
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { comments: true } }
        }
      }),
      prisma.supportTicket.count({ where })
    ]);

    res.json({
      ok: true,
      tickets: tickets.map(t => ({
        id: t.ticket_number,
        subject: t.subject,
        organization: t.organization || 'Unknown',
        organizationId: t.client_id,
        user: t.user_name,
        userEmail: t.user_email,
        status: t.status,
        priority: t.priority,
        category: t.category,
        assignedTo: t.assigned_name,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        responseTime: t.response_time,
        slaBreached: t.sla_breached,
        tags: t.tags || [],
        commentCount: t._count.comments
      })),
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

    const ticket = await prisma.supportTicket.findFirst({
      where: { 
        OR: [
          { ticket_number: ticketId },
          { id: parseInt(ticketId) || 0 }
        ]
      },
      include: {
        comments: {
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ ok: false, error: 'Ticket not found' });
    }

    // Calculate SLA targets based on priority
    const slaTargets = {
      critical: { responseTime: 30, resolutionTime: 120 },
      high: { responseTime: 60, resolutionTime: 240 },
      medium: { responseTime: 120, resolutionTime: 480 },
      low: { responseTime: 240, resolutionTime: 1440 }
    };
    const targets = slaTargets[ticket.priority] || slaTargets.medium;

    res.json({
      ok: true,
      ticket: {
        id: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        organization: ticket.organization,
        organizationId: ticket.client_id,
        user: {
          name: ticket.user_name,
          email: ticket.user_email,
          role: ticket.user_role,
          phone: ticket.user_phone
        },
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assignedTo: ticket.assigned_name ? {
          name: ticket.assigned_name,
          id: ticket.assigned_to
        } : null,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        sla: {
          responseTime: ticket.response_time,
          resolutionTime: ticket.resolution_time,
          targetResponseTime: targets.responseTime,
          targetResolutionTime: targets.resolutionTime,
          breached: ticket.sla_breached
        },
        tags: ticket.tags || [],
        conversation: ticket.comments.map(c => ({
          id: c.id,
          type: c.is_internal ? 'note' : 'comment',
          author: c.author_name,
          authorType: c.author_type,
          message: c.message,
          timestamp: c.created_at,
          isInternal: c.is_internal,
          attachments: c.attachments || []
        })),
        customFields: ticket.custom_fields || {}
      }
    });
  } catch (error) {
    console.error('[Get Ticket Detail Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch ticket details' });
  }
});

// Create new ticket
router.post('/tickets', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { subject, description, clientId, organization, userName, userEmail, userRole, userPhone, priority, category, tags } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ ok: false, error: 'Subject and description are required' });
    }

    const ticketNumber = await generateTicketNumber();

    const ticket = await prisma.supportTicket.create({
      data: {
        ticket_number: ticketNumber,
        subject,
        description,
        client_id: clientId,
        organization,
        user_name: userName,
        user_email: userEmail,
        user_role: userRole,
        user_phone: userPhone,
        priority: priority || 'medium',
        category,
        tags: tags || [],
        status: 'new'
      }
    });

    // Log activity
    await prisma.recent_activity.create({
      data: {
        action: 'Support Ticket Created',
        entity: 'Support',
        entity_id: ticketNumber,
        username: req.user?.username || 'Enterprise Admin',
        details: { ticketNumber, subject, priority }
      }
    });

    res.status(201).json({
      ok: true,
      message: 'Ticket created successfully',
      ticket: {
        id: ticket.ticket_number,
        ...ticket
      }
    });
  } catch (error) {
    console.error('[Create Ticket Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to create ticket' });
  }
});

// Update ticket
router.put('/tickets/:ticketId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const { status, priority, assignedTo, assignedName, tags, category } = req.body;

    const ticket = await prisma.supportTicket.findFirst({
      where: { 
        OR: [
          { ticket_number: ticketId },
          { id: parseInt(ticketId) || 0 }
        ]
      }
    });

    if (!ticket) {
      return res.status(404).json({ ok: false, error: 'Ticket not found' });
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === 'resolved' && !ticket.resolved_at) {
        updateData.resolved_at = new Date();
        updateData.resolution_time = Math.round((Date.now() - ticket.created_at.getTime()) / 60000);
      }
      if (status === 'closed' && !ticket.closed_at) {
        updateData.closed_at = new Date();
      }
    }
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) {
      updateData.assigned_to = assignedTo;
      updateData.assigned_name = assignedName;
      if (!ticket.first_response_at) {
        updateData.first_response_at = new Date();
        updateData.response_time = Math.round((Date.now() - ticket.created_at.getTime()) / 60000);
      }
    }
    if (tags) updateData.tags = tags;
    if (category) updateData.category = category;

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: updateData
    });

    await prisma.recent_activity.create({
      data: {
        action: 'Support Ticket Updated',
        entity: 'Support',
        entity_id: ticketId,
        username: req.user?.username || 'Enterprise Admin',
        details: { ticketId, changes: updateData }
      }
    });

    res.json({
      ok: true,
      message: 'Ticket updated successfully',
      ticket: {
        id: updated.ticket_number,
        status: updated.status,
        priority: updated.priority,
        assignedTo: updated.assigned_name,
        tags: updated.tags,
        updatedAt: updated.updated_at
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
      return res.status(400).json({ ok: false, error: 'Message is required' });
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { 
        OR: [
          { ticket_number: ticketId },
          { id: parseInt(ticketId) || 0 }
        ]
      }
    });

    if (!ticket) {
      return res.status(404).json({ ok: false, error: 'Ticket not found' });
    }

    const comment = await prisma.supportTicketComment.create({
      data: {
        ticket_id: ticket.id,
        author_name: req.user?.username || 'Enterprise Admin',
        author_email: req.user?.email,
        author_type: 'admin',
        message,
        is_internal: isInternal || false
      }
    });

    if (!ticket.first_response_at && !isInternal) {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          first_response_at: new Date(),
          response_time: Math.round((Date.now() - ticket.created_at.getTime()) / 60000)
        }
      });
    }

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
      comment: {
        id: comment.id,
        type: isInternal ? 'note' : 'comment',
        author: comment.author_name,
        authorType: comment.author_type,
        message: comment.message,
        timestamp: comment.created_at,
        isInternal: comment.is_internal,
        attachments: []
      }
    });
  } catch (error) {
    console.error('[Add Comment Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to add comment' });
  }
});

// Get support metrics/SLA dashboard
router.get('/metrics', requireEnterpriseAdmin, async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalTickets,
      openTickets,
      newTickets,
      pendingTickets,
      closedThisWeek,
      byPriorityRaw,
      byCategoryRaw,
      avgResponseTime,
      avgResolutionTime,
      breachedCount
    ] = await Promise.all([
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: 'open' } }),
      prisma.supportTicket.count({ where: { status: 'new' } }),
      prisma.supportTicket.count({ where: { status: 'pending' } }),
      prisma.supportTicket.count({ 
        where: { 
          status: 'closed',
          closed_at: { gte: weekAgo }
        } 
      }),
      prisma.supportTicket.groupBy({
        by: ['priority'],
        where: { status: { in: ['new', 'open', 'pending'] } },
        _count: { id: true },
        _avg: { resolution_time: true }
      }),
      prisma.supportTicket.groupBy({
        by: ['category'],
        _count: { id: true }
      }),
      prisma.supportTicket.aggregate({
        where: { response_time: { not: null } },
        _avg: { response_time: true }
      }),
      prisma.supportTicket.aggregate({
        where: { resolution_time: { not: null } },
        _avg: { resolution_time: true }
      }),
      prisma.supportTicket.count({ where: { sla_breached: true } })
    ]);

    const lastWeekTickets = await prisma.supportTicket.count({
      where: {
        created_at: {
          gte: new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
          lt: weekAgo
        }
      }
    });
    const thisWeekTickets = await prisma.supportTicket.count({
      where: { created_at: { gte: weekAgo } }
    });

    const byPriority = {};
    byPriorityRaw.forEach(p => {
      byPriority[p.priority] = {
        open: p._count.id,
        avgResolutionTime: Math.round(p._avg.resolution_time || 0)
      };
    });

    const byCategory = {};
    byCategoryRaw.forEach(c => {
      if (c.category) byCategory[c.category] = c._count.id;
    });

    const breachRate = totalTickets > 0 ? (breachedCount / totalTickets * 100).toFixed(1) : 0;

    res.json({
      ok: true,
      metrics: {
        overview: {
          totalTickets,
          openTickets,
          newTickets,
          pendingTickets,
          closedThisWeek
        },
        sla: {
          averageFirstResponseTime: Math.round(avgResponseTime._avg?.response_time || 0),
          averageResolutionTime: Math.round(avgResolutionTime._avg?.resolution_time || 0),
          breachedTickets: breachedCount,
          breachRate: parseFloat(breachRate),
          withinSLA: (100 - parseFloat(breachRate)).toFixed(1)
        },
        byPriority,
        byCategory,
        trend: {
          thisWeek: thisWeekTickets,
          lastWeek: lastWeekTickets,
          percentChange: lastWeekTickets > 0 
            ? (((thisWeekTickets - lastWeekTickets) / lastWeekTickets) * 100).toFixed(1)
            : 0
        }
      }
    });
  } catch (error) {
    console.error('[Get Support Metrics Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch support metrics' });
  }
});

// Get ticket statistics
router.get('/stats', requireEnterpriseAdmin, async (req, res) => {
  try {
    const range = req.query.range || 'week';
    
    let startDate;
    const now = new Date();
    switch (range) {
      case 'day': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case 'month': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case 'year': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const [created, resolved, avgResolution, topIssuesRaw] = await Promise.all([
      prisma.supportTicket.count({ where: { created_at: { gte: startDate } } }),
      prisma.supportTicket.count({ 
        where: { 
          resolved_at: { gte: startDate },
          status: { in: ['resolved', 'closed'] }
        } 
      }),
      prisma.supportTicket.aggregate({
        where: { resolved_at: { gte: startDate } },
        _avg: { resolution_time: true }
      }),
      prisma.supportTicket.groupBy({
        by: ['category'],
        where: { created_at: { gte: startDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      })
    ]);

    const days = range === 'day' ? 1 : range === 'month' ? 30 : range === 'year' ? 12 : 7;
    const dailyTrend = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      const [dayCreated, dayResolved] = await Promise.all([
        prisma.supportTicket.count({ 
          where: { created_at: { gte: dayStart, lt: dayEnd } } 
        }),
        prisma.supportTicket.count({ 
          where: { resolved_at: { gte: dayStart, lt: dayEnd } } 
        })
      ]);
      
      dailyTrend.push({
        date: dayStart.toISOString().split('T')[0],
        created: dayCreated,
        resolved: dayResolved
      });
    }

    res.json({
      ok: true,
      stats: {
        created,
        resolved,
        avgResolutionTime: Math.round(avgResolution._avg?.resolution_time || 0),
        topIssues: topIssuesRaw.map(i => ({
          issue: i.category || 'Uncategorized',
          count: i._count.id
        })),
        dailyTrend
      }
    });
  } catch (error) {
    console.error('[Get Ticket Stats Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch ticket statistics' });
  }
});

// Get agents list
router.get('/agents', requireEnterpriseAdmin, async (req, res) => {
  try {
    const assignedAgents = await prisma.supportTicket.groupBy({
      by: ['assigned_to', 'assigned_name'],
      where: { assigned_to: { not: null } },
      _count: { id: true }
    });

    const agents = assignedAgents.map(a => ({
      id: a.assigned_to,
      name: a.assigned_name || `Agent ${a.assigned_to}`,
      assignedTickets: a._count.id,
      status: 'available'
    }));

    res.json({
      ok: true,
      agents: agents.length > 0 ? agents : []
    });
  } catch (error) {
    console.error('[Get Agents Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch agents' });
  }
});

// Bulk assign tickets
router.post('/tickets/bulk-assign', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { ticketIds, agentId, agentName } = req.body;

    if (!ticketIds || !Array.isArray(ticketIds) || !agentId) {
      return res.status(400).json({ ok: false, error: 'Ticket IDs and agent ID are required' });
    }

    await prisma.supportTicket.updateMany({
      where: { ticket_number: { in: ticketIds } },
      data: { 
        assigned_to: agentId,
        assigned_name: agentName
      }
    });

    await prisma.recent_activity.create({
      data: {
        action: 'Bulk Ticket Assignment',
        entity: 'Support',
        entity_id: ticketIds.join(','),
        username: req.user?.username || 'Enterprise Admin',
        details: { ticketIds, agentId, agentName, count: ticketIds.length }
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
