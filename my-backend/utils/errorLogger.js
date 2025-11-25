/**
 * ============================================================================
 * ERROR LOGGING UTILITY
 * ============================================================================
 * 
 * Centralized error logging with:
 * - File logging (errors.log)
 * - Database logging (error_logs table)
 * - Console output
 * - Structured format
 * 
 * @module utils/errorLogger
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const errorLogPath = path.join(logsDir, 'errors.log');

/**
 * Extract user information from request
 */
function extractUserInfo(req) {
  const user = req.user || {};
  return {
    userId: user.id || null,
    userEmail: user.email || null,
    userRole: user.role || null,
    userType: user.userType || null,
  };
}

/**
 * Extract IP address from request
 */
function extractIpAddress(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/**
 * Extract module/route from request
 */
function extractModule(req) {
  const path = req.originalUrl || req.url || '';
  
  // Extract module from path (e.g., /api/tasks -> tasks)
  const match = path.match(/^\/api\/([^/?]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Format error log entry
 */
function formatLogEntry(error, req, metadata = {}) {
  const timestamp = new Date().toISOString();
  const userInfo = extractUserInfo(req);
  const ipAddress = extractIpAddress(req);
  const module = extractModule(req);
  
  return {
    timestamp,
    errorCode: error.errorCode || 'SERVER_ERROR',
    message: error.message || 'Unknown error',
    httpStatus: error.httpStatus || 500,
    module,
    method: req.method,
    path: req.originalUrl || req.url,
    ipAddress,
    ...userInfo,
    userAgent: req.headers['user-agent'] || null,
    stack: error.stack || null,
    ...metadata,
  };
}

/**
 * Write error to file
 */
function writeToFile(logEntry) {
  try {
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(errorLogPath, logLine, 'utf8');
  } catch (fileError) {
    console.error('Failed to write error to file:', fileError);
  }
}

/**
 * Write error to database
 */
async function writeToDatabase(logEntry) {
  try {
    // Check if error_logs table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'error_logs'
      )
    `;
    
    if (tableExists && tableExists[0]?.exists) {
      await prisma.$executeRaw`
        INSERT INTO error_logs (
          timestamp, 
          error_code, 
          message, 
          http_status, 
          module, 
          method, 
          path, 
          ip_address, 
          user_id, 
          user_email, 
          user_role, 
          user_agent, 
          stack
        ) VALUES (
          ${logEntry.timestamp}::timestamp,
          ${logEntry.errorCode},
          ${logEntry.message},
          ${logEntry.httpStatus},
          ${logEntry.module},
          ${logEntry.method},
          ${logEntry.path},
          ${logEntry.ipAddress},
          ${logEntry.userId},
          ${logEntry.userEmail},
          ${logEntry.userRole},
          ${logEntry.userAgent},
          ${logEntry.stack}
        )
      `;
    }
  } catch (dbError) {
    // Silently fail database logging - don't crash the app
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to write error to database:', dbError.message);
    }
  }
}

/**
 * Main error logging function
 */
async function logError(error, req, metadata = {}) {
  const logEntry = formatLogEntry(error, req, metadata);
  
  // Always log to console
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🚨 ERROR:', logEntry.errorCode);
  console.error('📍 Path:', logEntry.method, logEntry.path);
  console.error('💬 Message:', logEntry.message);
  console.error('👤 User:', logEntry.userEmail || 'Anonymous');
  console.error('🌐 IP:', logEntry.ipAddress);
  console.error('📅 Time:', logEntry.timestamp);
  
  if (process.env.NODE_ENV !== 'production' && error.stack) {
    console.error('📚 Stack:', error.stack);
  }
  
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Write to file (synchronous)
  writeToFile(logEntry);
  
  // Write to database (asynchronous, non-blocking)
  writeToDatabase(logEntry).catch(err => {
    // Silent fail for database logging
  });
}

/**
 * Create error_logs table if it doesn't exist
 */
async function initializeErrorLogsTable() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS error_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        error_code VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        http_status INTEGER,
        module VARCHAR(100),
        method VARCHAR(10),
        path TEXT,
        ip_address VARCHAR(100),
        user_id INTEGER,
        user_email VARCHAR(255),
        user_role VARCHAR(100),
        user_type VARCHAR(100),
        user_agent TEXT,
        stack TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Create index on timestamp for faster queries
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp 
      ON error_logs(timestamp DESC)
    `;
    
    // Create index on error_code
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_error_logs_error_code 
      ON error_logs(error_code)
    `;
    
    console.log('✅ Error logs table initialized');
  } catch (err) {
    console.warn('⚠️ Could not initialize error_logs table:', err.message);
  }
}

module.exports = {
  logError,
  initializeErrorLogsTable,
  extractUserInfo,
  extractIpAddress,
  extractModule,
};
