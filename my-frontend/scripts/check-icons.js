// Scans page-registry.ts for icon usages and compares to imported icon names
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'common', 'config', 'page-registry.ts');
const src = fs.readFileSync(file, 'utf8');

// Find import block from lucide-react
const importRegex = /import[\s\S]*?\{([\s\S]*?)\}[\s\S]*?from\s+['"]lucide-react['"]/m;
const match = src.match(importRegex);
const imported = new Set();
if (match) {
  const body = match[1];
  body.split(',').forEach(s => {
    const name = s.trim().split(/\sas\s/)[0].trim();
    if (name) imported.add(name);
  });
}

// Find all icon: <Identifier>, occurrences
const iconRegex = /icon:\s*([A-Za-z0-9_$]+)\s*,/g;
let m;
const used = new Set();
while ((m = iconRegex.exec(src)) !== null) {
  used.add(m[1]);
}

const missing = [];
for (const u of used) {
  if (!imported.has(u)) missing.push(u);
}

console.log('Imported icons count:', imported.size);
console.log('Used icons count:', used.size);
if (missing.length === 0) {
  console.log('No missing icon imports detected.');
  process.exit(0);
}
console.log('Missing icon imports:');
missing.forEach(x => console.log('-', x));
process.exit(2);
