const { chromium } = require('playwright');

async function testEnterpriseLogin() {
  console.log('🚀 Starting Playwright test for Enterprise Admin login...\n');
  
  const browser = await chromium.launch({
    headless: false, // Set to true for headless mode
    slowMo: 500 // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    // Accept all cookies and bypass CORS checks in browser
    ignoreHTTPSErrors: true,
  });
  
  const page = await context.newPage();
  
  // Listen to console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      console.log(`❌ Browser Error: ${text}`);
    } else if (text.includes('CORS') || text.includes('Backend') || text.includes('API')) {
      console.log(`📡 ${type.toUpperCase()}: ${text}`);
    }
  });
  
  // Listen to network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('localhost:3001') || url.includes('/api/')) {
      console.log(`📤 REQUEST: ${request.method()} ${url}`);
    }
  });
  
  // Listen to network responses
  page.on('response', response => {
    const url = response.url();
    if (url.includes('localhost:3001') || url.includes('/api/')) {
      console.log(`📥 RESPONSE: ${response.status()} ${url}`);
      
      // Log CORS headers
      const headers = response.headers();
      if (headers['access-control-allow-origin']) {
        console.log(`   ✅ CORS Allow Origin: ${headers['access-control-allow-origin']}`);
      } else {
        console.log(`   ❌ CORS Allow Origin: NOT SET`);
      }
      if (headers['access-control-allow-credentials']) {
        console.log(`   ✅ CORS Allow Credentials: ${headers['access-control-allow-credentials']}`);
      }
    }
  });
  
  try {
    console.log('🌐 Navigating to http://localhost:3000...\n');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if we're on login page
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}\n`);
    
    // Look for login form
    const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]').first();
    const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
    
    if (await emailInput.count() > 0) {
      console.log('📝 Found login form, entering credentials...\n');
      
      // Fill in credentials
      await emailInput.fill('enterprise@bisman.erp');
      await passwordInput.fill('Enterprise@123');
      
      console.log('✅ Credentials entered');
      
      // Find and click login button
      const loginButton = await page.locator('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]').first();
      
      if (await loginButton.count() > 0) {
        console.log('🔘 Clicking login button...\n');
        await loginButton.click();
        
        // Wait for navigation or response
        await page.waitForTimeout(3000);
        
        const newUrl = page.url();
        console.log(`\n📍 After login URL: ${newUrl}`);
        
        // Check for error messages
        const errorMessages = await page.locator('text=/error|Error|failed|Failed|blocked|Blocked/i').allTextContents();
        if (errorMessages.length > 0) {
          console.log('\n❌ Error messages found on page:');
          errorMessages.forEach(msg => console.log(`   - ${msg}`));
        }
        
        // Check if logged in successfully
        if (newUrl.includes('dashboard') || newUrl.includes('enterprise')) {
          console.log('\n✅ Login successful! Redirected to dashboard');
        } else if (newUrl.includes('login') || newUrl.includes('auth')) {
          console.log('\n⚠️  Still on login page - login may have failed');
        }
        
        // Wait a bit more to see any delayed responses
        await page.waitForTimeout(3000);
        
      } else {
        console.log('❌ Login button not found');
      }
    } else {
      console.log('⚠️  Login form not found - might already be logged in or on different page');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved as test-screenshot.png');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
    console.log('🔚 Closing browser...');
    await browser.close();
  }
}

// Run the test
testEnterpriseLogin().catch(console.error);
