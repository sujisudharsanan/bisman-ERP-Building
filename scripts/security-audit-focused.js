#!/usr/bin/env node
/**
 * FOCUSED SECURITY AUDIT
 * Quick security scan without blocking operations
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, 'my-frontend');

const audit = {
  timestamp: new Date().toISOString(),
  critical: [],
  high: [],
  medium: [],
  low: [],
  info: [],
  score: 100
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function scanFile(filePath, content) {
  const issues = [];
  const filename = path.basename(filePath);
  
  // 1. Check for hardcoded credentials
  const credPatterns = [
    /password\s*=\s*['"][^'"]+['"]/gi,
    /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
    /secret\s*=\s*['"][^'"]+['"]/gi,
    /token\s*=\s*['"][^'"]+['"]/gi,
    /mongodb:\/\/[^'"]+/gi,
    /postgres:\/\/[^'"]+/gi
  ];
  
  credPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        severity: 'critical',
        type: 'Hardcoded Credentials',
        message: `Potential hardcoded credential found: ${matches[0].substring(0, 30)}...`,
        file: filename
      });
    }
  });
  
  // 2. Check for eval() usage
  if (content.includes('eval(')) {
    issues.push({
      severity: 'critical',
      type: 'Code Injection Risk',
      message: 'eval() usage detected - security risk',
      file: filename
    });
  }
  
  // 3. Check for dangerouslySetInnerHTML
  if (content.includes('dangerouslySetInnerHTML')) {
    issues.push({
      severity: 'high',
      type: 'XSS Risk',
      message: 'dangerouslySetInnerHTML usage - ensure input is sanitized',
      file: filename
    });
  }
  
  // 4. Check for localStorage with sensitive data
  if (content.match(/localStorage\.setItem.*token|localStorage\.setItem.*password/gi)) {
    issues.push({
      severity: 'high',
      type: 'Insecure Storage',
      message: 'Storing sensitive data in localStorage - use httpOnly cookies',
      file: filename
    });
  }
  
  // 5. Check for console.log in production files
  if (content.includes('console.log') && !filePath.includes('test') && !filePath.includes('debug')) {
    issues.push({
      severity: 'low',
      type: 'Information Disclosure',
      message: 'console.log found - may leak sensitive info in production',
      file: filename
    });
  }
  
  // 6. Check for TODO/FIXME security
  const securityTodos = content.match(/\/\/\s*(TODO|FIXME).*security|\/\/\s*(TODO|FIXME).*auth/gi);
  if (securityTodos) {
    issues.push({
      severity: 'medium',
      type: 'Incomplete Security',
      message: `Security TODO found: ${securityTodos[0]}`,
      file: filename
    });
  }
  
  // 7. Check for insecure random
  if (content.includes('Math.random()') && content.match(/token|session|key/gi)) {
    issues.push({
      severity: 'high',
      type: 'Weak Randomness',
      message: 'Math.random() used for security - use crypto.randomBytes',
      file: filename
    });
  }
  
  // 8. Check for SQL injection patterns
  if (content.match(/query.*\+.*req\.|query.*\$\{.*req\./gi)) {
    issues.push({
      severity: 'critical',
      type: 'SQL Injection',
      message: 'Potential SQL injection - use parameterized queries',
      file: filename
    });
  }
  
  return issues;
}

function getAllFiles(dir, extension, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next')) {
        getAllFiles(filePath, extension, fileList);
      }
    } else if (file.endsWith(extension)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function checkNextConfig() {
  log('\n🛡️ Checking Next.js Security Configuration...', 'cyan');
  
  const configPath = path.join(FRONTEND_DIR, 'next.config.js');
  if (!fs.existsSync(configPath)) {
    audit.high.push({
      type: 'Missing Config',
      message: 'next.config.js not found',
      recommendation: 'Create security configuration'
    });
    return;
  }
  
  const config = fs.readFileSync(configPath, 'utf-8');
  
  const requiredHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000',
    'Content-Security-Policy': "default-src 'self'"
  };
  
  Object.entries(requiredHeaders).forEach(([header, value]) => {
    if (!config.includes(header)) {
      audit.high.push({
        type: 'Missing Security Header',
        message: `${header} not configured`,
        recommendation: `Add: { key: '${header}', value: '${value}' }`
      });
    } else {
      log(`   ✓ ${header} configured`, 'green');
    }
  });
}

function checkEnvFiles() {
  log('\n🔐 Checking Environment Files...', 'cyan');
  
  const envFiles = ['.env', '.env.local', '.env.production'];
  const frontendEnvDir = FRONTEND_DIR;
  
  envFiles.forEach(file => {
    const envPath = path.join(frontendEnvDir, file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      
      // Check for exposed secrets
      if (content.match(/password|secret|key/i) && !content.match(/^#/gm)) {
        audit.medium.push({
          type: 'Environment Variables',
          message: `${file} contains potential secrets`,
          recommendation: 'Ensure this file is in .gitignore'
        });
      }
      
      log(`   ✓ ${file} found`, 'green');
    }
  });
  
  // Check .gitignore
  const gitignorePath = path.join(__dirname, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('.env')) {
      audit.critical.push({
        type: 'Git Security',
        message: '.env files not in .gitignore',
        recommendation: 'Add .env* to .gitignore immediately'
      });
    } else {
      log('   ✓ .env files in .gitignore', 'green');
    }
  }
}

function checkAuthImplementation() {
  log('\n🔑 Checking Authentication Security...', 'cyan');
  
  const authFiles = [
    path.join(FRONTEND_DIR, 'src/hooks/useAuth.ts'),
    path.join(FRONTEND_DIR, 'middleware.ts'),
    path.join(FRONTEND_DIR, 'src/app/api/login/route.ts')
  ];
  
  authFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for JWT validation
      if (content.includes('jwt') || content.includes('token')) {
        if (!content.includes('verify') && !content.includes('validate')) {
          audit.high.push({
            type: 'Auth Validation',
            message: `${path.basename(file)} - Token validation not explicit`,
            recommendation: 'Ensure JWT tokens are properly validated'
          });
        }
      }
      
      // Check for session security
      if (content.includes('cookie') || content.includes('session')) {
        if (!content.includes('httpOnly') && !content.includes('secure')) {
          audit.high.push({
            type: 'Cookie Security',
            message: `${path.basename(file)} - Cookies may not be secure`,
            recommendation: 'Use httpOnly and secure flags for cookies'
          });
        } else {
          log(`   ✓ ${path.basename(file)} uses secure cookies`, 'green');
        }
      }
    }
  });
}

function scanSourceCode() {
  log('\n🔍 Scanning Source Code for Security Issues...', 'cyan');
  
  const files = getAllFiles(path.join(FRONTEND_DIR, 'src'), '.ts')
    .concat(getAllFiles(path.join(FRONTEND_DIR, 'src'), '.tsx'));
  
  let scannedCount = 0;
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const issues = scanFile(file, content);
    
    issues.forEach(issue => {
      audit[issue.severity].push(issue);
    });
    
    scannedCount++;
  });
  
  log(`   ✓ Scanned ${scannedCount} files`, 'green');
}

function calculateScore() {
  const weights = {
    critical: 20,
    high: 10,
    medium: 5,
    low: 2
  };
  
  let deduction = 0;
  deduction += audit.critical.length * weights.critical;
  deduction += audit.high.length * weights.high;
  deduction += audit.medium.length * weights.medium;
  deduction += audit.low.length * weights.low;
  
  audit.score = Math.max(0, 100 - deduction);
}

function generateReport() {
  calculateScore();
  
  log('\n' + '='.repeat(70), 'bright');
  log('🔒 SECURITY AUDIT REPORT', 'bright');
  log('='.repeat(70), 'bright');
  
  // Score with color
  const scoreColor = audit.score >= 80 ? 'green' : audit.score >= 60 ? 'yellow' : 'red';
  log(`\n🎯 Security Score: ${audit.score}/100`, scoreColor);
  
  log('\n📊 Issues Summary:', 'cyan');
  log(`   🔴 Critical: ${audit.critical.length}`, audit.critical.length > 0 ? 'red' : 'green');
  log(`   🟠 High:     ${audit.high.length}`, audit.high.length > 0 ? 'yellow' : 'green');
  log(`   🟡 Medium:   ${audit.medium.length}`, 'yellow');
  log(`   🔵 Low:      ${audit.low.length}`, 'cyan');
  
  // Critical issues
  if (audit.critical.length > 0) {
    log('\n🚨 CRITICAL ISSUES (Fix Immediately):', 'red');
    audit.critical.forEach((issue, i) => {
      log(`\n${i + 1}. ${issue.type}`, 'red');
      log(`   Message: ${issue.message}`, 'red');
      if (issue.file) log(`   File: ${issue.file}`, 'red');
      if (issue.recommendation) log(`   Fix: ${issue.recommendation}`, 'yellow');
    });
  }
  
  // High priority issues
  if (audit.high.length > 0) {
    log('\n⚠️  HIGH PRIORITY ISSUES:', 'yellow');
    audit.high.slice(0, 5).forEach((issue, i) => {
      log(`\n${i + 1}. ${issue.type}`, 'yellow');
      log(`   Message: ${issue.message}`, 'yellow');
      if (issue.file) log(`   File: ${issue.file}`);
      if (issue.recommendation) log(`   Fix: ${issue.recommendation}`, 'cyan');
    });
    if (audit.high.length > 5) {
      log(`\n   ... and ${audit.high.length - 5} more high priority issues`, 'yellow');
    }
  }
  
  // Recommendations
  log('\n💡 Security Recommendations:', 'cyan');
  log('   1. Review and fix all critical issues immediately');
  log('   2. Add missing security headers to next.config.js');
  log('   3. Ensure all .env files are in .gitignore');
  log('   4. Use httpOnly and secure flags for all cookies');
  log('   5. Implement proper input validation on all forms');
  log('   6. Use parameterized queries to prevent SQL injection');
  log('   7. Remove console.log statements from production code');
  log('   8. Implement rate limiting on API endpoints');
  
  // Save report
  const reportPath = path.join(__dirname, 'SECURITY_AUDIT_DETAILED.json');
  fs.writeFileSync(reportPath, JSON.stringify(audit, null, 2));
  log(`\n📝 Detailed report saved to: ${reportPath}`, 'green');
  
  // Generate markdown
  generateMarkdown();
  
  log('\n' + '='.repeat(70), 'bright');
  log('✅ Security Audit Complete!', 'green');
  log('='.repeat(70), 'bright');
  
  // Exit code based on critical issues
  if (audit.critical.length > 0) {
    log('\n⚠️  Critical security issues found. Please fix immediately.', 'red');
    process.exit(1);
  }
}

function generateMarkdown() {
  let md = `# 🔒 Security Audit Report\n\n`;
  md += `**Generated:** ${audit.timestamp}\n\n`;
  md += `---\n\n`;
  
  md += `## 🎯 Security Score: ${audit.score}/100\n\n`;
  
  const rating = audit.score >= 90 ? 'Excellent ✅' :
                 audit.score >= 80 ? 'Good ✅' :
                 audit.score >= 70 ? 'Fair ⚠️' :
                 audit.score >= 60 ? 'Poor ⚠️' : 'Critical 🔴';
  
  md += `**Rating:** ${rating}\n\n`;
  
  md += `## 📊 Issues Summary\n\n`;
  md += `| Severity | Count | Status |\n`;
  md += `|----------|-------|--------|\n`;
  md += `| 🔴 Critical | ${audit.critical.length} | ${audit.critical.length === 0 ? '✅' : '🚨'} |\n`;
  md += `| 🟠 High | ${audit.high.length} | ${audit.high.length === 0 ? '✅' : '⚠️'} |\n`;
  md += `| 🟡 Medium | ${audit.medium.length} | ${audit.medium.length === 0 ? '✅' : 'ℹ️'} |\n`;
  md += `| 🔵 Low | ${audit.low.length} | ℹ️ |\n\n`;
  
  if (audit.critical.length > 0) {
    md += `## 🚨 Critical Issues\n\n`;
    audit.critical.forEach((issue, i) => {
      md += `### ${i + 1}. ${issue.type}\n\n`;
      md += `- **Message:** ${issue.message}\n`;
      if (issue.file) md += `- **File:** \`${issue.file}\`\n`;
      if (issue.recommendation) md += `- **Fix:** ${issue.recommendation}\n`;
      md += `\n`;
    });
  }
  
  if (audit.high.length > 0) {
    md += `## ⚠️ High Priority Issues\n\n`;
    audit.high.forEach((issue, i) => {
      md += `### ${i + 1}. ${issue.type}\n\n`;
      md += `- **Message:** ${issue.message}\n`;
      if (issue.file) md += `- **File:** \`${issue.file}\`\n`;
      if (issue.recommendation) md += `- **Fix:** ${issue.recommendation}\n`;
      md += `\n`;
    });
  }
  
  md += `## 💡 Recommendations\n\n`;
  md += `1. **Immediate Actions:**\n`;
  md += `   - Fix all critical issues\n`;
  md += `   - Review high priority issues\n`;
  md += `   - Update security headers\n\n`;
  
  md += `2. **Short-term (This Week):**\n`;
  md += `   - Add missing security headers\n`;
  md += `   - Implement proper authentication\n`;
  md += `   - Review cookie security\n\n`;
  
  md += `3. **Long-term (This Month):**\n`;
  md += `   - Regular security audits\n`;
  md += `   - Code review process\n`;
  md += `   - Security training\n\n`;
  
  md += `---\n\n`;
  md += `*Generated by Security Audit System*\n`;
  
  const mdPath = path.join(__dirname, 'SECURITY_AUDIT_DETAILED.md');
  fs.writeFileSync(mdPath, md);
  log(`📝 Markdown report saved to: ${mdPath}`, 'green');
}

// Main execution
log('🚀 Starting Focused Security Audit...', 'bright');
log('='.repeat(70), 'bright');

try {
  checkNextConfig();
  checkEnvFiles();
  checkAuthImplementation();
  scanSourceCode();
  generateReport();
} catch (error) {
  log('\n❌ Audit failed:', 'red');
  log(error.message, 'red');
  console.error(error);
  process.exit(1);
}
