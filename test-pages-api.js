#!/usr/bin/env node

/**
 * Test script to verify pages API is working correctly
 */

const http = require('http');

function makeRequest(port, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      headers: {
        'Cookie': 'token=demo_token' // Add a dummy token
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testPagesAPI() {
  console.log('🧪 Testing Pages API...\n');

  try {
    console.log('1️⃣ Testing Backend (port 3001) - /api/pages');
    const backendResult = await makeRequest(3001, '/api/pages');
    console.log('   Status:', backendResult.statusCode);
    
    if (backendResult.statusCode === 200) {
      try {
        const data = JSON.parse(backendResult.body);
        console.log('   ✅ Success!');
        console.log('   Pages count:', data.count || data.data?.length || 'unknown');
        console.log('   Data type:', Array.isArray(data.data) ? 'Array' : typeof data.data);
        console.log('   Sample pages:', data.data?.slice(0, 3).map(p => p.name).join(', '));
      } catch (e) {
        console.log('   ⚠️  Could not parse JSON:', backendResult.body.substring(0, 200));
      }
    } else {
      console.log('   ❌ Error:', backendResult.body);
    }

    console.log('\n2️⃣ Testing Frontend proxy (port 3000) - /api/pages');
    const frontendResult = await makeRequest(3000, '/api/pages');
    console.log('   Status:', frontendResult.statusCode);
    
    if (frontendResult.statusCode === 200) {
      try {
        const data = JSON.parse(frontendResult.body);
        console.log('   ✅ Success!');
        console.log('   Pages count:', data.count || data.data?.length || 'unknown');
        console.log('   Data type:', Array.isArray(data.data) ? 'Array' : typeof data.data);
        console.log('   Sample pages:', data.data?.slice(0, 3).map(p => p.name).join(', '));
      } catch (e) {
        console.log('   ⚠️  Could not parse JSON:', frontendResult.body.substring(0, 200));
      }
    } else {
      console.log('   ❌ Error:', frontendResult.body);
    }

    console.log('\n3️⃣ Testing /api/privileges/roles');
    const rolesResult = await makeRequest(3001, '/api/privileges/roles');
    console.log('   Status:', rolesResult.statusCode);
    
    if (rolesResult.statusCode === 200) {
      try {
        const data = JSON.parse(rolesResult.body);
        console.log('   ✅ Success!');
        console.log('   Roles count:', data.data?.length || 'unknown');
        console.log('   Sample roles:', data.data?.slice(0, 5).map(r => r.name).join(', '));
      } catch (e) {
        console.log('   ⚠️  Could not parse JSON');
      }
    } else {
      console.log('   ❌ Error:', rolesResult.body);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPagesAPI();
