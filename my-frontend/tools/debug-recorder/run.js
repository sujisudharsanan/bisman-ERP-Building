#!/usr/bin/env node
/**
 * Simple Playwright-based recorder wrapper.
 * Usage: node tools/debug-recorder/run.js --test=tests/playwright/login.spec.ts --out=debug-artifacts
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const argv = require('minimist')(process.argv.slice(2));

const outDir = argv.out || 'debug-artifacts';
const allFlag = argv.all || false;
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(outDir, ts);
fs.mkdirSync(runDir, { recursive: true });

console.log('Debug recorder starting. Artifacts will be written to', runDir);

// Load debug config if exists
let cfg = { targets: ['login'], capture: ['network', 'console', 'storage', 'screenshot'] };
const cfgPath = path.join(process.cwd(), 'debug.config.json');
if (fs.existsSync(cfgPath)) {
  try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (e) {}
}

// Auto-detect Next routes under src/app
function detectRoutes() {
  const routes = [];
  const appDir = path.join(process.cwd(), 'src', 'app');
  if (!fs.existsSync(appDir)) return routes;
  for (const name of fs.readdirSync(appDir)) {
    const p = path.join(appDir, name);
    if (!fs.statSync(p).isDirectory()) continue;
    // skip special folders
    if (name.startsWith('(') || name.startsWith('_')) continue;
    // if folder contains page.tsx or page.jsx
    const pageFiles = ['page.tsx','page.ts','page.jsx','page.js'];
    for (const pf of pageFiles) {
      if (fs.existsSync(path.join(p, pf))) {
        routes.push(`/${name}`);
        break;
      }
    }
  }
  return routes;
}

const routes = detectRoutes();
console.log('Detected routes:', routes.join(', '));

// Build a Playwright test that visits each route and records console/network into runDir
const autoTestDir = path.join(runDir, 'autotests');
fs.mkdirSync(autoTestDir, { recursive: true });
const autoSpec = path.join(autoTestDir, 'auto.spec.ts');
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const specLines = [];
specLines.push(`import { test } from '@playwright/test';`);
specLines.push(`import fs from 'fs';`);
specLines.push(`const RUN_DIR = process.env.RUN_DIR || '${runDir.replace(/\\/g,'/')}';`);
specLines.push(`test.describe('auto routes', () => {`);
for (const r of routes) {
  const routeName = r.replace(/^\//,'') || 'root';
  specLines.push(`  test('${routeName}', async ({ page }) => {`);
  specLines.push(`    const logs = [];`);
  specLines.push(`    page.on('console', msg => logs.push({type:msg.type(), text: msg.text()}));`);
  specLines.push(`    const responses = [];`);
  specLines.push(`    page.on('response', async resp => { try { responses.push({url: resp.url(), status: resp.status()}); } catch(e){} });`);
  specLines.push(`    await page.goto('${baseURL}${r}');`);
  specLines.push(`    await page.waitForTimeout(1000);`);
  specLines.push(`    fs.writeFileSync(RUN_DIR + '/${routeName}-console.json', JSON.stringify(logs, null, 2));`);
  specLines.push(`    fs.writeFileSync(RUN_DIR + '/${routeName}-responses.json', JSON.stringify(responses, null, 2));`);
  specLines.push(`  });`);
}
specLines.push(`});`);
fs.writeFileSync(autoSpec, specLines.join('\n'));

// Run the generated test using Playwright
const cmd = `npx playwright test ${autoSpec} --config=playwright.config.ts --reporter=list`;
try {
  console.log('Running:', cmd);
  execSync(cmd, { stdio: 'inherit', env: Object.assign({}, process.env, { RUN_DIR: runDir }) });

  // copy test-results if Playwright created them
  const tr = path.join(process.cwd(), 'test-results');
  if (fs.existsSync(tr)) {
    const dest = path.join(runDir, 'test-results');
    execSync(`cp -R ${tr} ${dest}`);
  }

  // write manifest
  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify({ ts: new Date().toISOString(), routes, cfg }, null, 2));

  console.log('Done. Artifacts at', runDir);
  process.exit(0);
} catch (err) {
  console.error('Recorder failed:', err && err.message || err);
  process.exit(2);
}
