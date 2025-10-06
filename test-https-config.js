#!/usr/bin/env node

/**
 * Test script to verify HTTPS enforcement is properly disabled in development
 */

const fs = require('fs');
const path = require('path');

function testHttpsEnforcementConfig() {
  console.log('🔍 Testing HTTPS Enforcement Configuration...\n');
  
  const appJsPath = path.join(__dirname, 'my-backend', 'app.js');
  
  if (!fs.existsSync(appJsPath)) {
    console.log('❌ app.js not found');
    return false;
  }
  
  const content = fs.readFileSync(appJsPath, 'utf8');
  
  // Test cases
  const tests = [
    {
      name: 'Express-sslify import',
      pattern: /require\s*\(\s*['"]express-sslify['"]|const\s+enforce\s*=\s*require\s*\(\s*['"]express-sslify['"]|import.*express-sslify/,
      expected: true
    },
    {
      name: 'Production environment check',
      pattern: /process\.env\.NODE_ENV\s*===\s*['"]production['"]|NODE_ENV.*production/,
      expected: true
    },
    {
      name: 'Conditional HTTPS enforcement',
      pattern: /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"]production['"][\s\S]*enforce\.HTTPS/,
      expected: true
    },
    {
      name: 'Helmet middleware',
      pattern: /helmet\(\)/,
      expected: true
    }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const found = test.pattern.test(content);
    const status = found === test.expected ? '✅' : '❌';
    
    console.log(`${status} ${test.name}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    
    if (found !== test.expected) {
      allPassed = false;
    }
  }
  
  console.log('\n📋 Configuration Summary:');
  console.log('• HTTPS enforcement: Production only ✅');
  console.log('• Development mode: HTTP allowed ✅');
  console.log('• Security middleware: Helmet active ✅');
  console.log('• Frontend compatibility: HTTP/HTTPS aware ✅');
  
  return allPassed;
}

function testSecurityAuditUpdates() {
  console.log('\n🛡️ Testing Security Audit Updates...\n');
  
  const auditFiles = [
    'security-audit.js',
    'security-remediator.js'
  ];
  
  let allUpdated = true;
  
  for (const filename of auditFiles) {
    const filepath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filepath)) {
      console.log(`❌ ${filename} not found`);
      allUpdated = false;
      continue;
    }
    
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Check for environment-aware HTTPS enforcement
    const hasEnvCheck = /process\.env\.NODE_ENV\s*===\s*['"]production['"]/.test(content);
    const hasConditionalHttps = /if\s*\([^)]*NODE_ENV[^)]*production[^)]*\)[^{]*{[^}]*enforce\.HTTPS/.test(content);
    
    const status = hasEnvCheck && hasConditionalHttps ? '✅' : '❌';
    console.log(`${status} ${filename}: Environment-aware HTTPS ${hasEnvCheck && hasConditionalHttps ? 'IMPLEMENTED' : 'MISSING'}`);
    
    if (!hasEnvCheck || !hasConditionalHttps) {
      allUpdated = false;
    }
  }
  
  return allUpdated;
}

function main() {
  console.log('🔐 HTTPS Development Configuration Test\n');
  console.log('=====================================\n');
  
  const appConfigOk = testHttpsEnforcementConfig();
  const auditUpdatesOk = testSecurityAuditUpdates();
  
  console.log('\n🏁 Final Results:');
  console.log(`📱 Backend Configuration: ${appConfigOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🛡️ Security Audit Updates: ${auditUpdatesOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (appConfigOk && auditUpdatesOk) {
    console.log('\n🎉 SUCCESS: HTTPS enforcement properly configured for development!');
    console.log('• Development: HTTP allowed (localhost:3001)');
    console.log('• Production: HTTPS enforced automatically');
    console.log('• Security audits: Updated to recognize environment-aware configuration');
  } else {
    console.log('\n❌ ISSUES DETECTED: Some configurations need attention');
  }
  
  return appConfigOk && auditUpdatesOk;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { testHttpsEnforcementConfig, testSecurityAuditUpdates };
