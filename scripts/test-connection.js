#!/usr/bin/env node

const fetch = require('node-fetch');

async function testConnection() {
  console.log('🔍 Testing Frontend-Backend Connection...\n');
  
  const tests = [
    {
      name: 'Backend Health Check',
      url: 'http://localhost:3001/api/health',
      method: 'GET'
    },
    {
      name: 'Backend Root',
      url: 'http://localhost:3001/',
      method: 'GET'
    },
    {
      name: 'Backend Login Test',
      url: 'http://localhost:3001/api/login',
      method: 'POST',
      body: JSON.stringify({
        email: 'staff@business.com',
        password: 'staff123'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Frontend Accessibility',
      url: 'http://localhost:3000',
      method: 'GET'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`🔗 Testing: ${test.name}`);
      
      const options = {
        method: test.method,
        headers: test.headers || {},
        body: test.body
      };
      
      const response = await fetch(test.url, options);
      const responseText = await response.text();
      
      if (response.ok) {
        console.log(`   ✅ SUCCESS: ${response.status} ${response.statusText}`);
        
        // Show response preview
        const preview = responseText.substring(0, 100);
        console.log(`   📄 Response: ${preview}${responseText.length > 100 ? '...' : ''}`);
      } else {
        console.log(`   ❌ FAILED: ${response.status} ${response.statusText}`);
        console.log(`   📄 Error: ${responseText.substring(0, 200)}`);
      }
      
    } catch (error) {
      console.log(`   ❌ CONNECTION ERROR: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('🏁 Connection tests completed!');
  console.log('\n📱 Frontend URL: http://localhost:3000');
  console.log('🔧 Backend URL: http://localhost:3001');
  console.log('🛡️ Security: HTTPS enforcement disabled in development');
}

testConnection().catch(console.error);
