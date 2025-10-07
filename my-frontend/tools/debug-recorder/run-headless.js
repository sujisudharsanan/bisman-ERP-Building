#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const playwright = require('playwright');

const RUN_DIR = process.env.RUN_DIR || path.join('debug-artifacts', new Date().toISOString());
fs.mkdirSync(RUN_DIR, { recursive: true });

const routes = [
  '/admin','/dashboard','/hub-incharge','/manager','/super-admin'
];

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const r of routes) {
    const logs = [];
    const responses = [];
    page.removeAllListeners('console');
    page.removeAllListeners('response');
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
    page.on('response', async resp => { try { responses.push({ url: resp.url(), status: resp.status() }); } catch (e) {} });
    try {
      await page.goto('http://localhost:3000' + r, { timeout: 10000 });
      await page.waitForTimeout(1000);
    } catch (e) {
      logs.push({ type: 'error', text: `navigation failed: ${e.message}` });
    }
    const safe = r.replace(/^\//, '').replace(/[^a-z0-9_-]/gi, '-');
    fs.writeFileSync(path.join(RUN_DIR, `${safe}-console.json`), JSON.stringify(logs, null, 2));
    fs.writeFileSync(path.join(RUN_DIR, `${safe}-responses.json`), JSON.stringify(responses, null, 2));
    console.log('wrote', safe);
  }
  await browser.close();
  console.log('done run-headless ->', RUN_DIR);
})();
