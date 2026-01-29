/**
 * Create Non-Superuser Application Database Role
 * 
 * This script creates a secure database role for the BISMAN ERP application.
 * The role CANNOT bypass RLS, ensuring security policies are enforced.
 * 
 * Usage:
 *   node scripts/setup-app-db-role.js
 *   node scripts/setup-app-db-role.js --password=MySecurePassword123
 */

const { Pool } = require('pg');
const crypto = require('crypto');

// Configuration
const SUPERUSER_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

const APP_ROLE_NAME = 'bisman_app';

// Parse command line args
const args = process.argv.slice(2);
let appPassword = null;
for (const arg of args) {
  if (arg.startsWith('--password=')) {
    appPassword = arg.split('=')[1];
  }
}

// Generate secure password if not provided
if (!appPassword) {
  appPassword = crypto.randomBytes(24).toString('base64').replace(/[+/=]/g, 'x');
  console.log('\n🔐 Generated secure password for bisman_app role');
  console.log('   (Save this somewhere safe - you will need it for the connection string)\n');
}

async function setupAppRole() {
  const pool = new Pool({ connectionString: SUPERUSER_URL });
  
  console.log('🔒 DATABASE ROLE SETUP');
  console.log('='.repeat(60));
  console.log('Creating non-superuser role for application...\n');
  
  try {
    // Step 1: Check if we're connected as superuser
    const userCheck = await pool.query(`
      SELECT current_user, 
             (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) as is_super
    `);
    
    if (!userCheck.rows[0].is_super) {
      console.error('❌ ERROR: Must run this script as superuser (postgres)');
      console.error('   Current user:', userCheck.rows[0].current_user);
      process.exit(1);
    }
    
    console.log('✅ Connected as superuser:', userCheck.rows[0].current_user);
    
    // Step 2: Check if role exists
    const roleExists = await pool.query(`
      SELECT 1 FROM pg_roles WHERE rolname = $1
    `, [APP_ROLE_NAME]);
    
    if (roleExists.rows.length > 0) {
      console.log(`\n📝 Role '${APP_ROLE_NAME}' exists - updating configuration...`);
      
      // Update role to ensure it cannot bypass RLS
      await pool.query(`
        ALTER ROLE ${APP_ROLE_NAME} WITH
          NOSUPERUSER
          NOCREATEDB
          NOCREATEROLE
          NOBYPASSRLS
          NOREPLICATION
          PASSWORD '${appPassword}'
      `);
    } else {
      console.log(`\n📝 Creating role '${APP_ROLE_NAME}'...`);
      
      await pool.query(`
        CREATE ROLE ${APP_ROLE_NAME} WITH
          LOGIN
          PASSWORD '${appPassword}'
          NOSUPERUSER
          NOCREATEDB
          NOCREATEROLE
          NOBYPASSRLS
          NOREPLICATION
          CONNECTION LIMIT 100
      `);
    }
    
    console.log(`   ✅ Role configured with NOBYPASSRLS`);
    
    // Step 3: Grant schema access
    console.log('\n📝 Granting schema permissions...');
    await pool.query(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE_NAME}`);
    console.log('   ✅ Schema access granted');
    
    // Step 4: Grant table permissions
    console.log('\n📝 Granting table permissions...');
    await pool.query(`
      GRANT SELECT, INSERT, UPDATE, DELETE 
      ON ALL TABLES IN SCHEMA public 
      TO ${APP_ROLE_NAME}
    `);
    console.log('   ✅ Table permissions granted (SELECT, INSERT, UPDATE, DELETE)');
    
    // Step 5: Grant sequence permissions
    console.log('\n📝 Granting sequence permissions...');
    await pool.query(`
      GRANT USAGE, SELECT 
      ON ALL SEQUENCES IN SCHEMA public 
      TO ${APP_ROLE_NAME}
    `);
    console.log('   ✅ Sequence permissions granted');
    
    // Step 6: Grant function execution
    console.log('\n📝 Granting function execution...');
    try {
      await pool.query(`GRANT EXECUTE ON FUNCTION set_security_context(TEXT, TEXT, TEXT, TEXT, TEXT) TO ${APP_ROLE_NAME}`);
      await pool.query(`GRANT EXECUTE ON FUNCTION is_security_context_set() TO ${APP_ROLE_NAME}`);
      await pool.query(`GRANT EXECUTE ON FUNCTION log_security_access(TEXT, TEXT, TEXT, INTEGER) TO ${APP_ROLE_NAME}`);
      console.log('   ✅ RLS context functions granted');
    } catch (e) {
      console.log('   ⚠️  Some functions may not exist yet:', e.message);
    }
    
    // Step 7: Set default privileges
    console.log('\n📝 Setting default privileges for future objects...');
    await pool.query(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_ROLE_NAME}
    `);
    await pool.query(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO ${APP_ROLE_NAME}
    `);
    console.log('   ✅ Default privileges configured');
    
    // Step 8: Grant connect
    console.log('\n📝 Granting database connect...');
    await pool.query(`GRANT CONNECT ON DATABASE railway TO ${APP_ROLE_NAME}`);
    console.log('   ✅ Connect permission granted');
    
    // Step 9: Verify configuration
    console.log('\n📝 Verifying role configuration...');
    const verify = await pool.query(`
      SELECT 
        rolname,
        rolsuper,
        rolcreatedb,
        rolcreaterole,
        rolbypassrls,
        rolcanlogin,
        rolconnlimit
      FROM pg_roles
      WHERE rolname = $1
    `, [APP_ROLE_NAME]);
    
    const role = verify.rows[0];
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 ROLE VERIFICATION');
    console.log('='.repeat(60));
    console.log(`   Role Name:     ${role.rolname}`);
    console.log(`   SUPERUSER:     ${role.rolsuper ? '❌ YES (BAD!)' : '✅ NO'}`);
    console.log(`   CREATEDB:      ${role.rolcreatedb ? '❌ YES (BAD!)' : '✅ NO'}`);
    console.log(`   CREATEROLE:    ${role.rolcreaterole ? '❌ YES (BAD!)' : '✅ NO'}`);
    console.log(`   BYPASSRLS:     ${role.rolbypassrls ? '❌ YES (BAD!)' : '✅ NO'}`);
    console.log(`   CAN LOGIN:     ${role.rolcanlogin ? '✅ YES' : '❌ NO (BAD!)'}`);
    console.log(`   CONN LIMIT:    ${role.rolconnlimit}`);
    
    // Validate
    if (role.rolsuper || role.rolbypassrls || !role.rolcanlogin) {
      console.error('\n❌ SECURITY VALIDATION FAILED');
      process.exit(1);
    }
    
    console.log('\n✅ ROLE CONFIGURED CORRECTLY FOR RLS ENFORCEMENT');
    
    // Step 10: Test RLS enforcement
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TESTING RLS ENFORCEMENT');
    console.log('='.repeat(60));
    
    // Connect as app role
    const appUrl = SUPERUSER_URL.replace(
      /postgresql:\/\/[^:]+:[^@]+@/,
      `postgresql://${APP_ROLE_NAME}:${appPassword}@`
    );
    
    const appPool = new Pool({ connectionString: appUrl });
    
    try {
      // Try to query without context
      const appClient = await appPool.connect();
      
      try {
        // Check if context is set
        const contextCheck = await appClient.query(`
          SELECT is_security_context_set() as context_set
        `);
        console.log('   Context set:', contextCheck.rows[0].context_set);
        
        // Try to query users_enhanced without context
        const noContextQuery = await appClient.query(`
          SELECT COUNT(*) as count FROM users_enhanced
        `);
        
        const count = parseInt(noContextQuery.rows[0].count);
        
        if (count === 0) {
          console.log('   ✅ RLS ENFORCED: Query without context returned 0 rows');
        } else {
          console.log(`   ⚠️  Query returned ${count} rows without context`);
          console.log('   This may be expected if no RLS policy requires context');
        }
        
        // Now set context and try again
        await appClient.query(`
          SELECT set_security_context('test-user', 'test-tenant', 'TENANT', 'USER', '')
        `);
        
        const withContextQuery = await appClient.query(`
          SELECT COUNT(*) as count FROM users_enhanced
        `);
        
        const countWithContext = parseInt(withContextQuery.rows[0].count);
        console.log(`   With context: ${countWithContext} rows (filtered by tenant)`);
        
      } finally {
        appClient.release();
      }
      
      await appPool.end();
      
    } catch (e) {
      console.log('   Error testing RLS:', e.message);
    }
    
    // Output connection string
    console.log('\n' + '='.repeat(60));
    console.log('🔑 NEW CONNECTION STRING');
    console.log('='.repeat(60));
    console.log('\nUpdate your .env with this connection string:\n');
    console.log(`DATABASE_URL="${appUrl}"`);
    console.log('\n⚠️  IMPORTANT: Save the password securely!');
    console.log(`    Password: ${appPassword}`);
    console.log('\n📋 Keep superuser credentials for migrations only.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run
setupAppRole().catch(console.error);
