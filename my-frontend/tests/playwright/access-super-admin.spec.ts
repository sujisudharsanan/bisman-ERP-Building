import { test, expect } from '@playwright/test';

test('unauthenticated /super-admin redirects to /auth/login', async ({ page }) => {
  // Ensure we have a fresh context with no cookies/localStorage
  await page.context().clearCookies();
  await page.goto('http://localhost:3000/super-admin', { waitUntil: 'load' });

  // The server should redirect unauthenticated users to /auth/login
  const finalUrl = page.url();
  console.log('finalUrl=', finalUrl);

  expect(finalUrl).toContain('/auth/login');
});
