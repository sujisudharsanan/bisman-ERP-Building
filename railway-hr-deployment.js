/**
 * Railway Database Update Script
 * Adds HR user and permissions to Railway deployment
 */

const { Pool } = require('pg');

// Railway database connection
// Replace with your actual Railway DATABASE_URL
const RAILWAY_DATABASE_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!RAILWAY_DATABASE_URL) {
  console.error('❌ Error: RAILWAY_DATABASE_URL or DATABASE_URL environment variable not set');
  console.log('Usage: RAILWAY_DATABASE_URL="your-railway-db-url" node railway-hr-deployment.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: RAILWAY_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function deployHRUpdates() {
  console.log('🚀 Starting Railway Database Deployment...\n');
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to Railway database\n');
    
    // Step 1: Create HR user if not exists
    console.log('📝 Step 1: Creating HR user...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('hr123', 10);
    
    const userResult = await pool.query(`
      INSERT INTO users (username, email, password, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password = EXCLUDED.password,
        role = EXCLUDED.role
      RETURNING id, username, email, role
    `, ['demo_hr', 'demo_hr@bisman.demo', hashedPassword, 'HR']);
    
    const hrUser = userResult.rows[0];
    console.log('✅ HR user created/updated:', {
      id: hrUser.id,
      username: hrUser.username,
      email: hrUser.email,
      role: hrUser.role
    });
    console.log('   Credentials: demo_hr@bisman.demo / hr123\n');
    
    // Step 2: Ensure user_permissions table exists
    console.log('📝 Step 2: Ensuring user_permissions table exists...');
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
    console.log('✅ user_permissions table ready\n');
    
    // Step 3: Add HR permissions
    console.log('📝 Step 3: Adding HR permissions...');
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
    
    console.log('✅ HR permissions added:', hrPages);
    
    // Step 4: Verify permissions
    console.log('\n📝 Step 4: Verifying permissions...');
    const verifyResult = await pool.query(`
      SELECT u.id, u.username, u.email, u.role, up.allowed_pages
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.role = 'HR'
    `);
    
    console.log('✅ Verification complete:');
    console.table(verifyResult.rows);
    
    // Step 5: Check if roles table needs HR role
    console.log('\n📝 Step 5: Checking roles table...');
    const roleCheck = await pool.query(`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'roles'
      ) as table_exists
    `);
    
    if (roleCheck.rows[0].table_exists) {
      try {
        // Check if HR role already exists
        const hrRoleExists = await pool.query(`
          SELECT * FROM roles WHERE name = 'HR' OR display_name = 'HR'
        `);
        
        if (hrRoleExists.rows.length === 0) {
          // Insert HR role - adapt to the actual schema
          await pool.query(`
            INSERT INTO roles (name, display_name)
            VALUES ('HR', 'HR Manager')
            ON CONFLICT (name) DO NOTHING
          `);
          console.log('✅ HR role ensured in roles table\n');
        } else {
          console.log('✅ HR role already exists in roles table\n');
        }
      } catch (err) {
        console.log('ℹ️  Could not update roles table (may not be needed):', err.message, '\n');
      }
    } else {
      console.log('ℹ️  Roles table not found - skipping\n');
    }
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - HR user: demo_hr@bisman.demo');
    console.log('   - Password: hr123');
    console.log('   - Allowed pages:', hrPages.join(', '));
    console.log('\n✅ HR user can now login and access User Creation page\n');
    
  } catch (err) {
    console.error('\n❌ Deployment failed:');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run deployment
deployHRUpdates().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
