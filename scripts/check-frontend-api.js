const { chromium } = require('playwright');

(async () => {
  console.log('🎭 Playwright: Testing Frontend API Proxy\n');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track API calls
  const apiCalls = [];
  
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      apiCalls.push({
        method: req.method(),
        url: req.url(),
        type: 'request'
      });
      console.log(`📤 ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      const status = res.status();
      const icon = status === 200 ? '✅' : '❌';
      console.log(`📥 ${icon} ${status} ${res.url()}`);
      
      // Check CORS headers
      const corsOrigin = res.headers()['access-control-allow-origin'];
      if (corsOrigin) {
        console.log(`   🔒 CORS Header: ${corsOrigin}`);
      } else {
        console.log(`   ℹ️  No CORS header (same-origin request)`);
      }
    }
  });

  try {
    console.log('\n🌐 Loading http://localhost:3000...\n');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    console.log('✅ Page loaded!\n');
    await page.waitForTimeout(1000);

    // Test API from browser console
    console.log('🧪 Testing /api/health from browser...\n');
    
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          credentials: 'include'
        });
        
        const data = await response.json();
        
        return {
          success: true,
          status: response.status,
          data: data,
          headers: {
            'content-type': response.headers.get('content-type'),
            'access-control-allow-origin': response.headers.get('access-control-allow-origin')
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          name: error.name
        };
      }
    });

    console.log('=' .repeat(60));
    console.log('RESULT:');
    console.log('=' .repeat(60));
    
    if (result.success) {
      console.log('✅ API Call Successful!');
      console.log(`   Status: ${result.status}`);
      console.log(`   Data:`, JSON.stringify(result.data, null, 2));
      console.log(`   CORS Origin Header: ${result.headers['access-control-allow-origin'] || 'Not present (same-origin)'}`);
    } else {
      console.log('❌ API Call Failed!');
      console.log(`   Error: ${result.error}`);
      console.log(`   Type: ${result.name}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('ANALYSIS:');
    console.log('='.repeat(60));
    
    if (result.success && !result.headers['access-control-allow-origin']) {
      console.log('✅ SUCCESS: Same-origin request (no CORS needed)');
      console.log('   - Request: http://localhost:3000/api/health');
      console.log('   - Origin: http://localhost:3000');
      console.log('   - Next.js proxy working correctly!');
    } else if (result.success && result.headers['access-control-allow-origin']) {
      console.log('⚠️  WARNING: CORS headers present');
      console.log('   - This suggests direct backend call, not proxy');
      console.log('   - Check if Next.js API routes are being used');
    } else {
      console.log('❌ FAILURE: API call blocked');
      console.log('   - Error suggests network or configuration issue');
      console.log('   - Check backend and Next.js servers are running');
    }

    console.log('\n💡 Keeping browser open for 10 seconds...');
    console.log('   Check Network tab in DevTools (F12)\n');
    
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
  } finally {
    console.log('\n�� Closing browser...');
    await browser.close();
    process.exit(0);
  }
})();
