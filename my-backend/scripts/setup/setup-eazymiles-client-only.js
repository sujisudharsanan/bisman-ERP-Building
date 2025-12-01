const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up Eazymiles Client (Admin User Only)...\n');

  // Get Enterprise Admin and Super Admin
  const enterpriseAdmin = await prisma.enterpriseAdmin.findFirst({
    orderBy: { id: 'asc' }
  });

  if (!enterpriseAdmin) {
    console.error('❌ Enterprise Admin not found!');
    return;
  }

  const superAdmin = await prisma.superAdmin.findFirst({
    where: { created_by: enterpriseAdmin.id },
    orderBy: { id: 'asc' }
  });

  if (!superAdmin) {
    console.error('❌ Super Admin not found!');
    return;
  }

  console.log(`✅ Enterprise Admin: ${enterpriseAdmin.email}`);
  console.log(`✅ Super Admin: ${superAdmin.email}\n`);

  // Delete old Demo Company client if exists
  console.log('🗑️  Checking for existing Demo Company client...');
  const oldClient = await prisma.client.findFirst({
    where: { 
      OR: [
        { name: 'Demo Company' },
        { name: 'Eazymiles' }
      ]
    }
  });

  if (oldClient) {
    console.log(`   Deleting old client: ${oldClient.name} (${oldClient.id})`);
    
    // Delete all related records first
    await prisma.userBranchAssignment.deleteMany({ where: { userId: { in: (await prisma.user.findMany({ where: { tenant_id: oldClient.id }, select: { id: true } })).map(u => u.id) } } });
    await prisma.userEmergencyContact.deleteMany({ where: { userId: { in: (await prisma.user.findMany({ where: { tenant_id: oldClient.id }, select: { id: true } })).map(u => u.id) } } });
    await prisma.userAchievement.deleteMany({ where: { userId: { in: (await prisma.user.findMany({ where: { tenant_id: oldClient.id }, select: { id: true } })).map(u => u.id) } } });
    await prisma.userSkill.deleteMany({ where: { userId: { in: (await prisma.user.findMany({ where: { tenant_id: oldClient.id }, select: { id: true } })).map(u => u.id) } } });
    await prisma.userEducation.deleteMany({ where: { userId: { in: (await prisma.user.findMany({ where: { tenant_id: oldClient.id }, select: { id: true } })).map(u => u.id) } } });
    await prisma.userBankAccount.deleteMany({ where: { userId: { in: (await prisma.user.findMany({ where: { tenant_id: oldClient.id }, select: { id: true } })).map(u => u.id) } } });
    await prisma.userKYC.deleteMany({ where: { userId: { in: (await prisma.user.findMany({ where: { tenant_id: oldClient.id }, select: { id: true } })).map(u => u.id) } } });
    await prisma.userAddress.deleteMany({ where: { userId: { in: (await prisma.user.findMany({ where: { tenant_id: oldClient.id }, select: { id: true } })).map(u => u.id) } } });
    await prisma.userProfile.deleteMany({ where: { userId: { in: (await prisma.user.findMany({ where: { tenant_id: oldClient.id }, select: { id: true } })).map(u => u.id) } } });
    await prisma.user.deleteMany({ where: { tenant_id: oldClient.id } });
    await prisma.branch.deleteMany({ where: { tenantId: oldClient.id } });
    await prisma.client.delete({ where: { id: oldClient.id } });
    
    console.log('   ✅ Old client deleted\n');
  } else {
    console.log('   No existing client found\n');
  }

  // Create Eazymiles Client (Admin User)
  console.log('🏢 Creating Eazymiles Client...');
  
  const hashedPassword = await bcrypt.hash('Eazy@123', 10);
  
  const eazymilesClient = await prisma.client.create({
    data: {
      name: 'Eazymiles',
      email: 'admin@eazymiles.com',
      password: hashedPassword,
      client_code: 'EAZY-001',
      public_code: 'EAZY-2025-001',
      legal_name: 'Eazymiles Private Limited',
      trade_name: 'Eazymiles',
      client_type: 'FUEL_COMPANY',
      industry: 'Petroleum & Fuel Distribution',
      business_size: 'MEDIUM',
      registration_number: 'U40300DL2020PTC123456',
      tax_id: 'AABCE1234F',
      legal_status: 'PRIVATE_LIMITED',
      registration_year: 2020,
      status: 'Active',
      onboarding_status: 'completed',
      productType: 'PUMP_ERP',
      super_admin_id: superAdmin.id,
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active',
      is_active: true,
      preferred_language: 'en',
      timezone: 'Asia/Kolkata',
      mfa_enabled: false,
      addresses: {
        registered: {
          line1: 'Plot 45, Sector 18',
          line2: 'Udyog Vihar',
          city: 'Gurgaon',
          state: 'Haryana',
          postalCode: '122015',
          country: 'India'
        },
        corporate: {
          line1: 'Tower B, 10th Floor',
          line2: 'Cyber City',
          city: 'Gurgaon',
          state: 'Haryana',
          postalCode: '122002',
          country: 'India'
        }
      },
      contact_persons: {
        ceo: {
          name: 'Rajesh Kumar',
          email: 'rajesh@eazymiles.com',
          phone: '+91-9876500001',
          designation: 'CEO'
        },
        admin: {
          name: 'Admin User',
          email: 'admin@eazymiles.com',
          phone: '+91-9876500002',
          designation: 'Admin'
        }
      },
      settings: {
        theme: 'light',
        notifications: {
          email: true,
          sms: true,
          whatsapp: false
        }
      }
    }
  });

  console.log(`   ✅ Client Created: ${eazymilesClient.name}`);
  console.log(`   📧 Admin Email: ${eazymilesClient.email}`);
  console.log(`   🔑 Admin Password: Eazy@123`);
  console.log(`   🏢 Client Code: ${eazymilesClient.client_code}`);
  console.log(`   🆔 Client ID: ${eazymilesClient.id}\n`);

  // Create Eazymiles Headquarters Branch
  console.log('🏭 Creating Eazymiles Headquarters Branch...');
  
  const branch = await prisma.branch.create({
    data: {
      tenantId: eazymilesClient.id,
      branchCode: 'EAZY-HQ-001',
      branchName: 'Eazymiles Headquarters',
      addressLine1: 'Tower B, 10th Floor, Cyber City',
      addressLine2: 'Udyog Vihar Phase 3',
      city: 'Gurgaon',
      state: 'Haryana',
      postalCode: '122002',
      country: 'India',
      isActive: true,
    },
  });

  console.log(`   ✅ Branch Created: ${branch.branchName}`);
  console.log(`   🏢 Branch Code: ${branch.branchCode}\n`);

  // Summary
  console.log('\n📊 ════════════════════════════════════════════════════════════');
  console.log('   SETUP COMPLETE - EAZYMILES CLIENT');
  console.log('   ════════════════════════════════════════════════════════════\n');
  
  console.log('   🏢 CLIENT (ADMIN USER):');
  console.log('      Name:     Eazymiles');
  console.log('      Email:    admin@eazymiles.com');
  console.log('      Password: Eazy@123');
  console.log('      Role:     CLIENT_ADMIN');
  console.log('      ID:       ' + eazymilesClient.id);
  
  console.log('\n   🏭 BRANCH:');
  console.log('      Name:     Eazymiles Headquarters');
  console.log('      Code:     EAZY-HQ-001');
  
  console.log('\n   👥 AVAILABLE ROLES (for employees):');
  console.log('      1.  CFO                  - Chief Financial Officer');
  console.log('      2.  FINANCE_CONTROLLER   - Financial Operations Manager');
  console.log('      3.  ACCOUNTS_PAYABLE     - Invoice & Payment Processing');
  console.log('      4.  OPERATIONS_MANAGER   - Multi-Site Operations Lead');
  console.log('      5.  HUB_INCHARGE         - Site/Location Manager');
  console.log('      6.  STORE_INCHARGE       - Warehouse & Inventory Manager');
  console.log('      7.  HR_MANAGER           - Human Resources Manager');
  console.log('      8.  PROCUREMENT_OFFICER  - Vendor & Purchasing Manager');
  console.log('      9.  COMPLIANCE_OFFICER   - Regulatory Compliance Manager');
  console.log('      10. LEGAL_HEAD           - Legal & Contracts Manager');
  
  console.log('\n   📝 NEXT STEPS:');
  console.log('      1. Admin logs in: admin@eazymiles.com / Eazy@123');
  console.log('      2. Admin creates employees through UI');
  console.log('      3. Admin assigns roles to employees');
  console.log('      4. Admin sets permissions for each role');
  
  console.log('\n   ✅ No demo employees created - you can add as many as needed!');
  console.log('\n════════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
