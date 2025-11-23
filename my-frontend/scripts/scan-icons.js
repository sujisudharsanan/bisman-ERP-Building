const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/common/config/page-registry.ts');
const src = fs.readFileSync(file, 'utf8');

// Extract imported lucide names
const importMatch = src.match(/import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"]/);
const imported = new Set();
if(importMatch){
  importMatch[1].split(',').map(s=>s.trim()).filter(Boolean).forEach(name=>{
    // remove type annotations like 'type LucideIcon' or trailing comments
    const clean = name.split('//')[0].split(' as ')[0].trim();
    if(!clean.startsWith('type') && clean) imported.add(clean);
  });
}

// Find all icon: <Identifier> occurrences
const iconRegex = /icon\s*:\s*([A-Za-z0-9_]+)\s*,/g;
const used = new Set();
let m;
while((m = iconRegex.exec(src)) !== null){
  used.add(m[1]);
}

const missing = [];
for(const u of used){
  if(!imported.has(u)) missing.push(u);
}

console.log('Imported icons count:', imported.size);
console.log('Used icons count:', used.size);
if(missing.length){
  console.log('Missing imports for icons:', missing);
} else {
  console.log('All used icons are imported.');
}
