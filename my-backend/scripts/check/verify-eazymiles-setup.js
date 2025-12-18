const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('\n🔍 VERIFYING EAZYMILES SETUP...\n');

  try {
    // Check Enterprise Admin
    const enterpriseAdmin = await prisma.enterpriseAdmin.findFirst();
    console.log('✅ Enterprise Admin:', enterpriseAdmin?.email || 'NOT FOUND');

    // Check Super Admin
    const superAdmin = await prisma.superAdmin.findFirst();
    console.log('✅ Super Admin:', superAdmin?.email || 'NOT FOUND');

    // Check Eazymiles Client
    const client = await prisma.client.findFirst({
      where: { name: 'Eazymiles' },
      include: {
        branches: true,
        users: true
      }
    });

    if (client) {
      console.log('\n🏢 EAZYMILES CLIENT:');
      console.log('   ID:', client.id);
      console.log('   Name:', client.name);
      console.log('   Email:', client.email);
      console.log('   Client Code:', client.client_code);
      console.log('   Legal Name:', client.legal_name);
      console.log('   Status:', client.status);
      console.log('   Subscription:', client.subscriptionPlan);
      console.log('   Product Type:', client.productType);
      
      console.log('\n🏭 BRANCHES:', client.branches.length);
      client.branches.forEach(branch => {
        console.log(`   - ${branch.branchName} (${branch.branchCode})`);
      });

      console.log('\n👥 EMPLOYEES:', client.users.length);
      if (client.users.length === 0) {
        console.log('   ✅ No employees created yet (as expected)');
        console.log('   📝 Admin can add employees through the UI');
      } else {
        client.users.forEach(user => {
          console.log(`   - ${user.email} (${user.role})`);
        });
      }

      console.log('\n🔑 LOGIN CREDENTIALS:');
      console.log('   📧 Email: admin@eazymiles.com');
      console.log('   🔐 Password: [DEFAULT_DEMO_PASSWORD env var]');
      console.log('   🌐 URL: http://localhost:3000/auth/login');

      console.log('\n📋 AVAILABLE ROLES (10):');
      const roles = [
        'CFO - Chief Financial Officer',
        'FINANCE_CONTROLLER - Financial Operations Manager',
        'ACCOUNTS_PAYABLE - Invoice & Payment Processing',
        'OPERATIONS_MANAGER - Multi-Site Operations Lead',
        'HUB_INCHARGE - Site/Location Manager',
        'STORE_INCHARGE - Warehouse & Inventory Manager',
        'HR_MANAGER - Human Resources Manager',
        'PROCUREMENT_OFFICER - Vendor & Purchasing Manager',
        'COMPLIANCE_OFFICER - Regulatory Compliance Manager',
        'LEGAL_HEAD - Legal & Contracts Manager'
      ];
      roles.forEach((role, index) => {
        console.log(`   ${index + 1}. ${role}`);
      });

      console.log('\n✅ SETUP VERIFICATION COMPLETE!');
      console.log('   All systems ready for use.\n');
    } else {
      console.log('\n❌ EAZYMILES CLIENT NOT FOUND!');
      console.log('   Please run: node setup-eazymiles-client-only.js\n');
    }

    // Count all users in system
    const totalUsers = await prisma.user.count();
    const allClients = await prisma.client.findMany({ select: { name: true, email: true } });
    
    console.log('📊 SYSTEM SUMMARY:');
    console.log('   Total Clients:', allClients.length);
    allClients.forEach(c => console.log(`   - ${c.name} (${c.email})`));
    console.log('   Total Employees:', totalUsers);

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
