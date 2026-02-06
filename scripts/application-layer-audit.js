#!/usr/bin/env node
/**
 * APPLICATION LAYER AUDIT
 * Scans Node.js code for anti-patterns that cause production failures
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..', 'my-backend');

const FINDINGS = {
  parseInt: [],
  Number: [],
  selectStar: [],
  localhost: [],
  hardcodedUrls: [],
  rawSql: [],
  missingValidation: []
};

const PATTERNS = [
  {
    category: 'parseInt',
    regex: /parseInt\s*\(\s*([^)]*(?:id|Id|user|User|tenant|Tenant)[^)]*)\s*\)/g,
    severity: 'HIGH',
    description: 'parseInt() on ID fields - breaks with UUID'
  },
  {
    category: 'Number',
    regex: /Number\s*\(\s*([^)]*(?:id|Id|user|User|tenant|Tenant)[^)]*)\s*\)/g,
    severity: 'HIGH',
    description: 'Number() on ID fields - breaks with UUID'
  },
  {
    category: 'selectStar',
    regex: /SELECT\s+\*\s+FROM/gi,
    severity: 'MEDIUM',
    description: 'SELECT * queries - fragile to schema changes'
  },
  {
    category: 'localhost',
    regex: /['"`](?:http:\/\/)?localhost[:\d]*['"`]/g,
    severity: 'HIGH',
    description: 'Hardcoded localhost - fails in production'
  },
  {
    category: 'hardcodedUrls',
    regex: /['"`]https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?\/api\//g,
    severity: 'MEDIUM',
    description: 'Hardcoded API URLs - should use env vars'
  }
];

const SKIP_PATTERNS = [
  'node_modules', '.git', 'dist', 'build', 'coverage', '__tests__',
  '.next', 'public', '.prisma'
];

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(p => filePath.includes(p));
}

function scanFile(filePath) {
  if (shouldSkip(filePath)) return;
  if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  
  for (const pattern of PATTERNS) {
    let match;
    pattern.regex.lastIndex = 0; // Reset regex
    
    while ((match = pattern.regex.exec(content)) !== null) {
      // Find line number
      const beforeMatch = content.substring(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      const line = lines[lineNum - 1]?.trim() || '';
      
      FINDINGS[pattern.category].push({
        file: relativePath,
        line: lineNum,
        code: line.substring(0, 100),
        severity: pattern.severity
      });
    }
  }
}

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!shouldSkip(fullPath)) {
        scanDirectory(fullPath);
      }
    } else {
      scanFile(fullPath);
    }
  }
}

function printFindings() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           APPLICATION LAYER AUDIT REPORT                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Scanned: ${BACKEND_DIR}\n`);

  let totalIssues = 0;
  const summary = [];

  for (const [category, findings] of Object.entries(FINDINGS)) {
    if (findings.length === 0) continue;
    
    const pattern = PATTERNS.find(p => p.category === category);
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`${pattern?.severity === 'HIGH' ? '🔴' : '🟡'} ${category.toUpperCase()}: ${findings.length} issues`);
    console.log(`   ${pattern?.description}`);
    console.log('═'.repeat(60));
    
    // Group by file
    const byFile = {};
    for (const f of findings) {
      if (!byFile[f.file]) byFile[f.file] = [];
      byFile[f.file].push(f);
    }
    
    for (const [file, issues] of Object.entries(byFile)) {
      console.log(`\n📄 ${file}`);
      for (const issue of issues.slice(0, 5)) {
        console.log(`   Line ${issue.line}: ${issue.code.substring(0, 70)}...`);
      }
      if (issues.length > 5) {
        console.log(`   ... and ${issues.length - 5} more`);
      }
    }
    
    totalIssues += findings.length;
    summary.push({ category, count: findings.length, severity: pattern?.severity });
  }

  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log(`\nTotal Issues: ${totalIssues}`);
  console.log('\nBy Category:');
  for (const s of summary) {
    const icon = s.severity === 'HIGH' ? '🔴' : '🟡';
    console.log(`  ${icon} ${s.category}: ${s.count}`);
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    totalIssues,
    findings: FINDINGS,
    summary
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'application-audit-report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('\n📁 Full report: scripts/application-audit-report.json');
}

// Run
console.log('Scanning backend code...\n');
scanDirectory(BACKEND_DIR);
printFindings();
