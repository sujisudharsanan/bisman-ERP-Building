import { test, expect } from '@playwright/test';

// This test assumes the frontend is running on http://localhost:3000 and backend on http://localhost:3001
// It will simulate a login by setting cookies/localStorage then perform logout and assert storage cleared.

test.describe('Logout flow', () => {
  test('clears cookies, localStorage and sessionStorage on logout', async ({ page, context }) => {
    // Start at a protected page
    await page.goto('http://localhost:3000/super-admin');

    // Set mock auth cookie and localStorage/sessionStorage items
    await context.addCookies([{ name: 'token', value: 'fake-token', domain: 'localhost', path: '/' }]);
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'fake-token');
      localStorage.setItem('justLoggedIn', '1');
      sessionStorage.setItem('sessionKey', 'abc');
    });

    // Reload to ensure UI sees authenticated state
    await page.reload();

    // Click the desktop logout button if present, otherwise open mobile menu
    const desktopLogout = page.locator('button[aria-label="Logout"]').first();
    if (await desktopLogout.count() > 0) {
      await desktopLogout.click();
    } else {
      // open mobile menu and click logout
      const menu = page.locator('button[title="Menu"]').first();
      if (await menu.count() > 0) {
        await menu.click();
        const mobileLogout = page.locator('text=Logout').first();
        await mobileLogout.click();
      }
    }

    // Wait for navigation to /login
    await page.waitForURL('**/login', { timeout: 5000 });

    // Assert storages cleared
    const ls = await page.evaluate(() => Object.keys(localStorage));
    const ss = await page.evaluate(() => Object.keys(sessionStorage));
    const cookies = await context.cookies();

    expect(ls.length).toBe(0);
    expect(ss.length).toBe(0);
    // token cookie should be removed or expired
    const tokenCookie = cookies.find(c => c.name === 'token');
    expect(tokenCookie).toBeUndefined();
  });
});
