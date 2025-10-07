#!/usr/bin/env node
/**
 * apply.js - minimal helper to create a branch and apply a suggested patch file.
 * Usage: node tools/debug-analyzer/apply.js --patch=debug-artifacts/<run>/suggested.patch --branch=debug/fix-... --confirm
 */
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const { execSync } = require('child_process');

const patch = argv.patch;
const branch = argv.branch || `debug/fix-${Date.now()}`;
const confirm = !!argv.confirm;

if (!patch || !fs.existsSync(patch)) {
  console.error('Please provide --patch pointing to suggested.patch');
  process.exit(2);
}

console.log('Preparing to apply patch', patch, 'into branch', branch);

// Create branch
execSync(`git checkout -b ${branch}`);

const content = fs.readFileSync(patch, 'utf8');
console.log('Patch preview:\n', content.slice(0, 1000));

if (!confirm) {
  console.log('Dry-run: patch written to', patch, 'No changes applied. Re-run with --confirm to apply.');
  process.exit(0);
}

// Simple application: write patch contents to a file under .debug-patches and commit as guidance
const outDir = path.join(process.cwd(), '.debug-patches');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, path.basename(patch));
fs.copyFileSync(patch, outFile);

execSync(`git add ${outFile}`);
execSync(`git commit -m "chore(debug): add suggested patch ${path.basename(patch)} for review"`);

console.log('Patch added to branch', branch, 'as', outFile, '— please review and apply changes manually.');
