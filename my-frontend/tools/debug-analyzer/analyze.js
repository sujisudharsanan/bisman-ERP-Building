#!/usr/bin/env node
/**
 * Basic analyzer: scans debug-artifacts/<run>/test-results for videos/logs and produces a report and suggested.patch
 */
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const runDir = argv.run || fs.existsSync('debug-artifacts') && fs.readdirSync('debug-artifacts').sort().pop() && path.join('debug-artifacts', fs.readdirSync('debug-artifacts').sort().pop()) || null;
if (!runDir) {
  console.error('No run directory found. Pass --run debug-artifacts/<ts>');
  process.exit(2);
}

console.log('Analyzing run directory', runDir);

const reportDir = path.join(runDir, 'reports');
fs.mkdirSync(reportDir, { recursive: true });

// Read per-route artifacts (console + responses) in runDir
const artifacts = fs.readdirSync(runDir).filter(f => f.endsWith('-console.json') || f.endsWith('-responses.json'));
const modules = {};
for (const a of artifacts) {
  const m = a.replace(/-(console|responses)\.json$/, '');
  modules[m] = modules[m] || { console: [], responses: [] };
  try {
    const content = fs.readFileSync(path.join(runDir, a), 'utf8');
    if (a.endsWith('-console.json')) modules[m].console = JSON.parse(content);
    if (a.endsWith('-responses.json')) modules[m].responses = JSON.parse(content);
  } catch (e) {}
}

const summary = { ts: new Date().toISOString(), modules: {} };

for (const mod of Object.keys(modules)) {
  const data = modules[mod];
  const consoleErrors = data.console.filter(c => c.type === 'error' || /error|uncaught|exception|react/i.test(c.text));
  const respErrors = data.responses.filter(r => r.status >= 400);
  summary.modules[mod] = { consoleErrorsCount: consoleErrors.length, respErrorsCount: respErrors.length };

  // Map response errors to backend files (best-effort): build a route index from backend sources
  function buildBackendRouteIndex() {
    const projectRoot = path.resolve(process.cwd(), '..'); // assume my-backend is adjacent to my-frontend
    const backendDirs = [path.join(projectRoot, 'my-backend'), path.join(projectRoot, 'apps', 'api')];
    const routeIndex = {};

    // First, prefer runtime dump if available
    try {
      const runtimeDump = path.join(projectRoot, 'my-backend', 'debug-routes.json');
      if (fs.existsSync(runtimeDump)) {
        const data = JSON.parse(fs.readFileSync(runtimeDump, 'utf8'));
        for (const r of data) {
          if (r.path && r.path.startsWith('/api')) {
            routeIndex[r.path] = routeIndex[r.path] || new Set();
            routeIndex[r.path].add(runtimeDump + ':' + (r.file || 'runtime'));
          }
        }
        // convert and return
        for (const k of Object.keys(routeIndex)) routeIndex[k] = Array.from(routeIndex[k]);
        return routeIndex;
      }
    } catch (e) {}

    // Fallback: AST extraction using acorn (if installed)
    let acorn = null;
    try { acorn = require('acorn'); } catch (e) { acorn = null; }

    for (const bd of backendDirs) {
      if (!fs.existsSync(bd)) continue;
      const walk = (dir) => {
        for (const name of fs.readdirSync(dir)) {
          const p = path.join(dir, name);
          try {
            if (fs.statSync(p).isDirectory()) { walk(p); continue; }
            if (!/\.(js|ts|jsx|tsx)$/.test(p)) continue;
            const src = fs.readFileSync(p, 'utf8');
                    if (acorn) {
                      try {
                        const acornWalk = require('acorn-walk');
                        const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
                        // Track router variable names to resolve mounts
                        const routers = new Set();
                        acornWalk.simple(ast, {
                          VariableDeclarator(node) {
                            if (node.init && node.init.type === 'CallExpression' && node.init.callee && node.init.callee.name === 'Router') {
                              if (node.id && node.id.name) routers.add(node.id.name);
                            }
                          },
                          AssignmentExpression(node) {
                            // capture express.Router() assigned to a property
                            try {
                              if (node.right && node.right.type === 'CallExpression' && node.right.callee && node.right.callee.object && node.right.callee.property && node.right.callee.property.name === 'Router') {
                                if (node.left && node.left.type === 'Identifier') routers.add(node.left.name);
                              }
                            } catch (e) {}
                          }
                        });

                        acornWalk.simple(ast, {
                          CallExpression(node) {
                            try {
                              const callee = node.callee;
                              let objectName = null;
                              let methodName = null;
                              if (callee.type === 'MemberExpression') {
                                if (callee.object) {
                                  if (callee.object.type === 'Identifier') objectName = callee.object.name;
                                  else if (callee.object.type === 'MemberExpression' && callee.object.property) objectName = callee.object.property.name;
                                }
                                if (callee.property && callee.property.name) methodName = callee.property.name;
                              }
                              if (!methodName) return;
                              if (!['get','post','put','delete','use','patch'].includes(methodName)) return;
                              const arg0 = node.arguments && node.arguments[0];
                              if (!arg0) return;
                              // Only process literal route strings
                              if (arg0.type === 'Literal' || arg0.type === 'StringLiteral') {
                                const route = arg0.value;
                                if (route && route.startsWith('/api')) {
                                  routeIndex[route] = routeIndex[route] || new Set();
                                  routeIndex[route].add(p);
                                }
                              }
                              // If method is 'use' and first arg is a literal path, note mount point
                              if (methodName === 'use' && (arg0.type === 'Literal' || arg0.type === 'StringLiteral')) {
                                const mount = arg0.value;
                                // If subsequent args reference a Router identifier, try to map that router's file to the mounted path
                                for (let i = 1; i < node.arguments.length; i++) {
                                  const a = node.arguments[i];
                                  if (a.type === 'Identifier' && routers.has(a.name)) {
                                    // record mount mapping as mount -> file
                                    const mountedRoute = (mount && mount.startsWith('/api')) ? mount : null;
                                    if (mountedRoute) {
                                      routeIndex[mountedRoute] = routeIndex[mountedRoute] || new Set();
                                      routeIndex[mountedRoute].add(p + ' (mount)');
                                    }
                                  }
                                }
                              }
                            } catch (e) {}
                          }
                        });
                      } catch (e) {
                        // fallback to regex below
                      }
                    }
            // regex fallback (previous approach)
            const re = /(?:app|router)\.(get|post|put|delete|use|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
            let m;
            while ((m = re.exec(src)) !== null) {
              const route = m[2];
              if (route && route.startsWith('/api')) {
                routeIndex[route] = routeIndex[route] || new Set();
                routeIndex[route].add(p);
              }
            }
          } catch (e) {
            // ignore
          }
        }
      };
      walk(bd);
    }
    // convert sets to arrays
    for (const k of Object.keys(routeIndex)) routeIndex[k] = Array.from(routeIndex[k]);
    return routeIndex;
  }

  const routeIndex = buildBackendRouteIndex();

  // For each response error, try to find matching backend route file(s)
  const respErrorsWithFiles = respErrors.map(r => {
    try {
      const u = new URL(r.url);
      const pth = u.pathname;
      // exact match or longest-prefix match
      let matched = [];
      if (routeIndex[pth]) matched = matched.concat(routeIndex[pth]);
      // prefix matches
      for (const route of Object.keys(routeIndex)) {
        if (route !== pth && pth.startsWith(route)) matched = matched.concat(routeIndex[route]);
      }
      // dedupe
      matched = Array.from(new Set(matched));
      return Object.assign({}, r, { probableFiles: matched });
    } catch (e) {
      return Object.assign({}, r, { probableFiles: [] });
    }
  });

  // create per-module HTML report
  const rep = `<!doctype html><html><head><meta charset="utf-8"><title>${mod} report</title></head><body><h1>Report: ${mod}</h1><h2>Console errors</h2><pre>${JSON.stringify(consoleErrors, null, 2)}</pre><h2>Response errors</h2><pre>${JSON.stringify(respErrorsWithFiles, null, 2)}</pre></body></html>`;
  fs.writeFileSync(path.join(reportDir, `${mod}-report.html`), rep);
}

// Summary report
  // DB / API health check: call /api/db-test on backend base URL
  function checkDbHealth() {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const url = `${base}/api/db-test`;
    try {
      const out = require('child_process').execSync(`curl -s -o /dev/null -w '%{http_code} %{time_total}' -m 5 ${url}`,{timeout:7000}).toString().trim();
      const parts = out.split(/\s+/);
      const status = parseInt(parts[0],10) || 0;
      const time = parseFloat(parts[1]) || 0;
      return { url, status, time };
    } catch (e) {
      return { url, status: 0, time: 0, error: (e && e.message) || 'timeout' };
    }
  }

  function detectPrismaPresence() {
    const root = process.cwd();
    const prismaPath = path.join(root, 'prisma');
    const backendPrisma = path.join(root, '..', 'my-backend', 'prisma');
    return {
      prismaFolder: fs.existsSync(prismaPath),
      backendPrismaFolder: fs.existsSync(backendPrisma),
    };
  }

  const dbHealth = checkDbHealth();
  const prismaPresence = detectPrismaPresence();

  summary.dbHealth = dbHealth;
  summary.prismaPresence = prismaPresence;

  fs.writeFileSync(path.join(reportDir, 'summary-report.html'), `<!doctype html><html><head><meta charset="utf-8"><title>Summary report</title></head><body><h1>Summary</h1><pre>${JSON.stringify(summary, null, 2)}</pre></body></html>`);

// Basic suggested patches for modules with issues
const suggested = [];
for (const mod of Object.keys(summary.modules)) {
  const m = summary.modules[mod];
  if (m.consoleErrorsCount > 0) {
    suggested.push({ module: mod, reason: 'console errors detected', patch: `/* Review ${mod} console logs and stack traces. */` });
  }
  if (m.respErrorsCount > 0) {
    suggested.push({ module: mod, reason: 'response errors (4xx/5xx)', patch: `/* Check API calls referenced in ${mod} and backend handlers. */` });
  }
}

if (suggested.length) {
  fs.writeFileSync(path.join(runDir, 'suggested.patch'), JSON.stringify(suggested, null, 2));
  console.log('Wrote suggested.patch');
}

console.log('Analysis complete. Reports in', reportDir);
