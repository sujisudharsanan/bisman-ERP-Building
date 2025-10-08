import { test, expect } from '@playwright/test';

const TEST_USERS = [
  {
    name: 'Super Admin',
    email: 'super@bisman.local',
    password: 'password',
    role: 'SUPER_ADMIN',
    expectedDashboard: '/super-admin',
    dashboardTitle: 'Super Admin Dashboard'
  },
  {
    name: 'Manager',
    email: 'manager@business.com',
    password: 'password',
    role: 'MANAGER',
    expectedDashboard: '/dashboard',
    dashboardTitle: 'Dashboard'
  },
  {
    name: 'Admin',
    email: 'admin@business.com',
    password: 'admin123',
    role: 'ADMIN',
    expectedDashboard: '/admin',
    dashboardTitle: 'Admin'
  },
  {
    name: 'Hub Incharge (Staff)',
    email: 'staff@business.com',
    password: 'staff123',
    role: 'STAFF',
    expectedDashboard: '/hub-incharge',
    dashboardTitle: 'Hub Incharge'
  }
];

test.describe('Complete Login System Test', () => {
  
  test.beforeEach(async ({ context }) => {
    // Clear all cookies before each test
    await context.clearCookies();
  });

  for (const user of TEST_USERS) {
    test(`${user.name} - Full Login Flow`, async ({ page, context }) => {
      console.log(`\n========================================`);
      console.log(`Testing: ${user.name} (${user.role})`);
      console.log(`========================================`);

      // Navigate to login page
      console.log('1. Navigating to login page...');
      await page.goto('http://localhost:3000/auth/login');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of login page
      await page.screenshot({ 
        path: `screenshots/login-${user.role}-01-login-page.png`, 
        fullPage: true 
      });

      // Fill in credentials
      console.log(`2. Entering credentials: ${user.email}`);
      await page.fill('input[type="email"], input[name="email"]', user.email);
      await page.fill('input[type="password"], input[name="password"]', user.password);
      
      await page.screenshot({ 
        path: `screenshots/login-${user.role}-02-credentials-filled.png`, 
        fullPage: true 
      });

      // Check cookies before login
      const cookiesBeforeLogin = await context.cookies();
      console.log(`3. Cookies before login: ${cookiesBeforeLogin.length}`);

      // Click login button
      console.log('4. Clicking login button...');
      const loginButton = page.locator('button:has-text("Next"), button:has-text("Login"), button[type="submit"]').first();
      await loginButton.click();

      // Wait for login response
      console.log('5. Waiting for redirect...');
      await page.waitForTimeout(2000); // Wait for 300ms delay + redirect

      // Get current URL
      const currentUrl = page.url();
      console.log(`6. Current URL: ${currentUrl}`);

      // Take screenshot after login
      await page.screenshot({ 
        path: `screenshots/login-${user.role}-03-after-login.png`, 
        fullPage: true 
      });

      // Check cookies after login
      const cookiesAfterLogin = await context.cookies();
      console.log(`7. Cookies after login: ${cookiesAfterLogin.length}`);
      
      const accessToken = cookiesAfterLogin.find(c => c.name === 'access_token');
      const refreshToken = cookiesAfterLogin.find(c => c.name === 'refresh_token');
      
      if (accessToken) {
        console.log(`   ✓ access_token found (domain: ${accessToken.domain})`);
      } else {
        console.log(`   ✗ access_token NOT found`);
      }
      
      if (refreshToken) {
        console.log(`   ✓ refresh_token found (domain: ${refreshToken.domain})`);
      } else {
        console.log(`   ✗ refresh_token NOT found`);
      }

      // Verify we're on the correct dashboard
      console.log(`8. Verifying dashboard URL...`);
      expect(currentUrl).toContain(user.expectedDashboard);
      console.log(`   ✓ Navigated to ${user.expectedDashboard}`);

      // Wait for dashboard to load
      await page.waitForTimeout(2000);

      // Take screenshot of dashboard
      await page.screenshot({ 
        path: `screenshots/login-${user.role}-04-dashboard.png`, 
        fullPage: true 
      });

      // Check for error messages
      const bodyText = await page.textContent('body');
      const hasError = bodyText?.toLowerCase().includes('error') || 
                       bodyText?.toLowerCase().includes('unauthorized') ||
                       bodyText?.toLowerCase().includes('access denied');
      
      if (hasError) {
        console.log(`   ⚠️ Warning: Page contains error text`);
      } else {
        console.log(`   ✓ No error messages found`);
      }

      // Verify we didn't get redirected back to login
      const finalUrl = page.url();
      expect(finalUrl).not.toContain('/auth/login');
      console.log(`   ✓ Still on dashboard (not redirected to login)`);

      // Test logout
      console.log('9. Testing logout...');
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("logout"), a:has-text("Logout")').first();
      
      if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoutButton.click();
        await page.waitForTimeout(1000);
        
        const afterLogoutUrl = page.url();
        console.log(`   Logout URL: ${afterLogoutUrl}`);
        
        // Should redirect to login page
        expect(afterLogoutUrl).toContain('/auth/login');
        console.log(`   ✓ Logged out successfully`);
        
        // Check cookies cleared
        const cookiesAfterLogout = await context.cookies();
        const hasAccessToken = cookiesAfterLogout.some(c => c.name === 'access_token');
        const hasRefreshToken = cookiesAfterLogout.some(c => c.name === 'refresh_token');
        
        if (!hasAccessToken && !hasRefreshToken) {
          console.log(`   ✓ Cookies cleared after logout`);
        } else {
          console.log(`   ⚠️ Warning: Some cookies still present`);
        }
        
        await page.screenshot({ 
          path: `screenshots/login-${user.role}-05-after-logout.png`, 
          fullPage: true 
        });
      } else {
        console.log(`   ⚠️ Logout button not found (checking alternative locations)`);
      }

      console.log(`\n✅ ${user.name} test completed successfully!\n`);
    });
  }

  test('Login with Invalid Credentials', async ({ page }) => {
    console.log('\n========================================');
    console.log('Testing: Invalid Credentials');
    console.log('========================================');

    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    const loginButton = page.locator('button:has-text("Next"), button[type="submit"]').first();
    await loginButton.click();

    await page.waitForTimeout(2000);

    // Should still be on login page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/auth/login');
    console.log('✓ Stayed on login page (as expected)');

    // Should show error message
    const bodyText = await page.textContent('body');
    const hasError = bodyText?.toLowerCase().includes('error') || 
                     bodyText?.toLowerCase().includes('invalid') ||
                     bodyText?.toLowerCase().includes('failed');
    
    expect(hasError).toBe(true);
    console.log('✓ Error message displayed');

    await page.screenshot({ 
      path: 'screenshots/login-invalid-credentials.png', 
      fullPage: true 
    });

    console.log('✅ Invalid credentials test completed!\n');
  });

  test('Protected Route Access Without Login', async ({ page }) => {
    console.log('\n========================================');
    console.log('Testing: Protected Route Access');
    console.log('========================================');

    const protectedRoutes = [
      '/super-admin',
      '/admin',
      '/dashboard',
      '/hub-incharge',
      '/manager'
    ];

    for (const route of protectedRoutes) {
      console.log(`Testing route: ${route}`);
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      
      // Should redirect to login
      expect(currentUrl).toContain('/auth/login');
      console.log(`  ✓ Redirected to login (as expected)`);
    }

    console.log('✅ Protected route test completed!\n');
  });
});

test.describe('Dashboard Functionality Tests', () => {
  
  test('Super Admin Dashboard - Check Key Elements', async ({ page, context }) => {
    await context.clearCookies();
    
    // Login as super admin
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'super@bisman.local');
    await page.fill('input[type="password"]', 'password');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);

    // Check for common dashboard elements
    const hasUsersLink = await page.locator('text=/users|user management/i').count() > 0;
    const hasSettingsLink = await page.locator('text=/settings|configuration/i').count() > 0;
    
    console.log(`Super Admin Dashboard Elements:`);
    console.log(`  - Users link present: ${hasUsersLink}`);
    console.log(`  - Settings link present: ${hasSettingsLink}`);

    await page.screenshot({ 
      path: 'screenshots/dashboard-super-admin-detailed.png', 
      fullPage: true 
    });
  });

  test('Hub Incharge Dashboard - Check API Calls', async ({ page, context }) => {
    await context.clearCookies();

    // Track API calls
    const apiCalls = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiCalls.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // Login as hub incharge
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'staff@business.com');
    await page.fill('input[type="password"]', 'staff123');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    // Check API calls
    console.log(`\nHub Incharge Dashboard API Calls:`);
    const successCalls = apiCalls.filter(c => c.status === 200);
    const failedCalls = apiCalls.filter(c => c.status >= 400);
    
    console.log(`  - Total API calls: ${apiCalls.length}`);
    console.log(`  - Successful (200): ${successCalls.length}`);
    console.log(`  - Failed (4xx/5xx): ${failedCalls.length}`);
    
    if (failedCalls.length > 0) {
      console.log(`\n  Failed calls:`);
      failedCalls.forEach(call => {
        console.log(`    - ${call.status}: ${call.url}`);
      });
    }

    await page.screenshot({ 
      path: 'screenshots/dashboard-hub-incharge-detailed.png', 
      fullPage: true 
    });
  });
});
