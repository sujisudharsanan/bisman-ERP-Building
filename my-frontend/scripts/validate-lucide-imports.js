const fs = require('fs');
const path = require('path');
const glob = require('glob');
const pkg = require('lucide-react');

const files = glob.sync('src/**/*.ts*', { nodir: true });
const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
const missing = new Map();
const allUsed = new Set();

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = importRegex.exec(src)) !== null) {
    const names = m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    for (const name of names) {
      allUsed.add(name);
      if (!Object.prototype.hasOwnProperty.call(pkg, name)) {
        missing.set(name, (missing.get(name) || []).concat(file));
      }
    }
  }
}

console.log('Total lucide imports found:', allUsed.size);
if (missing.size === 0) {
  console.log('No missing lucide exports detected.');
} else {
  console.log('Missing lucide exports:');
  for (const [name, files] of missing.entries()) {
    console.log('-', name, 'used in', files.length, 'file(s)');
    files.slice(0,5).forEach(f => console.log('   ', f));
  }
}
