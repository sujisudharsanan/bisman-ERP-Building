#!/usr/bin/env node
/**
 * Reset Admin Passwords Script
 * 
 * Resets passwords for Enterprise Admin and Super Admin users.
 * 
 * Usage:
 *   ENTERPRISE_ADMIN_PASSWORD=xxx SUPER_ADMIN_PASSWORD=xxx node scripts/reset-admin-passwords.js
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Get passwords from environment variables
const ENTERPRISE_PASSWORD = process.env.ENTERPRISE_ADMIN_PASSWORD;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

async function resetPasswords() {
  // Validate required environment variables
  if (!ENTERPRISE_PASSWORD || !SUPER_ADMIN_PASSWORD) {
    console.error('❌ Missing required environment variables:');
    console.error('   ENTERPRISE_ADMIN_PASSWORD - New password for enterprise admin');
    console.error('   SUPER_ADMIN_PASSWORD - New password for super admin');
    console.error('\nUsage:');
    console.error('   ENTERPRISE_ADMIN_PASSWORD=xxx SUPER_ADMIN_PASSWORD=xxx node scripts/reset-admin-passwords.js');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('\n🔐 Resetting Admin Passwords...\n');
  console.log('='.repeat(60));

  try {
    const client = await pool.connect();
    
    // Reset Enterprise Admin password
    const enterpriseHash = await bcrypt.hash(ENTERPRISE_PASSWORD, 10);
    
    const enterpriseResult = await client.query(
      `UPDATE enterprise_admins 
       SET password_hash = $1, updated_at = NOW()
       WHERE email = $2`,
      [enterpriseHash, 'enterprise@bisman.erp']
    );

    if (enterpriseResult.rowCount > 0) {
      console.log('✅ Enterprise Admin password reset successfully');
      console.log('   Email: enterprise@bisman.erp');
    } else {
      console.log('⚠️  Enterprise Admin not found, creating...');
      
      await client.query(
        `INSERT INTO enterprise_admins (name, email, password_hash, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET password_hash = $3, updated_at = NOW()`,
        ['Enterprise Admin', 'enterprise@bisman.erp', enterpriseHash]
      );
      console.log('✅ Enterprise Admin created/updated');
    }

    // Reset Super Admin password
    const superAdminHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    
    const superAdminResult = await client.query(
      `UPDATE super_admins 
       SET password_hash = $1, updated_at = NOW()
       WHERE email = $2`,
      [superAdminHash, 'business_superadmin@bisman.demo']
    );

    if (superAdminResult.rowCount > 0) {
      console.log('✅ Super Admin password reset successfully');
      console.log('   Email: business_superadmin@bisman.demo');
    } else {
      console.log('⚠️  Super Admin not found');
      
      // Get enterprise admin id first
      const entAdminResult = await client.query(
        `SELECT id FROM enterprise_admins WHERE email = $1 LIMIT 1`,
        ['enterprise@bisman.erp']
      );
      
      if (entAdminResult.rows.length > 0) {
        await client.query(
          `INSERT INTO super_admins (name, email, password_hash, "productType", is_active, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
           ON CONFLICT (email) DO UPDATE SET password_hash = $3, updated_at = NOW()`,
          ['Business Super Admin', 'business_superadmin@bisman.demo', superAdminHash, 'BUSINESS_ERP', entAdminResult.rows[0].id]
        );
        console.log('✅ Super Admin created/updated');
      }
    }
    
    client.release();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Password reset complete!\n');
    console.log('📝 Login Credentials:');
    console.log('   Enterprise Admin: enterprise@bisman.erp');
    console.log('   Super Admin: business_superadmin@bisman.demo');
    console.log('\n   Passwords set via environment variables.\n');

  } catch (error) {
    console.error('\n❌ Error resetting passwords:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetPasswords();
