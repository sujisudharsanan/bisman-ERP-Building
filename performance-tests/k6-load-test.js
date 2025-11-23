/**
 * K6 Load Test for BISMAN ERP
 * Performance testing based on ISO/IEC 25010 standards
 * 
 * Run with: k6 run k6-load-test.js
 * With custom VUs: k6 run --vus 50 --duration 5m k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const authLatency = new Trend('auth_latency');
const dashboardLatency = new Trend('dashboard_latency');
const requestCounter = new Counter('total_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp-up to 10 users
    { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
    { duration: '3m', target: 100 },  // Ramp-up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '2m', target: 0 },    // Ramp-down to 0 users
  ],
  thresholds: {
    // ISO/IEC 25010 Performance targets
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.01'],                  // <1% errors
    'errors': ['rate<0.01'],                            // <1% error rate
    'api_latency': ['p(95)<400'],                       // API P95 < 400ms
    'auth_latency': ['p(95)<500'],                      // Auth P95 < 500ms
    'dashboard_latency': ['p(95)<800'],                 // Dashboard P95 < 800ms
  },
};

// Base URL - update this to your Railway URL
const BASE_URL = __ENV.BASE_URL || 'https://your-erp.railway.app';

// Test data
const testUsers = [
  { email: 'test1@bisman.local', password: 'Test@123' },
  { email: 'test2@bisman.local', password: 'Test@123' },
  { email: 'test3@bisman.local', password: 'Test@123' },
];

/**
 * Setup function - runs once before the test
 */
export function setup() {
  console.log(`🚀 Starting load test on ${BASE_URL}`);
  console.log(`📊 Test configuration: ${JSON.stringify(options.stages)}`);
  
  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    console.error('❌ API health check failed!');
  } else {
    console.log('✅ API health check passed');
  }
  
  return { baseUrl: BASE_URL };
}

/**
 * Main test function - runs for each VU
 */
export default function(data) {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Group 1: Authentication Flow
  group('Authentication', () => {
    const loginStart = new Date();
    const loginRes = http.post(`${data.baseUrl}/api/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    });
    
    const loginDuration = new Date() - loginStart;
    authLatency.add(loginDuration);
    requestCounter.add(1);
    
    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login has token': (r) => r.json('token') !== undefined,
      'login duration < 1s': () => loginDuration < 1000,
    });
    
    errorRate.add(!loginSuccess);
    
    if (!loginSuccess) {
      console.error(`❌ Login failed: ${loginRes.status}`);
      return;
    }
    
    const token = loginRes.json('token');
    
    // Group 2: Dashboard API Calls
    group('Dashboard', () => {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      
      // Get dashboard metrics
      const dashStart = new Date();
      const dashRes = http.get(`${data.baseUrl}/api/dashboard/metrics`, {
        headers,
        tags: { name: 'Dashboard Metrics' },
      });
      
      const dashDuration = new Date() - dashStart;
      dashboardLatency.add(dashDuration);
      apiLatency.add(dashDuration);
      requestCounter.add(1);
      
      const dashSuccess = check(dashRes, {
        'dashboard status is 200': (r) => r.status === 200,
        'dashboard has data': (r) => r.json('data') !== undefined,
        'dashboard duration < 1.5s': () => dashDuration < 1500,
      });
      
      errorRate.add(!dashSuccess);
    });
    
    // Group 3: User Management API
    group('User Management', () => {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      
      // Get users list
      const usersStart = new Date();
      const usersRes = http.get(`${data.baseUrl}/api/users?page=1&limit=20`, {
        headers,
        tags: { name: 'Users List' },
      });
      
      const usersDuration = new Date() - usersStart;
      apiLatency.add(usersDuration);
      requestCounter.add(1);
      
      const usersSuccess = check(usersRes, {
        'users status is 200': (r) => r.status === 200,
        'users duration < 800ms': () => usersDuration < 800,
      });
      
      errorRate.add(!usersSuccess);
    });
    
    // Group 4: Reports API
    group('Reports', () => {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      
      // Get report
      const reportStart = new Date();
      const reportRes = http.get(`${data.baseUrl}/api/reports/sales?startDate=2025-01-01&endDate=2025-11-24`, {
        headers,
        tags: { name: 'Sales Report' },
      });
      
      const reportDuration = new Date() - reportStart;
      apiLatency.add(reportDuration);
      requestCounter.add(1);
      
      const reportSuccess = check(reportRes, {
        'report status is 200 or 404': (r) => [200, 404].includes(r.status),
        'report duration < 2s': () => reportDuration < 2000,
      });
      
      errorRate.add(!reportSuccess);
    });
  });
  
  // Think time between iterations
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  console.log('✅ Load test completed');
}

/**
 * Handle summary - custom report
 */
export function handleSummary(data) {
  console.log('\n📊 === PERFORMANCE TEST SUMMARY ===\n');
  
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;
  
  console.log('HTTP Request Duration:');
  console.log(`  - Average: ${httpReqDuration.values.avg.toFixed(2)}ms`);
  console.log(`  - P50: ${httpReqDuration.values.med.toFixed(2)}ms`);
  console.log(`  - P95: ${httpReqDuration.values['p(95)'].toFixed(2)}ms`);
  console.log(`  - P99: ${httpReqDuration.values['p(99)'].toFixed(2)}ms`);
  console.log(`  - Max: ${httpReqDuration.values.max.toFixed(2)}ms`);
  
  console.log('\nError Rate:');
  console.log(`  - Failed Requests: ${(httpReqFailed.values.rate * 100).toFixed(2)}%`);
  
  console.log('\nTotal Requests:', data.metrics.total_requests.values.count);
  console.log('VU Iterations:', data.metrics.iterations.values.count);
  
  // Performance grading
  const p95 = httpReqDuration.values['p(95)'];
  const errorRate = httpReqFailed.values.rate;
  
  let grade = '🔴 RED (Poor)';
  if (p95 < 500 && errorRate < 0.01) {
    grade = '🟢 GREEN (Excellent)';
  } else if (p95 < 1000 && errorRate < 0.05) {
    grade = '🟡 AMBER (Acceptable)';
  }
  
  console.log(`\n🎯 Overall Performance Grade: ${grade}`);
  console.log('\n=== END OF SUMMARY ===\n');
  
  return {
    'stdout': '', // Disable default summary
    'performance-summary.json': JSON.stringify(data, null, 2),
  };
}
