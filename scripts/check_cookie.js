const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // Use the APIRequestContext attached to the browser context to do the POST
    const loginResp = await context.request.post('http://127.0.0.1:3000/api/login', {
      data: {},
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('login status:', loginResp.status());
    console.log('login set-cookie header:', loginResp.headers()['set-cookie']);

    const cookies = await context.cookies('http://127.0.0.1');
    console.log('context.cookies:', JSON.stringify(cookies, null, 2));

    const tokenCookie = cookies.find(c => c.name === 'token');
    if (!tokenCookie) {
      console.error('token cookie NOT found in browser context');
    } else {
      console.log('token cookie details:', tokenCookie);
    }

    // Make a subsequent request via the same context; cookies should be sent
    const healthResp = await context.request.get('http://127.0.0.1:3000/api/health/db');
    console.log('/api/health/db status:', healthResp.status());
    console.log('/api/health/db body:', await healthResp.text());

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('error in check_cookie script', err);
    process.exit(2);
  }
})();
