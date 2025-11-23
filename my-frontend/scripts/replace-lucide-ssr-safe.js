#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, filelist);
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      filelist.push(filepath);
    }
  });
  return filelist;
}

const files = walk(path.join(root, 'src'));
let changed = 0;
files.forEach((file) => {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes("from 'lucide-react'")) return;

  // Check if file is a client component (has 'use client' at top)
  const firstLines = src.split(/\n/).slice(0, 6).join('\n');
  if (/^\s*['\"]use client['\"]\s*;?/m.test(firstLines)) {
    // skip client files
    return;
  }

  // Replace only non-type imports: import { A, B } from 'lucide-react';
  const newSrc = src.replace(/import\s+\{([\s\S]*?)\}\s+from\s+'lucide-react';?/g, (m, group) => {
    // Avoid changing 'import type' lines
    if (/import\s+type/.test(m)) return m;
    return `import {${group}} from '@/lib/ssr-safe-icons';`;
  });

  if (newSrc !== src) {
    fs.writeFileSync(file, newSrc, 'utf8');
    changed++;
    console.log('Patched', file);
  }
});

console.log(`Done. Patched ${changed} files.`);
