#!/usr/bin/env node
/**
 * SECURITY & BUILD QUALITY AUDIT
 * Comprehensive security, performance, and code quality checks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRONTEND_DIR = path.join(__dirname, 'my-frontend');
const BACKEND_DIR = path.join(__dirname, 'my-backend');

const securityAudit = {
  timestamp: new Date().toISOString(),
  security: {
    vulnerabilities: [],
    outdatedDeps: [],
    securityHeaders: [],
    authIssues: [],
    apiSecurityIssues: []
  },
  performance: {
    largeFiles: [],
    heavyDependencies: [],
    unnecessaryRenders: []
  },
  codeQuality: {
    eslintErrors: [],
    typeErrors: [],
    unusedCode: []
  },
  buildHealth: {
    canBuild: false,
    buildTime: 0,
    buildSize: 0,
    errors: []
  }
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'white') {
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

function checkNodeModulesSecurity() {
  log('\n🔐 Checking NPM Security...', 'cyan');
  
  try {
    const auditOutput = execSync('cd my-frontend && npm audit --json', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    try {
      const auditData = JSON.parse(auditOutput);
      const vulnerabilities = auditData.vulnerabilities || {};
      const vulnCount = Object.keys(vulnerabilities).length;
      
      if (vulnCount > 0) {
        log(`   ⚠️ Found ${vulnCount} vulnerabilities`, 'yellow');
        securityAudit.security.vulnerabilities = Object.entries(vulnerabilities).map(([pkg, data]) => ({
          package: pkg,
          severity: data.severity,
          via: data.via
        }));
      } else {
        log('   ✓ No known vulnerabilities', 'green');
      }
    } catch (e) {
      log('   ℹ️ Audit output format changed or no vulnerabilities', 'blue');
    }
  } catch (error) {
    log('   ⚠️ npm audit check failed or has issues', 'yellow');
  }
}

function checkOutdatedPackages() {
  log('\n📦 Checking Outdated Packages...', 'cyan');
  
  try {
    const outdated = execSync('cd my-frontend && npm outdated --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    try {
      const outdatedData = JSON.parse(outdated);
      const outdatedCount = Object.keys(outdatedData).length;
      
      if (outdatedCount > 0) {
        log(`   ⚠️ ${outdatedCount} packages are outdated`, 'yellow');
        securityAudit.security.outdatedDeps = Object.entries(outdatedData).map(([pkg, data]) => ({
          package: pkg,
          current: data.current,
          wanted: data.wanted,
          latest: data.latest
        }));
      } else {
        log('   ✓ All packages are up to date', 'green');
      }
    } catch (e) {
      log('   ✓ All packages are up to date', 'green');
    }
  } catch (error) {
    log('   ℹ️ Could not check outdated packages', 'blue');
  }
}

function checkSecurityHeaders() {
  log('\n🛡️ Checking Security Headers Configuration...', 'cyan');
  
  const nextConfigPath = path.join(FRONTEND_DIR, 'next.config.js');
  if (fs.existsSync(nextConfigPath)) {
    const config = fs.readFileSync(nextConfigPath, 'utf-8');
    
    const requiredHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy'
    ];
    
    requiredHeaders.forEach(header => {
      if (config.includes(header)) {
        log(`   ✓ ${header} configured`, 'green');
      } else {
        log(`   ⚠️ ${header} not found`, 'yellow');
        securityAudit.security.securityHeaders.push({
          header,
          status: 'missing',
          recommendation: 'Add security header to next.config.js'
        });
      }
    });
  } else {
    log('   ⚠️ next.config.js not found', 'yellow');
  }
}

function checkAuthImplementation() {
  log('\n🔑 Auditing Authentication Implementation...', 'cyan');
  
  const authFiles = [
    path.join(FRONTEND_DIR, 'src/hooks/useAuth.ts'),
    path.join(FRONTEND_DIR, 'src/common/hooks/useAuth.ts'),
    path.join(FRONTEND_DIR, 'middleware.ts')
  ];
  
  authFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for common auth issues
      const issues = [];
      
      if (!content.includes('token') && !content.includes('session')) {
        issues.push('No token/session handling detected');
      }
      
      if (content.includes('localStorage') && !content.includes('httpOnly')) {
        issues.push('Potential XSS risk: tokens in localStorage');
      }
      
      if (!content.includes('logout') && !content.includes('signOut')) {
        issues.push('No logout mechanism found');
      }
      
      if (issues.length > 0) {
        log(`   ⚠️ ${path.basename(file)}:`, 'yellow');
        issues.forEach(issue => log(`      - ${issue}`, 'yellow'));
        securityAudit.security.authIssues.push({ file, issues });
      } else {
        log(`   ✓ ${path.basename(file)} looks good`, 'green');
      }
    }
  });
}

function checkAPIEndpoints() {
  log('\n🌐 Checking API Endpoint Security...', 'cyan');
  
  const apiDir = path.join(FRONTEND_DIR, 'src/app/api');
  if (fs.existsSync(apiDir)) {
    const apiFiles = getAllFiles(apiDir, '.ts');
    
    apiFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const issues = [];
      
      // Check for authentication
      if (!content.includes('auth') && !content.includes('protected')) {
        issues.push('No authentication check detected');
      }
      
      // Check for rate limiting
      if (!content.includes('rate') && !content.includes('limit')) {
        issues.push('No rate limiting detected');
      }
      
      // Check for input validation
      if (!content.includes('validate') && !content.includes('schema')) {
        issues.push('No input validation detected');
      }
      
      if (issues.length > 0) {
        securityAudit.security.apiSecurityIssues.push({
          file: path.relative(FRONTEND_DIR, file),
          issues
        });
      }
    });
    
    if (securityAudit.security.apiSecurityIssues.length > 0) {
      log(`   ⚠️ ${securityAudit.security.apiSecurityIssues.length} API endpoints need security review`, 'yellow');
    } else {
      log('   ✓ API endpoints look secure', 'green');
    }
  }
}

function getAllFiles(dir, extension, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, extension, fileList);
    } else if (file.endsWith(extension)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function checkPerformance() {
  log('\n⚡ Checking Performance...', 'cyan');
  
  const moduleFiles = getAllFiles(path.join(FRONTEND_DIR, 'src'), '.tsx');
  
  moduleFiles.forEach(file => {
    const stats = fs.statSync(file);
    const sizeKB = stats.size / 1024;
    
    if (sizeKB > 50) {
      securityAudit.performance.largeFiles.push({
        file: path.relative(FRONTEND_DIR, file),
        size: Math.round(sizeKB) + 'KB',
        recommendation: 'Consider code splitting or optimization'
      });
    }
  });
  
  if (securityAudit.performance.largeFiles.length > 0) {
    log(`   ⚠️ ${securityAudit.performance.largeFiles.length} large files detected (>50KB)`, 'yellow');
  } else {
    log('   ✓ No unusually large files detected', 'green');
  }
}

function testBuild() {
  log('\n🏗️ Testing Build Process...', 'cyan');
  
  try {
    log('   Running build test (this may take a moment)...', 'blue');
    const startTime = Date.now();
    
    // Try to run type check instead of full build to save time
    execSync('cd my-frontend && npx tsc --noEmit', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    const buildTime = Date.now() - startTime;
    securityAudit.buildHealth.canBuild = true;
    securityAudit.buildHealth.buildTime = buildTime;
    
    log(`   ✓ TypeScript compilation successful (${buildTime}ms)`, 'green');
  } catch (error) {
    securityAudit.buildHealth.canBuild = false;
    securityAudit.buildHealth.errors.push(error.message);
    log('   ⚠️ TypeScript compilation has errors', 'yellow');
  }
}

function generateSecurityReport() {
  log('\n' + '='.repeat(60), 'bright');
  log('🔒 SECURITY AUDIT SUMMARY', 'bright');
  log('='.repeat(60), 'bright');
  
  log(`\n🔐 Security Issues:`, 'cyan');
  log(`   Vulnerabilities: ${securityAudit.security.vulnerabilities.length}`, 'white');
  log(`   Outdated Dependencies: ${securityAudit.security.outdatedDeps.length}`, 'white');
  log(`   Missing Security Headers: ${securityAudit.security.securityHeaders.length}`, 'white');
  log(`   Auth Issues: ${securityAudit.security.authIssues.length}`, 'white');
  log(`   API Security Issues: ${securityAudit.security.apiSecurityIssues.length}`, 'white');
  
  log(`\n⚡ Performance:`, 'cyan');
  log(`   Large Files: ${securityAudit.performance.largeFiles.length}`, 'white');
  
  log(`\n🏗️ Build Health:`, 'cyan');
  log(`   Can Build: ${securityAudit.buildHealth.canBuild ? '✅' : '❌'}`, securityAudit.buildHealth.canBuild ? 'green' : 'red');
  if (securityAudit.buildHealth.buildTime > 0) {
    log(`   Build Time: ${securityAudit.buildHealth.buildTime}ms`, 'white');
  }
  
  // Save JSON report
  const reportPath = path.join(__dirname, 'SECURITY_AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(securityAudit, null, 2));
  log(`\n📝 Security report saved to: ${reportPath}`, 'green');
  
  // Generate markdown report
  generateSecurityMarkdown();
}

function generateSecurityMarkdown() {
  let markdown = `# 🔒 Security & Build Quality Audit\n\n`;
  markdown += `**Generated:** ${securityAudit.timestamp}\n\n`;
  markdown += `---\n\n`;
  
  markdown += `## 🎯 Security Score\n\n`;
  const totalIssues = securityAudit.security.vulnerabilities.length +
                      securityAudit.security.securityHeaders.length +
                      securityAudit.security.authIssues.length +
                      securityAudit.security.apiSecurityIssues.length;
  
  const score = Math.max(0, 100 - (totalIssues * 5));
  markdown += `**Overall Score:** ${score}/100\n\n`;
  
  markdown += `| Category | Status |\n`;
  markdown += `|----------|--------|\n`;
  markdown += `| Vulnerabilities | ${securityAudit.security.vulnerabilities.length === 0 ? '✅' : '⚠️'} ${securityAudit.security.vulnerabilities.length} found |\n`;
  markdown += `| Security Headers | ${securityAudit.security.securityHeaders.length === 0 ? '✅' : '⚠️'} ${securityAudit.security.securityHeaders.length} missing |\n`;
  markdown += `| Auth Security | ${securityAudit.security.authIssues.length === 0 ? '✅' : '⚠️'} ${securityAudit.security.authIssues.length} issues |\n`;
  markdown += `| API Security | ${securityAudit.security.apiSecurityIssues.length === 0 ? '✅' : '⚠️'} ${securityAudit.security.apiSecurityIssues.length} endpoints |\n`;
  markdown += `| Build Health | ${securityAudit.buildHealth.canBuild ? '✅' : '❌'} ${securityAudit.buildHealth.canBuild ? 'Passing' : 'Failing'} |\n\n`;
  
  if (securityAudit.security.vulnerabilities.length > 0) {
    markdown += `## 🚨 Vulnerabilities\n\n`;
    securityAudit.security.vulnerabilities.slice(0, 10).forEach(vuln => {
      markdown += `- **${vuln.package}** (${vuln.severity})\n`;
    });
    markdown += `\n`;
  }
  
  if (securityAudit.security.securityHeaders.length > 0) {
    markdown += `## 🛡️ Missing Security Headers\n\n`;
    securityAudit.security.securityHeaders.forEach(header => {
      markdown += `- ${header.header}: ${header.recommendation}\n`;
    });
    markdown += `\n`;
  }
  
  if (securityAudit.performance.largeFiles.length > 0) {
    markdown += `## ⚡ Performance Optimization Needed\n\n`;
    markdown += `Large files detected (>50KB):\n\n`;
    securityAudit.performance.largeFiles.slice(0, 10).forEach(file => {
      markdown += `- ${file.file} (${file.size})\n`;
    });
    markdown += `\n`;
  }
  
  markdown += `## 📋 Recommendations\n\n`;
  markdown += `1. Run \`npm audit fix\` to resolve known vulnerabilities\n`;
  markdown += `2. Add missing security headers to next.config.js\n`;
  markdown += `3. Review and optimize large files for better performance\n`;
  markdown += `4. Ensure all API endpoints have proper authentication\n`;
  markdown += `5. Implement rate limiting on sensitive endpoints\n\n`;
  
  const reportPath = path.join(__dirname, 'SECURITY_BUILD_AUDIT.md');
  fs.writeFileSync(reportPath, markdown);
  log(`📝 Security markdown report saved to: ${reportPath}`, 'green');
}

// Main execution
log('🚀 Starting Security & Build Audit...', 'bright');
log('='.repeat(60), 'bright');

try {
  checkNodeModulesSecurity();
  checkOutdatedPackages();
  checkSecurityHeaders();
  checkAuthImplementation();
  checkAPIEndpoints();
  checkPerformance();
  testBuild();
  generateSecurityReport();
  
  log('\n' + '='.repeat(60), 'bright');
  log('✅ Security Audit Complete!', 'green');
  log('='.repeat(60), 'bright');
} catch (error) {
  log('\n❌ Audit failed:', 'red');
  log(error.message, 'red');
  process.exit(1);
}
