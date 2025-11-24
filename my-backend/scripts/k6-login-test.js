/**
 * K6 Load Testing Script - Login API
 * 
 * Tests authentication endpoint performance under various loads
 * 
 * Install k6:
 *   macOS: brew install k6
 *   Linux: sudo apt install k6
 * 
 * Usage:
 *   k6 run scripts/k6-login-test.js
 *   k6 run --vus 10 --duration 30s scripts/k6-login-test.js
 *   k6 run --stage 30s:10,1m:50,30s:0 scripts/k6-login-test.js
 * 
 * Cloud run (requires k6 account):
 *   k6 cloud scripts/k6-login-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Test configuration
export const options = {
  // Scenario 1: Smoke test (baseline)
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '1m', target: 5 },    // Stay at 5 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  
  // Alternative scenarios (uncomment to use):
  
  // Scenario 2: Load test (normal load)
  // stages: [
  //   { duration: '1m', target: 50 },   // Ramp up to 50 users
  //   { duration: '3m', target: 50 },   // Stay at 50 users
  //   { duration: '1m', target: 0 },    // Ramp down
  // ],
  
  // Scenario 3: Stress test (breaking point)
  // stages: [
  //   { duration: '2m', target: 100 },  // Ramp up to 100 users
  //   { duration: '5m', target: 100 },  // Stay at 100 users
  //   { duration: '3m', target: 200 },  // Spike to 200 users
  //   { duration: '5m', target: 200 },  // Stay at 200 users
  //   { duration: '2m', target: 0 },    // Ramp down
  // ],
  
  // Scenario 4: Spike test (sudden traffic)
  // stages: [
  //   { duration: '10s', target: 100 }, // Instant spike
  //   { duration: '1m', target: 100 },  // Hold
  //   { duration: '10s', target: 0 },   // Drop
  // ],
  
  thresholds: {
    // HTTP errors should be less than 1%
    http_req_failed: ['rate<0.01'],
    
    // 95% of requests should be below 500ms
    http_req_duration: ['p(95)<500'],
    
    // 99% of requests should be below 1000ms
    'http_req_duration{scenario:login}': ['p(99)<1000'],
    
    // Success rate should be above 95%
    'login_success_rate': ['rate>0.95'],
  },
};

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const loginDuration = new Trend('login_duration');
const tokenValidationDuration = new Trend('token_validation_duration');
const loginErrors = new Counter('login_errors');

// ============================================================================
// TEST DATA
// ============================================================================

// Your ERP URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const LOGIN_ENDPOINT = `${BASE_URL}/api/auth/login`;

// Test users (create these in your database)
const TEST_USERS = [
  { email: 'demo@bisman.com', password: 'Demo@123' },
  { email: 'admin@bisman.com', password: 'Admin@123' },
  { email: 'user1@bisman.com', password: 'User@123' },
  { email: 'user2@bisman.com', password: 'User@123' },
  { email: 'user3@bisman.com', password: 'User@123' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get random test user
 */
function getRandomUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

/**
 * Setup function - runs once per VU
 */
export function setup() {
  console.log('🚀 Starting K6 Load Test - Login API');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`👥 Test users: ${TEST_USERS.length}`);
  
  // Test if API is reachable
  const healthCheck = http.get(`${BASE_URL}/health`);
  
  if (healthCheck.status !== 200) {
    console.error('❌ API health check failed!');
    console.error(`Status: ${healthCheck.status}`);
    throw new Error('API is not reachable');
  }
  
  console.log('✅ API is reachable');
  console.log('');
  
  return { startTime: Date.now() };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function(data) {
  const user = getRandomUser();
  
  // ========================================
  // Test 1: Login Request
  // ========================================
  
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });
  
  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { scenario: 'login' },
  };
  
  const loginStart = Date.now();
  const loginResponse = http.post(LOGIN_ENDPOINT, loginPayload, loginParams);
  const loginEnd = Date.now();
  
  // Record login duration
  loginDuration.add(loginEnd - loginStart);
  
  // Check login response
  const loginSuccess = check(loginResponse, {
    'status is 200': (r) => r.status === 200,
    'has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch (e) {
        return false;
      }
    },
    'has user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user !== undefined;
      } catch (e) {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  // Record success rate
  loginSuccessRate.add(loginSuccess);
  
  if (!loginSuccess) {
    loginErrors.add(1);
    console.error(`❌ Login failed for ${user.email}`);
    console.error(`Status: ${loginResponse.status}`);
    console.error(`Body: ${loginResponse.body}`);
  }
  
  // ========================================
  // Test 2: Token Validation (optional)
  // ========================================
  
  if (loginSuccess && loginResponse.status === 200) {
    try {
      const loginBody = JSON.parse(loginResponse.body);
      const token = loginBody.token;
      
      // Test authenticated endpoint
      const validateParams = {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        tags: { scenario: 'token_validation' },
      };
      
      const validateStart = Date.now();
      const validateResponse = http.get(`${BASE_URL}/api/auth/me`, validateParams);
      const validateEnd = Date.now();
      
      tokenValidationDuration.add(validateEnd - validateStart);
      
      check(validateResponse, {
        'token validation status is 200': (r) => r.status === 200,
        'token validation time < 200ms': (r) => r.timings.duration < 200,
      });
    } catch (e) {
      console.error('❌ Token validation error:', e.message);
    }
  }
  
  // Think time (simulate real user behavior)
  sleep(Math.random() * 3 + 1); // Random delay between 1-4 seconds
}

/**
 * Teardown function - runs once after all VUs finish
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  
  console.log('');
  console.log('🏁 Test Complete');
  console.log(`⏱️  Total duration: ${duration.toFixed(2)}s`);
  console.log('');
  console.log('📊 Check the summary below for detailed metrics');
  console.log('');
}

/**
 * Handle summary - custom output
 */
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
  
  // Optionally save to file
  if (__ENV.SAVE_RESULTS) {
    summary['./k6-results/login-test-results.json'] = JSON.stringify(data);
  }
  
  return summary;
}

// Text summary helper
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  const green = enableColors ? '\x1b[32m' : '';
  const red = enableColors ? '\x1b[31m' : '';
  const yellow = enableColors ? '\x1b[33m' : '';
  const reset = enableColors ? '\x1b[0m' : '';
  
  let output = '\n';
  output += `${indent}╔════════════════════════════════════════════════════════╗\n`;
  output += `${indent}║           K6 LOAD TEST - LOGIN API RESULTS            ║\n`;
  output += `${indent}╚════════════════════════════════════════════════════════╝\n\n`;
  
  // Test info
  output += `${indent}📋 Test Information:\n`;
  output += `${indent}   Duration: ${data.state.testRunDurationMs / 1000}s\n`;
  output += `${indent}   VUs: ${data.metrics.vus.values.value}\n`;
  output += `${indent}   Iterations: ${data.metrics.iterations.values.count}\n\n`;
  
  // HTTP metrics
  output += `${indent}🌐 HTTP Metrics:\n`;
  output += `${indent}   Requests: ${data.metrics.http_reqs.values.count}\n`;
  output += `${indent}   Failed: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  output += `${indent}   Duration (avg): ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  output += `${indent}   Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  output += `${indent}   Duration (p99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  // Login metrics
  if (data.metrics.login_success_rate) {
    const successRate = data.metrics.login_success_rate.values.rate * 100;
    const color = successRate > 95 ? green : successRate > 80 ? yellow : red;
    
    output += `${indent}🔐 Login Metrics:\n`;
    output += `${indent}   Success Rate: ${color}${successRate.toFixed(2)}%${reset}\n`;
    output += `${indent}   Login Duration (avg): ${data.metrics.login_duration.values.avg.toFixed(2)}ms\n`;
    output += `${indent}   Login Duration (p95): ${data.metrics.login_duration.values['p(95)'].toFixed(2)}ms\n`;
    output += `${indent}   Login Duration (p99): ${data.metrics.login_duration.values['p(99)'].toFixed(2)}ms\n`;
    output += `${indent}   Errors: ${data.metrics.login_errors.values.count}\n\n`;
  }
  
  // Thresholds
  output += `${indent}✅ Thresholds:\n`;
  for (const [name, threshold] of Object.entries(data.thresholds)) {
    const passed = threshold.ok;
    const color = passed ? green : red;
    const symbol = passed ? '✓' : '✗';
    output += `${indent}   ${color}${symbol}${reset} ${name}\n`;
  }
  
  output += '\n';
  return output;
}
