const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Get passwords from environment variables
const ENTERPRISE_PASSWORD = process.env.ENTERPRISE_ADMIN_PASSWORD;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

async function createAllDemoUsers() {
  // Validate required environment variables
  if (!ENTERPRISE_PASSWORD || !SUPER_ADMIN_PASSWORD) {
    console.error('❌ Missing required environment variables:');
    console.error('   ENTERPRISE_ADMIN_PASSWORD - Password for enterprise admin');
    console.error('   SUPER_ADMIN_PASSWORD - Password for super admin');
    console.error('\nExample:');
    console.error('   ENTERPRISE_ADMIN_PASSWORD=xxx SUPER_ADMIN_PASSWORD=xxx node create-all-demo-users.js');
    process.exit(1);
  }

  try {
    // Delete all existing users first
    console.log('🗑️  Deleting all existing users...\n');
    await prisma.user.deleteMany({});
    
    const enterpriseHash = bcrypt.hashSync(ENTERPRISE_PASSWORD, 10);
    const superAdminHash = bcrypt.hashSync(SUPER_ADMIN_PASSWORD, 10);
    
    // Admin users only (Enterprise Admin and Super Admin)
    const adminUsers = [
      // 1. Enterprise Admin
      {
        email: 'enterprise@bisman.erp',
        username: 'enterprise_admin',
        password: enterpriseHash,
        role: 'ENTERPRISE_ADMIN'
      },
      // 2. Super Admin
      {
        email: 'business_superadmin@bisman.demo',
        username: 'business_superadmin',
        password: superAdminHash,
        role: 'SUPER_ADMIN'
      }
    ];
    
    console.log('✨ Creating admin users...\n');
    
    for (const userData of adminUsers) {
      try {
        await prisma.user.create({
          data: {
            email: userData.email,
            username: userData.username,
            password: userData.password,
            role: userData.role,
            assignedModules: [],
            pagePermissions: {}
          }
        });
        console.log(`  ✅ Created: ${userData.email} (${userData.role})`);
      } catch (err) {
        console.log(`  ⚠️  Error creating ${userData.email}:`, err.message);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✨ Admin Users Created Successfully!\n');
    console.log('📊 Total Users: 2\n');
    
    console.log('🔑 Passwords provided via environment variables');
    
    console.log('\n👥 Roles Created:');
    console.log('   1. ENTERPRISE_ADMIN (1 user)');
    console.log('   2. SUPER_ADMIN (1 user)');
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAllDemoUsers();
