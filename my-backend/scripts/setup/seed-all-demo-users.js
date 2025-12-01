const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Creating all demo users from login page...');

  const demoUsers = [
    { email: 'enterprise@bisman.erp', username: 'enterprise_admin', password: 'enterprise123', role: 'ENTERPRISE_ADMIN' },
    { email: 'business_superadmin@bisman.demo', username: 'business_superadmin', password: 'Super@123', role: 'SUPER_ADMIN' },
    { email: 'pump_superadmin@bisman.demo', username: 'pump_superadmin', password: 'Super@123', role: 'SUPER_ADMIN' },
    { email: 'demo_it_admin@bisman.demo', username: 'demo_it_admin', password: 'Demo@123', role: 'IT_ADMIN' },
    { email: 'demo_admin@bisman.demo', username: 'demo_admin', password: 'Demo@123', role: 'ADMIN' },
    { email: 'demo_cfo@bisman.demo', username: 'demo_cfo', password: 'Demo@123', role: 'CFO' },
    { email: 'demo_finance_controller@bisman.demo', username: 'demo_finance_controller', password: 'Demo@123', role: 'FINANCE_CONTROLLER' },
    { email: 'demo_treasury@bisman.demo', username: 'demo_treasury', password: 'Demo@123', role: 'TREASURY' },
    { email: 'demo_accounts@bisman.demo', username: 'demo_accounts', password: 'Demo@123', role: 'ACCOUNTS' },
    { email: 'demo_accounts_payable@bisman.demo', username: 'demo_accounts_payable', password: 'Demo@123', role: 'ACCOUNTS_PAYABLE' },
    { email: 'demo_banker@bisman.demo', username: 'demo_banker', password: 'Demo@123', role: 'BANKER' },
    { email: 'demo_procurement_officer@bisman.demo', username: 'demo_procurement_officer', password: 'Demo@123', role: 'PROCUREMENT_OFFICER' },
    { email: 'demo_store_incharge@bisman.demo', username: 'demo_store_incharge', password: 'Demo@123', role: 'STORE_INCHARGE' },
    { email: 'demo_operations_manager@bisman.demo', username: 'demo_operations_manager', password: 'Demo@123', role: 'MANAGER' },
    { email: 'demo_hub_incharge@bisman.demo', username: 'demo_hub_incharge', password: 'Demo@123', role: 'HUB_INCHARGE' },
    { email: 'demo_hr@bisman.demo', username: 'demo_hr', password: 'hr123', role: 'HR' },
    { email: 'demo_compliance@bisman.demo', username: 'demo_compliance', password: 'Demo@123', role: 'COMPLIANCE' },
    { email: 'demo_legal@bisman.demo', username: 'demo_legal', password: 'Demo@123', role: 'LEGAL' },
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const user of demoUsers) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      const created = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          password: hashedPassword,
          role: user.role,
          is_active: true,
        },
        create: {
          email: user.email,
          username: user.username,
          password: hashedPassword,
          role: user.role,
          is_active: true,
        },
      });
      
      console.log(`✅ ${user.email} (${user.role})`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${user.email}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✨ Demo users seed complete!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log('\n📝 Key Login Credentials:');
  console.log('   Enterprise Admin: enterprise@bisman.erp / enterprise123');
  console.log('   Business Super Admin: business_superadmin@bisman.demo / Super@123');
  console.log('   Pump Super Admin: pump_superadmin@bisman.demo / Super@123');
  console.log('   HR Manager: demo_hr@bisman.demo / hr123');
  console.log('   All other demo users: Demo@123');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
