const { chromium } = require('playwright');

(async () => {
  console.log('🎭 Starting Playwright browser automation...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Monitor console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      console.log(`❌ [Browser Error] ${text}`);
    } else if (text.includes('CORS') || text.includes('Backend')) {
      console.log(`📡 [Browser Log] ${text}`);
    }
  });

  // Monitor network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/')) {
      console.log(`📤 [Request] ${request.method()} ${url}`);
    }
  });

  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/')) {
      const status = response.status();
      const statusIcon = status === 200 ? '✅' : '❌';
      console.log(`📥 [Response] ${statusIcon} ${status} ${url}`);
    }
  });

  // Monitor network failures
  page.on('requestfailed', request => {
    const url = request.url();
    if (url.includes('/api/')) {
      console.log(`❌ [Failed] ${url} - ${request.failure().errorText}`);
    }
  });

  try {
    console.log('🌐 Navigating to http://localhost:3000...\n');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 10000 });
    
    console.log('\n✅ Page loaded successfully!\n');
    
    // Wait a moment for initial API calls
    await page.waitForTimeout(2000);
    
    // Test API health check from browser console
    console.log('🧪 Testing API calls from browser console...\n');
    
    const healthCheck = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          credentials: 'include'
        });
        const data = await response.json();
        return {
          success: true,
          status: response.status,
          data: data
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    if (healthCheck.success) {
      console.log('✅ Health check successful!');
      console.log('   Status:', healthCheck.status);
      console.log('   Response:', JSON.stringify(healthCheck.data, null, 2));
    } else {
      console.log('❌ Health check failed:', healthCheck.error);
    }

    // Check for CORS errors in the page
    console.log('\n🔍 Checking for CORS errors...\n');
    
    const corsErrors = await page.evaluate(() => {
      // Check if there are any CORS-related error messages
      const errors = [];
      const bodyText = document.body.innerText;
      
      if (bodyText.includes('CORS') || bodyText.includes('Cross-Origin')) {
        errors.push('Found CORS mention in page content');
      }
      
      return errors;
    });

    if (corsErrors.length === 0) {
      console.log('✅ No CORS errors detected on the page!');
    } else {
      console.log('⚠️  CORS issues found:');
      corsErrors.forEach(err => console.log('   -', err));
    }

    // Check if login page is accessible
    console.log('\n🔐 Testing login page...\n');
    
    const loginVisible = await page.evaluate(() => {
      const loginInput = document.querySelector('input[type="email"], input[name="email"]');
      return loginInput !== null;
    });

    if (loginVisible) {
      console.log('✅ Login form is visible');
      
      // Try to login with test credentials
      console.log('\n🔑 Attempting login with enterprise admin credentials...\n');
      
      await page.fill('input[type="email"], input[name="email"]', 'enterprise@bisman.erp');
      await page.fill('input[type="password"], input[name="password"]', 'Enterprise@123');
      
      console.log('📝 Filled in credentials');
      
      // Click login button
      const loginButton = await page.locator('button:has-text("Login"), button:has-text("Sign in"), button[type="submit"]').first();
      
      if (await loginButton.count() > 0) {
        console.log('🖱️  Clicking login button...\n');
        await loginButton.click();
        
        // Wait for navigation or response
        await page.waitForTimeout(3000);
        
        const currentUrl = page.url();
        console.log('📍 Current URL:', currentUrl);
        
        if (currentUrl.includes('dashboard')) {
          console.log('✅ Successfully redirected to dashboard!');
        } else if (currentUrl === 'http://localhost:3000/') {
          console.log('⚠️  Still on home page - check login response');
        }
      } else {
        console.log('⚠️  Could not find login button');
      }
    } else {
      console.log('ℹ️  Login form not immediately visible (might already be logged in or different page)');
    }

    console.log('\n⏸️  Keeping browser open for 15 seconds for inspection...');
    console.log('💡 Check the browser window and Network tab manually\n');
    
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
  } finally {
    console.log('\n🏁 Test complete. Closing browser...');
    await browser.close();
  }
})();
