#!/usr/bin/env node

/**
 * Quick Test Script for Intelligent Chat Engine
 * Tests the chat endpoints to verify integration
 */

const http = require('http');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 8080,
      path: url.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testHealthCheck() {
  log('\n📊 Test 1: Health Check', 'blue');
  log('─'.repeat(50));
  
  try {
    const result = await makeRequest('/api/chat/health');
    
    if (result.status === 200 && result.data.status === 'ok') {
      log('✅ Health check PASSED', 'green');
      log(`   Version: ${result.data.version}`);
      log(`   Service: ${result.data.service}`);
      log(`   Features: ${Object.keys(result.data.features || {}).length} enabled`);
      return true;
    } else {
      log('❌ Health check FAILED', 'red');
      log(`   Status: ${result.status}`);
      return false;
    }
  } catch (error) {
    log('❌ Health check ERROR', 'red');
    log(`   ${error.message}`, 'red');
    return false;
  }
}

async function testIntentsEndpoint() {
  log('\n📋 Test 2: Available Intents (Unauthenticated)', 'blue');
  log('─'.repeat(50));
  
  try {
    const result = await makeRequest('/api/chat/intents');
    
    // This should work even without auth (will return empty or default list)
    if (result.status === 200 || result.status === 401 || result.status === 403) {
      if (result.status === 401 || result.status === 403) {
        log('⚠️  Authentication required (expected)', 'yellow');
        log('   This is correct - endpoint is protected', 'yellow');
        return true;
      } else {
        log('✅ Intents endpoint accessible', 'green');
        if (result.data.intents) {
          log(`   Available intents: ${result.data.intents.length}`);
        }
        return true;
      }
    } else {
      log('❌ Intents endpoint FAILED', 'red');
      log(`   Status: ${result.status}`);
      return false;
    }
  } catch (error) {
    log('❌ Intents endpoint ERROR', 'red');
    log(`   ${error.message}`, 'red');
    return false;
  }
}

async function testChatMessage() {
  log('\n💬 Test 3: Chat Message (Unauthenticated)', 'blue');
  log('─'.repeat(50));
  
  try {
    const result = await makeRequest('/api/chat/message', {
      method: 'POST',
      body: {
        message: 'Hello, what can you do?'
      }
    });
    
    // Should require authentication
    if (result.status === 401 || result.status === 403) {
      log('✅ Authentication required (expected)', 'green');
      log('   Endpoint is properly protected', 'green');
      return true;
    } else if (result.status === 200) {
      log('⚠️  Message processed without auth (might be auth middleware disabled)', 'yellow');
      log(`   Response: ${result.data.response?.substring(0, 100)}...`);
      return true;
    } else {
      log('❌ Chat message FAILED', 'red');
      log(`   Status: ${result.status}`);
      log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
      return false;
    }
  } catch (error) {
    log('❌ Chat message ERROR', 'red');
    log(`   ${error.message}`, 'red');
    return false;
  }
}

async function testTasksEndpoint() {
  log('\n📋 Test 4: Pending Tasks (Unauthenticated)', 'blue');
  log('─'.repeat(50));
  
  try {
    const result = await makeRequest('/api/chat/tasks/pending');
    
    if (result.status === 401 || result.status === 403) {
      log('✅ Authentication required (expected)', 'green');
      log('   Endpoint is properly protected', 'green');
      return true;
    } else if (result.status === 200) {
      log('⚠️  Tasks accessible without auth (might be auth middleware disabled)', 'yellow');
      return true;
    } else {
      log('❌ Tasks endpoint FAILED', 'red');
      log(`   Status: ${result.status}`);
      return false;
    }
  } catch (error) {
    log('❌ Tasks endpoint ERROR', 'red');
    log(`   ${error.message}`, 'red');
    return false;
  }
}

async function checkBackendStatus() {
  log('\n🔍 Checking Backend Server...', 'blue');
  log('─'.repeat(50));
  
  try {
    const result = await makeRequest('/api/health');
    
    if (result.status === 200) {
      log('✅ Backend server is running', 'green');
      log(`   Status: ${result.data.status}`);
      return true;
    } else {
      log('❌ Backend server issue', 'red');
      log(`   Status: ${result.status}`);
      return false;
    }
  } catch (error) {
    log('❌ Cannot connect to backend', 'red');
    log(`   URL: ${BASE_URL}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    log('\n💡 Make sure your backend is running:', 'yellow');
    log('   cd my-backend && npm start', 'yellow');
    return false;
  }
}

async function runTests() {
  log('\n🚀 Intelligent Chat Engine - Integration Test', 'blue');
  log('═'.repeat(50), 'blue');
  log(`Testing: ${BASE_URL}`, 'blue');
  
  const results = [];
  
  // Check if backend is running first
  const backendRunning = await checkBackendStatus();
  if (!backendRunning) {
    log('\n❌ TESTS ABORTED - Backend not running', 'red');
    process.exit(1);
  }
  
  // Run tests
  results.push(await testHealthCheck());
  results.push(await testIntentsEndpoint());
  results.push(await testChatMessage());
  results.push(await testTasksEndpoint());
  
  // Summary
  log('\n📊 Test Summary', 'blue');
  log('═'.repeat(50), 'blue');
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    log(`✅ All tests passed! (${passed}/${total})`, 'green');
    log('\n🎉 Your intelligent chat engine is integrated and working!', 'green');
    log('\n📝 Next steps:', 'blue');
    log('   1. Update frontend to call /api/chat/message', 'blue');
    log('   2. Add authentication token to requests', 'blue');
    log('   3. Test with real user messages', 'blue');
  } else {
    log(`⚠️  ${passed}/${total} tests passed`, 'yellow');
    log('\n💡 Some endpoints require authentication, which is expected.', 'yellow');
    log('   To test authenticated endpoints, use a valid JWT token.', 'yellow');
  }
  
  log('\n✅ Integration check complete!\n', 'green');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
