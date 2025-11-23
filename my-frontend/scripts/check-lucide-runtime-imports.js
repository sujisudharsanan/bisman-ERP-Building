const fs = require('fs');
const path = require('path');
const glob = require('glob');

const lucide = require('lucide-react');
const lucideKeys = new Set(Object.keys(lucide));

function findAllFiles() {
  return glob.sync('src/**/*.{ts,tsx,js,jsx}');
}

function reportInvalid() {
  const files = findAllFiles();
  const problems = [];

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    let idx = 0;
    while (true) {
      const fromPos = src.indexOf("from 'lucide-react'", idx);
      if (fromPos === -1) break;
      // find the 'import' token before fromPos
      const importPos = src.lastIndexOf('import', fromPos);
      if (importPos === -1) { idx = fromPos + 1; continue; }
      const between = src.substring(importPos, fromPos + "from 'lucide-react'".length + 1);
      // If it's a type-only import (import type ...), skip
      const importTypeMatch = /^\s*import\s+type\b/.test(between);
      if (importTypeMatch) { idx = fromPos + 1; continue; }
      // Find opening brace '{' after 'import'
      const braceOpen = src.indexOf('{', importPos);
      if (braceOpen === -1 || braceOpen > fromPos) { idx = fromPos + 1; continue; }
      // find matching closing brace
      let i = braceOpen + 1, depth = 1;
      while (i < fromPos && depth > 0) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') depth--;
        i++;
      }
      if (depth !== 0) { idx = fromPos + 1; continue; }
      const braceClose = i - 1;
      const inside = src.substring(braceOpen + 1, braceClose);
      const names = inside.split(',').map(s=>s.trim()).filter(Boolean);
      for (let name of names) {
        // remove 'type' tokens inside braces and 'as' aliases
        name = name.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
        // remove inline comments
        name = name.replace(/\/\*.*?\*\//g,'').replace(/\/\/.*$/g,'').trim();
        if (!name) continue;
        if (!lucideKeys.has(name)) {
          problems.push({file, name});
        }
      }
      idx = fromPos + 1;
    }
  }

  return problems;
}

const problems = reportInvalid();
if (problems.length === 0) {
  console.log('No invalid runtime lucide imports found.');
  process.exit(0);
}
console.log('Invalid runtime lucide imports found:', problems.length);
for (const p of problems) console.log(`${p.file}: ${p.name}`);
process.exit(1);
