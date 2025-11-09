#!/usr/bin/env node
// Quick test script for Mattermost integration
const MM_BASE = 'https://mattermost-production-84fd.up.railway.app';
const FRONTEND = 'http://localhost:3000';

async function test() {
  console.log('🔍 Testing Mattermost Integration...\n');
  
  // 1. Test direct Mattermost ping
  console.log('1️⃣ Testing Mattermost server...');
  const ping = await fetch(`${MM_BASE}/api/v4/system/ping`);
  console.log(`   Status: ${ping.status} ${ping.ok ? '✅' : '❌'}`);
  
  // 2. Test frontend health endpoint
  console.log('\n2️⃣ Testing frontend health API...');
  const health = await fetch(`${FRONTEND}/api/mattermost/health`);
  const healthData = await health.json();
  console.log(`   Status: ${health.status} ${health.ok ? '✅' : '❌'}`);
  console.log(`   Data:`, healthData);
  
  // 3. Test provision endpoint (with mock user)
  console.log('\n3️⃣ Testing provision API...');
  const provision = await fetch(`${FRONTEND}/api/mattermost/provision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: {
        id: 1,
        email: 'admin@bisman.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN'
      }
    })
  });
  const provisionData = await provision.json();
  console.log(`   Status: ${provision.status} ${provision.ok ? '✅' : '❌'}`);
  console.log(`   Data:`, provisionData);
  
  // 4. Test login endpoint
  console.log('\n4️⃣ Testing login API...');
  const login = await fetch(`${FRONTEND}/api/mattermost/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@bisman.com',
      password: 'Welcome@2025'
    })
  });
  const loginData = await login.json();
  console.log(`   Status: ${login.status} ${login.ok ? '✅' : '❌'}`);
  console.log(`   Data:`, loginData);
  
  console.log('\n✅ Test complete!');
}

test().catch(console.error);
