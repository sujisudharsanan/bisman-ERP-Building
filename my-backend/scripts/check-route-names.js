#!/usr/bin/env node
/**
 * Checks that route files and mount prefixes map cleanly to module slugs.
 * - Warns on mismatches (e.g., superAdmin.js vs super-admin)
 * - No writes; process exit 0 with summary
 */
const fs = require('fs');
const path = require('path');

function kebab(s) { return s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[_\s]+/g,'-').toLowerCase(); }

function main() {
  const routesDir = path.join(__dirname, '..', 'routes');
  const files = fs.readdirSync(routesDir).filter(f=>f.endsWith('.js'));
  const warnings = [];

  for (const f of files) {
    if (f === 'superAdmin.js') warnings.push(`File ${f} should be named super-admin.js for consistency`);
    if (f.startsWith('enterpriseAdmin')) warnings.push(`File ${f} should use enterprise-admin* naming`);
  }

  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
  const re = /app\.use\(\s*['\"](\/api[^'\"]*)['\"]/g;
  let m; while ((m = re.exec(appJs))) {
    const p = m[1];
    const seg = p.split('/').filter(Boolean)[1] || '';
    if (seg && seg !== kebab(seg)) warnings.push(`Path segment should be kebab-case: ${p}`);
  }

  if (warnings.length) {
    console.log('Route naming warnings:');
    for (const w of warnings) console.log(' -', w);
  } else {
    console.log('Route naming check passed.');
  }
}

main();
