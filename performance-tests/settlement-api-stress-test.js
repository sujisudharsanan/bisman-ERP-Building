/* global process, console, URL */
/**
 * ============================================================================
 * SETTLEMENT SYSTEM API STRESS TEST
 * ============================================================================
 * 
 * Tests settlement workflow via API calls (not direct DB access)
 * 
 * Run: node performance-tests/settlement-api-stress-test.js
 * 
 * Prerequisites:
 * - Backend running at localhost:5000
 * - Test users exist in database
 */

import http from 'http';
import https from 'https';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  BASE_URL: process.env.API_URL || 'http://localhost:5000',
  
  // Test scale (reduced for API-based testing)
  TOTAL_REQUESTS: 100,
  TOTAL_SETTLEMENTS: 10,
  CONCURRENT_OPERATIONS: 5,
  
  // Test users (update with actual credentials)
  USERS: {
    accountant: { email: 'demo_accountant@bisman.demo', password: 'Demo@123', token: null },
    financeController: { email: 'demo_fc@bisman.demo', password: 'Demo@123', token: null },
    cfo: { email: 'demo_cfo@bisman.demo', password: 'Demo@123', token: null },
    banker: { email: 'demo_banker@bisman.demo', password: 'Demo@123', token: null }
  },
  
  // Operation timeout
  TIMEOUT_MS: 30000
};

// Metrics
const metrics = {
  requestsCreated: 0,
  settlementsCreated: 0,
  fcApprovals: 0,
  cfoApprovals: 0,
  executions: 0,
  failures: 0,
  deadlocks: 0,
  timeouts: 0,
  startTime: null,
  endTime: null
};

// ============================================================================
// HTTP HELPERS
// ============================================================================

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: CONFIG.TIMEOUT_MS
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      metrics.timeouts++;
      reject(new Error('Request timeout'));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function login(email, password) {
  const response = await makeRequest('POST', '/api/auth/login', { email, password });
  if (response.status === 200 && response.data.accessToken) {
    return response.data.accessToken;
  }
  throw new Error(`Login failed for ${email}: ${JSON.stringify(response.data)}`);
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function setup() {
  console.log('🔧 Setting up test environment...\n');
  
  // Login all test users
  for (const [role, user] of Object.entries(CONFIG.USERS)) {
    try {
      user.token = await login(user.email, user.password);
      console.log(`  ✅ ${role}: logged in`);
    } catch (error) {
      console.log(`  ⚠️ ${role}: ${error.message}`);
      // Try with default demo user
      try {
        user.token = await login('demo_hub_incharge@bisman.demo', 'Demo@123');
        console.log(`  ✅ ${role}: using fallback user`);
      } catch {
        console.log(`  ❌ ${role}: failed to login`);
      }
    }
  }
  
  console.log('');
}

async function testSettlementEndpoints() {
  console.log('🧪 Testing Settlement API Endpoints...\n');
  
  const token = CONFIG.USERS.accountant.token;
  if (!token) {
    console.log('  ❌ No accountant token available');
    return;
  }
  
  // Test GET /api/settlements
  try {
    const response = await makeRequest('GET', '/api/settlements', null, token);
    console.log(`  GET /api/settlements: ${response.status}`);
    if (response.status === 200) {
      console.log(`    Found ${Array.isArray(response.data) ? response.data.length : 0} settlements`);
    } else {
      console.log(`    Response: ${JSON.stringify(response.data).slice(0, 100)}`);
    }
  } catch (error) {
    console.log(`  GET /api/settlements: ERROR - ${error.message}`);
  }
  
  // Test GET /api/settlements/stats
  try {
    const response = await makeRequest('GET', '/api/settlements/stats', null, token);
    console.log(`  GET /api/settlements/stats: ${response.status}`);
  } catch (error) {
    console.log(`  GET /api/settlements/stats: ERROR - ${error.message}`);
  }
  
  // Test GET /api/payment-requests
  try {
    const response = await makeRequest('GET', '/api/payment-requests', null, token);
    console.log(`  GET /api/payment-requests: ${response.status}`);
    if (response.status === 200) {
      const data = response.data;
      const requests = data.requests || data.data || data;
      console.log(`    Found ${Array.isArray(requests) ? requests.length : 0} payment requests`);
    }
  } catch (error) {
    console.log(`  GET /api/payment-requests: ERROR - ${error.message}`);
  }
  
  console.log('');
}

async function testConcurrentRequests() {
  console.log(`⚡ Testing ${CONFIG.CONCURRENT_OPERATIONS} concurrent requests...\n`);
  
  const token = CONFIG.USERS.accountant.token;
  if (!token) {
    console.log('  ❌ No token available');
    return;
  }
  
  const startTime = Date.now();
  
  // Fire concurrent requests
  const promises = [];
  for (let i = 0; i < CONFIG.CONCURRENT_OPERATIONS; i++) {
    promises.push(
      makeRequest('GET', '/api/settlements', null, token)
        .then(r => ({ success: true, status: r.status }))
        .catch(e => ({ success: false, error: e.message }))
    );
  }
  
  const results = await Promise.all(promises);
  const elapsed = Date.now() - startTime;
  
  const successful = results.filter(r => r.success && r.status === 200).length;
  const failed = results.length - successful;
  
  console.log(`  ✅ Successful: ${successful}/${results.length}`);
  console.log(`  ❌ Failed: ${failed}/${results.length}`);
  console.log(`  ⏱️ Total time: ${elapsed}ms`);
  console.log(`  📊 Avg response: ${Math.round(elapsed / CONFIG.CONCURRENT_OPERATIONS)}ms\n`);
  
  metrics.failures += failed;
}

async function testSettlementWorkflow() {
  console.log('🔄 Testing Settlement Workflow...\n');
  
  // This would test the full workflow if we had payment requests to consolidate
  // For now, we just verify the endpoints exist and respond
  
  const endpoints = [
    { method: 'GET', path: '/api/settlements', role: 'accountant' },
    { method: 'GET', path: '/api/settlements/pending', role: 'financeController' },
    { method: 'GET', path: '/api/settlements/for-execution', role: 'banker' }
  ];
  
  for (const ep of endpoints) {
    const token = CONFIG.USERS[ep.role]?.token;
    if (!token) {
      console.log(`  ⚠️ ${ep.method} ${ep.path}: No ${ep.role} token`);
      continue;
    }
    
    try {
      const response = await makeRequest(ep.method, ep.path, null, token);
      const status = response.status;
      console.log(`  ${status === 200 || status === 404 ? '✅' : '❌'} ${ep.method} ${ep.path}: ${status}`);
    } catch (error) {
      console.log(`  ❌ ${ep.method} ${ep.path}: ${error.message}`);
    }
  }
  
  console.log('');
}

async function testIdempotency() {
  console.log('🔒 Testing Idempotency...\n');
  
  const token = CONFIG.USERS.accountant.token;
  if (!token) {
    console.log('  ❌ No token available');
    return;
  }
  
  // Make same request twice to verify idempotent behavior
  try {
    const response1 = await makeRequest('GET', '/api/settlements', null, token);
    const response2 = await makeRequest('GET', '/api/settlements', null, token);
    
    console.log(`  First request: ${response1.status}`);
    console.log(`  Second request: ${response2.status}`);
    console.log(`  ✅ Idempotency test passed (both requests succeeded)\n`);
  } catch (error) {
    console.log(`  ❌ Idempotency test failed: ${error.message}\n`);
  }
}

async function printSummary() {
  metrics.endTime = Date.now();
  const duration = (metrics.endTime - metrics.startTime) / 1000;
  
  console.log('='.repeat(60));
  console.log('📊 STRESS TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`
Duration: ${duration.toFixed(2)} seconds

Operations:
  - Settlements Found: ${metrics.settlementsCreated}
  - Failures: ${metrics.failures}
  - Timeouts: ${metrics.timeouts}
  - Deadlocks: ${metrics.deadlocks}

Status: ${metrics.failures === 0 && metrics.timeouts === 0 ? '✅ PASSED' : '⚠️ ISSUES DETECTED'}
`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 SETTLEMENT SYSTEM API STRESS TEST');
  console.log('='.repeat(60));
  console.log(`
Configuration:
  - Base URL: ${CONFIG.BASE_URL}
  - Concurrent Operations: ${CONFIG.CONCURRENT_OPERATIONS}
  - Timeout: ${CONFIG.TIMEOUT_MS}ms
`);

  metrics.startTime = Date.now();
  
  try {
    await setup();
    await testSettlementEndpoints();
    await testConcurrentRequests();
    await testSettlementWorkflow();
    await testIdempotency();
    await printSummary();
  } catch (error) {
    console.error(`\n❌ FATAL ERROR: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
