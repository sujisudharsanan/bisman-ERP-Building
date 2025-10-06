#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND_SRC = path.join(ROOT, 'my-frontend', 'src');
const FRONTEND_APP = path.join(ROOT, 'my-frontend', 'app');

function collectFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...collectFiles(full));
    else if (e.isFile() && /\.(js|jsx|ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

function tryResolveImport(baseDir, importPath) {
  // importPath starts with '@/components'
  const rel = importPath.replace(/^@\//, '');
  // Map '@/components/..' -> my-frontend/src/components/..
  const candidate = path.join(ROOT, 'my-frontend', 'src', rel);
  const exts = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js', ''];
  for (const e of exts) {
    const p = candidate + e;
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function parseExports(file) {
  const src = fs.readFileSync(file, 'utf8');
  const exports = { default: false, names: new Set() };
  if (/export\s+default/.test(src)) exports.default = true;
  // find `export const NAME`, `export function NAME`, `export class NAME` and `export { A, B as C }`
  const re1 = /export\s+(?:const|let|var|function|class)\s+([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re1.exec(src))) exports.names.add(m[1]);
  const re2 = /export\s*\{([^}]+)\}/g;
  while ((m = re2.exec(src))) {
    const list = m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
    for (const n of list) if (n) exports.names.add(n);
  }
  return exports;
}

function parseImportLine(line) {
  // crude parser: supports `import X from '...';` and `import {A, B} from '...';` and `import X, {A} from '...';`
  const re = /import\s+([^;]+)\s+from\s+['"]([^'"]+)['"]/;
  const m = re.exec(line);
  if (!m) return null;
  const spec = m[1].trim();
  const from = m[2].trim();
  const result = { default: null, named: [], raw: spec, from };
  if (spec.startsWith('{')) {
    // named only
    const names = spec.replace(/^{|}$/g, '').split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    result.named = names;
  } else if (spec.includes('{')) {
    // default and named
    const parts = spec.split('{');
    result.default = parts[0].trim().replace(/,$/, '');
    const names = parts[1].replace(/}$/,'').split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    result.named = names;
  } else {
    result.default = spec;
  }
  return result;
}

function run() {
  const files = [...collectFiles(FRONTEND_SRC), ...collectFiles(FRONTEND_APP)];
  const importLines = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import') && line.includes("'@/components") || line.includes('"@/components')) {
        const parsed = parseImportLine(line);
        if (parsed) importLines.push({ file: f, line: i+1, raw: line, parsed });
      }
    }
  }

  const issues = [];
  const fixes = [];

  for (const imp of importLines) {
    const from = imp.parsed.from;
    const resolved = tryResolveImport(path.dirname(imp.file), from);
    if (!resolved) {
      issues.push({ type: 'missing-file', import: imp, note: `Cannot resolve ${from}` });
      continue;
    }
    const exports = parseExports(resolved);
    // check default
    if (imp.parsed.default) {
      if (!exports.default && !exports.names.has(imp.parsed.default)) {
        issues.push({ type: 'default-missing', import: imp, target: resolved, note: `Imported default '${imp.parsed.default}' but target has no default export` });
        // if target has a named export with same name, suggest change
        if (exports.names.has(imp.parsed.default)) {
          fixes.push({ kind: 'change-to-named', import: imp, target: resolved, suggest: `import { ${imp.parsed.default} } from '${from}';` });
        }
      }
    }
    if (imp.parsed.named && imp.parsed.named.length) {
      for (const name of imp.parsed.named) {
        if (!exports.names.has(name) && !(exports.default && name === 'default')) {
          // if file has default and named import tries to import same as default name, suggest default import
          if (exports.default && exports.names.size === 0 && exports.default) {
            fixes.push({ kind: 'change-to-default', import: imp, target: resolved, suggest: `import ${name} from '${from}';` });
            issues.push({ type: 'named-missing', import: imp, target: resolved, note: `Named import '${name}' not found in target; target exports default only` });
          } else {
            issues.push({ type: 'named-missing', import: imp, target: resolved, note: `Named import '${name}' not found in target` });
          }
        }
      }
    }
  }

  // Print results
  console.log('\n=== Import/export check report ===\n');
  if (issues.length === 0) console.log('✅ No mismatches found');
  else {
    for (const it of issues) {
      const f = it.import.file;
      console.log(`⚠️ ${it.type} — ${path.relative(ROOT, f)}:${it.import.line}  -> ${it.note}`);
      console.log(`   import: ${it.import.raw}`);
      if (it.target) console.log(`   target: ${path.relative(ROOT, it.target)}`);
      console.log('');
    }
  }

  if (fixes.length) {
    console.log('\nSuggested fixes:');
    for (const fx of fixes) {
      const f = fx.import.file;
      console.log(`🔧 ${path.relative(ROOT, f)}:${fx.import.line}  => ${fx.suggest}  (target: ${path.relative(ROOT, fx.target)})`);
    }
  }

  process.exit(0);
}

run();
