/**
 * Analytics Service
 * 
 * Lightweight event tracking and aggregation:
 * - Track events to PostgreSQL or queue
 * - Batch writes for performance
 * - Daily aggregation to tenant_usage
 */

const prisma = require('../../lib/prisma');

// Event buffer for batch writes
const eventBuffer = [];
const BUFFER_SIZE = 100;
const FLUSH_INTERVAL_MS = 5000;

// Event types
const EVENT_TYPES = {
  API_REQUEST: 'api_request',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  FILE_UPLOAD: 'file_upload',
  FILE_DELETE: 'file_delete',
  REPORT_GENERATED: 'report_generated',
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
  ERROR_OCCURRED: 'error_occurred',
  FEATURE_USED: 'feature_used',
  SUBSCRIPTION_CHANGED: 'subscription_changed'
};

// Flush timer
let flushTimer = null;

/**
 * Track an event
 * 
 * @param {Object} params Event parameters
 * @param {string} params.tenantId Tenant/Client ID (optional for system events)
 * @param {string} params.eventType Event type from EVENT_TYPES
 * @param {Object} params.payload Additional event data
 * @param {string} params.userId User ID (optional)
 */
async function trackEvent({ tenantId, eventType, payload = {}, userId = null }) {
  const event = {
    client_id: tenantId || null,  // Map tenantId to client_id column
    user_id: userId,
    event_type: eventType,
    payload: {
      ...payload,
      timestamp: new Date().toISOString()
    },
    created_at: new Date()
  };

  // Add to buffer
  eventBuffer.push(event);

  // Flush if buffer is full
  if (eventBuffer.length >= BUFFER_SIZE) {
    await flushEvents();
  } else if (!flushTimer) {
    // Schedule flush
    flushTimer = setTimeout(() => flushEvents(), FLUSH_INTERVAL_MS);
  }

  return event;
}

/**
 * Flush buffered events to database
 */
async function flushEvents() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventBuffer.length === 0) {
    return;
  }

  const eventsToFlush = eventBuffer.splice(0, eventBuffer.length);
  
  try {
    await prisma.event.createMany({
      data: eventsToFlush,
      skipDuplicates: true
    });
    
    console.log(`[Analytics] Flushed ${eventsToFlush.length} events`);
  } catch (error) {
    console.error('[Analytics] Failed to flush events:', error);
    // Put events back in buffer for retry
    eventBuffer.unshift(...eventsToFlush);
  }
}

/**
 * Track API request (simplified version for middleware)
 */
function trackApiRequest(tenantId, endpoint, method, statusCode, durationMs, userId = null) {
  return trackEvent({
    tenantId,
    eventType: EVENT_TYPES.API_REQUEST,
    userId,
    payload: {
      endpoint,
      method,
      statusCode,
      durationMs,
      success: statusCode < 400
    }
  });
}

/**
 * Track user login
 */
function trackUserLogin(tenantId, userId, method = 'password') {
  return trackEvent({
    tenantId,
    eventType: EVENT_TYPES.USER_LOGIN,
    userId,
    payload: { method }
  });
}

/**
 * Track file upload
 */
function trackFileUpload(tenantId, userId, fileSize, fileType) {
  return trackEvent({
    tenantId,
    eventType: EVENT_TYPES.FILE_UPLOAD,
    userId,
    payload: { fileSize, fileType }
  });
}

/**
 * Track feature usage
 */
function trackFeatureUsage(tenantId, userId, feature, metadata = {}) {
  return trackEvent({
    tenantId,
    eventType: EVENT_TYPES.FEATURE_USED,
    userId,
    payload: { feature, ...metadata }
  });
}

/**
 * Track error
 */
function trackError(tenantId, userId, errorType, errorMessage, stack = null) {
  return trackEvent({
    tenantId,
    eventType: EVENT_TYPES.ERROR_OCCURRED,
    userId,
    payload: {
      errorType,
      errorMessage,
      stack: process.env.NODE_ENV !== 'production' ? stack : null
    }
  });
}

/**
 * Query events for a tenant
 */
async function getEvents(tenantId, options = {}) {
  const {
    eventType,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = options;

  const where = {
    client_id: tenantId  // Use client_id column
  };

  if (eventType) {
    where.event_type = eventType;
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(startDate);
    if (endDate) where.created_at.lte = new Date(endDate);
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.event.count({ where })
  ]);

  return {
    events,
    total,
    limit,
    offset
  };
}

/**
 * Get event counts by type for a tenant
 */
async function getEventCounts(tenantId, startDate, endDate) {
  const where = {
    client_id: tenantId,  // Use client_id column
    created_at: {
      gte: new Date(startDate),
      lte: new Date(endDate)
    }
  };

  const counts = await prisma.event.groupBy({
    by: ['event_type'],
    where,
    _count: { id: true }
  });

  return counts.reduce((acc, item) => {
    acc[item.event_type] = item._count.id;
    return acc;
  }, {});
}

/**
 * Get daily event counts for charts
 */
async function getDailyEventCounts(tenantId, startDate, endDate, eventType = null) {
  const where = {
    client_id: tenantId,
    created_at: {
      gte: new Date(startDate),
      lte: new Date(endDate)
    }
  };

  if (eventType) {
    where.event_type = eventType;
  }

  // Use raw query for date grouping
  const result = await prisma.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      event_type,
      COUNT(*)::int as count
    FROM events
    WHERE client_id = ${tenantId}::uuid
      AND created_at >= ${new Date(startDate)}
      AND created_at <= ${new Date(endDate)}
      ${eventType ? prisma.$queryRaw`AND event_type = ${eventType}` : prisma.$queryRaw``}
    GROUP BY DATE(created_at), event_type
    ORDER BY date ASC
  `;

  return result;
}

/**
 * Get unique active users count
 */
async function getActiveUsersCount(tenantId, startDate, endDate) {
  const result = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT user_id)::int as count
    FROM events
    WHERE client_id = ${tenantId}::uuid
      AND created_at >= ${new Date(startDate)}
      AND created_at <= ${new Date(endDate)}
      AND user_id IS NOT NULL
  `;

  return result[0]?.count || 0;
}

/**
 * Graceful shutdown - flush remaining events
 */
async function shutdown() {
  console.log('[Analytics] Shutting down, flushing events...');
  await flushEvents();
}

// Register shutdown handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
  trackEvent,
  trackApiRequest,
  trackUserLogin,
  trackFileUpload,
  trackFeatureUsage,
  trackError,
  flushEvents,
  getEvents,
  getEventCounts,
  getDailyEventCounts,
  getActiveUsersCount,
  shutdown,
  EVENT_TYPES
};
