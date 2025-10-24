// ERP Load Test - k6 Performance Testing
// Tests: API endpoints under 100-500 concurrent users
// Measures: Response time, throughput, error rate

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const cacheHitRate = new Rate('cache_hits');
const requestCounter = new Counter('total_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 200 },  // Spike to 200 users
    { duration: '1m', target: 200 },   // Stay at 200 users
    { duration: '30s', target: 500 },  // Spike to 500 users
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<800'], // 95% of requests must complete below 800ms
    'http_req_failed': ['rate<0.05'],   // Error rate must be less than 5%
    'errors': ['rate<0.05'],
    'api_latency': ['p(95)<500'],       // 95% API latency below 500ms
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Test scenarios
export default function () {
  requestCounter.add(1);

  // Scenario 1: Health check (lightweight)
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check status 200': (r) => r.status === 200,
    'health check latency < 200ms': (r) => r.timings.duration < 200,
  });
  errorRate.add(healthRes.status !== 200);
  apiLatency.add(healthRes.timings.duration);

  sleep(1);

  // Scenario 2: Cache health (tests cache layer)
  const cacheRes = http.get(`${BASE_URL}/api/health/cache`);
  check(cacheRes, {
    'cache health status 200': (r) => r.status === 200,
    'cache health latency < 300ms': (r) => r.timings.duration < 300,
  });
  errorRate.add(cacheRes.status !== 200);
  
  if (cacheRes.status === 200) {
    try {
      const cacheData = JSON.parse(cacheRes.body);
      const hitRate = parseFloat(cacheData.data?.hitRate?.replace('%', '') || 0);
      cacheHitRate.add(hitRate > 70);
    } catch (e) {
      // Ignore parse errors
    }
  }

  sleep(1);

  // Scenario 3: Database health (tests DB connection)
  const dbRes = http.get(`${BASE_URL}/api/health/database`);
  check(dbRes, {
    'db health status 200': (r) => r.status === 200,
    'db health latency < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(dbRes.status !== 200);
  apiLatency.add(dbRes.timings.duration);

  sleep(1);

  // Scenario 4: Pages endpoint (larger response)
  const pagesRes = http.get(`${BASE_URL}/api/pages`);
  check(pagesRes, {
    'pages status 200': (r) => r.status === 200,
    'pages latency < 1000ms': (r) => r.timings.duration < 1000,
    'pages response compressed': (r) => r.headers['Content-Encoding'] === 'gzip',
  });
  errorRate.add(pagesRes.status !== 200);
  apiLatency.add(pagesRes.timings.duration);

  sleep(2);
}

// Summary handler
export function handleSummary(data) {
  const timestamp = new Date().toISOString();
  
  return {
    'benchmarks/load-test-results.json': JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options?.indent || '';
  const enableColors = options?.enableColors || false;
  
  const metrics = data.metrics;
  const output = [];

  output.push('');
  output.push('═══════════════════════════════════════════════════');
  output.push('  📊 ERP LOAD TEST RESULTS');
  output.push('═══════════════════════════════════════════════════');
  output.push('');
  
  // Request stats
  output.push('📈 REQUEST STATISTICS');
  output.push(`${indent}Total Requests: ${metrics.total_requests?.values?.count || 0}`);
  output.push(`${indent}Request Rate: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)} req/s`);
  output.push(`${indent}Failed Requests: ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`);
  output.push('');
  
  // Latency stats
  output.push('⚡ LATENCY (HTTP Request Duration)');
  output.push(`${indent}Average: ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms`);
  output.push(`${indent}Median: ${(metrics.http_req_duration?.values?.med || 0).toFixed(2)}ms`);
  output.push(`${indent}P95: ${(metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms`);
  output.push(`${indent}P99: ${(metrics.http_req_duration?.values['p(99)'] || 0).toFixed(2)}ms`);
  output.push(`${indent}Max: ${(metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms`);
  output.push('');
  
  // API latency
  output.push('🔌 API LATENCY');
  output.push(`${indent}Average: ${(metrics.api_latency?.values?.avg || 0).toFixed(2)}ms`);
  output.push(`${indent}P95: ${(metrics.api_latency?.values['p(95)'] || 0).toFixed(2)}ms`);
  output.push('');
  
  // Cache stats
  output.push('💾 CACHE PERFORMANCE');
  output.push(`${indent}Cache Hit Rate: ${((metrics.cache_hits?.values?.rate || 0) * 100).toFixed(2)}%`);
  output.push('');
  
  // Error rate
  output.push('❌ ERROR RATE');
  output.push(`${indent}Error Rate: ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%`);
  output.push('');
  
  // Thresholds
  output.push('🎯 THRESHOLD STATUS');
  const thresholds = data.root_group?.checks || [];
  thresholds.forEach(check => {
    const passed = check.passes === check.fails + check.passes;
    const status = passed ? '✅' : '❌';
    output.push(`${indent}${status} ${check.name}: ${check.passes}/${check.passes + check.fails}`);
  });
  output.push('');
  
  output.push('═══════════════════════════════════════════════════');
  output.push('');

  return output.join('\n');
}
