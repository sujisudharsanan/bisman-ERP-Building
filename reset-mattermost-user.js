#!/usr/bin/env node
// Reset Mattermost user with correct password
const MM_BASE = 'https://mattermost-production-84fd.up.railway.app';
const MM_ADMIN_TOKEN = '1y54w4qe4fg3djq186tixu34uc';
const USER_EMAIL = 'admin@bisman.com';
const NEW_PASSWORD = 'Welcome@2025';

async function resetUser() {
  console.log('🔧 Resetting Mattermost user password...\n');
  
  // 1. Find user by email
  console.log('1️⃣ Finding user...');
  const findRes = await fetch(`${MM_BASE}/api/v4/users/email/${encodeURIComponent(USER_EMAIL)}`, {
    headers: {
      'Authorization': `Bearer ${MM_ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!findRes.ok) {
    console.log(`   User not found (${findRes.status})`);
    return;
  }
  
  const user = await findRes.json();
  console.log(`   Found user: ${user.username} (ID: ${user.id})`);
  
  // 2. Update password
  console.log('\n2️⃣ Updating password...');
  const updateRes = await fetch(`${MM_BASE}/api/v4/users/${user.id}/password`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${MM_ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      new_password: NEW_PASSWORD
    })
  });
  
  if (!updateRes.ok) {
    const error = await updateRes.text();
    console.log(`   ❌ Failed to update password: ${updateRes.status}`);
    console.log(`   Error: ${error}`);
    return;
  }
  
  console.log(`   ✅ Password updated successfully!`);
  
  // 3. Test login
  console.log('\n3️⃣ Testing login...');
  const loginRes = await fetch(`${MM_BASE}/api/v4/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      login_id: USER_EMAIL,
      password: NEW_PASSWORD
    }),
    redirect: 'manual'
  });
  
  console.log(`   Login status: ${loginRes.status} ${loginRes.ok || loginRes.status === 307 ? '✅' : '❌'}`);
  
  console.log('\n✅ User reset complete! Try opening the Spark chat box again.');
}

resetUser().catch(console.error);
