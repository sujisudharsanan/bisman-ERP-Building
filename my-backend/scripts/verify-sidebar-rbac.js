#!/usr/bin/env node
/**
 * Sidebar RBAC Verification Script
 * 
 * Tests the sidebar menu API for different user roles to verify RBAC is working.
 * 
 * Usage:
 *   node scripts/verify-sidebar-rbac.js
 * 
 * Prerequisites:
 *   - Backend must be running on localhost:5000
 *   - Test users must exist in database
 */

const http = require('http');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

// Test credentials for different roles
const TEST_USERS = [
  { 
    name: 'Super Admin',
    email: 'super_admin@bisman.demo', 
    password: 'Demo@123',
    expectedMinPages: 10,
    expectedMenuType: 'super-admin'
  },
  { 
    name: 'Operations User',
    email: 'demo_hub_incharge@bisman.demo', 
    password: 'Demo@123',
    expectedMinPages: 5,
    expectedMenuType: 'user'
  },
  { 
    name: 'Accountant',
    email: 'demo_accountant@bisman.demo', 
    password: 'Demo@123',
    expectedMinPages: 3,
    expectedMenuType: 'user'
  }
];

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
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
          const cookies = res.headers['set-cookie'] || [];
          resolve({ 
            status: res.statusCode, 
            body: JSON.parse(data),
            cookies
          });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, cookies: [] });
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

async function login(email, password) {
  const result = await makeRequest(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    body: { email, password }
  });
  
  if (result.status !== 200 || !result.body.ok) {
    throw new Error(`Login failed: ${result.body.message || result.body.error || 'Unknown error'}`);
  }
  
  // Extract session cookie
  const cookies = result.cookies
    .map(c => c.split(';')[0])
    .join('; ');
  
  return { user: result.body.user, cookies };
}

async function getSidebar(cookies) {
  const result = await makeRequest(`${API_BASE}/api/menu/sidebar`, {
    headers: { Cookie: cookies }
  });
  
  return result;
}

async function checkPageAccess(pageCode, cookies) {
  const result = await makeRequest(`${API_BASE}/api/menu/check-access/${pageCode}`, {
    headers: { Cookie: cookies }
  });
  
  return result;
}

async function verifyUser(testUser) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${testUser.name} (${testUser.email})`);
  console.log('='.repeat(60));
  
  try {
    // Login
    console.log('\n1. Logging in...');
    const { user, cookies } = await login(testUser.email, testUser.password);
    console.log(`   ✅ Logged in as ${user.username || user.email} (Role: ${user.role || user.roleName})`);
    
    // Get sidebar
    console.log('\n2. Fetching sidebar menu...');
    const sidebarResult = await getSidebar(cookies);
    
    if (sidebarResult.status !== 200 || !sidebarResult.body.ok) {
      console.log(`   ❌ Sidebar fetch failed: ${sidebarResult.body.error}`);
      return false;
    }
    
    const menu = sidebarResult.body;
    console.log(`   ✅ Received ${menu.totalItems} pages in ${menu.modules?.length || 0} modules`);
    console.log(`   Menu type: ${menu.menuType}`);
    console.log(`   Source: ${menu.source}`);
    
    // Verify expectations
    if (menu.totalItems < testUser.expectedMinPages) {
      console.log(`   ⚠️  Warning: Expected at least ${testUser.expectedMinPages} pages, got ${menu.totalItems}`);
    }
    
    if (menu.menuType !== testUser.expectedMenuType) {
      console.log(`   ⚠️  Warning: Expected menuType '${testUser.expectedMenuType}', got '${menu.menuType}'`);
    }
    
    // List modules
    console.log('\n3. Modules received:');
    for (const mod of (menu.modules || [])) {
      console.log(`   📁 ${mod.name} (${mod.items?.length || 0} pages)`);
    }
    
    // Test page access check
    console.log('\n4. Testing page access checks...');
    
    // Pick first page from menu
    if (menu.flatItems?.length > 0) {
      const testPage = menu.flatItems[0];
      const accessResult = await checkPageAccess(testPage.id, cookies);
      
      if (accessResult.body.hasAccess) {
        console.log(`   ✅ ${testPage.id}: Access granted (${accessResult.body.accessLevel})`);
      } else {
        console.log(`   ❌ ${testPage.id}: Access denied (${accessResult.body.reason})`);
      }
    }
    
    // Test access to a page user should NOT have
    const restrictedPage = testUser.expectedMenuType === 'super-admin' 
      ? 'ENTERPRISE_DASHBOARD'  // Super admin can't see enterprise pages
      : 'SUPER_ADMIN_DASHBOARD'; // Regular users can't see super admin pages
    
    const restrictedResult = await checkPageAccess(restrictedPage, cookies);
    if (!restrictedResult.body.hasAccess) {
      console.log(`   ✅ ${restrictedPage}: Correctly denied access`);
    } else {
      console.log(`   ❌ ${restrictedPage}: Should have been denied!`);
      return false;
    }
    
    console.log('\n✅ All checks passed for', testUser.name);
    return true;
    
  } catch (error) {
    console.log(`\n❌ Error testing ${testUser.name}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          SIDEBAR RBAC VERIFICATION                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nAPI Base: ${API_BASE}`);
  
  let passed = 0;
  let failed = 0;
  
  for (const testUser of TEST_USERS) {
    try {
      const result = await verifyUser(testUser);
      if (result) passed++;
      else failed++;
    } catch (e) {
      console.error(`Error testing ${testUser.name}:`, e.message);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Passed: ${passed}/${TEST_USERS.length}`);
  console.log(`Failed: ${failed}/${TEST_USERS.length}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All RBAC tests passed!');
    process.exit(0);
  }
}

main().catch(console.error);
