// Heuristic scanner to find likely missing dark: variants
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'my-frontend');
const EXT = ['.tsx', '.ts', '.jsx', '.js', '.html'];
const LIGHT_TOKENS = [
  'bg-white',
  'text-gray-900',
  'text-gray-700',
  'border-gray-300',
  'placeholder-gray-400',
  'bg-gray-100',
  'shadow-md',
  'shadow-sm'
];

function walk(dir) {
  const results = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (['node_modules', '.git', '.next'].includes(name)) continue;
      results.push(...walk(p));
    } else {
      if (EXT.includes(path.extname(name))) results.push(p);
    }
  }
  return results;
}

function hasDarkVariant(line, token) {
  // Heuristic: check if the line includes any dark: occurrence
  if (line.includes('dark:')) return true;
  // or more precise: dark: same token
  if (line.includes(`dark:${token}`)) return true;
  return false;
}

function run() {
  const files = walk(ROOT);
  const report = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const token of LIGHT_TOKENS) {
        if (line.includes(token)) {
          if (!hasDarkVariant(line, token)) {
            report.push({ file: path.relative(ROOT, f), line: i + 1, token, snippet: line.trim() });
          }
        }
      }
    }
  }

  if (report.length === 0) {
    console.log('No obvious missing dark variants found.');
    return;
  }

  console.log('Potential missing dark variants (heuristic):');
  report.forEach(r => {
    console.log(`${r.file}:${r.line}  token=${r.token}`);
    console.log(`  ${r.snippet}`);
  });
  console.log(`Total findings: ${report.length}`);
}

run();
