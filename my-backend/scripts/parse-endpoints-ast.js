#!/usr/bin/env node
/**
 * AST-based endpoint extraction for higher accuracy.
 * - Parses each route file with @babel/parser
 * - Detects router.<method>(path, ...handlers)
 * - Captures dynamic params list and canonical path (/api/users/:id -> /api/users/:param)
 * - Outputs JSON summary to registry/endpoints-detailed.json
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROUTES_DIR = path.join(__dirname, '..', 'routes');
const APP_JS = path.join(__dirname, '..', 'app.js');
const OUT_FILE = path.join(__dirname, '..', 'registry', 'endpoints-detailed.json');

function normalizeName(s) {
  const noExt = s.replace(/\.js$/i, '');
  return noExt.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function loadMountMap(appJsSource) {
  const map = {}; // normalized file key -> base path
  // direct requires like app.use('/api/x', require('./routes/fileName'))
  const directRegex = /app\.use\(\s*['\"](\/api[^'\"]*)['\"],\s*require\(['\"]\.\/routes\/([^'\"]+)['\"]\)\)/g;
  let m;
  while ((m = directRegex.exec(appJsSource))) {
    const key = normalizeName(m[2]);
    map[key] = m[1].replace(/\/$/, '');
  }
  // variable requires: const X = require('./routes/fileName'); app.use('/api/x', X)
  const varReq = /const\s+(\w+)\s*=\s*require\(['\"]\.\/routes\/([^'\"]+)['\"]\)/g;
  const varMap = {};
  while ((m = varReq.exec(appJsSource))) { varMap[m[1]] = normalizeName(m[2]); }
  const varUse = /app\.use\(\s*['\"](\/api[^'\"]*)['\"]\s*,\s*(\w+)\s*\)/g;
  while ((m = varUse.exec(appJsSource))) {
    const key = varMap[m[2]];
    if (key) map[key] = m[1].replace(/\/$/, '');
  }
  return map;
}

function canonicalize(base, rawPath) {
  const full = path.posix.join(base, rawPath).replace(/\\+/g,'/');
  const params = [];
  const canonical = full.split('/').map(seg => {
    if (seg.startsWith(':')) { params.push(seg.slice(1)); return ':param'; }
    return seg;
  }).join('/');
  return { full, canonical, params };
}

function parseFile(filePath, basePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx','typescript'] });
  const endpoints = [];
  traverse(ast, {
    CallExpression(pathNode) {
      const callee = pathNode.node.callee;
      if (!callee) return;
      // Direct router.METHOD('/x') pattern
      if (callee.type === 'MemberExpression') {
        const obj = callee.object;
        const prop = callee.property;
        if (obj && obj.type === 'Identifier' && obj.name === 'router' && prop && prop.type === 'Identifier' && ['get','post','put','delete','patch'].includes(prop.name)) {
          const args = pathNode.node.arguments;
          if (!args.length) return;
          const first = args[0];
          if (first.type === 'StringLiteral') {
            const rawPath = first.value.replace(/\/$/, '');
            const { full, canonical, params } = canonicalize(basePath, rawPath);
            endpoints.push({ method: prop.name.toUpperCase(), path: full, canonical_path: canonical, params, handler_count: args.length - 1, middleware_count: Math.max(args.length - 2, 0) });
          }
        }
      }
      // Chained router.route('/x').get().post() pattern: detect initial router.route then walk chain
      if (callee.type === 'MemberExpression' && callee.property && callee.property.type === 'Identifier' && callee.property.name === 'route') {
        // initial route('/x') call arguments
        const args = pathNode.node.arguments;
        if (!args.length) return;
        const first = args[0];
        if (first.type !== 'StringLiteral') return;
        const baseRawPath = first.value.replace(/\/$/, '');
        const { full, canonical, params } = canonicalize(basePath, baseRawPath);
        // Collect subsequent chained calls on the returned expression
        let chainNode = pathNode.parentPath; // expect MemberExpression .get().post()
        while (chainNode && chainNode.node && chainNode.node.type === 'CallExpression') {
          const member = chainNode.node.callee;
          if (member && member.type === 'MemberExpression') {
            const mProp = member.property;
            if (mProp && mProp.type === 'Identifier' && ['get','post','put','delete','patch'].includes(mProp.name)) {
              const mArgs = chainNode.node.arguments;
              endpoints.push({ method: mProp.name.toUpperCase(), path: full, canonical_path: canonical, params, handler_count: mArgs.length, middleware_count: Math.max(mArgs.length - 1, 0) });
            }
            chainNode = chainNode.parentPath;
            continue;
          }
          break;
        }
      }
    }
  });
  return endpoints;
}

function main() {
  const appJsSource = fs.readFileSync(APP_JS, 'utf-8');
  const mountMap = loadMountMap(appJsSource);
  const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));
  const all = [];
  for (const f of files) {
    const key = normalizeName(f);
    const base = mountMap[key];
    if (!base) continue; // skip unmounted
    const endpoints = parseFile(path.join(ROUTES_DIR, f), base);
    for (const ep of endpoints) all.push({ file: f, ...ep });
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify({ generated_at: new Date().toISOString(), count: all.length, endpoints: all }, null, 2));
  console.log(`AST endpoint parse complete. endpoints=${all.length}`);
}

main();