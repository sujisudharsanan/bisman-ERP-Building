const { Pool } = require('pg');
require('dotenv').config({ path: './my-backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false  // Local database doesn't use SSL
});

async function fixHRPermissions() {
  try {
    console.log('🔧 Fixing HR user permissions...\n');
    
    // Step 1: Check if HR user exists
    const userResult = await pool.query(
      'SELECT id, username, email, role FROM users WHERE email = $1',
      ['demo_hr@bisman.demo']
    );
    
    let hrUserId;
    
    if (userResult.rows.length === 0) {
      console.log('❌ HR user not found. Creating...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('hr123', 10);
      
      const newUser = await pool.query(`
        INSERT INTO users (username, email, password, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, email, role
      `, ['demo_hr', 'demo_hr@bisman.demo', hashedPassword, 'HR']);
      
      hrUserId = newUser.rows[0].id;
      console.log('✅ HR User created:', newUser.rows[0]);
    } else {
      hrUserId = userResult.rows[0].id;
      console.log('✅ HR User exists:');
      console.log('   ID:', userResult.rows[0].id);
      console.log('   Email:', userResult.rows[0].email);
      console.log('   Role:', userResult.rows[0].role);
    }
    
    console.log('');
    
    // Step 2: Ensure user_permissions table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_permissions')`
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('📝 Creating user_permissions table...');
      await pool.query(`
        CREATE TABLE user_permissions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          allowed_pages TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        )
      `);
      console.log('✅ Table created\n');
    }
    
    // Step 3: Add/Update HR permissions
    console.log('📝 Setting HR permissions...');
    const hrPages = ['user-creation', 'user-settings', 'about-me'];
    
    await pool.query(`
      INSERT INTO user_permissions (user_id, allowed_pages)
      VALUES ($1, $2)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        allowed_pages = EXCLUDED.allowed_pages,
        updated_at = CURRENT_TIMESTAMP
    `, [hrUserId, hrPages]);
    
    console.log('✅ HR Permissions set:', hrPages);
    
    // Step 4: Verify
    console.log('\n📋 Verification:');
    const verify = await pool.query(`
      SELECT u.id, u.email, u.role, up.allowed_pages
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.email = 'demo_hr@bisman.demo'
    `);
    
    console.table(verify.rows);
    
    console.log('\n✅ All done! HR user can now access:');
    console.log('   - /hr/user-creation (Create New User)');
    console.log('   - /common/user-settings (User Settings)');
    console.log('   - /common/about-me (About Me)');
    console.log('\nLogin credentials:');
    console.log('   Email: demo_hr@bisman.demo');
    console.log('   Password: hr123');
    
    await pool.end();
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    await pool.end();
    process.exit(1);
  }
}

fixHRPermissions();
