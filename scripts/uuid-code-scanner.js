#!/usr/bin/env node
/**
 * UUID Code Migration Scanner
 * 
 * Scans backend code for problematic patterns that need to be fixed
 * for UUID migration compliance.
 * 
 * Usage:
 *   node scripts/uuid-code-scanner.js
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..', 'my-backend');

// Patterns that need to be fixed
const PROBLEMATIC_PATTERNS = [
  {
    pattern: /parseInt\s*\(\s*(.*?(?:user|sender|creator|tenant|assigned).*?id.*?)\s*\)/gi,
    description: 'parseInt() used on UUID field',
    fix: 'Use ensureUUID() from utils/uuid-helpers.js instead'
  },
  {
    pattern: /Number\s*\(\s*(.*?(?:user|sender|creator|tenant|assigned).*?id.*?)\s*\)/gi,
    description: 'Number() used on UUID field',
    fix: 'Use ensureUUID() from utils/uuid-helpers.js instead'
  },
  {
    pattern: /::INTEGER/gi,
    description: 'SQL cast to INTEGER for ID',
    fix: 'Remove cast, use UUID comparison directly'
  },
  {
    pattern: /creator\.username/gi,
    description: 'Accessing creator.username (may not exist)',
    fix: 'Use creator.email or COALESCE(creator.first_name, creator.username, creator.email)'
  },
  {
    pattern: /where:\s*\{\s*id:\s*Number\(/gi,
    description: 'Prisma where with Number() conversion',
    fix: 'Pass UUID string directly'
  }
];

// Files/directories to skip
const SKIP_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  '__tests__',
  'test',
  '.next',
  'coverage'
];

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => filePath.includes(pattern));
}

function scanFile(filePath) {
  const issues = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const patternConfig of PROBLEMATIC_PATTERNS) {
      lines.forEach((line, lineNum) => {
        const matches = line.match(patternConfig.pattern);
        if (matches) {
          issues.push({
            file: filePath.replace(BACKEND_DIR, 'my-backend'),
            line: lineNum + 1,
            pattern: patternConfig.description,
            fix: patternConfig.fix,
            code: line.trim().substring(0, 100)
          });
        }
      });
    }
  } catch {
    // Ignore read errors
  }
  
  return issues;
}

function scanDirectory(dir) {
  let allIssues = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (shouldSkip(fullPath)) continue;
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        allIssues = allIssues.concat(scanDirectory(fullPath));
      } else if (item.endsWith('.js') || item.endsWith('.ts')) {
        const fileIssues = scanFile(fullPath);
        allIssues = allIssues.concat(fileIssues);
      }
    }
  } catch {
    // Ignore directory access errors
  }
  
  return allIssues;
}

function main() {
  console.log('='.repeat(80));
  console.log('UUID CODE MIGRATION SCANNER');
  console.log('='.repeat(80));
  console.log(`Scanning: ${BACKEND_DIR}`);
  console.log('');
  
  const issues = scanDirectory(BACKEND_DIR);
  
  // Group by file
  const byFile = {};
  for (const issue of issues) {
    if (!byFile[issue.file]) {
      byFile[issue.file] = [];
    }
    byFile[issue.file].push(issue);
  }
  
  // Output results
  console.log(`Found ${issues.length} potential issues in ${Object.keys(byFile).length} files:\n`);
  
  for (const [file, fileIssues] of Object.entries(byFile)) {
    console.log(`📄 ${file}`);
    for (const issue of fileIssues) {
      console.log(`   Line ${issue.line}: ${issue.pattern}`);
      console.log(`   Code: ${issue.code}`);
      console.log(`   Fix:  ${issue.fix}`);
      console.log('');
    }
  }
  
  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const byPattern = {};
  for (const issue of issues) {
    if (!byPattern[issue.pattern]) {
      byPattern[issue.pattern] = 0;
    }
    byPattern[issue.pattern]++;
  }
  
  for (const [pattern, count] of Object.entries(byPattern)) {
    console.log(`  ${count}x ${pattern}`);
  }
  
  console.log('');
  console.log('To fix these issues:');
  console.log('1. Import UUID helpers: const { ensureUUID } = require("./utils/uuid-helpers");');
  console.log('2. Replace parseInt(userId) with ensureUUID(userId)');
  console.log('3. Remove ::INTEGER casts from SQL queries');
  console.log('4. Update creator.username to use available fields');
  console.log('');
  
  // Save report
  const reportPath = path.join(__dirname, 'uuid-code-scan-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalIssues: issues.length,
    byFile,
    byPattern
  }, null, 2));
  console.log(`Report saved to: ${reportPath}`);
}

main();
