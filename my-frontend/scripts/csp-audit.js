#!/usr/bin/env node
/**
 * Simple CSP audit script: scans src for inline <script> tags or style attributes.
 */
const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, results); else results.push(full);
  }
  return results;
}

const root = path.join(process.cwd(), 'src');
const files = walk(root).filter(f => /\.(tsx?|jsx?)$/.test(f));
let issues = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('<script>')) issues.push({ file, type: 'inline-script' });
  if (/style={{[^}]+}}/m.test(content)) issues.push({ file, type: 'inline-style-prop' });
}

if (issues.length === 0) {
  console.log('CSP Audit: No inline scripts/styles detected.');
  process.exit(0);
}
console.log('CSP Audit: Potential inline usage detected:');
for (const issue of issues) {
  console.log(` - ${issue.type} in ${issue.file}`);
}
process.exit(issues.length ? 1 : 0);
