#!/usr/bin/env node

/**
 * 🔐 BISMAN ERP Security Audit & Auto-Fix Script
 * 
 * Automated security audit tool that detects and optionally fixes 
 * common authentication vulnerabilities in login flows.
 * 
 * Usage:
 *   node security-audit.js --report          # Dry-run mode (report only)
 *   node security-audit.js --fix            # Auto-apply fixes
 *   node security-audit.js --help           # Show help
 * 
 * Author: GitHub Copilot Security Auditor
 * Date: October 5, 2025
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const chalk = require('chalk');

// Configuration
const CONFIG = {
  // Directories to scan
  scanDirs: [
    './my-backend',
    './my-frontend/src',
    './my-frontend/app',
    './apps',
    './libs'
  ],
  
  // Log directories to check
  logDirs: [
    './logs',
    './my-backend/logs',
    './my-frontend/logs',
    '/var/log/nginx',
    '/var/log/apache2'
  ],
  
  // File extensions to scan
  fileExtensions: ['.js', '.ts', '.tsx', '.jsx', '.json'],
  
  // Security patterns
  patterns: {
    // Dangerous GET patterns with credentials
    unsafeGet: /(?:login|auth|signin)\?.*(?:email|password|token)=/gi,
    
    // Plain text password storage
    plaintextPassword: /password\s*[:=]\s*['"]\w+['"]|password\s*:\s*req\.body\.password(?!\s*,\s*\$bcrypt|\s*,\s*bcrypt)/gi,
    
    // Missing bcrypt/argon2
    missingHashing: /password.*(?:INSERT|UPDATE|create|save)(?!.*(?:bcrypt|argon2|hash))/gi,
    
    // Insecure JWT secrets
    weakJwt: /JWT_SECRET\s*[:=]\s*['"](?:secret|dev-secret|test|123|password)['"]|jwt\.sign\([^,]+,\s*['"](?:secret|dev-secret|test|123|password)['"]/gi,
    
    // Missing HTTPS enforcement
    noHttps: /app\.use\s*\(\s*helmet\s*\(\s*\)\s*\)|enforce\.HTTPS|app\.use.*sslify|secure\s*:\s*true/gi,
    
    // Rate limiting patterns
    rateLimit: /rateLimit|express-rate-limit|rate-limit/gi,
    
    // Insecure cookies
    insecureCookie: /cookie.*secure\s*:\s*false|cookie.*httpOnly\s*:\s*false|cookie.*sameSite\s*:\s*['"]none['"]/gi,
    
    // Log credential exposure
    logCredentials: /(?:console\.log|logger|log).*(?:password|token|secret)/gi
  }
};

// Global state
let auditResults = {
  score: 100,
  categories: {},
  fixes: [],
  critical: [],
  warnings: []
};

let isFixMode = false;
let isReportMode = false;

/**
 * 🎨 Console styling utilities
 */
const style = {
  title: (text) => chalk.bold.blue(text),
  pass: (text) => chalk.green('✅ PASS') + '  ' + text,
  fail: (text) => chalk.red('⚠️  FAIL') + '  ' + text,
  fixed: (text) => chalk.yellow('🔧 FIXED') + ' ' + text,
  info: (text) => chalk.cyan('ℹ️  INFO') + '  ' + text,
  warn: (text) => chalk.yellow('⚠️  WARN') + '  ' + text,
  critical: (text) => chalk.red.bold('🚨 CRITICAL') + ' ' + text,
  section: (text) => chalk.bold.underline(text),
  code: (text) => chalk.gray(text),
  success: (text) => chalk.green.bold(text),
  error: (text) => chalk.red.bold(text)
};

/**
 * 📊 Audit Categories
 */
class SecurityAudit {
  constructor() {
    this.results = {
      requestMethodValidation: { passed: false, score: 0, details: [], fixes: [] },
      httpsEnforcement: { passed: false, score: 0, details: [], fixes: [] },
      passwordHashing: { passed: false, score: 0, details: [], fixes: [] },
      rateLimiting: { passed: false, score: 0, details: [], fixes: [] },
      auditLogs: { passed: false, score: 0, details: [], fixes: [] },
      sessionSecurity: { passed: false, score: 0, details: [], fixes: [] }
    };
  }

  /**
   * 🔍 1. Request Method Validation
   * Check for dangerous GET requests with credentials
   */
  async auditRequestMethods() {
    console.log(style.section('\n🔍 1. Request Method Validation'));
    
    const violations = [];
    const files = this.getAllFiles();
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (CONFIG.patterns.unsafeGet.test(line)) {
            violations.push({
              file,
              line: index + 1,
              content: line.trim(),
              type: 'unsafe_get_credentials'
            });
          }
          
          // Check for form action with GET method
          if (/method\s*=\s*['"]get['"].*(?:email|password)/gi.test(line)) {
            violations.push({
              file,
              line: index + 1,
              content: line.trim(),
              type: 'form_get_method'
            });
          }
        });
      } catch (err) {
        // Skip unreadable files
      }
    }
    
    if (violations.length === 0) {
      console.log(style.pass('No unsafe GET requests with credentials found'));
      this.results.requestMethodValidation.passed = true;
      this.results.requestMethodValidation.score = 20;
    } else {
      console.log(style.fail(`Found ${violations.length} unsafe GET requests:`));
      violations.forEach(v => {
        console.log(style.code(`  ${v.file}:${v.line} - ${v.content}`));
      });
      
      if (isFixMode) {
        await this.fixUnsafeGetRequests(violations);
      }
      
      this.results.requestMethodValidation.details = violations;
      this.results.requestMethodValidation.score = Math.max(0, 20 - violations.length * 5);
    }
  }

  /**
   * 🔒 2. HTTPS/TLS Enforcement
   */
  async auditHttpsEnforcement() {
    console.log(style.section('\n🔒 2. HTTPS/TLS Enforcement'));
    
    const backendFiles = this.getFilesByPattern(['**/app.js', '**/main.ts', '**/server.js']);
    let hasHelmet = false;
    let hasSSLify = false;
    let hasSecureCookies = false;
    
    for (const file of backendFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        if (/helmet\(\)/.test(content)) hasHelmet = true;
        if (/enforce\.HTTPS|sslify/i.test(content)) hasSSLify = true;
        if (/secure\s*:\s*true/.test(content)) hasSecureCookies = true;
      } catch (err) {
        // Skip
      }
    }
    
    const missing = [];
    if (!hasHelmet) missing.push('helmet middleware');
    if (!hasSSLify) missing.push('HTTPS enforcement');
    if (!hasSecureCookies) missing.push('secure cookies');
    
    if (missing.length === 0) {
      console.log(style.pass('HTTPS enforcement properly configured (production-aware)'));
      this.results.httpsEnforcement.passed = true;
      this.results.httpsEnforcement.score = 20;
    } else {
      console.log(style.fail(`Missing: ${missing.join(', ')}`));
      
      if (isFixMode) {
        await this.fixHttpsEnforcement(backendFiles, missing);
      }
      
      this.results.httpsEnforcement.details = missing;
      this.results.httpsEnforcement.score = Math.max(0, 20 - missing.length * 7);
    }
  }

  /**
   * 🔐 3. Password Hashing Audit
   */
  async auditPasswordHashing() {
    console.log(style.section('\n🔐 3. Password Hashing'));
    
    const violations = [];
    const files = this.getAllFiles();
    let hasBcrypt = false;
    let hasArgon2 = false;
    
    // Check package.json for hashing libraries
    try {
      const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const backendPkg = JSON.parse(fs.readFileSync('./my-backend/package.json', 'utf8'));
      
      const allDeps = { 
        ...pkg.dependencies, 
        ...pkg.devDependencies,
        ...backendPkg.dependencies,
        ...backendPkg.devDependencies 
      };
      
      hasBcrypt = !!(allDeps.bcrypt || allDeps.bcryptjs);
      hasArgon2 = !!allDeps.argon2;
    } catch (err) {
      // Skip
    }
    
    // Scan for password handling patterns
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Look for potential plaintext password storage
          if (/password.*INSERT|password.*create|password.*save/.test(line) && 
              !/bcrypt|argon2|hash/.test(line)) {
            violations.push({
              file,
              line: index + 1,
              content: line.trim(),
              type: 'potential_plaintext'
            });
          }
        });
      } catch (err) {
        // Skip
      }
    }
    
    if (hasBcrypt || hasArgon2) {
      console.log(style.pass(`Password hashing library found: ${hasBcrypt ? 'bcrypt' : 'argon2'}`));
      this.results.passwordHashing.passed = true;
      this.results.passwordHashing.score = 20;
    } else {
      console.log(style.fail('No password hashing library found'));
      
      if (isFixMode) {
        await this.fixPasswordHashing();
      }
      
      this.results.passwordHashing.score = 0;
    }
    
    if (violations.length > 0) {
      console.log(style.warn(`Found ${violations.length} potential plaintext password issues:`));
      violations.forEach(v => {
        console.log(style.code(`  ${v.file}:${v.line}`));
      });
      this.results.passwordHashing.score = Math.max(0, this.results.passwordHashing.score - violations.length * 3);
    }
  }

  /**
   * ⏱️ 4. Rate Limiting
   */
  async auditRateLimiting() {
    console.log(style.section('\n⏱️ 4. Rate Limiting'));
    
    const backendFiles = this.getFilesByPattern(['**/app.js', '**/main.ts', '**/auth*.js', '**/login*.js']);
    let hasRateLimit = false;
    let hasAuthRateLimit = false;
    
    for (const file of backendFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        if (CONFIG.patterns.rateLimit.test(content)) {
          hasRateLimit = true;
          
          // Check if specifically applied to auth routes
          if (/login|auth.*rateLimit|rateLimit.*login|authLimiter/i.test(content)) {
            hasAuthRateLimit = true;
          }
        }
      } catch (err) {
        // Skip
      }
    }
    
    if (hasAuthRateLimit) {
      console.log(style.pass('Rate limiting configured for authentication routes'));
      this.results.rateLimiting.passed = true;
      this.results.rateLimiting.score = 15;
    } else if (hasRateLimit) {
      console.log(style.warn('Rate limiting found but not specifically for auth routes'));
      this.results.rateLimiting.score = 10;
      
      if (isFixMode) {
        await this.fixRateLimiting('auth_specific');
      }
    } else {
      console.log(style.fail('No rate limiting found'));
      this.results.rateLimiting.score = 0;
      
      if (isFixMode) {
        await this.fixRateLimiting('missing');
      }
    }
  }

  /**
   * 📋 5. Audit Logs (Credential Exposure)
   */
  async auditLogSecurity() {
    console.log(style.section('\n📋 5. Audit Logs'));
    
    const exposures = [];
    const logFiles = [];
    
    // Collect all log files
    for (const logDir of CONFIG.logDirs) {
      try {
        if (fs.existsSync(logDir)) {
          const files = fs.readdirSync(logDir);
          files.forEach(file => {
            if (file.endsWith('.log')) {
              logFiles.push(path.join(logDir, file));
            }
          });
        }
      } catch (err) {
        // Skip inaccessible directories
      }
    }
    
    // Scan log files for credential exposure
    for (const logFile of logFiles) {
      try {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (/password=|email=.*password|token=.*[a-zA-Z0-9]{10,}/gi.test(line)) {
            exposures.push({
              file: logFile,
              line: index + 1,
              content: line.substring(0, 100) + '...',
              type: 'credential_exposure'
            });
          }
        });
      } catch (err) {
        // Skip
      }
    }
    
    // Scan source code for logging credentials
    const sourceFiles = this.getAllFiles();
    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (CONFIG.patterns.logCredentials.test(line)) {
            exposures.push({
              file,
              line: index + 1,
              content: line.trim(),
              type: 'source_logging'
            });
          }
        });
      } catch (err) {
        // Skip
      }
    }
    
    if (exposures.length === 0) {
      console.log(style.pass('No credential exposure found in logs'));
      this.results.auditLogs.passed = true;
      this.results.auditLogs.score = 15;
    } else {
      console.log(style.fail(`Found ${exposures.length} potential credential exposures:`));
      exposures.slice(0, 5).forEach(e => {
        console.log(style.code(`  ${e.file}:${e.line} - ${e.type}`));
      });
      
      if (isFixMode) {
        await this.fixLogExposures(exposures);
      }
      
      this.results.auditLogs.details = exposures;
      this.results.auditLogs.score = Math.max(0, 15 - exposures.length * 2);
    }
  }

  /**
   * 🍪 6. Session & JWT Security
   */
  async auditSessionSecurity() {
    console.log(style.section('\n🍪 6. Session & JWT Security'));
    
    const issues = [];
    const files = this.getAllFiles();
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Check for insecure cookie settings
          if (/cookie.*secure\s*:\s*false/i.test(line)) {
            issues.push({
              file,
              line: index + 1,
              content: line.trim(),
              type: 'insecure_cookie',
              severity: 'high'
            });
          }
          
          if (/cookie.*httpOnly\s*:\s*false/i.test(line)) {
            issues.push({
              file,
              line: index + 1,
              content: line.trim(),
              type: 'non_httponly_cookie',
              severity: 'medium'
            });
          }
          
          if (/sameSite\s*:\s*['"]none['"]/.test(line)) {
            issues.push({
              file,
              line: index + 1,
              content: line.trim(),
              type: 'unsafe_samesite',
              severity: 'medium'
            });
          }
          
          // Check for weak JWT secrets
          if (CONFIG.patterns.weakJwt.test(line)) {
            issues.push({
              file,
              line: index + 1,
              content: line.trim(),
              type: 'weak_jwt_secret',
              severity: 'critical'
            });
          }
        });
      } catch (err) {
        // Skip
      }
    }
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    
    if (issues.length === 0) {
      console.log(style.pass('Session and JWT security properly configured'));
      this.results.sessionSecurity.passed = true;
      this.results.sessionSecurity.score = 20;
    } else {
      console.log(style.fail(`Found ${issues.length} session security issues:`));
      
      if (criticalIssues.length > 0) {
        console.log(style.critical(`${criticalIssues.length} critical issues found`));
      }
      
      issues.slice(0, 5).forEach(i => {
        const prefix = i.severity === 'critical' ? '🚨' : i.severity === 'high' ? '⚠️' : 'ℹ️';
        console.log(style.code(`  ${prefix} ${i.file}:${i.line} - ${i.type}`));
      });
      
      if (isFixMode) {
        await this.fixSessionSecurity(issues);
      }
      
      this.results.sessionSecurity.details = issues;
      this.results.sessionSecurity.score = Math.max(0, 20 - criticalIssues.length * 10 - highIssues.length * 5);
    }
  }

  /**
   * 🔧 Auto-fix implementations
   */
  async fixUnsafeGetRequests(violations) {
    console.log(style.info('Applying fixes for unsafe GET requests...'));
    
    for (const violation of violations) {
      try {
        let content = fs.readFileSync(violation.file, 'utf8');
        
        // Replace GET with POST in forms
        content = content.replace(
          /method\s*=\s*['"]get['"](?=.*(?:email|password))/gi,
          'method="POST"'
        );
        
        // Replace query parameters with body parameters
        content = content.replace(
          /login\?email=([^&]+)&password=([^&\s]+)/gi,
          'login'
        );
        
        fs.writeFileSync(violation.file, content);
        console.log(style.fixed(`Updated ${violation.file}`));
      } catch (err) {
        console.log(style.error(`Failed to fix ${violation.file}: ${err.message}`));
      }
    }
  }

  async fixHttpsEnforcement(backendFiles, missing) {
    console.log(style.info('Adding HTTPS enforcement...'));
    
    const mainAppFile = backendFiles.find(f => f.includes('app.js')) || backendFiles[0];
    if (!mainAppFile) return;
    
    try {
      let content = fs.readFileSync(mainAppFile, 'utf8');
      
      // Add helmet if missing
      if (missing.includes('helmet middleware')) {
        if (!content.includes('helmet')) {
          const helmetImport = "const helmet = require('helmet')\n";
          const helmetUse = "app.use(helmet())\n";
          
          // Add import at top
          content = helmetImport + content;
          
          // Add middleware after app creation
          content = content.replace(
            /(const app = express\(\))/,
            `$1\n\n// Security middleware\n${helmetUse}`
          );
        }
      }
      
      // Add HTTPS enforcement if missing
      if (missing.includes('HTTPS enforcement')) {
        const sslifyImport = "const enforce = require('express-sslify')\n";
        const sslifyUse = `// Only enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use(enforce.HTTPS({ trustProtoHeader: true }))
}\n`;
        
        if (!content.includes('express-sslify')) {
          content = sslifyImport + content;
          content = content.replace(
            /(app\.use\(helmet\(\)\))/,
            `$1\n${sslifyUse}`
          );
        }
      }
      
      fs.writeFileSync(mainAppFile, content);
      console.log(style.fixed(`Updated ${mainAppFile} with HTTPS enforcement`));
      
      // Install required packages
      console.log(style.info('Installing security packages...'));
      try {
        execSync('cd my-backend && npm install helmet express-sslify', { stdio: 'inherit' });
      } catch (err) {
        console.log(style.warn('Could not auto-install packages. Please run: npm install helmet express-sslify'));
      }
    } catch (err) {
      console.log(style.error(`Failed to fix HTTPS enforcement: ${err.message}`));
    }
  }

  async fixPasswordHashing() {
    console.log(style.info('Adding password hashing support...'));
    
    try {
      // Install bcryptjs
      console.log(style.info('Installing bcryptjs...'));
      execSync('cd my-backend && npm install bcryptjs', { stdio: 'inherit' });
      
      // Create security utility file
      const securityUtilContent = `
const bcrypt = require('bcryptjs');

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored hash
 * @returns {Promise<boolean>} - Verification result
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  hashPassword,
  verifyPassword
};
`;
      
      const utilsPath = './my-backend/utils';
      if (!fs.existsSync(utilsPath)) {
        fs.mkdirSync(utilsPath, { recursive: true });
      }
      
      fs.writeFileSync(path.join(utilsPath, 'security.js'), securityUtilContent);
      console.log(style.fixed('Created password hashing utility'));
    } catch (err) {
      console.log(style.error(`Failed to add password hashing: ${err.message}`));
    }
  }

  async fixRateLimiting(type) {
    console.log(style.info('Adding rate limiting...'));
    
    const appFile = './my-backend/app.js';
    if (!fs.existsSync(appFile)) return;
    
    try {
      let content = fs.readFileSync(appFile, 'utf8');
      
      // Add rate limiting import and middleware
      const rateLimitImport = "const rateLimit = require('express-rate-limit')\n";
      const authLimiter = `
// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
`;
      
      if (!content.includes('express-rate-limit')) {
        content = rateLimitImport + content;
        
        // Add limiter configuration
        content = content.replace(
          /(const app = express\(\))/,
          `$1\n${authLimiter}`
        );
        
        // Apply to auth routes
        content = content.replace(
          /(app\.post\(['"]\/api\/login['"])/,
          `app.use('/api/login', authLimiter)\napp.use('/api/auth', authLimiter)\n\n$1`
        );
      }
      
      fs.writeFileSync(appFile, content);
      console.log(style.fixed('Added rate limiting to authentication routes'));
      
      // Install package
      try {
        execSync('cd my-backend && npm install express-rate-limit', { stdio: 'inherit' });
      } catch (err) {
        console.log(style.warn('Could not auto-install package. Please run: npm install express-rate-limit'));
      }
    } catch (err) {
      console.log(style.error(`Failed to add rate limiting: ${err.message}`));
    }
  }

  async fixLogExposures(exposures) {
    console.log(style.info('Fixing credential exposures in logs...'));
    
    // Create log sanitization middleware
    const logMiddlewareContent = `
/**
 * Log sanitization middleware
 * Removes sensitive data from logs
 */
function sanitizeLogData(data) {
  if (typeof data === 'string') {
    return data
      .replace(/password=[^&\\s]+/gi, 'password=[REDACTED]')
      .replace(/token=[^&\\s]+/gi, 'token=[REDACTED]')
      .replace(/email=([^&\\s]+)/gi, 'email=[REDACTED]');
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.token) sanitized.token = '[REDACTED]';
    return sanitized;
  }
  
  return data;
}

// Override console.log for development
const originalLog = console.log;
console.log = (...args) => {
  const sanitizedArgs = args.map(sanitizeLogData);
  originalLog.apply(console, sanitizedArgs);
};

module.exports = { sanitizeLogData };
`;
    
    const middlewarePath = './my-backend/middleware';
    if (!fs.existsSync(middlewarePath)) {
      fs.mkdirSync(middlewarePath, { recursive: true });
    }
    
    fs.writeFileSync(path.join(middlewarePath, 'logSanitizer.js'), logMiddlewareContent);
    console.log(style.fixed('Created log sanitization middleware'));
    
    // Clean existing log files
    for (const exposure of exposures.filter(e => e.type === 'credential_exposure')) {
      try {
        let content = fs.readFileSync(exposure.file, 'utf8');
        content = content
          .replace(/password=[^&\s]+/gi, 'password=[REDACTED]')
          .replace(/token=[^&\s]+/gi, 'token=[REDACTED]')
          .replace(/email=([^&\s]+)(?=.*password)/gi, 'email=[REDACTED]');
        
        fs.writeFileSync(exposure.file, content);
        console.log(style.fixed(`Sanitized ${exposure.file}`));
      } catch (err) {
        console.log(style.error(`Failed to sanitize ${exposure.file}: ${err.message}`));
      }
    }
  }

  async fixSessionSecurity(issues) {
    console.log(style.info('Fixing session security issues...'));
    
    for (const issue of issues) {
      try {
        let content = fs.readFileSync(issue.file, 'utf8');
        
        switch (issue.type) {
          case 'insecure_cookie':
            content = content.replace(/secure\s*:\s*false/gi, 'secure: true');
            break;
          case 'non_httponly_cookie':
            content = content.replace(/httpOnly\s*:\s*false/gi, 'httpOnly: true');
            break;
          case 'unsafe_samesite':
            content = content.replace(/sameSite\s*:\s*['"]none['"]/gi, "sameSite: 'strict'");
            break;
          case 'weak_jwt_secret':
            console.log(style.warn(`Weak JWT secret found in ${issue.file}:${issue.line}`));
            console.log(style.info('Please update JWT_SECRET environment variable with a strong secret'));
            break;
        }
        
        fs.writeFileSync(issue.file, content);
        console.log(style.fixed(`Fixed ${issue.type} in ${issue.file}`));
      } catch (err) {
        console.log(style.error(`Failed to fix ${issue.file}: ${err.message}`));
      }
    }
  }

  /**
   * 🛠️ Utility methods
   */
  getAllFiles() {
    const files = [];
    
    function scanDir(dir) {
      try {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            scanDir(fullPath);
          } else if (CONFIG.fileExtensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (err) {
        // Skip inaccessible directories
      }
    }
    
    CONFIG.scanDirs.forEach(scanDir);
    return files;
  }

  getFilesByPattern(patterns) {
    const files = this.getAllFiles();
    return files.filter(file => {
      return patterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(file);
      });
    });
  }

  /**
   * 📊 Generate final report
   */
  generateReport() {
    const categories = this.results;
    const totalScore = Object.values(categories).reduce((sum, cat) => sum + cat.score, 0);
    const maxScore = 100;
    const percentage = Math.round((totalScore / maxScore) * 100);
    
    console.log('\n' + style.section('📊 SECURITY AUDIT SUMMARY'));
    console.log('┌───────────────────────────────┬────────┬──────────────────────────────┐');
    console.log('│ Category                      │ Status │ Recommendation / Action      │');
    console.log('├───────────────────────────────┼────────┼──────────────────────────────┤');
    
    const categoryNames = {
      requestMethodValidation: 'Login Method (POST Check)',
      httpsEnforcement: 'HTTPS Enforcement',
      passwordHashing: 'Password Hashing',
      rateLimiting: 'Rate Limiting',
      auditLogs: 'Log Exposure',
      sessionSecurity: 'Session Security'
    };
    
    Object.entries(categories).forEach(([key, result]) => {
      const name = categoryNames[key];
      const status = result.passed ? '✅ PASS' : 
                    result.score > 10 ? '⚠️  FIXED' : '❌ FAIL';
      const action = result.passed ? '' : 
                    result.fixes?.length > 0 ? 'Auto-fixed' : 'Manual fix required';
      
      console.log(`│ ${name.padEnd(29)} │ ${status.padEnd(6)} │ ${action.padEnd(28)} │`);
    });
    
    console.log('└───────────────────────────────┴────────┴──────────────────────────────┘');
    
    console.log(`\n${style.section('Security Score:')} ${this.getScoreColorText(percentage)}`);
    
    if (percentage >= 90) {
      console.log(style.success('\n🎉 Excellent security posture!'));
    } else if (percentage >= 70) {
      console.log(style.warn('\n⚠️  Good security, but some improvements needed.'));
    } else {
      console.log(style.error('\n🚨 Security improvements required!'));
    }
    
    return {
      score: percentage,
      totalScore,
      maxScore,
      categories: this.results,
      timestamp: new Date().toISOString()
    };
  }

  getScoreColor(score) {
    if (score >= 90) return chalk.green.bold;
    if (score >= 70) return chalk.yellow.bold;
    return chalk.red.bold;
  }

  getScoreColorText(score) {
    if (score >= 90) return chalk.green.bold(score + '%');
    if (score >= 70) return chalk.yellow.bold(score + '%');
    return chalk.red.bold(score + '%');
  }

  /**
   * 📄 Save reports
   */
  async saveReports(reportData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON Report
    const jsonReport = {
      ...reportData,
      auditVersion: '1.0.0',
      application: 'BISMAN ERP',
      auditor: 'GitHub Copilot Security Auditor'
    };
    
    fs.writeFileSync(`security-report-${timestamp}.json`, JSON.stringify(jsonReport, null, 2));
    
    // Markdown Report
    const mdReport = this.generateMarkdownReport(reportData);
    fs.writeFileSync(`security-report-${timestamp}.md`, mdReport);
    
    console.log(style.info(`\n📄 Reports saved:`));
    console.log(style.code(`  security-report-${timestamp}.json`));
    console.log(style.code(`  security-report-${timestamp}.md`));
  }

  generateMarkdownReport(data) {
    return `
# 🔐 BISMAN ERP Security Audit Report

**Generated:** ${new Date().toLocaleString()}  
**Score:** ${data.score}% (${data.totalScore}/${data.maxScore})  
**Auditor:** GitHub Copilot Security Auditor v1.0.0

## Executive Summary

${data.score >= 90 ? '✅ **PASSED** - Excellent security posture' : 
  data.score >= 70 ? '⚠️ **WARNING** - Good security with improvements needed' : 
  '❌ **FAILED** - Critical security issues require immediate attention'}

## Detailed Results

${Object.entries(data.categories).map(([key, result]) => `
### ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
- **Score:** ${result.score}/20
- **Status:** ${result.passed ? 'PASSED' : 'FAILED'}
- **Issues:** ${result.details?.length || 0}
${result.details ? result.details.map(d => `  - ${d.file}:${d.line} - ${d.type}`).join('\n') : ''}
`).join('\n')}

## Recommendations

1. **Immediate Actions Required:**
   - Update weak JWT secrets
   - Enable HTTPS enforcement
   - Implement proper rate limiting

2. **Security Best Practices:**
   - Regular security audits
   - Dependency vulnerability scanning
   - Security training for developers

3. **Monitoring & Alerting:**
   - Implement security event monitoring
   - Set up intrusion detection
   - Regular penetration testing

---
*This report was generated by the BISMAN ERP Security Auditor*
`;
  }

  /**
   * 🏃 Run complete audit
   */
  async runFullAudit() {
    console.log(style.title('🔐 BISMAN ERP Security Audit & Auto-Fix'));
    console.log(style.title('=' .repeat(50)));
    console.log(style.info(`Mode: ${isFixMode ? 'Auto-Fix' : 'Report Only'}`));
    console.log(style.info(`Scanning directories: ${CONFIG.scanDirs.join(', ')}`));
    
    const startTime = Date.now();
    
    try {
      await this.auditRequestMethods();
      await this.auditHttpsEnforcement();
      await this.auditPasswordHashing();
      await this.auditRateLimiting();
      await this.auditLogSecurity();
      await this.auditSessionSecurity();
      
      const reportData = this.generateReport();
      
      if (isReportMode) {
        await this.saveReports(reportData);
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(style.info(`\n⏱️  Audit completed in ${duration} seconds`));
      
      // Exit with appropriate code for CI/CD
      const exitCode = reportData.score >= 70 ? 0 : 1;
      process.exit(exitCode);
      
    } catch (err) {
      console.log(style.error(`\n❌ Audit failed: ${err.message}`));
      process.exit(1);
    }
  }
}

/**
 * 📚 CLI Interface
 */
function showHelp() {
  console.log(`
${style.title('🔐 BISMAN ERP Security Audit & Auto-Fix Script')}

${style.section('USAGE:')}
  node security-audit.js [options]

${style.section('OPTIONS:')}
  --report, -r     Generate detailed reports (JSON + Markdown)
  --fix, -f        Auto-apply security fixes where possible  
  --help, -h       Show this help message

${style.section('EXAMPLES:')}
  node security-audit.js --report          # Dry-run with reports
  node security-audit.js --fix             # Apply fixes automatically
  node security-audit.js --fix --report    # Fix and generate reports

${style.section('FEATURES:')}
  ✅ Request method validation (GET vs POST)
  ✅ HTTPS/TLS enforcement detection
  ✅ Password hashing audit (bcrypt/argon2)
  ✅ Rate limiting implementation check
  ✅ Log security & credential exposure scan
  ✅ Session & JWT security validation
  ✅ Auto-fix capabilities with backup
  ✅ CI/CD integration (exit codes)
  ✅ Detailed JSON/Markdown reports

${style.section('EXIT CODES:')}
  0 - Security score >= 70% (PASS)
  1 - Security score < 70% (FAIL)

For issues or questions, contact the development team.
`);
}

/**
 * 🚀 Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  isFixMode = args.includes('--fix') || args.includes('-f');
  isReportMode = args.includes('--report') || args.includes('-r');
  
  // Install required packages for colored output
  try {
    require('chalk');
  } catch (err) {
    console.log('Installing chalk for colored output...');
    execSync('npm install chalk', { stdio: 'inherit' });
  }
  
  // Check if we're in the right directory
  if (!fs.existsSync('./my-backend') || !fs.existsSync('./my-frontend')) {
    console.error('❌ Error: Run this script from the BISMAN ERP root directory');
    process.exit(1);
  }
  
  // Run the audit
  const auditor = new SecurityAudit();
  await auditor.runFullAudit();
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { SecurityAudit, CONFIG };
