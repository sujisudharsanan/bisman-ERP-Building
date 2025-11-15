/**
 * Test Enterprise Admin API - Super Admins Endpoint
 * This script tests the super-admins endpoint with proper authentication
 */

const http = require('http');

// Configuration
const BACKEND_URL = 'http://localhost:3001';
const ENTERPRISE_EMAIL = 'enterprise@bisman.erp';
const ENTERPRISE_PASSWORD = 'enterprise123';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function testSuperAdminsAPI() {
  console.log('\n' + '='.repeat(60));
  log('cyan', '🧪 ENTERPRISE ADMIN - SUPER ADMINS API TEST');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Login as Enterprise Admin
    log('blue', '📝 Step 1: Logging in as Enterprise Admin...');
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: ENTERPRISE_EMAIL,
      password: ENTERPRISE_PASSWORD
    });

    if (loginResponse.status !== 200 || !loginResponse.data.accessToken) {
      log('red', `❌ Login failed: ${JSON.stringify(loginResponse.data)}`);
      return;
    }

    const token = loginResponse.data.accessToken;
    log('green', `✅ Login successful!`);
    log('yellow', `   User: ${loginResponse.data.user?.email || 'Unknown'}`);
    log('yellow', `   Role: ${loginResponse.data.user?.role || 'Unknown'}`);
    log('yellow', `   Token: ${token.substring(0, 20)}...`);

    // Step 2: Test /api/enterprise-admin/super-admins
    log('blue', '\n📝 Step 2: Testing /api/enterprise-admin/super-admins...');
    const superAdminsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/enterprise-admin/super-admins',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `access_token=${token}`
      }
    });

    log('cyan', `   Status: ${superAdminsResponse.status}`);
    
    if (superAdminsResponse.status === 200) {
      log('green', `✅ Super Admins API Success!`);
      const superAdmins = Array.isArray(superAdminsResponse.data) 
        ? superAdminsResponse.data 
        : superAdminsResponse.data.superAdmins || [];
      
      log('yellow', `   Total Super Admins: ${superAdmins.length}`);
      
      if (superAdmins.length > 0) {
        console.log('\n   Super Admins List:');
        superAdmins.forEach((admin, index) => {
          log('cyan', `   ${index + 1}. ${admin.name || 'Unknown'} (${admin.email || 'No email'})`);
          if (admin.assignedModules) {
            log('yellow', `      Assigned Modules: ${admin.assignedModules.length}`);
          }
        });
      }
    } else {
      log('red', `❌ Super Admins API Failed!`);
      log('red', `   Response: ${JSON.stringify(superAdminsResponse.data, null, 2)}`);
    }

    // Step 3: Test fallback endpoint
    log('blue', '\n📝 Step 3: Testing fallback /api/enterprise/super-admins...');
    const fallbackResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/enterprise/super-admins',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `access_token=${token}`
      }
    });

    log('cyan', `   Status: ${fallbackResponse.status}`);
    
    if (fallbackResponse.status === 200) {
      log('green', `✅ Fallback API Success!`);
      const superAdmins = Array.isArray(fallbackResponse.data) 
        ? fallbackResponse.data 
        : fallbackResponse.data.superAdmins || [];
      log('yellow', `   Total Super Admins: ${superAdmins.length}`);
    } else {
      log('red', `❌ Fallback API Failed!`);
      log('red', `   Response: ${JSON.stringify(fallbackResponse.data, null, 2)}`);
    }

    // Step 4: Direct database check
    log('blue', '\n📝 Step 4: Direct database verification...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const dbSuperAdmins = await prisma.superAdmin.findMany({
      select: { id: true, email: true, name: true }
    });
    
    log('green', `✅ Database has ${dbSuperAdmins.length} Super Admins`);
    dbSuperAdmins.forEach((admin, index) => {
      log('cyan', `   ${index + 1}. ${admin.name} (${admin.email})`);
    });
    
    await prisma.$disconnect();

    // Summary
    console.log('\n' + '='.repeat(60));
    log('cyan', '📊 TEST SUMMARY');
    console.log('='.repeat(60));
    log(loginResponse.status === 200 ? 'green' : 'red', 
      `${loginResponse.status === 200 ? '✅' : '❌'} Login: ${loginResponse.status}`);
    log(superAdminsResponse.status === 200 ? 'green' : 'red', 
      `${superAdminsResponse.status === 200 ? '✅' : '❌'} Enterprise Admin API: ${superAdminsResponse.status}`);
    log(fallbackResponse.status === 200 ? 'green' : 'red', 
      `${fallbackResponse.status === 200 ? '✅' : '❌'} Fallback API: ${fallbackResponse.status}`);
    log('green', `✅ Database Super Admins: ${dbSuperAdmins.length}`);
    console.log('='.repeat(60) + '\n');

    // Recommendations
    if (superAdminsResponse.status === 403) {
      log('yellow', '💡 RECOMMENDATION:');
      log('yellow', '   The 403 error suggests a role/permission issue.');
      log('yellow', '   Check the backend middleware requireRole() configuration.');
      log('yellow', '   Verify the enterprise admin has the correct role in the database.');
    } else if (superAdminsResponse.status === 401) {
      log('yellow', '💡 RECOMMENDATION:');
      log('yellow', '   The 401 error suggests authentication is failing.');
      log('yellow', '   Check if the access_token cookie is being sent correctly.');
      log('yellow', '   Verify the JWT secret matches between frontend and backend.');
    }

  } catch (error) {
    log('red', `\n❌ ERROR: ${error.message}`);
    console.error(error);
  }
}

// Run the test
testSuperAdminsAPI();
