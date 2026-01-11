#!/usr/bin/env node
/**
 * Test subscription info endpoint on Railway
 */

const https = require('https');

const CLIENT_ID = '6b68f86a-225f-480f-ae29-292da9e565d3';

// Test by calling the backend directly with a mock user context
const BACKEND_URL = 'https://bisman-erp-backend-production.up.railway.app';

// We need to login first to get a token
console.log('Testing subscription enforcement logic locally...\n');

// Instead, let's test the function directly
const { Client } = require('pg');

async function testSubscription() {
  const client = new Client({
    connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    // 1. Check client_subscriptions
    console.log('1. Checking client_subscriptions...');
    const sub = await client.query(`
      SELECT cs.*, sp.name as plan_name, sp.max_users 
      FROM client_subscriptions cs
      JOIN subscription_plans sp ON sp.id = cs.plan_id
      WHERE cs.client_id = $1
    `, [CLIENT_ID]);
    
    if (sub.rows.length === 0) {
      console.log('❌ No subscription found for client!');
    } else {
      console.log('✅ Subscription found:');
      console.log('   Plan:', sub.rows[0].plan_name);
      console.log('   Max Users:', sub.rows[0].max_users);
      console.log('   State:', sub.rows[0].state);
    }

    // 2. Count users
    console.log('\n2. Counting users...');
    const userCount = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) as total
      FROM users_enhanced 
      WHERE tenant_id = $1
    `, [CLIENT_ID]);
    
    console.log('   Total users:', userCount.rows[0].total);
    console.log('   Active users:', userCount.rows[0].active);

    // 3. Calculate limits
    const maxUsers = parseInt(sub.rows[0]?.max_users || 5);
    const activeUsers = parseInt(userCount.rows[0]?.active || 0);
    const totalUsers = parseInt(userCount.rows[0]?.total || 0);
    
    console.log('\n3. Calculated limits:');
    console.log('   Max users:', maxUsers);
    console.log('   Active users:', activeUsers);
    console.log('   Can create user:', totalUsers < maxUsers);
    console.log('   Can activate user:', activeUsers < maxUsers);

    if (totalUsers < maxUsers && activeUsers < maxUsers) {
      console.log('\n✅ User should be able to create new users!');
      console.log('   The issue is likely in the backend code or Prisma query.');
    } else {
      console.log('\n⚠️ User limit is actually reached.');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

testSubscription();
