const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'common', 'config', 'page-registry.ts');
const src = fs.readFileSync(file, 'utf8');
const importRegex = /import[\s\S]*?\{([\s\S]*?)\}[\s\S]*?from\s+['"]lucide-react['"]/m;
const match = src.match(importRegex);
if (!match) {
  console.log('NO_MATCH');
  process.exit(0);
}
const body = match[1];
console.log('===IMPORT_BODY_START===');
console.log(body);
console.log('===IMPORT_BODY_END===');
console.log('---PARSED_ITEMS---');
const items = body.split(',').map(s=>s.trim()).filter(Boolean);
console.log(items.length);
console.log(items.slice(0,300));
