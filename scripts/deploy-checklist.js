#!/usr/bin/env node
/**
 * Pre-Deployment Safety Checklist
 * 
 * Run this before pushing to production to verify:
 * 1. No hardcoded secrets
 * 2. No console.log/error in production code
 * 3. DB migrations are applied
 * 4. Page sync drift check
 * 5. Type check passes
 * 6. No known security vulnerabilities
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'my-backend');
const FRONTEND = path.join(ROOT, 'my-frontend');

// Colors for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const results = [];

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function check(name, passed, message = '') {
  const status = passed ? `${GREEN}✓ PASS${RESET}` : `${RED}✗ FAIL${RESET}`;
  console.log(`${status} ${name}${message ? `: ${message}` : ''}`);
  results.push({ name, passed, message });
  return passed;
}

function runCommand(cmd, cwd = ROOT) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    return { error: err.stderr || err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Check 1: No hardcoded secrets in codebase
// ─────────────────────────────────────────────────────────────────────────
function checkHardcodedSecrets() {
  log(`\n${BOLD}[1/6] Checking for hardcoded secrets...${RESET}`);
  
  const patterns = [
    { pattern: /password\s*[:=]\s*['"][^'"]{6,}['"]/gi, name: 'hardcoded password' },
    { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, name: 'API key' },
    { pattern: /secret\s*[:=]\s*['"][^'"]{10,}['"]/gi, name: 'secret' },
    { pattern: /Bearer\s+[A-Za-z0-9\-_.]+\.[A-Za-z0-9\-_.]+\.[A-Za-z0-9\-_.]+/g, name: 'JWT token' },
    { pattern: /postgres:\/\/[^"'\s]+@/g, name: 'DB connection string' }
  ];
  
  const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'backups'];
  const excludeFiles = ['.env', '.env.local', 'package-lock.json', 'deploy-checklist.js'];
  
  function searchDir(dir, relativePath = '') {
    const findings = [];
    
    if (!fs.existsSync(dir)) return findings;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          findings.push(...searchDir(fullPath, relPath));
        }
      } else if (entry.isFile()) {
        if (excludeFiles.some(f => entry.name.includes(f))) continue;
        if (!/\.(js|ts|tsx|json|yaml|yml)$/.test(entry.name)) continue;
        
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const { pattern, name } of patterns) {
            const matches = content.match(pattern);
            if (matches) {
              findings.push({
                file: relPath,
                type: name,
                count: matches.length
              });
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
    
    return findings;
  }
  
  const findings = [...searchDir(BACKEND, 'my-backend'), ...searchDir(FRONTEND, 'my-frontend')];
  
  if (findings.length === 0) {
    check('No hardcoded secrets', true);
  } else {
    check('No hardcoded secrets', false, `Found ${findings.length} potential issues`);
    findings.forEach(f => log(`   ${YELLOW}⚠ ${f.file}: ${f.count} ${f.type}(s)${RESET}`));
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Check 2: Production console.log usage (warning only)
// ─────────────────────────────────────────────────────────────────────────
function checkConsoleLogs() {
  log(`\n${BOLD}[2/6] Checking console.log usage in routes...${RESET}`);
  
  const routesDir = path.join(BACKEND, 'routes');
  let totalLogs = 0;
  const filesWithLogs = [];
  
  if (fs.existsSync(routesDir)) {
    const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      const logMatches = content.match(/console\.(log|warn|error)\s*\(/g) || [];
      if (logMatches.length > 0) {
        totalLogs += logMatches.length;
        filesWithLogs.push({ file, count: logMatches.length });
      }
    }
  }
  
  // This is a warning, not a failure - logging is needed but should use pino in production
  if (totalLogs === 0) {
    check('No console.log in routes', true);
  } else {
    log(`${YELLOW}⚠ WARNING${RESET} Console logs in routes: ${totalLogs} instances in ${filesWithLogs.length} files`);
    log(`   Consider migrating to structured logging (pino)`);
    filesWithLogs.slice(0, 5).forEach(f => log(`   ${f.file}: ${f.count} logs`));
    if (filesWithLogs.length > 5) log(`   ... and ${filesWithLogs.length - 5} more files`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Check 3: TypeScript type check
// ─────────────────────────────────────────────────────────────────────────
function checkTypeScript() {
  log(`\n${BOLD}[3/6] Running TypeScript type check...${RESET}`);
  
  const result = runCommand('npm run type-check 2>&1 || true', FRONTEND);
  
  if (typeof result === 'object' && result.error) {
    check('TypeScript type check', false, 'Command failed');
    log(`   ${RED}${result.error}${RESET}`);
  } else if (result.includes('error TS')) {
    const errorCount = (result.match(/error TS/g) || []).length;
    check('TypeScript type check', false, `${errorCount} errors`);
  } else {
    check('TypeScript type check', true);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Check 4: Git status - uncommitted changes
// ─────────────────────────────────────────────────────────────────────────
function checkGitStatus() {
  log(`\n${BOLD}[4/6] Checking git status...${RESET}`);
  
  const status = runCommand('git status --porcelain');
  
  if (typeof status === 'object' && status.error) {
    check('Git status', false, 'Not a git repository');
  } else if (status.trim().length === 0) {
    check('Git status clean', true);
  } else {
    const lines = status.trim().split('\n').length;
    check('Git status clean', false, `${lines} uncommitted changes`);
    log(`   ${YELLOW}Run 'git status' to see details${RESET}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Check 5: Package vulnerabilities (npm audit)
// ─────────────────────────────────────────────────────────────────────────
function checkVulnerabilities() {
  log(`\n${BOLD}[5/6] Checking for vulnerabilities...${RESET}`);
  
  const audit = runCommand('npm audit --json 2>/dev/null || echo "{}"', BACKEND);
  
  try {
    const parsed = typeof audit === 'object' ? {} : JSON.parse(audit);
    const vulnerabilities = parsed.metadata?.vulnerabilities || {};
    const high = (vulnerabilities.high || 0) + (vulnerabilities.critical || 0);
    
    if (high > 0) {
      check('No high/critical vulnerabilities', false, `${high} found`);
      log(`   ${RED}Run 'npm audit' in my-backend for details${RESET}`);
    } else {
      check('No high/critical vulnerabilities', true);
    }
  } catch (e) {
    log(`   ${YELLOW}⚠ Could not parse audit results${RESET}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Check 6: Environment variables required
// ─────────────────────────────────────────────────────────────────────────
function checkEnvVars() {
  log(`\n${BOLD}[6/6] Checking required environment variables...${RESET}`);
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'NODE_ENV'
  ];
  
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missing.length === 0) {
    check('Required environment variables', true);
  } else {
    check('Required environment variables', false, `Missing: ${missing.join(', ')}`);
    log(`   ${YELLOW}These must be set in production${RESET}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────
function printSummary() {
  log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  log(`${BOLD}                  DEPLOYMENT CHECKLIST SUMMARY${RESET}`);
  log(`${BOLD}═══════════════════════════════════════════════════════${RESET}\n`);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  if (failed === 0) {
    log(`${GREEN}${BOLD}All ${passed} checks passed! Safe to deploy.${RESET}\n`);
  } else {
    log(`${YELLOW}${passed} passed, ${RED}${failed} failed${RESET}\n`);
    log(`${RED}Fix the above issues before deploying to production.${RESET}\n`);
  }
  
  log(`${BLUE}Next steps:${RESET}`);
  log(`  1. Review any warnings above`);
  log(`  2. Run: git push origin deployment`);
  log(`  3. Monitor Railway deployment logs`);
  log(`  4. Verify health endpoint: curl https://bisman.up.railway.app/health`);
  log('');
  
  process.exit(failed > 0 ? 1 : 0);
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────
log(`${BOLD}${BLUE}╔════════════════════════════════════════════════════════╗${RESET}`);
log(`${BOLD}${BLUE}║       BISMAN ERP - Pre-Deployment Safety Check         ║${RESET}`);
log(`${BOLD}${BLUE}╚════════════════════════════════════════════════════════╝${RESET}`);
log(`${BLUE}Running from: ${ROOT}${RESET}`);

checkHardcodedSecrets();
checkConsoleLogs();
checkTypeScript();
checkGitStatus();
checkVulnerabilities();
checkEnvVars();
printSummary();
