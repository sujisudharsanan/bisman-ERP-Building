/**
 * K6 Stress Test for BISMAN ERP
 * Tests system breaking points and recovery
 * 
 * Run with: k6 run stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Warm up
    { duration: '5m', target: 100 },   // Normal load
    { duration: '5m', target: 200 },   // Stress load
    { duration: '5m', target: 500 },   // Heavy stress
    { duration: '5m', target: 1000 },  // Breaking point
    { duration: '5m', target: 0 },     // Recovery
  ],
  thresholds: {
    'http_req_duration': ['p(99)<5000'], // 99% under 5s (stress tolerance)
    'errors': ['rate<0.10'],              // <10% errors under stress
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://your-erp.railway.app';

export default function() {
  const endpoints = [
    '/api/health',
    '/api/dashboard/metrics',
    '/api/users?page=1&limit=10',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`);
  
  const success = check(res, {
    'status is 200 or 429': (r) => [200, 429].includes(r.status),
  });
  
  errorRate.add(!success);
  
  sleep(0.5);
}

export function handleSummary(data) {
  const p99 = data.metrics.http_req_duration.values['p(99)'];
  const errors = data.metrics.errors.values.rate * 100;
  
  console.log('\n🔥 === STRESS TEST RESULTS ===');
  console.log(`P99 Response Time: ${p99.toFixed(2)}ms`);
  console.log(`Error Rate: ${errors.toFixed(2)}%`);
  
  if (p99 > 5000 || errors > 10) {
    console.log('🔴 System reached breaking point');
  } else {
    console.log('🟢 System handled stress well');
  }
  
  return {
    'stress-test-results.json': JSON.stringify(data, null, 2),
  };
}
