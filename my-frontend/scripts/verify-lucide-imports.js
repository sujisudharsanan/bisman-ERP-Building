const fs = require('fs');
const path = require('path');
const glob = require('glob');

const lucide = require('lucide-react');
const lucideKeys = new Set(Object.keys(lucide));

const matches = glob.sync('src/**/*.{ts,tsx,js,jsx}');
let problems = [];

for (const file of matches) {
  const text = fs.readFileSync(file, 'utf8');
  const regex = /import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"]/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const inside = m[1];
    const names = inside.split(',').map(s=>s.trim()).filter(Boolean);
    for (const name of names) {
      // strip "as" alias
      const [orig] = name.split(/\s+as\s+/);
      const clean = orig.replace(/\s+/g,'').replace(/;$|,$/,'');
      if (!lucideKeys.has(clean)) {
        problems.push({file, name: clean});
      }
    }
  }
}

if (problems.length===0) {
  console.log('All lucide imports valid.');
  process.exit(0);
}

console.log('Invalid lucide imports found:', problems.length);
for (const p of problems) {
  console.log(`${p.file}: ${p.name}`);
}
process.exit(1);
