/**
 * Socket.IO Real-Time Report Handlers
 * Manages live data updates for ERP dashboards and reports
 * 
 * Events:
 * - report:subscribe - Subscribe to specific report updates
 * - report:unsubscribe - Unsubscribe from report updates
 * - report:data - Receive real-time data updates
 * - report:kpi - Real-time KPI value updates
 * - report:alert - Critical threshold alerts
 */

const jwt = require('jsonwebtoken');

// Store active subscriptions
const reportSubscriptions = new Map();

// Report types with their update intervals (ms)
const REPORT_CONFIG = {
  // Financial Reports
  'revenue': { interval: 30000, room: 'report:revenue' },
  'expenses': { interval: 30000, room: 'report:expenses' },
  'cashflow': { interval: 60000, room: 'report:cashflow' },
  'profit-loss': { interval: 60000, room: 'report:profit-loss' },
  
  // Sales Reports  
  'sales-live': { interval: 10000, room: 'report:sales-live' },
  'orders': { interval: 15000, room: 'report:orders' },
  'invoices': { interval: 30000, room: 'report:invoices' },
  
  // Inventory Reports
  'stock-levels': { interval: 20000, room: 'report:stock-levels' },
  'low-stock': { interval: 30000, room: 'report:low-stock' },
  'inventory-movement': { interval: 15000, room: 'report:inventory-movement' },
  
  // HR Reports
  'attendance': { interval: 60000, room: 'report:attendance' },
  'leave-requests': { interval: 30000, room: 'report:leave-requests' },
  
  // Operations
  'active-users': { interval: 5000, room: 'report:active-users' },
  'system-health': { interval: 10000, room: 'report:system-health' },
  
  // Dashboard KPIs
  'dashboard-kpi': { interval: 15000, room: 'report:dashboard-kpi' },
  'hub-metrics': { interval: 20000, room: 'report:hub-metrics' },
  
  // Custom tenant reports
  'tenant-usage': { interval: 30000, room: 'report:tenant-usage' },
};

// Active intervals for report data fetching
const activeIntervals = new Map();

/**
 * Initialize Report Socket namespace
 */
const initializeReportSocket = (io) => {
  // Create dedicated namespace for reports
  const reportNamespace = io.of('/reports');
  
  // Authentication middleware
  reportNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                    socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.username = decoded.username || decoded.email;
      socket.organizationId = decoded.organizationId || decoded.org_id;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  reportNamespace.on('connection', (socket) => {
    console.log(`[Reports] User connected: ${socket.username} (Role: ${socket.userRole})`);
    
    // Track user's subscriptions
    const userSubscriptions = new Set();
    
    // Join organization room for org-specific reports
    if (socket.organizationId) {
      socket.join(`org:${socket.organizationId}`);
    }
    
    // Join role-based room
    socket.join(`role:${socket.userRole}`);
    
    // Subscribe to a report
    socket.on('report:subscribe', (data) => {
      const { reportType, filters = {} } = data;
      
      if (!REPORT_CONFIG[reportType]) {
        socket.emit('report:error', { 
          message: `Unknown report type: ${reportType}`,
          code: 'INVALID_REPORT_TYPE'
        });
        return;
      }
      
      const config = REPORT_CONFIG[reportType];
      const roomName = `${config.room}:${socket.organizationId || 'global'}`;
      
      socket.join(roomName);
      userSubscriptions.add(reportType);
      
      console.log(`[Reports] ${socket.username} subscribed to ${reportType}`);
      
      // Send initial data immediately
      fetchAndEmitReportData(reportNamespace, reportType, roomName, filters, socket.organizationId);
      
      // Start interval if not already running for this room
      startReportInterval(reportNamespace, reportType, roomName, filters, socket.organizationId);
      
      socket.emit('report:subscribed', { 
        reportType, 
        room: roomName,
        interval: config.interval 
      });
    });
    
    // Unsubscribe from a report
    socket.on('report:unsubscribe', (data) => {
      const { reportType } = data;
      
      if (REPORT_CONFIG[reportType]) {
        const config = REPORT_CONFIG[reportType];
        const roomName = `${config.room}:${socket.organizationId || 'global'}`;
        
        socket.leave(roomName);
        userSubscriptions.delete(reportType);
        
        console.log(`[Reports] ${socket.username} unsubscribed from ${reportType}`);
        
        // Check if room is empty and stop interval
        checkAndStopInterval(reportNamespace, roomName);
        
        socket.emit('report:unsubscribed', { reportType });
      }
    });
    
    // Request immediate refresh
    socket.on('report:refresh', (data) => {
      const { reportType, filters = {} } = data;
      
      if (REPORT_CONFIG[reportType]) {
        const config = REPORT_CONFIG[reportType];
        const roomName = `${config.room}:${socket.organizationId || 'global'}`;
        
        fetchAndEmitReportData(reportNamespace, reportType, roomName, filters, socket.organizationId);
      }
    });
    
    // Subscribe to KPI updates
    socket.on('kpi:subscribe', (data) => {
      const { kpiIds = [] } = data;
      
      kpiIds.forEach(kpiId => {
        socket.join(`kpi:${kpiId}`);
      });
      
      console.log(`[Reports] ${socket.username} subscribed to KPIs: ${kpiIds.join(', ')}`);
      
      // Send initial KPI values
      fetchAndEmitKPIs(reportNamespace, kpiIds, socket);
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Reports] User ${socket.username} disconnected: ${reason}`);
      
      // Clean up subscriptions
      userSubscriptions.forEach(reportType => {
        if (REPORT_CONFIG[reportType]) {
          const config = REPORT_CONFIG[reportType];
          const roomName = `${config.room}:${socket.organizationId || 'global'}`;
          checkAndStopInterval(reportNamespace, roomName);
        }
      });
    });
    
    // Error handling
    socket.on('error', (error) => {
      console.error(`[Reports] Socket error for ${socket.username}:`, error);
    });
  });
  
  console.log('[Reports] ✅ Socket.IO report handlers initialized (namespace: /reports)');
  
  return reportNamespace;
};

/**
 * Start interval for fetching report data
 */
function startReportInterval(namespace, reportType, roomName, filters, organizationId) {
  if (activeIntervals.has(roomName)) {
    return; // Already running
  }
  
  const config = REPORT_CONFIG[reportType];
  
  const intervalId = setInterval(() => {
    const room = namespace.adapter.rooms.get(roomName);
    
    if (!room || room.size === 0) {
      // No subscribers, stop interval
      clearInterval(intervalId);
      activeIntervals.delete(roomName);
      return;
    }
    
    fetchAndEmitReportData(namespace, reportType, roomName, filters, organizationId);
  }, config.interval);
  
  activeIntervals.set(roomName, intervalId);
}

/**
 * Check if room is empty and stop interval
 */
function checkAndStopInterval(namespace, roomName) {
  const room = namespace.adapter.rooms.get(roomName);
  
  if (!room || room.size === 0) {
    const intervalId = activeIntervals.get(roomName);
    if (intervalId) {
      clearInterval(intervalId);
      activeIntervals.delete(roomName);
    }
  }
}

/**
 * Fetch and emit report data
 */
async function fetchAndEmitReportData(namespace, reportType, roomName, filters, organizationId) {
  try {
    const data = await getReportData(reportType, filters, organizationId);
    
    namespace.to(roomName).emit('report:data', {
      reportType,
      data,
      timestamp: new Date().toISOString(),
      filters
    });
  } catch (error) {
    console.error(`[Reports] Error fetching ${reportType}:`, error.message);
    
    namespace.to(roomName).emit('report:error', {
      reportType,
      message: 'Failed to fetch report data',
      code: 'FETCH_ERROR'
    });
  }
}

/**
 * Fetch and emit KPI values
 */
async function fetchAndEmitKPIs(namespace, kpiIds, socket) {
  try {
    const kpiData = await getKPIValues(kpiIds, socket.organizationId);
    
    socket.emit('kpi:data', {
      kpis: kpiData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Reports] Error fetching KPIs:', error.message);
  }
}

/**
 * Get report data based on type
 * This function should be connected to your actual data sources
 */
async function getReportData(reportType, filters, organizationId) {
  // Try to use Prisma for real data
  let prisma;
  try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  } catch (e) {
    // Prisma not available, use mock data
  }
  
  const now = new Date();
  
  switch (reportType) {
    case 'revenue':
      return {
        total: Math.floor(Math.random() * 1000000) + 500000,
        today: Math.floor(Math.random() * 50000) + 10000,
        thisWeek: Math.floor(Math.random() * 200000) + 50000,
        thisMonth: Math.floor(Math.random() * 500000) + 100000,
        growth: (Math.random() * 20 - 5).toFixed(2),
        trend: generateTrendData(7),
        breakdown: {
          products: Math.floor(Math.random() * 300000),
          services: Math.floor(Math.random() * 200000),
          subscriptions: Math.floor(Math.random() * 100000)
        }
      };
      
    case 'sales-live':
      return {
        ordersToday: Math.floor(Math.random() * 100) + 20,
        ordersProcessing: Math.floor(Math.random() * 30) + 5,
        ordersCompleted: Math.floor(Math.random() * 80) + 15,
        revenueToday: Math.floor(Math.random() * 100000) + 20000,
        avgOrderValue: Math.floor(Math.random() * 5000) + 1000,
        topProducts: [
          { name: 'Product A', sales: Math.floor(Math.random() * 50) },
          { name: 'Product B', sales: Math.floor(Math.random() * 40) },
          { name: 'Product C', sales: Math.floor(Math.random() * 30) },
        ],
        hourlyTrend: generateHourlyData(),
        lastOrder: {
          id: `ORD-${Date.now().toString(36).toUpperCase()}`,
          amount: Math.floor(Math.random() * 10000) + 500,
          time: now.toISOString()
        }
      };
      
    case 'stock-levels':
      return {
        totalItems: Math.floor(Math.random() * 5000) + 1000,
        lowStock: Math.floor(Math.random() * 50) + 10,
        outOfStock: Math.floor(Math.random() * 10),
        categories: [
          { name: 'Electronics', count: Math.floor(Math.random() * 500), value: Math.floor(Math.random() * 500000) },
          { name: 'Furniture', count: Math.floor(Math.random() * 300), value: Math.floor(Math.random() * 300000) },
          { name: 'Supplies', count: Math.floor(Math.random() * 1000), value: Math.floor(Math.random() * 100000) },
        ],
        recentMovements: generateRecentMovements(),
        alerts: generateStockAlerts()
      };
      
    case 'active-users':
      return {
        online: Math.floor(Math.random() * 50) + 10,
        idle: Math.floor(Math.random() * 20) + 5,
        offline: Math.floor(Math.random() * 100) + 50,
        byRole: {
          admin: Math.floor(Math.random() * 5) + 1,
          manager: Math.floor(Math.random() * 10) + 2,
          employee: Math.floor(Math.random() * 30) + 10,
          viewer: Math.floor(Math.random() * 20) + 5
        },
        recentActivity: generateRecentActivity()
      };
      
    case 'dashboard-kpi':
      return {
        revenue: {
          value: Math.floor(Math.random() * 1000000) + 500000,
          change: (Math.random() * 20 - 5).toFixed(2),
          trend: 'up'
        },
        orders: {
          value: Math.floor(Math.random() * 500) + 100,
          change: (Math.random() * 15 - 3).toFixed(2),
          trend: 'up'
        },
        customers: {
          value: Math.floor(Math.random() * 1000) + 200,
          change: (Math.random() * 10).toFixed(2),
          trend: 'up'
        },
        inventory: {
          value: Math.floor(Math.random() * 5000) + 1000,
          lowStock: Math.floor(Math.random() * 50),
          trend: 'stable'
        },
        tasks: {
          pending: Math.floor(Math.random() * 30) + 5,
          completed: Math.floor(Math.random() * 100) + 20,
          overdue: Math.floor(Math.random() * 10)
        }
      };
      
    case 'system-health':
      return {
        status: 'healthy',
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: ((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100).toFixed(2)
        },
        cpu: (Math.random() * 30 + 10).toFixed(2),
        activeConnections: Math.floor(Math.random() * 100) + 20,
        requestsPerMinute: Math.floor(Math.random() * 500) + 100,
        avgResponseTime: Math.floor(Math.random() * 100) + 20,
        errorRate: (Math.random() * 1).toFixed(3),
        database: {
          status: 'connected',
          queryTime: Math.floor(Math.random() * 50) + 5
        }
      };
      
    case 'attendance':
      return {
        present: Math.floor(Math.random() * 80) + 60,
        absent: Math.floor(Math.random() * 20) + 5,
        late: Math.floor(Math.random() * 15) + 2,
        onLeave: Math.floor(Math.random() * 10) + 1,
        workFromHome: Math.floor(Math.random() * 20) + 5,
        checkIns: generateCheckInData()
      };
      
    case 'hub-metrics':
      return {
        totalHubs: Math.floor(Math.random() * 20) + 5,
        activeHubs: Math.floor(Math.random() * 18) + 5,
        totalCapacity: Math.floor(Math.random() * 10000) + 5000,
        utilization: (Math.random() * 40 + 50).toFixed(2),
        hubPerformance: [
          { name: 'Hub A', orders: Math.floor(Math.random() * 100), efficiency: (Math.random() * 20 + 80).toFixed(1) },
          { name: 'Hub B', orders: Math.floor(Math.random() * 80), efficiency: (Math.random() * 20 + 75).toFixed(1) },
          { name: 'Hub C', orders: Math.floor(Math.random() * 60), efficiency: (Math.random() * 20 + 70).toFixed(1) },
        ]
      };
      
    default:
      return {
        message: `Report type ${reportType} data`,
        timestamp: now.toISOString(),
        organizationId
      };
  }
}

/**
 * Get KPI values
 */
async function getKPIValues(kpiIds, organizationId) {
  const kpis = {};
  
  kpiIds.forEach(kpiId => {
    kpis[kpiId] = {
      value: Math.floor(Math.random() * 10000),
      change: (Math.random() * 20 - 10).toFixed(2),
      trend: Math.random() > 0.5 ? 'up' : 'down',
      updatedAt: new Date().toISOString()
    };
  });
  
  return kpis;
}

// Helper functions for generating mock data
function generateTrendData(days) {
  const data = [];
  const baseValue = Math.floor(Math.random() * 50000) + 30000;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: baseValue + Math.floor(Math.random() * 10000 - 5000)
    });
  }
  
  return data;
}

function generateHourlyData() {
  const data = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now);
    hour.setHours(now.getHours() - i);
    data.push({
      hour: hour.getHours(),
      orders: Math.floor(Math.random() * 20),
      revenue: Math.floor(Math.random() * 10000)
    });
  }
  
  return data;
}

function generateRecentMovements() {
  const movements = [];
  const types = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'];
  
  for (let i = 0; i < 5; i++) {
    movements.push({
      id: `MOV-${Date.now() - i * 1000}`,
      type: types[Math.floor(Math.random() * types.length)],
      item: `Item ${Math.floor(Math.random() * 100)}`,
      quantity: Math.floor(Math.random() * 50) + 1,
      timestamp: new Date(Date.now() - i * 60000).toISOString()
    });
  }
  
  return movements;
}

function generateStockAlerts() {
  const alerts = [];
  const alertTypes = ['LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRING_SOON', 'REORDER_NEEDED'];
  
  for (let i = 0; i < 3; i++) {
    alerts.push({
      id: `ALERT-${Date.now() - i}`,
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      item: `Critical Item ${i + 1}`,
      message: 'Requires immediate attention',
      severity: Math.random() > 0.5 ? 'high' : 'medium'
    });
  }
  
  return alerts;
}

function generateRecentActivity() {
  const activities = [];
  const actions = ['logged_in', 'viewed_report', 'created_order', 'updated_inventory', 'approved_task'];
  
  for (let i = 0; i < 10; i++) {
    activities.push({
      userId: `user_${Math.floor(Math.random() * 100)}`,
      username: `User ${Math.floor(Math.random() * 100)}`,
      action: actions[Math.floor(Math.random() * actions.length)],
      timestamp: new Date(Date.now() - i * 30000).toISOString()
    });
  }
  
  return activities;
}

function generateCheckInData() {
  const checkIns = [];
  
  for (let i = 0; i < 5; i++) {
    const hour = 8 + Math.floor(Math.random() * 3);
    const minute = Math.floor(Math.random() * 60);
    checkIns.push({
      employeeId: `EMP-${1000 + i}`,
      name: `Employee ${i + 1}`,
      checkInTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      status: hour >= 9 ? 'late' : 'on_time'
    });
  }
  
  return checkIns;
}

/**
 * Broadcast report update to all subscribers
 * Call this from your controllers when data changes
 */
function broadcastReportUpdate(io, reportType, data, organizationId = 'global') {
  if (!REPORT_CONFIG[reportType]) {
    console.warn(`[Reports] Unknown report type for broadcast: ${reportType}`);
    return;
  }
  
  const config = REPORT_CONFIG[reportType];
  const roomName = `${config.room}:${organizationId}`;
  
  io.of('/reports').to(roomName).emit('report:data', {
    reportType,
    data,
    timestamp: new Date().toISOString(),
    source: 'broadcast'
  });
}

/**
 * Send alert to report subscribers
 */
function sendReportAlert(io, reportType, alert, organizationId = 'global') {
  if (!REPORT_CONFIG[reportType]) return;
  
  const config = REPORT_CONFIG[reportType];
  const roomName = `${config.room}:${organizationId}`;
  
  io.of('/reports').to(roomName).emit('report:alert', {
    reportType,
    alert,
    timestamp: new Date().toISOString()
  });
}

/**
 * Update specific KPI value
 */
function updateKPI(io, kpiId, value, metadata = {}) {
  io.of('/reports').to(`kpi:${kpiId}`).emit('kpi:update', {
    kpiId,
    value,
    ...metadata,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  initializeReportSocket,
  broadcastReportUpdate,
  sendReportAlert,
  updateKPI,
  REPORT_CONFIG
};
