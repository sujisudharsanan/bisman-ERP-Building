import { test, expect } from '@playwright/test';

test.describe('Hub Incharge Login Debug', () => {
  test('should login and navigate to hub-incharge dashboard', async ({ page, context }) => {
    // Enable video recording (configured in playwright.config.ts)
    console.log('Starting hub-incharge login test...');

    // Listen to all console messages
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
    });

    // Listen to network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`→ REQUEST: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const status = response.status();
        console.log(`← RESPONSE: ${status} ${response.url()}`);
        
        // Log response body for API calls
        try {
          const body = await response.text();
          console.log(`   Body: ${body.substring(0, 200)}`);
        } catch (e) {
          console.log(`   (Could not read body)`);
        }
      }
    });

    // Navigate to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'screenshots/01-login-page.png', fullPage: true });
    console.log('   Screenshot saved: 01-login-page.png');

    // Fill in hub incharge credentials
    console.log('2. Filling in credentials...');
    await page.fill('input[type="email"], input[name="email"]', 'staff@business.com');
    await page.fill('input[type="password"], input[name="password"]', 'staff123');
    await page.screenshot({ path: 'screenshots/02-credentials-filled.png', fullPage: true });
    console.log('   Screenshot saved: 02-credentials-filled.png');

    // Check cookies before login
    const cookiesBeforeLogin = await context.cookies();
    console.log('3. Cookies before login:', cookiesBeforeLogin.length);

    // Click login/next button
    console.log('4. Clicking login button...');
    const loginButton = page.locator('button:has-text("Next"), button:has-text("Login"), button[type="submit"]').first();
    await loginButton.click();

    // Wait for login to process
    console.log('5. Waiting for login response...');
    await page.waitForTimeout(1000); // Wait 1 second for login to complete

    // Take screenshot after clicking login
    await page.screenshot({ path: 'screenshots/03-after-login-click.png', fullPage: true });
    console.log('   Screenshot saved: 03-after-login-click.png');

    // Check cookies after login
    const cookiesAfterLogin = await context.cookies();
    console.log('6. Cookies after login:', cookiesAfterLogin.length);
    console.log('   Cookie details:');
    cookiesAfterLogin.forEach(cookie => {
      console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 30)}... (domain: ${cookie.domain}, path: ${cookie.path})`);
    });

    // Wait for any redirect
    console.log('7. Waiting for potential redirect...');
    await page.waitForTimeout(2000);

    // Get current URL
    const currentUrl = page.url();
    console.log('8. Current URL:', currentUrl);

    // Take screenshot of current page
    await page.screenshot({ path: 'screenshots/04-current-page.png', fullPage: true });
    console.log('   Screenshot saved: 04-current-page.png');

    // Check if we're on hub-incharge page
    if (currentUrl.includes('/hub-incharge')) {
      console.log('✅ SUCCESS: Navigated to hub-incharge dashboard');
      
      // Wait for dashboard to load
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/05-hub-dashboard.png', fullPage: true });
      console.log('   Screenshot saved: 05-hub-dashboard.png');
      
    } else if (currentUrl.includes('/auth/login')) {
      console.log('❌ FAILED: Still on login page!');
      
      // Check for error messages
      const errorText = await page.textContent('body');
      console.log('   Page contains error:', errorText?.includes('error') || errorText?.includes('failed'));
      
    } else {
      console.log('⚠️  UNEXPECTED: Navigated to:', currentUrl);
    }

    // Try to manually navigate to hub-incharge
    console.log('9. Manually navigating to /hub-incharge...');
    await page.goto('http://localhost:3000/hub-incharge');
    await page.waitForTimeout(2000);
    
    const finalUrl = page.url();
    console.log('10. Final URL after manual navigation:', finalUrl);
    await page.screenshot({ path: 'screenshots/06-after-manual-nav.png', fullPage: true });
    console.log('    Screenshot saved: 06-after-manual-nav.png');

    // Check final cookies
    const finalCookies = await context.cookies();
    console.log('11. Final cookies:', finalCookies.length);

    // Final assertion - we should either be on hub-incharge or redirected there
    if (finalUrl.includes('/hub-incharge')) {
      console.log('✅ SUCCESS: Hub incharge dashboard loaded');
      expect(finalUrl).toContain('/hub-incharge');
    } else {
      console.log('❌ FAILED: Not on hub-incharge dashboard');
      console.log('   Expected: /hub-incharge');
      console.log('   Got:', finalUrl);
      expect(finalUrl).toContain('/hub-incharge'); // This will fail and show the diff
    }
  });

  test('should verify cookies are set correctly', async ({ page, context }) => {
    console.log('Testing cookie setting directly via API...');

    // Make direct API call to login
    const response = await page.request.post('http://localhost:3001/api/login', {
      data: {
        email: 'staff@business.com',
        password: 'staff123'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('API Login Response Status:', response.status());
    const body = await response.json();
    console.log('API Login Response Body:', body);

    // Check Set-Cookie headers
    const headers = response.headers();
    console.log('Response Headers:', headers);
    console.log('Set-Cookie header:', headers['set-cookie']);

    // Now try to access /api/me with the cookies
    const meResponse = await page.request.get('http://localhost:3001/api/me');
    console.log('/api/me Response Status:', meResponse.status());
    const meBody = await meResponse.text();
    console.log('/api/me Response Body:', meBody);

    // Assertions
    expect(response.status()).toBe(200);
    expect(body.ok).toBe(true);
  });
});
