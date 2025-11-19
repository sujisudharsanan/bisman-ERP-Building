const { Pool } = require('pg');
require('dotenv').config({ path: './my-backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Don't use SSL for local database
  ssl: false
});

async function checkHRUser() {
  try {
    console.log('Checking HR user and permissions...\n');
    
    // Check if HR user exists
    const userResult = await pool.query(
      'SELECT id, username, email, role FROM users WHERE role = $1',
      ['HR']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ No HR user found in database');
      console.log('\nCreating HR user...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('hr123', 10);
      
      const newUser = await pool.query(`
        INSERT INTO users (username, email, password, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, email, role
      `, ['demo_hr', 'demo_hr@bisman.demo', hashedPassword, 'HR']);
      
      console.log('✅ HR User created:', newUser.rows[0]);
    } else {
      const hrUser = userResult.rows[0];
      console.log('✅ HR User found:');
      console.log('   ID:', hrUser.id);
      console.log('   Username:', hrUser.username);
      console.log('   Email:', hrUser.email);
      console.log('   Role:', hrUser.role);
      console.log('');
    }
    
    // Get HR user (after creation or if already exists)
    const hrUserResult = await pool.query(
      'SELECT id FROM users WHERE role = $1',
      ['HR']
    );
    const hrUserId = hrUserResult.rows[0].id;
    
    // Check if user_permissions table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_permissions')`
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating user_permissions table...');
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
      console.log('✅ Table created');
    }
    
    // Check user_permissions
    const permResult = await pool.query(
      'SELECT * FROM user_permissions WHERE user_id = $1',
      [hrUserId]
    );
    
    if (permResult.rows.length === 0) {
      console.log('❌ No permissions found for HR user');
      console.log('\nAdding HR permissions...');
      
      const hrPages = ['user-creation', 'user-settings', 'about-me'];
      
      await pool.query(`
        INSERT INTO user_permissions (user_id, allowed_pages)
        VALUES ($1, $2)
      `, [hrUserId, hrPages]);
      
      console.log('✅ HR Permissions added:', hrPages);
    } else {
      console.log('✅ HR Permissions:');
      console.log('   Allowed Pages:', permResult.rows[0].allowed_pages);
    }
    
    console.log('\n✅ All checks complete!');
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

checkHRUser();
