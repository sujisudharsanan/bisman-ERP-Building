import { test } from '@playwright/test';
import fs from 'fs';
const RUN_DIR = process.env.RUN_DIR || 'debug-artifacts/2025-10-07T09-55-40-580Z';
test.describe('auto routes', () => {
  test('admin', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push({type:msg.type(), text: msg.text()}));
    const responses = [];
    page.on('response', async resp => { try { responses.push({url: resp.url(), status: resp.status()}); } catch(e){} });
    await page.goto('http://localhost:3000/admin');
    await page.waitForTimeout(1000);
    fs.writeFileSync(RUN_DIR + '/admin-console.json', JSON.stringify(logs, null, 2));
    fs.writeFileSync(RUN_DIR + '/admin-responses.json', JSON.stringify(responses, null, 2));
  });
  test('dashboard', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push({type:msg.type(), text: msg.text()}));
    const responses = [];
    page.on('response', async resp => { try { responses.push({url: resp.url(), status: resp.status()}); } catch(e){} });
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(1000);
    fs.writeFileSync(RUN_DIR + '/dashboard-console.json', JSON.stringify(logs, null, 2));
    fs.writeFileSync(RUN_DIR + '/dashboard-responses.json', JSON.stringify(responses, null, 2));
  });
  test('hub-incharge', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push({type:msg.type(), text: msg.text()}));
    const responses = [];
    page.on('response', async resp => { try { responses.push({url: resp.url(), status: resp.status()}); } catch(e){} });
    await page.goto('http://localhost:3000/hub-incharge');
    await page.waitForTimeout(1000);
    fs.writeFileSync(RUN_DIR + '/hub-incharge-console.json', JSON.stringify(logs, null, 2));
    fs.writeFileSync(RUN_DIR + '/hub-incharge-responses.json', JSON.stringify(responses, null, 2));
  });
  test('manager', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push({type:msg.type(), text: msg.text()}));
    const responses = [];
    page.on('response', async resp => { try { responses.push({url: resp.url(), status: resp.status()}); } catch(e){} });
    await page.goto('http://localhost:3000/manager');
    await page.waitForTimeout(1000);
    fs.writeFileSync(RUN_DIR + '/manager-console.json', JSON.stringify(logs, null, 2));
    fs.writeFileSync(RUN_DIR + '/manager-responses.json', JSON.stringify(responses, null, 2));
  });
  test('super-admin', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push({type:msg.type(), text: msg.text()}));
    const responses = [];
    page.on('response', async resp => { try { responses.push({url: resp.url(), status: resp.status()}); } catch(e){} });
    await page.goto('http://localhost:3000/super-admin');
    await page.waitForTimeout(1000);
    fs.writeFileSync(RUN_DIR + '/super-admin-console.json', JSON.stringify(logs, null, 2));
    fs.writeFileSync(RUN_DIR + '/super-admin-responses.json', JSON.stringify(responses, null, 2));
  });
});