/*
Simple import casing checker
Scans .ts/.tsx/.js/.jsx files under src and compares relative and alias imports ("@/") to filesystem paths to detect case mismatches.
Run: node scripts/check-import-casing.js
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const exts = ['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs'];

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      // skip node_modules
      if (file === 'node_modules' || file === '.next') continue;
      walk(full, filelist);
    } else if (exts.includes(path.extname(full))) {
      filelist.push(full);
    }
  }
  return filelist;
}

function resolveAlias(importPath) {
  if (importPath.startsWith('@/')) {
    return path.join(SRC, importPath.slice(2));
  }
  return null;
}

function fileExistsWithCase(filePath) {
  try {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const entries = fs.readdirSync(dir);
    return entries.includes(base);
  } catch (e) {
    return false;
  }
}

function findActualCase(filePath) {
  const parts = filePath.split(path.sep);
  const built = [];
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (i === 0 && seg === '') { built.push(''); continue; }
    const cur = path.join(...built, seg);
    const dir = path.dirname(cur) || '.';
    const name = path.basename(cur);
    try {
      const items = fs.readdirSync(dir);
      const match = items.find(x => x.toLowerCase() === name.toLowerCase());
      if (!match) return null;
      built.push(match);
    } catch (e) {
      return null;
    }
  }
  return path.join(...built);
}

const files = walk(SRC);
const importRegex = /from\s+['\"]([^'\"]+)['\"];?|require\(['\"]([^'\"]+)['\"]\)/g;
const mismatches = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = importRegex.exec(src)) !== null) {
    const imp = m[1] || m[2];
    if (!imp) continue;
    // Only check relative or alias imports
    if (imp.startsWith('.') || imp.startsWith('@/')) {
      let resolved;
      if (imp.startsWith('@/')) {
        resolved = resolveAlias(imp);
      } else {
        resolved = path.resolve(path.dirname(f), imp);
      }

      // Try with extensions
      let found = null;
      for (const ext of exts) {
        const candidate = resolved.endsWith(ext) ? resolved : resolved + ext;
        if (fs.existsSync(candidate)) { found = candidate; break; }
      }
      // If not found, maybe it's a directory index
      if (!found) {
        for (const ext of exts) {
          const candidate = path.join(resolved, 'index' + ext);
          if (fs.existsSync(candidate)) { found = candidate; break; }
        }
      }
      if (!found) continue; // skip unresolved imports

      const actual = findActualCase(found);
      if (!actual) continue;
      // Normalize
      const normFound = path.normalize(found);
      const normActual = path.normalize(actual);
      if (normFound !== normActual) {
        mismatches.push({ file: f, import: imp, expected: normFound, actual: normActual });
      }
    }
  }
}

if (mismatches.length === 0) {
  console.log('No import casing mismatches found.');
  process.exit(0);
}

console.log('Found import casing mismatches:');
for (const mm of mismatches) {
  console.log(`- In ${path.relative(ROOT, mm.file)} import '${mm.import}' -> expected '${path.relative(ROOT, mm.expected)}' but actual path '${path.relative(ROOT, mm.actual)}'`);
}
process.exit(2);
