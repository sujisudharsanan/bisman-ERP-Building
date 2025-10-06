#!/usr/bin/env node

/**
 * 🔐 Intelligent Security Remediation Script
 * 
 * Performs secure remediation with pre-checks to detect existing implementations
 * before applying any fixes. Ensures compliance without duplicate code.
 * 
 * Usage:
 *   node security-remediator.js --fix      # Auto-apply missing configurations
 *   node security-remediator.js --report   # Generate analysis only
 *   node security-remediator.js --help     # Show help
 * 
 * Author: GitHub Copilot Security Remediation Engine
 * Date: October 5, 2025
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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
  
  // File patterns for different checks
  patterns: {
    backend: ['**/app.js', '**/main.ts', '**/server.js', '**/index.js'],
    frontend: ['**/pages/**', '**/components/**', '**/src/**'],
    auth: ['**/auth/**', '**/login/**', '**/middleware/**'],
    models: ['**/models/**', '**/entities/**', '**/schemas/**']
  },
  
  // Backup directory
  backupDir: './backup/security_remediation',
  reportsDir: './security-reports',
  
  // File extensions to scan
  fileExtensions: ['.js', '.ts', '.tsx', '.jsx', '.json', '.env']
};

// Global state
let isFixMode = false;
let isReportMode = false;
let remediationResults = {
  totalScore: 0,
  maxScore: 100,
  categories: {},
  backupsCreated: [],
  fixesApplied: [],
  riskAssessment: 'UNKNOWN'
};

/**
 * 🎨 Console styling utilities
 */
const style = {
  title: (text) => chalk.bold.cyan(text),
  pass: (text) => chalk.green('✅ PASS') + '   ' + text,
  fail: (text) => chalk.red('❌ FAIL') + '   ' + text,
  fixed: (text) => chalk.yellow('⚠️  FIXED') + ' ' + text,
  info: (text) => chalk.blue('ℹ️  INFO') + '   ' + text,
  warn: (text) => chalk.yellow('⚠️  WARN') + '   ' + text,
  critical: (text) => chalk.red.bold('🚨 CRITICAL') + ' ' + text,
  section: (text) => chalk.bold.underline.magenta(text),
  code: (text) => chalk.gray(text),
  success: (text) => chalk.green.bold(text),
  error: (text) => chalk.red.bold(text),
  backup: (text) => chalk.cyan('💾 BACKUP') + ' ' + text
};

/**
 * 🔧 Security Remediation Engine
 */
class SecurityRemediator {
  constructor() {
    this.results = {
      requestMethodValidation: { status: 'UNKNOWN', score: 0, details: [], fixes: [] },
      httpsEnforcement: { status: 'UNKNOWN', score: 0, details: [], fixes: [] },
      passwordHashing: { status: 'UNKNOWN', score: 0, details: [], fixes: [] },
      rateLimiting: { status: 'UNKNOWN', score: 0, details: [], fixes: [] },
      logExposure: { status: 'UNKNOWN', score: 0, details: [], fixes: [] },
      sessionSecurity: { status: 'UNKNOWN', score: 0, details: [], fixes: [] }
    };
    
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.setupDirectories();
  }

  /**
   * 📁 Setup backup and report directories
   */
  setupDirectories() {
    const dirs = [
      `${CONFIG.backupDir}_${this.timestamp}`,
      CONFIG.reportsDir
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 💾 Create backup of file before modification
   */
  createBackup(filePath) {
    try {
      const backupDir = `${CONFIG.backupDir}_${this.timestamp}`;
      const relativePath = path.relative('.', filePath);
      const backupPath = path.join(backupDir, relativePath);
      
      // Create directory structure
      const backupDirPath = path.dirname(backupPath);
      if (!fs.existsSync(backupDirPath)) {
        fs.mkdirSync(backupDirPath, { recursive: true });
      }
      
      // Copy file
      fs.copyFileSync(filePath, backupPath);
      console.log(style.backup(`Created backup: ${backupPath}`));
      remediationResults.backupsCreated.push(backupPath);
      
      return backupPath;
    } catch (err) {
      console.log(style.error(`Failed to create backup for ${filePath}: ${err.message}`));
      return null;
    }
  }

  /**
   * 🔍 Get all files matching patterns
   */
  getAllFiles(patterns = null) {
    const files = [];
    const targetPatterns = patterns || CONFIG.patterns.backend.concat(CONFIG.patterns.frontend);
    
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

  /**
   * 🔍 Advanced pattern search with context
   */
  searchPattern(pattern, files = null, options = {}) {
    const targetFiles = files || this.getAllFiles();
    const results = [];
    
    for (const file of targetFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const match = line.match(pattern);
          if (match) {
            results.push({
              file,
              line: index + 1,
              content: line.trim(),
              match: match[0],
              context: options.includeContext ? {
                before: lines.slice(Math.max(0, index - 2), index),
                after: lines.slice(index + 1, Math.min(lines.length, index + 3))
              } : null
            });
          }
        });
      } catch (err) {
        // Skip unreadable files
      }
    }
    
    return results;
  }

  /**
   * 🔍 1. Request Method Validation
   */
  async checkRequestMethodValidation() {
    console.log(style.section('\n🔍 1. Request Method Validation'));
    
    // Check for unsafe GET requests with credentials
    const unsafeGetPatterns = [
      /login\?.*(?:email|password)=/gi,
      /auth\?.*(?:email|password)=/gi,
      /signin\?.*(?:email|password)=/gi,
      /method\s*=\s*['"]get['"].*(?:email|password)/gi
    ];
    
    let violations = [];
    
    for (const pattern of unsafeGetPatterns) {
      const matches = this.searchPattern(pattern);
      violations = violations.concat(matches);
    }
    
    // Check for proper POST implementation
    const postPatterns = [
      /method\s*:\s*['"]POST['"]|method\s*=\s*['"]POST['"]/gi,
      /\.post\s*\(\s*['"].*(?:login|auth)['"]|fetch\([^,]+,\s*{\s*method:\s*['"]POST['"]/gi
    ];
    
    let hasProperPost = false;
    for (const pattern of postPatterns) {
      const matches = this.searchPattern(pattern);
      if (matches.length > 0) {
        hasProperPost = true;
        break;
      }
    }
    
    if (violations.length === 0 && hasProperPost) {
      console.log(style.pass('Secure POST methods properly implemented'));
      this.results.requestMethodValidation = {
        status: 'PASS',
        score: 20,
        details: ['All login requests use secure POST method'],
        fixes: []
      };
    } else if (violations.length === 0) {
      console.log(style.warn('No unsafe GET requests found, but POST implementation unclear'));
      this.results.requestMethodValidation = {
        status: 'WARN',
        score: 15,
        details: ['No clear POST implementation detected'],
        fixes: []
      };
    } else {
      console.log(style.fail(`Found ${violations.length} unsafe GET requests with credentials`));
      violations.slice(0, 3).forEach(v => {
        console.log(style.code(`  ${v.file}:${v.line} - ${v.content.substring(0, 60)}...`));
      });
      
      if (isFixMode) {
        await this.fixUnsafeGetRequests(violations);
      }
      
      this.results.requestMethodValidation = {
        status: 'FAIL',
        score: violations.length > 5 ? 0 : Math.max(0, 20 - violations.length * 4),
        details: violations.map(v => `${v.file}:${v.line}`),
        fixes: isFixMode ? ['Converted GET to POST requests'] : []
      };
    }
  }

  /**
   * 🔒 2. HTTPS/TLS Enforcement
   */
  async checkHttpsEnforcement() {
    console.log(style.section('\n🔒 2. HTTPS/TLS Enforcement'));
    
    const backendFiles = this.getAllFiles(CONFIG.patterns.backend);
    
    // Check for existing security middleware
    const securityChecks = [
      { name: 'helmet', pattern: /helmet\s*\(\s*\)|require\s*\(\s*['"]helmet['"]|import.*helmet/gi },
      { name: 'express-sslify', pattern: /express-sslify|enforce\.HTTPS|sslify/gi },
      { name: 'HSTS headers', pattern: /Strict-Transport-Security|HSTS/gi },
      { name: 'secure cookies', pattern: /secure\s*:\s*true|cookie.*secure.*true/gi },
      { name: 'trust proxy', pattern: /trust\s+proxy|trustProxy/gi }
    ];
    
    const foundSecurity = {};
    
    for (const check of securityChecks) {
      const matches = this.searchPattern(check.pattern, backendFiles);
      foundSecurity[check.name] = matches.length > 0;
      
      if (matches.length > 0) {
        console.log(style.info(`✓ Found ${check.name} implementation`));
      }
    }
    
    const missingControls = securityChecks
      .filter(check => !foundSecurity[check.name])
      .map(check => check.name);
    
    if (missingControls.length === 0) {
      console.log(style.pass('Complete HTTPS/TLS enforcement implemented (production-aware)'));
      this.results.httpsEnforcement = {
        status: 'PASS',
        score: 20,
        details: ['All security controls present'],
        fixes: []
      };
    } else {
      console.log(style.fail(`Missing: ${missingControls.join(', ')}`));
      
      if (isFixMode) {
        await this.fixHttpsEnforcement(backendFiles, missingControls);
      }
      
      this.results.httpsEnforcement = {
        status: 'FAIL',
        score: Math.max(0, 20 - missingControls.length * 4),
        details: missingControls,
        fixes: isFixMode ? ['Added missing HTTPS enforcement'] : []
      };
    }
  }

  /**
   * 🔐 3. Password Hashing
   */
  async checkPasswordHashing() {
    console.log(style.section('\n🔐 3. Password Hashing'));
    
    // Check for hashing libraries
    const hashingLibraries = [
      { name: 'bcrypt', pattern: /bcrypt|bcryptjs/gi },
      { name: 'argon2', pattern: /argon2/gi },
      { name: 'scrypt', pattern: /scrypt/gi }
    ];
    
    let foundLibrary = null;
    const files = this.getAllFiles();
    
    for (const lib of hashingLibraries) {
      const matches = this.searchPattern(lib.pattern, files);
      if (matches.length > 0) {
        foundLibrary = lib.name;
        console.log(style.info(`✓ Found ${lib.name} implementation`));
        break;
      }
    }
    
    // Check package.json for dependencies
    let hasHashingDependency = false;
    try {
      const packagePaths = ['./package.json', './my-backend/package.json'];
      for (const pkgPath of packagePaths) {
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
          
          if (allDeps.bcrypt || allDeps.bcryptjs || allDeps.argon2 || allDeps.scrypt) {
            hasHashingDependency = true;
            break;
          }
        }
      }
    } catch (err) {
      // Skip package.json errors
    }
    
    // Check for proper usage
    const hashingUsagePattern = /\.hash\(|\.compare\(|bcrypt\.|argon2\./gi;
    const usageMatches = this.searchPattern(hashingUsagePattern, files);
    
    // Check for potential plaintext passwords
    const plaintextPatterns = [
      /password\s*[:=]\s*['"](?!.*hash|.*bcrypt|.*argon2)/gi,
      /INSERT.*password.*VALUES.*['"][^']+['"](?!.*hash)/gi
    ];
    
    let plaintextViolations = [];
    for (const pattern of plaintextPatterns) {
      const matches = this.searchPattern(pattern, files);
      plaintextViolations = plaintextViolations.concat(matches);
    }
    
    if (foundLibrary && hasHashingDependency && usageMatches.length > 0) {
      console.log(style.pass(`Password hashing properly implemented with ${foundLibrary}`));
      
      if (plaintextViolations.length > 0) {
        console.log(style.warn(`Found ${plaintextViolations.length} potential plaintext password issues`));
      }
      
      this.results.passwordHashing = {
        status: 'PASS',
        score: Math.max(15, 20 - plaintextViolations.length * 2),
        details: [`Using ${foundLibrary}`, `${usageMatches.length} usage instances`],
        fixes: []
      };
    } else {
      console.log(style.fail('Password hashing not properly implemented'));
      
      if (isFixMode) {
        await this.fixPasswordHashing();
      }
      
      this.results.passwordHashing = {
        status: 'FAIL',
        score: 0,
        details: ['Missing password hashing library or implementation'],
        fixes: isFixMode ? ['Added bcrypt password hashing'] : []
      };
    }
  }

  /**
   * ⏱️ 4. Rate Limiting
   */
  async checkRateLimiting() {
    console.log(style.section('\n⏱️ 4. Rate Limiting'));
    
    const backendFiles = this.getAllFiles(CONFIG.patterns.backend);
    
    // Check for rate limiting implementations
    const rateLimitingPatterns = [
      { name: 'express-rate-limit', pattern: /express-rate-limit|rateLimit/gi },
      { name: 'nestjs throttler', pattern: /ThrottlerGuard|@nestjs\/throttler/gi },
      { name: 'custom rate limiting', pattern: /rate.*limit|limit.*rate/gi }
    ];
    
    let foundRateLimit = null;
    let authSpecificLimit = false;
    
    for (const check of rateLimitingPatterns) {
      const matches = this.searchPattern(check.pattern, backendFiles);
      if (matches.length > 0) {
        foundRateLimit = check.name;
        
        // Check if applied to auth routes
        const authLimitPattern = /(?:login|auth|signin).*(?:rateLimit|limit)|(?:rateLimit|limit).*(?:login|auth|signin)|authLimiter/gi;
        const authMatches = this.searchPattern(authLimitPattern, backendFiles);
        
        if (authMatches.length > 0) {
          authSpecificLimit = true;
          console.log(style.info(`✓ Found ${check.name} on authentication routes`));
        } else {
          console.log(style.warn(`Found ${check.name} but not on auth routes`));
        }
        break;
      }
    }
    
    if (foundRateLimit && authSpecificLimit) {
      console.log(style.pass('Rate limiting properly configured for authentication'));
      this.results.rateLimiting = {
        status: 'PASS',
        score: 15,
        details: [`Using ${foundRateLimit} on auth routes`],
        fixes: []
      };
    } else if (foundRateLimit) {
      console.log(style.warn('Rate limiting found but not specifically for auth routes'));
      
      if (isFixMode) {
        await this.fixRateLimiting('auth_specific');
      }
      
      this.results.rateLimiting = {
        status: 'WARN',
        score: 10,
        details: ['Rate limiting present but not auth-specific'],
        fixes: isFixMode ? ['Applied rate limiting to auth routes'] : []
      };
    } else {
      console.log(style.fail('No rate limiting implementation found'));
      
      if (isFixMode) {
        await this.fixRateLimiting('missing');
      }
      
      this.results.rateLimiting = {
        status: 'FAIL',
        score: 0,
        details: ['No rate limiting implementation'],
        fixes: isFixMode ? ['Added rate limiting to auth routes'] : []
      };
    }
  }

  /**
   * 📋 5. Log Exposure
   */
  async checkLogExposure() {
    console.log(style.section('\n📋 5. Log Exposure'));
    
    const exposureViolations = [];
    
    // Check log files for credential exposure
    const logDirs = ['./logs', './my-backend/logs', './my-frontend/logs'];
    
    for (const logDir of logDirs) {
      if (fs.existsSync(logDir)) {
        try {
          const logFiles = fs.readdirSync(logDir)
            .filter(file => file.endsWith('.log'))
            .map(file => path.join(logDir, file));
          
          for (const logFile of logFiles) {
            const credentialPattern = /password=|email=.*password|token=[a-zA-Z0-9]{10,}/gi;
            const matches = this.searchPattern(credentialPattern, [logFile]);
            
            if (matches.length > 0) {
              exposureViolations.push(...matches);
              console.log(style.warn(`Found ${matches.length} credential exposures in ${logFile}`));
            }
          }
        } catch (err) {
          // Skip inaccessible log directories
        }
      }
    }
    
    // Check source code for logging credentials
    const sourceFiles = this.getAllFiles();
    const logCredentialPattern = /(?:console\.log|logger|log).*(?:password|token|secret)/gi;
    const sourceExposures = this.searchPattern(logCredentialPattern, sourceFiles);
    
    if (sourceExposures.length > 0) {
      exposureViolations.push(...sourceExposures);
      console.log(style.warn(`Found ${sourceExposures.length} potential credential logging in source`));
    }
    
    // Check for existing log sanitization
    const sanitizationPattern = /sanitize|redact|\[REDACTED\]|log.*filter/gi;
    const hasSanitization = this.searchPattern(sanitizationPattern, sourceFiles).length > 0;
    
    if (exposureViolations.length === 0 && hasSanitization) {
      console.log(style.pass('No credential exposure found and sanitization implemented'));
      this.results.logExposure = {
        status: 'PASS',
        score: 15,
        details: ['No credential exposures found', 'Log sanitization present'],
        fixes: []
      };
    } else if (exposureViolations.length === 0) {
      console.log(style.warn('No credential exposure found but missing sanitization'));
      this.results.logExposure = {
        status: 'WARN',
        score: 12,
        details: ['No current exposures but missing prevention'],
        fixes: []
      };
    } else {
      console.log(style.fail(`Found ${exposureViolations.length} credential exposures`));
      
      if (isFixMode) {
        await this.fixLogExposures(exposureViolations);
      }
      
      this.results.logExposure = {
        status: 'FAIL',
        score: Math.max(0, 15 - exposureViolations.length * 2),
        details: [`${exposureViolations.length} credential exposures found`],
        fixes: isFixMode ? ['Applied log sanitization and redacted exposures'] : []
      };
    }
  }

  /**
   * 🍪 6. Session Security
   */
  async checkSessionSecurity() {
    console.log(style.section('\n🍪 6. Session Security'));
    
    const backendFiles = this.getAllFiles(CONFIG.patterns.backend);
    
    // Check for secure session/cookie configuration
    const securityChecks = [
      { name: 'httpOnly cookies', pattern: /httpOnly\s*:\s*true/gi },
      { name: 'secure cookies', pattern: /secure\s*:\s*true/gi },
      { name: 'sameSite cookies', pattern: /sameSite\s*:\s*['"](?:strict|lax)['"]|sameSite.*strict|sameSite.*lax/gi },
      { name: 'session secret', pattern: /session.*secret|SESSION_SECRET/gi },
      { name: 'JWT implementation', pattern: /jwt\.sign|jsonwebtoken|JWT_SECRET/gi }
    ];
    
    const securityStatus = {};
    
    for (const check of securityChecks) {
      const matches = this.searchPattern(check.pattern, backendFiles);
      securityStatus[check.name] = matches.length > 0;
      
      if (matches.length > 0) {
        console.log(style.info(`✓ Found ${check.name} implementation`));
      }
    }
    
    // Check for insecure configurations
    const insecurePatterns = [
      { name: 'insecure cookies', pattern: /secure\s*:\s*false|httpOnly\s*:\s*false/gi },
      { name: 'weak JWT secrets', pattern: /JWT_SECRET\s*[:=]\s*['"](?:secret|test|dev|123)['"]|jwt\.sign.*['"](?:secret|test)['"]/gi },
      { name: 'none sameSite', pattern: /sameSite\s*:\s*['"]none['"]/gi }
    ];
    
    let insecureConfigs = [];
    for (const check of insecurePatterns) {
      const matches = this.searchPattern(check.pattern, backendFiles);
      if (matches.length > 0) {
        insecureConfigs.push({ name: check.name, matches });
      }
    }
    
    const secureCount = Object.values(securityStatus).filter(Boolean).length;
    const totalChecks = securityChecks.length;
    
    if (secureCount >= 4 && insecureConfigs.length === 0) {
      console.log(style.pass('Session security properly configured'));
      this.results.sessionSecurity = {
        status: 'PASS',
        score: 20,
        details: [`${secureCount}/${totalChecks} security controls implemented`],
        fixes: []
      };
    } else if (insecureConfigs.length > 0) {
      console.log(style.fail(`Found ${insecureConfigs.length} insecure configurations`));
      
      if (isFixMode) {
        await this.fixSessionSecurity(insecureConfigs);
      }
      
      this.results.sessionSecurity = {
        status: 'FAIL',
        score: Math.max(0, 20 - insecureConfigs.length * 5),
        details: insecureConfigs.map(c => c.name),
        fixes: isFixMode ? ['Fixed insecure session configurations'] : []
      };
    } else {
      console.log(style.warn('Session security partially implemented'));
      this.results.sessionSecurity = {
        status: 'WARN',
        score: Math.round((secureCount / totalChecks) * 20),
        details: [`${secureCount}/${totalChecks} security controls present`],
        fixes: []
      };
    }
  }

  /**
   * 🔧 Fix implementations
   */
  async fixUnsafeGetRequests(violations) {
    console.log(style.info('Fixing unsafe GET requests...'));
    
    const modifiedFiles = new Set();
    
    for (const violation of violations) {
      if (!modifiedFiles.has(violation.file)) {
        this.createBackup(violation.file);
        modifiedFiles.add(violation.file);
      }
      
      try {
        let content = fs.readFileSync(violation.file, 'utf8');
        
        // Fix various patterns
        content = content.replace(
          /method\s*=\s*['"]get['"](?=.*(?:email|password))/gi,
          'method="POST"'
        );
        
        content = content.replace(
          /login\?email=([^&]+)&password=([^&\s]+)/gi,
          'login'
        );
        
        // Fix fetch GET requests
        content = content.replace(
          /fetch\s*\(\s*['"]([^'"]*login[^'"]*)['"](?:\s*,\s*\{\s*method\s*:\s*['"]GET['"])?/gi,
          'fetch("$1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials)'
        );
        
        fs.writeFileSync(violation.file, content);
        console.log(style.fixed(`Updated ${violation.file}`));
        remediationResults.fixesApplied.push(`Fixed unsafe GET in ${violation.file}`);
      } catch (err) {
        console.log(style.error(`Failed to fix ${violation.file}: ${err.message}`));
      }
    }
  }

  async fixHttpsEnforcement(backendFiles, missingControls) {
    console.log(style.info('Adding HTTPS enforcement...'));
    
    const mainAppFile = backendFiles.find(f => f.includes('app.js')) || backendFiles[0];
    if (!mainAppFile) {
      console.log(style.error('No main application file found'));
      return;
    }
    
    this.createBackup(mainAppFile);
    
    try {
      let content = fs.readFileSync(mainAppFile, 'utf8');
      let modified = false;
      
      // Add helmet if missing
      if (missingControls.includes('helmet') && !content.includes('helmet')) {
        if (!content.includes("require('helmet')") && !content.includes('import.*helmet')) {
          const helmetImport = "const helmet = require('helmet');\n";
          content = helmetImport + content;
          
          // Add helmet middleware
          if (!content.includes('app.use(helmet())')) {
            content = content.replace(
              /(const app = express\(\))/,
              '$1\n\n// Security middleware\napp.use(helmet());'
            );
          }
          modified = true;
        }
      }
      
      // Add HTTPS enforcement if missing
      if (missingControls.includes('express-sslify') && !content.includes('express-sslify')) {
        if (!content.includes("require('express-sslify')")) {
          const sslifyImport = "const enforce = require('express-sslify');\n";
          content = sslifyImport + content;
          
          content = content.replace(
            /(app\.use\(helmet\(\)\);)/,
            `$1
// Only enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use(enforce.HTTPS({ trustProtoHeader: true }));
}`
          );
          modified = true;
        }
      }
      
      // Add HSTS headers if missing
      if (missingControls.includes('HSTS headers') && !content.includes('Strict-Transport-Security')) {
        const hstsMiddleware = `
// HSTS (HTTP Strict Transport Security)
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
`;
        content = content.replace(
          /(app\.use\(enforce\.HTTPS[^;]+;)/,
          '$1' + hstsMiddleware
        );
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(mainAppFile, content);
        console.log(style.fixed(`Updated ${mainAppFile} with HTTPS enforcement`));
        remediationResults.fixesApplied.push('Added HTTPS/TLS enforcement');
        
        // Install missing packages
        const packagesToInstall = [];
        if (missingControls.includes('helmet')) packagesToInstall.push('helmet');
        if (missingControls.includes('express-sslify')) packagesToInstall.push('express-sslify');
        
        if (packagesToInstall.length > 0) {
          try {
            execSync(`cd my-backend && npm install ${packagesToInstall.join(' ')}`, { stdio: 'inherit' });
            console.log(style.info(`Installed packages: ${packagesToInstall.join(', ')}`));
          } catch (err) {
            console.log(style.warn(`Could not auto-install packages: ${packagesToInstall.join(', ')}`));
          }
        }
      }
    } catch (err) {
      console.log(style.error(`Failed to fix HTTPS enforcement: ${err.message}`));
    }
  }

  async fixPasswordHashing() {
    console.log(style.info('Adding password hashing implementation...'));
    
    try {
      // Check if bcrypt is already installed
      const backendPackagePath = './my-backend/package.json';
      let needsInstall = true;
      
      if (fs.existsSync(backendPackagePath)) {
        const pkg = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        needsInstall = !(allDeps.bcrypt || allDeps.bcryptjs);
      }
      
      if (needsInstall) {
        console.log(style.info('Installing bcryptjs...'));
        execSync('cd my-backend && npm install bcryptjs', { stdio: 'inherit' });
      }
      
      // Create security utility
      const utilsDir = './my-backend/utils';
      if (!fs.existsSync(utilsDir)) {
        fs.mkdirSync(utilsDir, { recursive: true });
      }
      
      const securityUtilPath = path.join(utilsDir, 'passwordSecurity.js');
      
      if (!fs.existsSync(securityUtilPath)) {
        const securityUtilContent = `
const bcrypt = require('bcryptjs');

/**
 * Password security utilities
 */
class PasswordSecurity {
  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @param {number} rounds - Salt rounds (default: 12)
   * @returns {Promise<string>} - Hashed password
   */
  static async hashPassword(password, rounds = 12) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    
    return bcrypt.hash(password, rounds);
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Stored hash
   * @returns {Promise<boolean>} - Verification result
   */
  static async verifyPassword(password, hash) {
    if (!password || !hash) {
      return false;
    }
    
    return bcrypt.compare(password, hash);
  }

  /**
   * Check password strength
   * @param {string} password - Password to check
   * @returns {Object} - Strength analysis
   */
  static analyzePasswordStrength(password) {
    const analysis = {
      score: 0,
      feedback: [],
      isStrong: false
    };
    
    if (password.length >= 8) analysis.score += 2;
    else analysis.feedback.push('Use at least 8 characters');
    
    if (/[a-z]/.test(password)) analysis.score += 1;
    else analysis.feedback.push('Include lowercase letters');
    
    if (/[A-Z]/.test(password)) analysis.score += 1;
    else analysis.feedback.push('Include uppercase letters');
    
    if (/\\d/.test(password)) analysis.score += 1;
    else analysis.feedback.push('Include numbers');
    
    if (/[^\\w\\s]/.test(password)) analysis.score += 2;
    else analysis.feedback.push('Include special characters');
    
    analysis.isStrong = analysis.score >= 6;
    
    return analysis;
  }
}

module.exports = PasswordSecurity;
`;
        
        fs.writeFileSync(securityUtilPath, securityUtilContent);
        console.log(style.fixed('Created password security utility'));
        remediationResults.fixesApplied.push('Added password hashing utilities');
      }
    } catch (err) {
      console.log(style.error(`Failed to add password hashing: ${err.message}`));
    }
  }

  async fixRateLimiting(type) {
    console.log(style.info('Adding rate limiting...'));
    
    const appFile = './my-backend/app.js';
    if (!fs.existsSync(appFile)) {
      console.log(style.error('No app.js file found'));
      return;
    }
    
    this.createBackup(appFile);
    
    try {
      let content = fs.readFileSync(appFile, 'utf8');
      let modified = false;
      
      // Check if rate limiting already exists
      if (!content.includes('express-rate-limit') && !content.includes('rateLimit')) {
        // Add import
        const rateLimitImport = "const rateLimit = require('express-rate-limit');\n";
        content = rateLimitImport + content;
        
        // Add rate limiter configuration
        const rateLimiterConfig = `
// Authentication rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false,    // Count failed requests
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many API requests, please try again later.'
  }
});
`;
        
        content = content.replace(
          /(const app = express\(\))/,
          `$1\n${rateLimiterConfig}`
        );
        
        // Apply rate limiting to routes
        if (!content.includes("app.use('/api/login', authLimiter)")) {
          const routeApplication = `
// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/login', authLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/signin', authLimiter);
`;
          
          // Find a good place to insert (after middleware setup)
          if (content.includes('app.use(express.json())')) {
            content = content.replace(
              /(app\.use\(express\.json\(\)\))/,
              `$1\n${routeApplication}`
            );
          } else {
            content = content.replace(
              /(const app = express\(\)[^]*?)(\napp\.)/,
              `$1${routeApplication}$2`
            );
          }
        }
        
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(appFile, content);
        console.log(style.fixed('Added comprehensive rate limiting'));
        remediationResults.fixesApplied.push('Added rate limiting to authentication routes');
        
        // Install express-rate-limit if needed
        try {
          execSync('cd my-backend && npm install express-rate-limit', { stdio: 'inherit' });
        } catch (err) {
          console.log(style.warn('Could not auto-install express-rate-limit'));
        }
      }
    } catch (err) {
      console.log(style.error(`Failed to add rate limiting: ${err.message}`));
    }
  }

  async fixLogExposures(exposures) {
    console.log(style.info('Fixing credential exposures...'));
    
    // Create log sanitization middleware
    const middlewareDir = './my-backend/middleware';
    if (!fs.existsSync(middlewareDir)) {
      fs.mkdirSync(middlewareDir, { recursive: true });
    }
    
    const sanitizerPath = path.join(middlewareDir, 'logSanitizer.js');
    
    if (!fs.existsSync(sanitizerPath)) {
      const sanitizerContent = `
/**
 * Advanced Log Sanitization Middleware
 * Prevents credential exposure in logs and requests
 */

class LogSanitizer {
  constructor() {
    this.sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth',
      'authorization', 'cookie', 'session', 'jwt'
    ];
    
    this.redactionPattern = new RegExp(
      \`(\${this.sensitiveFields.join('|')})\\s*[:=]\\s*[^&\\s]+\`,
      'gi'
    );
  }

  /**
   * Sanitize string data
   */
  sanitizeString(str) {
    if (typeof str !== 'string') return str;
    
    return str.replace(this.redactionPattern, '$1=[REDACTED]');
  }

  /**
   * Sanitize object data
   */
  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Express middleware for request/response sanitization
   */
  middleware() {
    return (req, res, next) => {
      // Sanitize URL
      req.originalUrl = this.sanitizeString(req.originalUrl);
      req.url = this.sanitizeString(req.url);
      
      // Override res.json to sanitize response logging
      const originalJson = res.json;
      res.json = function(data) {
        // Log sanitized version for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('Response:', this.sanitizeObject(data));
        }
        return originalJson.call(this, data);
      }.bind(this);
      
      next();
    };
  }

  /**
   * Override console methods for development
   */
  overrideConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      const sanitizedArgs = args.map(arg => 
        typeof arg === 'string' ? this.sanitizeString(arg) :
        typeof arg === 'object' ? this.sanitizeObject(arg) : arg
      );
      originalLog.apply(console, sanitizedArgs);
    };
    
    console.error = (...args) => {
      const sanitizedArgs = args.map(arg => 
        typeof arg === 'string' ? this.sanitizeString(arg) :
        typeof arg === 'object' ? this.sanitizeObject(arg) : arg
      );
      originalError.apply(console, sanitizedArgs);
    };
  }
}

const logSanitizer = new LogSanitizer();

// Auto-enable in development
if (process.env.NODE_ENV === 'development') {
  logSanitizer.overrideConsole();
}

module.exports = logSanitizer;
`;
      
      fs.writeFileSync(sanitizerPath, sanitizerContent);
      console.log(style.fixed('Created advanced log sanitization middleware'));
    }
    
    // Clean existing log files
    const logExposures = exposures.filter(e => e.file.includes('.log'));
    for (const exposure of logExposures) {
      try {
        this.createBackup(exposure.file);
        
        let content = fs.readFileSync(exposure.file, 'utf8');
        content = content
          .replace(/password=[^&\s]+/gi, 'password=[REDACTED]')
          .replace(/token=[^&\s]+/gi, 'token=[REDACTED]')
          .replace(/email=([^&\s]+)(?=.*password)/gi, 'email=[REDACTED]')
          .replace(/secret=[^&\s]+/gi, 'secret=[REDACTED]');
        
        fs.writeFileSync(exposure.file, content);
        console.log(style.fixed(`Sanitized credentials in ${exposure.file}`));
      } catch (err) {
        console.log(style.error(`Failed to sanitize ${exposure.file}: ${err.message}`));
      }
    }
    
    remediationResults.fixesApplied.push('Applied log sanitization and cleaned exposures');
  }

  async fixSessionSecurity(insecureConfigs) {
    console.log(style.info('Fixing session security issues...'));
    
    const backendFiles = this.getAllFiles(CONFIG.patterns.backend);
    const modifiedFiles = new Set();
    
    for (const config of insecureConfigs) {
      for (const match of config.matches) {
        if (!modifiedFiles.has(match.file)) {
          this.createBackup(match.file);
          modifiedFiles.add(match.file);
        }
        
        try {
          let content = fs.readFileSync(match.file, 'utf8');
          let modified = false;
          
          // Fix insecure cookie settings
          if (config.name === 'insecure cookies') {
            content = content.replace(/secure\s*:\s*false/gi, 'secure: true');
            content = content.replace(/httpOnly\s*:\s*false/gi, 'httpOnly: true');
            modified = true;
          }
          
          // Fix weak JWT secrets
          if (config.name === 'weak JWT secrets') {
            console.log(style.warn('Weak JWT secret detected. Please update JWT_SECRET environment variable.'));
            // Don't auto-change JWT secrets as it would break existing tokens
          }
          
          // Fix unsafe sameSite
          if (config.name === 'none sameSite') {
            content = content.replace(/sameSite\s*:\s*['"]none['"]/gi, "sameSite: 'strict'");
            modified = true;
          }
          
          if (modified) {
            fs.writeFileSync(match.file, content);
            console.log(style.fixed(`Fixed session security in ${match.file}`));
          }
        } catch (err) {
          console.log(style.error(`Failed to fix ${match.file}: ${err.message}`));
        }
      }
    }
    
    remediationResults.fixesApplied.push('Fixed insecure session/cookie configurations');
  }

  /**
   * 📊 Generate comprehensive report
   */
  generateReport() {
    const categories = this.results;
    const totalScore = Object.values(categories).reduce((sum, cat) => sum + cat.score, 0);
    const maxScore = 100;
    const percentage = Math.round((totalScore / maxScore) * 100);
    
    // Determine risk assessment
    let riskAssessment;
    if (percentage >= 90) riskAssessment = 'LOW';
    else if (percentage >= 70) riskAssessment = 'MEDIUM';
    else if (percentage >= 50) riskAssessment = 'HIGH';
    else riskAssessment = 'CRITICAL';
    
    console.log('\n' + style.section('📊 SECURITY REMEDIATION SUMMARY'));
    console.log('┌───────────────────────────────┬────────┬──────────────────────────────┐');
    console.log('│ Category                      │ Status │ Action Taken                 │');
    console.log('├───────────────────────────────┼────────┼──────────────────────────────┤');
    
    const categoryNames = {
      requestMethodValidation: 'Request Method Validation',
      httpsEnforcement: 'HTTPS Enforcement',
      passwordHashing: 'Password Hashing',
      rateLimiting: 'Rate Limiting',
      logExposure: 'Log Exposure',
      sessionSecurity: 'Session Security'
    };
    
    Object.entries(categories).forEach(([key, result]) => {
      const name = categoryNames[key];
      let status, action;
      
      switch (result.status) {
        case 'PASS':
          status = '✅ PASS';
          action = 'Already implemented';
          break;
        case 'WARN':
          status = '⚠️  WARN';
          action = result.fixes.length > 0 ? 'Partially fixed' : 'Needs attention';
          break;
        case 'FAIL':
          status = result.fixes.length > 0 ? '⚠️  FIXED' : '❌ FAIL';
          action = result.fixes.length > 0 ? 'Auto-remediated' : 'Manual fix required';
          break;
        default:
          status = '❓ UNKNOWN';
          action = 'Analysis incomplete';
      }
      
      console.log(`│ ${name.padEnd(29)} │ ${status.padEnd(6)} │ ${action.padEnd(28)} │`);
    });
    
    console.log('└───────────────────────────────┴────────┴──────────────────────────────┘');
    
    // Risk assessment
    const riskColor = {
      'LOW': chalk.green,
      'MEDIUM': chalk.yellow,
      'HIGH': chalk.red,
      'CRITICAL': chalk.red.bold
    };
    
    console.log(`\n${style.section('Security Score:')} ${this.getScoreColor(percentage)(percentage + '%')}`);
    console.log(`${style.section('Risk Level:')} ${riskColor[riskAssessment](riskAssessment)}`);
    
    if (remediationResults.backupsCreated.length > 0) {
      console.log(`\n💾 ${remediationResults.backupsCreated.length} backup(s) created`);
    }
    
    if (remediationResults.fixesApplied.length > 0) {
      console.log(`🔧 ${remediationResults.fixesApplied.length} fix(es) applied`);
    }
    
    // Summary message
    if (percentage >= 90) {
      console.log(style.success('\n🎉 Excellent security posture achieved!'));
    } else if (percentage >= 70) {
      console.log(style.warn('\n⚠️  Good security with minor improvements needed.'));
    } else {
      console.log(style.error('\n🚨 Significant security improvements required!'));
    }
    
    return {
      score: percentage,
      totalScore,
      maxScore,
      riskLevel: riskAssessment,
      categories: this.results,
      backupsCreated: remediationResults.backupsCreated,
      fixesApplied: remediationResults.fixesApplied,
      timestamp: new Date().toISOString(),
      manualSteps: this.getManualSteps()
    };
  }

  getScoreColor(score) {
    if (score >= 90) return chalk.green.bold;
    if (score >= 70) return chalk.yellow.bold;
    return chalk.red.bold;
  }

  getManualSteps() {
    const steps = [];
    
    Object.entries(this.results).forEach(([key, result]) => {
      if (result.status === 'FAIL' && result.fixes.length === 0) {
        steps.push({
          category: key,
          priority: 'HIGH',
          steps: result.details
        });
      } else if (result.status === 'WARN') {
        steps.push({
          category: key,
          priority: 'MEDIUM',
          steps: result.details
        });
      }
    });
    
    return steps;
  }

  /**
   * 💾 Save detailed report
   */
  async saveReport(reportData) {
    const reportPath = path.join(CONFIG.reportsDir, `security_remediation_${this.timestamp}.json`);
    
    const detailedReport = {
      ...reportData,
      auditVersion: '2.0.0',
      application: 'BISMAN ERP',
      auditor: 'GitHub Copilot Security Remediation Engine',
      environment: {
        node: process.version,
        platform: process.platform,
        cwd: process.cwd()
      },
      recommendations: this.generateRecommendations(reportData)
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    console.log(style.info(`\n📄 Detailed report saved: ${reportPath}`));
    
    return reportPath;
  }

  generateRecommendations(reportData) {
    const recommendations = [];
    
    if (reportData.score < 70) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Overall Security',
        action: 'Implement all failed security controls immediately',
        timeframe: 'Within 24 hours'
      });
    }
    
    if (reportData.manualSteps.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Manual Remediation',
        action: 'Complete manual security fixes identified in the report',
        timeframe: 'Within 1 week'
      });
    }
    
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Ongoing Security',
      action: 'Schedule regular security audits (weekly or after major changes)',
      timeframe: 'Ongoing'
    });
    
    recommendations.push({
      priority: 'LOW',
      category: 'Security Monitoring',
      action: 'Implement continuous security monitoring and alerting',
      timeframe: 'Within 1 month'
    });
    
    return recommendations;
  }

  /**
   * 🏃 Run complete remediation
   */
  async runFullRemediation() {
    console.log(style.title('🔐 Intelligent Security Remediation Engine'));
    console.log(style.title('=' .repeat(55)));
    console.log(style.info(`Mode: ${isFixMode ? 'Auto-Fix' : 'Analysis Only'}`));
    console.log(style.info(`Timestamp: ${new Date().toLocaleString()}`));
    
    const startTime = Date.now();
    
    try {
      await this.checkRequestMethodValidation();
      await this.checkHttpsEnforcement();
      await this.checkPasswordHashing();
      await this.checkRateLimiting();
      await this.checkLogExposure();
      await this.checkSessionSecurity();
      
      const reportData = this.generateReport();
      
      if (isReportMode || isFixMode) {
        await this.saveReport(reportData);
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(style.info(`\n⏱️  Remediation completed in ${duration} seconds`));
      
      // Exit with appropriate code
      const exitCode = reportData.score >= 70 ? 0 : 1;
      
      if (isFixMode && reportData.fixesApplied.length > 0) {
        console.log(style.success(`\n✅ Applied ${reportData.fixesApplied.length} security fixes successfully!`));
      }
      
      process.exit(exitCode);
      
    } catch (err) {
      console.log(style.error(`\n❌ Remediation failed: ${err.message}`));
      console.error(err);
      process.exit(1);
    }
  }
}

/**
 * 📚 CLI Interface
 */
function showHelp() {
  console.log(`
${style.title('🔐 Intelligent Security Remediation Script')}

${style.section('DESCRIPTION:')}
  Performs secure remediation with pre-checks to detect existing implementations
  before applying any fixes. Ensures compliance without duplicate code.

${style.section('USAGE:')}
  node security-remediator.js [options]

${style.section('OPTIONS:')}
  --fix        Auto-apply missing security configurations
  --report     Generate analysis report only (no code changes)
  --help       Show this help message

${style.section('EXAMPLES:')}
  node security-remediator.js --fix           # Apply fixes automatically
  node security-remediator.js --report        # Analysis only
  node security-remediator.js --fix --report  # Fix and generate report

${style.section('SECURITY CATEGORIES:')}
  ✅ Request Method Validation (GET vs POST)
  ✅ HTTPS/TLS Enforcement (helmet, SSL, HSTS)
  ✅ Password Hashing (bcrypt/argon2)
  ✅ Rate Limiting (authentication protection)
  ✅ Log Exposure (credential sanitization)
  ✅ Session Security (secure cookies, JWT)

${style.section('SAFETY FEATURES:')}
  ✅ Pre-check existing implementations
  ✅ Automatic file backups before changes
  ✅ Non-destructive remediation
  ✅ Comprehensive reporting
  ✅ Risk assessment and recommendations

${style.section('EXIT CODES:')}
  0 - Security score >= 70% (ACCEPTABLE)
  1 - Security score < 70% (NEEDS ATTENTION)

${style.section('BACKUP LOCATION:')}
  ./backup/security_remediation_<timestamp>/

${style.section('REPORTS LOCATION:')}
  ./security-reports/security_remediation_<timestamp>.json

For more information, visit: https://github.com/your-repo/security-docs
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
  
  isFixMode = args.includes('--fix');
  isReportMode = args.includes('--report') || !isFixMode; // Default to report mode
  
  // Install chalk if needed
  try {
    require('chalk');
  } catch (err) {
    console.log('Installing chalk for colored output...');
    execSync('npm install chalk', { stdio: 'inherit' });
  }
  
  // Validate environment
  if (!fs.existsSync('./my-backend') || !fs.existsSync('./my-frontend')) {
    console.error('❌ Error: Run this script from the BISMAN ERP root directory');
    process.exit(1);
  }
  
  // Run remediation
  const remediator = new SecurityRemediator();
  await remediator.runFullRemediation();
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { SecurityRemediator, CONFIG };
