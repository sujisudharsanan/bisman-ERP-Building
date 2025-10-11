// Security Monitoring Service
// Production-ready service for recording, querying, and resolving security events.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Cached readiness check for security tables
let securityReadyCache = { ready: null, ts: 0 };
const TTL_MS = 10_000;
async function isSecurityTablesReady() {
  const now = Date.now();
  if (securityReadyCache.ready !== null && now - securityReadyCache.ts < TTL_MS) {
    return !!securityReadyCache.ready;
  }
  try {
    if (!process.env.DATABASE_URL) {
      securityReadyCache = { ready: false, ts: now };
      return false;
    }
    const rows = await prisma.$queryRawUnsafe(
      "SELECT to_regclass('public.security_events') as se, to_regclass('public.security_resolutions') as sr"
    );
    const r = Array.isArray(rows) ? rows[0] : rows;
    const ready = !!(r && r.se && r.sr);
    securityReadyCache = { ready, ts: now };
    return ready;
  } catch (_e) {
    securityReadyCache = { ready: false, ts: now };
    return false;
  }
}

const normalizeSeverity = (s) => (s || '').toLowerCase();
const VALID_STATUSES = ['open', 'investigating', 'resolved', 'verified', 'closed'];

module.exports = {
  async ingestEvent(payload) {
    if (!(await isSecurityTablesReady())) {
      throw new Error('Security tables are not ready. Please run database migrations.');
    }
    const data = {
      occurred_at: payload.time ? new Date(payload.time) : new Date(),
      source: payload.source || 'unknown',
      event_type: payload.event_type,
      severity: normalizeSeverity(payload.severity || 'low'),
      summary: payload.summary || 'Security event',
      details: payload.details || {},
      status: 'open',
      assignee_id: payload.assignee_id || null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
    };

    const event = await prisma.securityEvent.create({ data });

    // Audit log
    await prisma.auditLog.create({
      data: {
        user_id: payload.actor_id || null,
        action: 'CREATE',
        entity_type: 'SECURITY_EVENT',
        entity_id: event.id,
        new_values: data,
      }
    });

    return event;
  },

  async listEvents(filters) {
    if (!(await isSecurityTablesReady())) {
      // Graceful fallback: no events until tables exist
      return [];
    }
    const where = {};
    if (filters.start || filters.end) {
      where.occurred_at = {};
      if (filters.start) where.occurred_at.gte = new Date(filters.start);
      if (filters.end) where.occurred_at.lte = new Date(filters.end);
    }
    if (filters.severity) where.severity = normalizeSeverity(filters.severity);
    if (filters.status) where.status = filters.status;

    const events = await prisma.securityEvent.findMany({
      where,
      orderBy: { occurred_at: 'desc' },
      include: { assignee: { select: { id: true, email: true, username: true } } }
    });

    return events;
  },

  async addResolution(eventId, note, statusAfter, actorId, attachments) {
    if (!(await isSecurityTablesReady())) {
      throw new Error('Security tables are not ready. Please run database migrations.');
    }
    if (!VALID_STATUSES.includes(statusAfter)) {
      throw new Error('Invalid status');
    }

    const result = await prisma.$transaction(async (tx) => {
      const resolution = await tx.securityResolution.create({
        data: {
          event_id: eventId,
          note,
          status_after: statusAfter,
          added_by: actorId || null,
          attachments: attachments || null,
        }
      });

      const eventUpdate = { status: statusAfter };
      if (statusAfter === 'resolved') eventUpdate.resolved_at = new Date();
      if (statusAfter === 'verified') eventUpdate.verified_at = new Date();
      if (statusAfter === 'closed') eventUpdate.closed_at = new Date();

      await tx.securityEvent.update({ where: { id: eventId }, data: eventUpdate });

      await tx.auditLog.create({
        data: {
          user_id: actorId || null,
          action: 'UPDATE',
          entity_type: 'SECURITY_EVENT',
          entity_id: eventId,
          old_values: {},
          new_values: { resolution: { id: resolution.id, note, statusAfter } },
        }
      });

      return { resolution };
    });

    return result;
  },

  async closeEvent(eventId, actorId) {
    return this.addResolution(eventId, 'Closed', 'closed', actorId);
  },

  async getAudit(options = {}) {
    const rows = await prisma.auditLog.findMany({
      where: { entity_type: 'SECURITY_EVENT' },
      orderBy: { created_at: 'desc' },
      take: options.limit || 100,
    });
    return rows;
  },

  async metrics() {
    if (!(await isSecurityTablesReady())) {
      return { openCount: 0, resolvedCount: 0, mtta: null, mttr: null, slaCompliance: null };
    }
    const [openCount, resolvedCount] = await Promise.all([
      prisma.securityEvent.count({ where: { status: { in: ['open', 'investigating'] } } }),
      prisma.securityEvent.count({ where: { status: { in: ['resolved', 'verified', 'closed'] } } }),
    ]);

    // MTTA/MTTR simplified (requires first resolution timestamps in full impl)
    const recent = await prisma.securityEvent.findMany({
      orderBy: { occurred_at: 'desc' },
      take: 200,
      select: { occurred_at: true, resolved_at: true }
    });

    let mtta = null, mttr = null; // placeholders; could be extended with resolution history
    const resolvedTimes = recent.filter(r => r.resolved_at).map(r => (r.resolved_at.getTime() - r.occurred_at.getTime()));
    if (resolvedTimes.length) mttr = Math.round(resolvedTimes.reduce((a,b)=>a+b,0)/resolvedTimes.length/1000);

    return { openCount, resolvedCount, mtta, mttr, slaCompliance: null };
  }
};
