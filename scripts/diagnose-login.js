const { chromium } = require('playwright');

async function diagnoseLogin() {
  console.log('🔍 Starting login diagnosis with Playwright...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`❌ BROWSER ERROR: ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️  BROWSER WARNING: ${text}`);
    } else {
      console.log(`ℹ️  BROWSER LOG: ${text}`);
    }
  });
  
  // Capture network errors
  page.on('requestfailed', request => {
    console.log(`❌ NETWORK FAILED: ${request.url()}`);
    console.log(`   Failure: ${request.failure().errorText}`);
  });
  
  // Capture API responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/auth/login')) {
      console.log(`\n📡 LOGIN API RESPONSE:`);
      console.log(`   URL: ${url}`);
      console.log(`   Status: ${response.status()} ${response.statusText()}`);
      console.log(`   Headers:`, response.headers());
      
      try {
        const body = await response.text();
        console.log(`   Body: ${body}`);
      } catch (e) {
        console.log(`   Body: (could not read)`);
      }
    }
  });
  
  try {
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    console.log('✅ Login page loaded\n');
    
    // Take screenshot
    await page.screenshot({ path: 'login-page.png' });
    console.log('📸 Screenshot saved: login-page.png\n');
    
    // Check if backend is reachable
    console.log('2️⃣ Testing backend connectivity...');
    try {
      const backendResponse = await page.evaluate(async () => {
        try {
          const res = await fetch('http://localhost:3001/api/health', {
            method: 'GET',
          });
          return {
            ok: res.ok,
            status: res.status,
            statusText: res.statusText,
            body: await res.text()
          };
        } catch (error) {
          return {
            error: error.message
          };
        }
      });
      
      if (backendResponse.error) {
        console.log(`❌ Backend NOT reachable: ${backendResponse.error}\n`);
      } else {
        console.log(`✅ Backend reachable: ${backendResponse.status} ${backendResponse.statusText}`);
        console.log(`   Response: ${backendResponse.body}\n`);
      }
    } catch (e) {
      console.log(`❌ Backend test failed: ${e.message}\n`);
    }
    
    // Fill in Enterprise Admin credentials
    console.log('3️⃣ Filling in Enterprise Admin credentials...');
    await page.fill('input[name="email"], input[type="email"]', 'enterprise@bisman.erp');
    await page.fill('input[name="password"], input[type="password"]', 'enterprise123');
    console.log('✅ Credentials filled\n');
    
    // Take screenshot before submit
    await page.screenshot({ path: 'before-login.png' });
    console.log('📸 Screenshot saved: before-login.png\n');
    
    console.log('4️⃣ Clicking login button...');
    
    // Wait for the login request and response
    const [response] = await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/api/auth/login'),
        { timeout: 10000 }
      ).catch(() => null),
      page.click('button[type="submit"]')
    ]);
    
    if (response) {
      console.log(`\n📊 LOGIN REQUEST DETAILS:`);
      console.log(`   Status: ${response.status()}`);
      
      const responseBody = await response.text();
      console.log(`   Response Body: ${responseBody}\n`);
    } else {
      console.log('⚠️ No login API call detected\n');
    }
    
    // Wait a bit for any errors or redirects
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`5️⃣ Current URL after login attempt: ${currentUrl}`);
    
    // Take screenshot after login attempt
    await page.screenshot({ path: 'after-login.png' });
    console.log('📸 Screenshot saved: after-login.png\n');
    
    // Check for error messages on page
    const errorMessages = await page.evaluate(() => {
      const errors = [];
      
      // Check for common error selectors
      const selectors = [
        '.error',
        '.alert-error',
        '[role="alert"]',
        '.text-red-500',
        '.text-red-600',
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent.trim();
          if (text && text.length > 0) {
            errors.push(text);
          }
        });
      });
      
      return errors;
    });
    
    if (errorMessages.length > 0) {
      console.log('❌ ERROR MESSAGES ON PAGE:');
      errorMessages.forEach(msg => console.log(`   - ${msg}`));
    }
    
    // Check if we're redirected (successful login)
    if (currentUrl.includes('dashboard')) {
      console.log('\n✅ LOGIN SUCCESSFUL! Redirected to dashboard');
    } else if (currentUrl.includes('login')) {
      console.log('\n❌ LOGIN FAILED - Still on login page');
    }
    
    console.log('\n⏳ Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ ERROR during diagnosis:', error.message);
    await page.screenshot({ path: 'error-state.png' });
    console.log('📸 Error screenshot saved: error-state.png');
  } finally {
    await browser.close();
    console.log('\n✅ Diagnosis complete!');
  }
}

// Check if Playwright is installed
async function checkPlaywright() {
  try {
    require('playwright');
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  const hasPlaywright = await checkPlaywright();
  
  if (!hasPlaywright) {
    console.log('❌ Playwright not found!');
    console.log('\n📦 Installing Playwright...');
    console.log('Please run: npm install -D playwright');
    console.log('Then run: npx playwright install chromium');
    process.exit(1);
  }
  
  await diagnoseLogin();
}

main().catch(console.error);
