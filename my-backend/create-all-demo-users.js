const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAllDemoUsers() {
  try {
    // Delete all existing users first
    console.log('🗑️  Deleting all existing users...\n');
    await prisma.user.deleteMany({});
    
    const enterpriseHash = bcrypt.hashSync('enterprise123', 10);
    const demoHash = bcrypt.hashSync('Demo@123', 10);
    
    // All demo users from login page (16 users - one for each role)
    const allDemoUsers = [
      // 1. Enterprise Admin
      {
        email: 'enterprise@bisman.erp',
        username: 'enterprise_admin',
        password: enterpriseHash,
        role: 'ENTERPRISE_ADMIN'
      },
      // 2. IT Admin
      {
        email: 'demo_it_admin@bisman.demo',
        username: 'demo_it_admin',
        password: demoHash,
        role: 'IT_ADMIN'
      },
      // 4. CFO
      {
        email: 'demo_cfo@bisman.demo',
        username: 'demo_cfo',
        password: demoHash,
        role: 'CFO'
      },
      // 5. Finance Controller
      {
        email: 'demo_finance_controller@bisman.demo',
        username: 'demo_finance_controller',
        password: demoHash,
        role: 'FINANCE_CONTROLLER'
      },
      // 6. Treasury
      {
        email: 'demo_treasury@bisman.demo',
        username: 'demo_treasury',
        password: demoHash,
        role: 'TREASURY'
      },
      // 7. Accounts
      {
        email: 'demo_accounts@bisman.demo',
        username: 'demo_accounts',
        password: demoHash,
        role: 'ACCOUNTS'
      },
      // 8. Accounts Payable
      {
        email: 'demo_accounts_payable@bisman.demo',
        username: 'demo_accounts_payable',
        password: demoHash,
        role: 'ACCOUNTS_PAYABLE'
      },
      // 9. Banker
      {
        email: 'demo_banker@bisman.demo',
        username: 'demo_banker',
        password: demoHash,
        role: 'BANKER'
      },
      // 10. Procurement Officer
      {
        email: 'demo_procurement_officer@bisman.demo',
        username: 'demo_procurement_officer',
        password: demoHash,
        role: 'PROCUREMENT_OFFICER'
      },
      // 11. Store Incharge
      {
        email: 'demo_store_incharge@bisman.demo',
        username: 'demo_store_incharge',
        password: demoHash,
        role: 'STORE_INCHARGE'
      },
      // 12. Compliance
      {
        email: 'demo_compliance@bisman.demo',
        username: 'demo_compliance',
        password: demoHash,
        role: 'COMPLIANCE'
      },
      // 13. Legal
      {
        email: 'demo_legal@bisman.demo',
        username: 'demo_legal',
        password: demoHash,
        role: 'LEGAL'
      },
      // 14. Admin
      {
        email: 'demo_admin@bisman.demo',
        username: 'demo_admin',
        password: demoHash,
        role: 'ADMIN'
      },
      // 15. Operations Manager
      {
        email: 'demo_operations_manager@bisman.demo',
        username: 'demo_operations_manager',
        password: demoHash,
        role: 'MANAGER'
      },
      // 16. Hub Incharge
      {
        email: 'demo_hub_incharge@bisman.demo',
        username: 'demo_hub_incharge',
        password: demoHash,
        role: 'HUB_INCHARGE'
      }
    ];
    
    console.log('✨ Creating 16 demo users (one for each role)...\n');
    
    for (const userData of allDemoUsers) {
      try {
        const user = await prisma.user.create({
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
    console.log('✨ All Demo Users Created Successfully!\n');
    console.log('📊 Total Users: 16\n');
    
    console.log('🔑 Login Credentials:');
    console.log('   Enterprise Admin: enterprise@bisman.erp / enterprise123');
    console.log('   All Demo Users: demo_*@bisman.demo / Demo@123\n');
    
    console.log('👥 Roles Created:');
    console.log('   1. ENTERPRISE_ADMIN (1 user)');
    console.log('   2. SUPER_ADMIN (1 user) ← Only one super admin');
    console.log('   3. IT_ADMIN (1 user)');
    console.log('   4. CFO (1 user)');
    console.log('   5. FINANCE_CONTROLLER (1 user)');
    console.log('   6. TREASURY (1 user)');
    console.log('   7. ACCOUNTS (1 user)');
    console.log('   8. ACCOUNTS_PAYABLE (1 user)');
    console.log('   9. BANKER (1 user)');
    console.log('   10. PROCUREMENT_OFFICER (1 user)');
    console.log('   11. STORE_INCHARGE (1 user)');
    console.log('   12. COMPLIANCE (1 user)');
    console.log('   13. LEGAL (1 user)');
    console.log('   14. ADMIN (1 user)');
    console.log('   15. MANAGER (1 user)');
    console.log('   16. HUB_INCHARGE (1 user)');
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAllDemoUsers();
