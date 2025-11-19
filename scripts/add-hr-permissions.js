const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres@localhost:5432/BISMAN'
});

async function addHRPermissions() {
  try {
    // Get HR user ID
    const userResult = await pool.query('SELECT id, username, role FROM users WHERE role = $1', ['HR']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No HR user found');
      return;
    }
    
    const hrUser = userResult.rows[0];
    console.log('Found HR user:', hrUser);
    
    // Check if user_permissions table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
      ['user_permissions']
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating user_permissions table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_permissions (
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
    
    // Insert or update permissions for HR user
    const hrPages = [
      'user-creation',
      'user-settings', 
      'about-me'
    ];
    
    await pool.query(`
      INSERT INTO user_permissions (user_id, allowed_pages)
      VALUES ($1, $2)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        allowed_pages = EXCLUDED.allowed_pages,
        updated_at = CURRENT_TIMESTAMP
    `, [hrUser.id, hrPages]);
    
    console.log('\n✅ HR permissions added successfully!');
    console.log('Allowed pages:', hrPages);
    
    // Verify
    const verify = await pool.query('SELECT * FROM user_permissions WHERE user_id = $1', [hrUser.id]);
    console.log('\nVerified permissions:', verify.rows[0]);
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
}

addHRPermissions();
