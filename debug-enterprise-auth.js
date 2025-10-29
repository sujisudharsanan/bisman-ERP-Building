/**
 * Debug Enterprise Admin Authentication Issue
 * This script decodes the JWT token and shows exactly what the backend sees
 */

const http = require('http');
const jwt = require('jsonwebtoken');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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

async function debugAuth() {
  console.log('\n' + '='.repeat(70));
  log('cyan', '🔍 ENTERPRISE ADMIN AUTHENTICATION DEBUG');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Login
    log('blue', '📝 Step 1: Logging in as enterprise@bisman.erp...');
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'enterprise@bisman.erp',
      password: 'enterprise123'
    });

    if (loginResponse.status !== 200) {
      log('red', `❌ Login failed: ${JSON.stringify(loginResponse.data, null, 2)}`);
      return;
    }

    log('green', '✅ Login successful!\n');
    const token = loginResponse.data.accessToken;
    
    // Step 2: Decode JWT
    log('blue', '📝 Step 2: Decoding JWT token...');
    const decoded = jwt.decode(token, { complete: true });
    
    console.log(colors.yellow + 'JWT Header:' + colors.reset);
    console.log(JSON.stringify(decoded.header, null, 2));
    
    console.log(colors.yellow + '\nJWT Payload:' + colors.reset);
    console.log(JSON.stringify(decoded.payload, null, 2));
    
    // Highlight the critical fields
    log('magenta', `\n🔑 KEY FIELDS IN TOKEN:`);
    log('cyan', `   id/sub: ${decoded.payload.sub || decoded.payload.id || 'NOT FOUND'}`);
    log('cyan', `   email: ${decoded.payload.email || 'NOT FOUND'}`);
    log('cyan', `   role: ${decoded.payload.role || 'NOT FOUND'}`);
    log('cyan', `   userType: ${decoded.payload.userType || 'NOT FOUND'}`);
    log('cyan', `   productType: ${decoded.payload.productType || 'NOT FOUND'}`);
    
    // Step 3: Test the endpoint with full logging
    log('blue', '\n📝 Step 3: Testing /api/enterprise-admin/super-admins...');
    log('yellow', '   Sending request with:');
    log('yellow', `   - Authorization: Bearer ${token.substring(0, 30)}...`);
    log('yellow', `   - Cookie: access_token=${token.substring(0, 30)}...`);
    
    const apiResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/enterprise-admin/super-admins',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `access_token=${token}`,
        'Content-Type': 'application/json'
      }
    });

    log('cyan', `\n   API Response Status: ${apiResponse.status}`);
    
    if (apiResponse.status === 403) {
      log('red', '❌ 403 FORBIDDEN - Access Denied');
      log('red', '   Response: ' + JSON.stringify(apiResponse.data, null, 2));
      
      log('yellow', '\n💡 DEBUGGING HINTS:');
      log('yellow', '   1. Check backend logs for [requireRole] messages');
      log('yellow', '   2. The middleware is rejecting the role');
      log('yellow', '   3. Look for role mismatch in logs');
      log('yellow', '\n   Expected in logs:');
      log('cyan', '      [requireRole] User actual role: ENTERPRISE_ADMIN');
      log('cyan', '      [requireRole] Allowed roles: [ \'ENTERPRISE_ADMIN\' ]');
      log('cyan', '      [requireRole] ✅ Role authorization passed');
      
    } else if (apiResponse.status === 200) {
      log('green', '✅ SUCCESS - API returned data!');
      const admins = Array.isArray(apiResponse.data) ? apiResponse.data : (apiResponse.data.superAdmins || []);
      log('green', `   Found ${admins.length} Super Admins`);
    } else {
      log('yellow', `⚠️  Unexpected status: ${apiResponse.status}`);
      log('yellow', '   Response: ' + JSON.stringify(apiResponse.data, null, 2));
    }

    // Step 4: Check what the middleware sees
    log('blue', '\n📝 Step 4: Checking middleware authentication...');
    log('yellow', '   Backend middleware should:');
    log('cyan', '   1. Extract token from Cookie or Authorization header');
    log('cyan', `   2. Verify JWT with secret: "${process.env.JWT_SECRET || 'dev-secret'}"`);
    log('cyan', '   3. Look up enterpriseAdmin with id:', decoded.payload.sub || decoded.payload.id);
    log('cyan', '   4. Set req.user.roleName = "ENTERPRISE_ADMIN"');
    log('cyan', '   5. Compare roleName against requireRole("ENTERPRISE_ADMIN")');
    
    // Step 5: Verify database
    log('blue', '\n📝 Step 5: Verifying database has the enterprise admin...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const enterpriseAdmin = await prisma.enterpriseAdmin.findUnique({
      where: { id: decoded.payload.sub || decoded.payload.id || 1 },
      select: {
        id: true,
        email: true,
        name: true,
        is_active: true
      }
    });
    
    if (enterpriseAdmin) {
      log('green', '✅ Enterprise Admin found in database');
      log('cyan', `   ID: ${enterpriseAdmin.id}`);
      log('cyan', `   Email: ${enterpriseAdmin.email}`);
      log('cyan', `   Name: ${enterpriseAdmin.name}`);
      log('cyan', `   Active: ${enterpriseAdmin.is_active}`);
    } else {
      log('red', '❌ Enterprise Admin NOT found in database!');
      log('red', `   Looking for ID: ${decoded.payload.sub || decoded.payload.id}`);
    }
    
    await prisma.$disconnect();

    // Final Summary
    console.log('\n' + '='.repeat(70));
    log('cyan', '📊 DIAGNOSIS SUMMARY');
    console.log('='.repeat(70));
    
    log(loginResponse.status === 200 ? 'green' : 'red', 
      `${loginResponse.status === 200 ? '✅' : '❌'} Login: ${loginResponse.status}`);
    log(decoded ? 'green' : 'red', 
      `${decoded ? '✅' : '❌'} JWT Token Decoded`);
    log(decoded && decoded.payload.role === 'ENTERPRISE_ADMIN' ? 'green' : 'red', 
      `${decoded && decoded.payload.role === 'ENTERPRISE_ADMIN' ? '✅' : '❌'} Token has role=ENTERPRISE_ADMIN`);
    log(enterpriseAdmin ? 'green' : 'red', 
      `${enterpriseAdmin ? '✅' : '❌'} User exists in database`);
    log(apiResponse.status === 200 ? 'green' : 'red', 
      `${apiResponse.status === 200 ? '✅' : '❌'} API Endpoint: ${apiResponse.status}`);
    
    console.log('='.repeat(70) + '\n');

    if (apiResponse.status === 403) {
      log('red', '🚨 PROBLEM IDENTIFIED:');
      log('red', '   The backend middleware is rejecting the ENTERPRISE_ADMIN role.');
      log('red', '   This means either:');
      log('red', '   1. The middleware.auth.js requireRole() is case-sensitive');
      log('red', '   2. The JWT payload.role is not being set correctly');
      log('red', '   3. The req.user.roleName is not being set in authenticate()');
      log('yellow', '\n💡 NEXT STEPS:');
      log('yellow', '   1. Check backend logs (tail -f backend.log)');
      log('yellow', '   2. Look for [requireRole] log messages');
      log('yellow', '   3. Compare "User actual role" vs "Allowed roles"');
      log('yellow', '   4. If they match but still 403, there\'s a logic bug');
    }

  } catch (error) {
    log('red', `\n❌ ERROR: ${error.message}`);
    console.error(error);
  }
}

debugAuth();
