const { Pool } = require('pg');
require('dotenv').config({ path: './my-backend/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

async function verifySetup() {
  try {
    console.log('🔍 Verifying HR User Creation Page Setup\n');
    
    // 1. Check HR user exists
    const user = await pool.query(
      "SELECT id, email, role FROM users WHERE email = 'demo_hr@bisman.demo'"
    );
    
    if (user.rows.length === 0) {
      console.log('❌ HR user not found');
      return;
    }
    
    console.log('✅ HR User Found:');
    console.log('   Email:', user.rows[0].email);
    console.log('   Role:', user.rows[0].role);
    console.log('   ID:', user.rows[0].id);
    console.log('');
    
    // 2. Check permissions
    const perms = await pool.query(
      'SELECT allowed_pages FROM user_permissions WHERE user_id = $1',
      [user.rows[0].id]
    );
    
    if (perms.rows.length === 0) {
      console.log('❌ No permissions found');
      return;
    }
    
    const allowedPages = perms.rows[0].allowed_pages;
    console.log('✅ Permissions Found:');
    console.log('   Allowed Pages:', allowedPages);
    console.log('');
    
    // 3. Verify specific permission
    const hasUserCreation = allowedPages.includes('user-creation');
    console.log('✅ User Creation Permission:');
    console.log('   Has "user-creation":', hasUserCreation ? '✅ YES' : '❌ NO');
    console.log('');
    
    // 4. Summary
    console.log('📊 Summary:');
    console.log('   ✅ HR user exists');
    console.log('   ✅ Permissions table configured');
    console.log('   ' + (hasUserCreation ? '✅' : '❌') + ' "user-creation" permission granted');
    console.log('');
    
    if (hasUserCreation) {
      console.log('🎉 Setup Complete! HR user can access the Create New User page.');
      console.log('');
      console.log('📝 Next Steps:');
      console.log('   1. Logout from current session');
      console.log('   2. Login with: demo_hr@bisman.demo / hr123');
      console.log('   3. Look for "Create New User" in sidebar');
      console.log('   4. Click to navigate to /hr/user-creation');
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
  }
}

verifySetup();
