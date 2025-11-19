#!/usr/bin/env node
/**
 * Creates a routes manifest from Express router files and logs summary.
 * Non-destructive: does not write DB by default (future extension can upsert rbac_routes).
 */
const fs = require('fs');
const path = require('path');

function countEndpointsFor(filePath) {
  const src = fs.readFileSync(filePath, 'utf-8');
  const matches = src.match(/router\.(get|post|put|delete|patch)\s*\(/g) || [];
  return matches.length;
}

function guessModuleFromFile(file) {
  if (/^enterpriseAdmin/.test(file)) return 'enterprise-admin';
  if (file === 'enterprise.js') return 'enterprise';
  if (file === 'superAdmin.js') return 'super-admin';
  if (file === 'auth.js') return 'auth';
  if (file === 'system.js') return 'system';
  if (file === 'securityRoutes.js') return 'security';
  if (file === 'reportsRoutes.js') return 'reports';
  if (['permissionsRoutes.js','permissions.js'].includes(file)) return 'permissions';
  if (file === 'privilegeRoutes.js') return 'privileges';
  if (file === 'calendar.js') return 'calendar';
  if (file === 'taskRoutes.js') return 'tasks';
  if (file === 'approverRoutes.js') return 'approvers';
  if (file === 'upload.js') return 'upload';
  if (file === 'pagesRoutes.js') return 'pages';
  if (file === 'aiRoute.js') return 'ai';
  if (file === 'aiAnalyticsRoute.js') return 'ai-analytics';
  if (['ultimate-chat.js','unified-chat.js'].includes(file)) return 'chat';
  if (file === 'userReport.js') return 'user-report';
  return 'misc';
}

function main() {
  const routesDir = path.join(__dirname, '..', 'routes');
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  const summary = [];
  const moduleTotals = {};

  for (const f of files) {
    const p = path.join(routesDir, f);
    const count = countEndpointsFor(p);
    const mod = guessModuleFromFile(f);
    summary.push({ file: f, module: mod, endpoints: count });
    moduleTotals[mod] = (moduleTotals[mod] || 0) + count;
  }

  // Write manifest for later use
  const outDir = path.join(__dirname, '..', 'registry');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'routes-manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary, moduleTotals }, null, 2));

  // Console report
  console.log('Route endpoints per file (top 15):');
  summary.sort((a,b) => b.endpoints - a.endpoints).slice(0,15).forEach(r => console.log(`${r.endpoints.toString().padStart(3,' ')} ${r.file} [${r.module}]`));
  console.log('\nBy module group:');
  Object.entries(moduleTotals).sort((a,b)=>b[1]-a[1]).forEach(([m,c]) => console.log(`${m} ${c}`));
}

main();
