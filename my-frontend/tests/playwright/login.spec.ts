import { test, expect } from '@playwright/test';

// This test verifies that after a successful login the protected dashboard
// content appears immediately after navigation (no manual reload required).

test('login updates app state and shows dashboard without reload', async ({ page }) => {
  // go to login page
  await page.goto('/auth/login');

  // fill form with demo manager credentials (should exist in demo set)
  await page.fill('#email', 'manager@business.com');
  await page.fill('#password', 'manager123');

  // submit form
  // submit form and wait for backend login response
  // Instrument to capture request/response details for /api/login
  let capturedReq: any = null;
  page.on('request', (req) => {
    try {
      if (req.url().includes('/api/login') && req.method() === 'POST') {
        capturedReq = { url: req.url(), method: req.method(), postData: req.postData() };
        console.log('Captured login request:', capturedReq);
      }
    } catch (e) {}
  });

  let capturedResp: any = null;
  page.on('response', async (resp) => {
    try {
      if (resp.url().includes('/api/login') && resp.request().method() === 'POST') {
        const body = await resp.text();
        capturedResp = { status: resp.status(), body };
        console.log('Captured login response:', capturedResp);
      }
    } catch (e) {}
  });

  const [response] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/login') && resp.request().method() === 'POST'),
    page.click('button[type="submit"]'),
  ]);

  // Assert login response was OK
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Login POST failed: ${response.status()} - ${body}`);
  }

  // Now wait for the dashboard marker rendered by client-side routing
  const dashboardMarker = page.locator('text=Dashboard').first();
  // Diagnostic: capture current URL and screenshot to inspect where we ended up
  const currentUrl = page.url();
  console.log('After login, page URL =', currentUrl);
  await page.screenshot({ path: '/tmp/playwright-login-after.png', fullPage: true });

  await expect(dashboardMarker).toBeVisible({ timeout: 15000 });

  // Also ensure a protected UI element that depends on auth is present; e.g. logout button
  const logoutBtn = page.locator('button:has-text("Logout")').first();
  await expect(logoutBtn).toBeVisible({ timeout: 15000 });
});
