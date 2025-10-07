import { test, expect } from '@playwright/test';
import fs from 'fs';

// Visual logout test: captures page errors and saves screenshots before/after logout

test('visual logout: capture page errors and screenshots', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', err => {
    console.log('PAGE_ERROR:', err.message);
    errors.push(err.message);
  });
  page.on('console', msg => {
    console.log('PAGE_CONSOLE:', msg.type(), msg.text());
  });

  await page.goto('http://localhost:3000/super-admin');

  // Set mock auth cookie and storage
  await context.addCookies([{ name: 'token', value: 'fake-token', domain: 'localhost', path: '/' }]);
  await page.evaluate(() => {
    try {
      localStorage.setItem('authToken', 'fake-token');
      sessionStorage.setItem('sessionKey', 'abc');
    } catch (e) {}
  });

  await page.reload();
  await page.waitForTimeout(500);

  // Screenshot before logout
  const beforePath = '/tmp/logout-before.png';
  await page.screenshot({ path: beforePath, fullPage: false });
  console.log('Saved before screenshot to', beforePath);

  // Try clicking logout
  const desktopLogout = page.locator('button[aria-label="Logout"]').first();
  if (await desktopLogout.count() > 0) {
    await desktopLogout.click();
  } else {
    const menu = page.locator('button[title="Menu"]').first();
    if (await menu.count() > 0) {
      await menu.click();
      const mobileLogout = page.locator('text=Logout').first();
      await mobileLogout.click();
    }
  }

  // Wait for navigation or small delay
  try {
    await page.waitForURL('**/login', { timeout: 3000 });
  } catch (e) {
    // ignore timeout
  }

  await page.waitForTimeout(500);
  const afterPath = '/tmp/logout-after.png';
  await page.screenshot({ path: afterPath, fullPage: false });
  console.log('Saved after screenshot to', afterPath);

  // Write errors to a file for inspection
  const errorsPath = '/tmp/logout-errors.txt';
  fs.writeFileSync(errorsPath, errors.join('\n') || '');
  console.log('Wrote page errors to', errorsPath);

  // Assert we did not encounter the hook error
  const foundHookError = errors.some(e => e.includes('Rendered fewer hooks than expected'));
  expect(foundHookError).toBeFalsy();
});
