const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupEazymilesClient() {
  try {
    console.log('\n🚀 SETTING UP EAZYMILES CLIENT\n');
    console.log('='.repeat(80) + '\n');

    // 1. Get Enterprise Admin
    const enterpriseAdmin = await prisma.enterpriseAdmin.findFirst();
    if (!enterpriseAdmin) {
      console.error('❌ Enterprise Admin not found!');
      return;
    }
    console.log(`✅ Enterprise Admin: ${enterpriseAdmin.email}`);

    // 2. Get or Create Super Admin
    let superAdmin = await prisma.superAdmin.findFirst();
    if (!superAdmin) {
      console.log('Creating Super Admin...');
      superAdmin = await prisma.superAdmin.create({
        data: {
          name: 'Super Admin',
          email: 'superadmin@bisman.demo',
          password: await bcrypt.hash('Super@123', 10),
          created_by: enterpriseAdmin.id,
          is_active: true,
        }
      });
      console.log('✅ Super Admin created');
    } else {
      console.log(`✅ Super Admin exists: ${superAdmin.email}`);
    }

    // 3. Delete old "Demo Company" client if exists
    const oldClient = await prisma.client.findFirst({
      where: { name: 'Demo Company' }
    });
    
    if (oldClient) {
      console.log('\n⚠️  Removing old "Demo Company" client...');
      
      // Delete related records first
      await prisma.userBranch.deleteMany({ where: { user: { tenant_id: oldClient.id } } });
      await prisma.userEmergencyContact.deleteMany({ where: { user: { tenant_id: oldClient.id } } });
      await prisma.userAchievement.deleteMany({ where: { user: { tenant_id: oldClient.id } } });
      await prisma.userSkill.deleteMany({ where: { user: { tenant_id: oldClient.id } } });
      await prisma.userEducation.deleteMany({ where: { user: { tenant_id: oldClient.id } } });
      await prisma.userBankAccount.deleteMany({ where: { user: { tenant_id: oldClient.id } } });
      await prisma.userKYC.deleteMany({ where: { user: { tenant_id: oldClient.id } } });
      await prisma.userAddress.deleteMany({ where: { user: { tenant_id: oldClient.id } } });
      await prisma.userProfile.deleteMany({ where: { user: { tenant_id: oldClient.id } } });
      
      // Delete users
      await prisma.user.deleteMany({ where: { tenant_id: oldClient.id } });
      
      // Delete branches
      await prisma.branch.deleteMany({ where: { tenantId: oldClient.id } });
      
      // Delete client
      await prisma.client.delete({ where: { id: oldClient.id } });
      
      console.log('✅ Old client removed');
    }

    // 4. Create Eazymiles Client
    console.log('\n📦 Creating EAZYMILES Client...');
    const eazymilesClient = await prisma.client.create({
      data: {
        name: 'Eazymiles',
        email: 'admin@eazymiles.com',
        password: await bcrypt.hash('Eazy@123', 10),
        super_admin_id: superAdmin.id,
        is_active: true,
      }
    });
    console.log(`✅ Client created: ${eazymilesClient.name} (${eazymilesClient.id})`);

    // 5. Create Eazymiles Headquarters Branch
    console.log('\n🏢 Creating Eazymiles Branch...');
    const branch = await prisma.branch.create({
      data: {
        branchCode: 'EAZY-HQ-001',
        branchName: 'Eazymiles Headquarters',
        addressLine1: 'DLF Cyber City',
        addressLine2: 'Tower B, 10th Floor',
        city: 'Gurgaon',
        state: 'Haryana',
        postalCode: '122002',
        country: 'India',
        tenantId: eazymilesClient.id,
        isActive: true,
      }
    });
    console.log(`✅ Branch created: ${branch.branchName}`);

    // 6. Create Eazymiles Admin User (under User table)
    console.log('\n👤 Creating Eazymiles Admin User...');
    const eazymilesAdmin = await prisma.user.create({
      data: {
        username: 'eazymiles_admin',
        email: 'admin@eazymiles.com',
        password: await bcrypt.hash('Eazy@123', 10),
        role: 'CLIENT_ADMIN',
        is_active: true,
        productType: 'BUSINESS_ERP',
        tenant_id: eazymilesClient.id,
        super_admin_id: superAdmin.id,
      }
    });
    console.log(`✅ Eazymiles Admin User: ${eazymilesAdmin.email}`);

    // Create profile for Eazymiles Admin
    await prisma.userProfile.create({
      data: {
        userId: eazymilesAdmin.id,
        fullName: 'Eazymiles Administrator',
        employeeCode: 'EAZY-ADMIN-001',
        phone: '+91-9876500000',
        gender: 'MALE',
        bloodGroup: 'O+',
        maritalStatus: 'SINGLE',
      }
    });
    console.log('  ✅ Profile created');

    // 7. Create 10 Demo Users for Eazymiles
    console.log('\n👥 Creating 10 Demo Users for Eazymiles...\n');
    
    const demoUsers = [
      {
        username: 'rajesh_verma',
        email: 'rajesh.verma@eazymiles.com',
        role: 'CFO',
        profile: { fullName: 'Rajesh Verma', employeeCode: 'EAZY-CFO-001', phone: '+91-9876540001' }
      },
      {
        username: 'meera_singh',
        email: 'meera.singh@eazymiles.com',
        role: 'FINANCE_CONTROLLER',
        profile: { fullName: 'Meera Singh', employeeCode: 'EAZY-FC-001', phone: '+91-9876541001' }
      },
      {
        username: 'vikram_reddy',
        email: 'vikram.reddy@eazymiles.com',
        role: 'OPERATIONS_MANAGER',
        profile: { fullName: 'Vikram Reddy', employeeCode: 'EAZY-OPS-001', phone: '+91-9876542001' }
      },
      {
        username: 'arun_kumar',
        email: 'arun.kumar@eazymiles.com',
        role: 'HUB_INCHARGE',
        profile: { fullName: 'Arun Kumar', employeeCode: 'EAZY-HUB-001', phone: '+91-9876543210' }
      },
      {
        username: 'priya_sharma',
        email: 'priya.sharma@eazymiles.com',
        role: 'HR_MANAGER',
        profile: { fullName: 'Priya Sharma', employeeCode: 'EAZY-HR-001', phone: '+91-9876543001' }
      },
      {
        username: 'amit_patel',
        email: 'amit.patel@eazymiles.com',
        role: 'PROCUREMENT_OFFICER',
        profile: { fullName: 'Amit Patel', employeeCode: 'EAZY-PRO-001', phone: '+91-9876544001' }
      },
      {
        username: 'suresh_yadav',
        email: 'suresh.yadav@eazymiles.com',
        role: 'STORE_INCHARGE',
        profile: { fullName: 'Suresh Yadav', employeeCode: 'EAZY-ST-001', phone: '+91-9876545001' }
      },
      {
        username: 'kavita_iyer',
        email: 'kavita.iyer@eazymiles.com',
        role: 'COMPLIANCE_OFFICER',
        profile: { fullName: 'Kavita Iyer', employeeCode: 'EAZY-CO-001', phone: '+91-9876546001' }
      },
      {
        username: 'deepak_mishra',
        email: 'deepak.mishra@eazymiles.com',
        role: 'LEGAL_HEAD',
        profile: { fullName: 'Deepak Mishra', employeeCode: 'EAZY-LEG-001', phone: '+91-9876547001' }
      },
      {
        username: 'rohit_desai',
        email: 'rohit.desai@eazymiles.com',
        role: 'ACCOUNTS_PAYABLE',
        profile: { fullName: 'Rohit Desai', employeeCode: 'EAZY-AP-001', phone: '+91-9876548001' }
      }
    ];

    const password = await bcrypt.hash('Demo@123', 10);

    for (const userData of demoUsers) {
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          password: password,
          role: userData.role,
          is_active: true,
          productType: 'BUSINESS_ERP',
          tenant_id: eazymilesClient.id,
          super_admin_id: superAdmin.id,
        }
      });

      // Create profile
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          fullName: userData.profile.fullName,
          employeeCode: userData.profile.employeeCode,
          phone: userData.profile.phone,
          gender: 'MALE',
          bloodGroup: 'O+',
          maritalStatus: 'SINGLE',
        }
      });

      // Assign to branch
      await prisma.userBranch.create({
        data: {
          userId: user.id,
          branchId: branch.id,
          isPrimary: true,
        }
      });

      console.log(`  ✅ ${userData.profile.fullName} (${userData.email}) - ${userData.role}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 EAZYMILES CLIENT SETUP COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`  - Client: ${eazymilesClient.name}`);
    console.log(`  - Branch: ${branch.branchName}`);
    console.log(`  - Admin User: admin@eazymiles.com / Eazy@123`);
    console.log(`  - 10 Demo Users (password: Demo@123)`);
    console.log('\n🔐 Login Credentials:\n');
    console.log('System Level:');
    console.log('  Enterprise Admin: enterprise@bisman.erp / enterprise123');
    console.log('  Super Admin: business_superadmin@bisman.demo / Super@123\n');
    console.log('Eazymiles Client:');
    console.log('  Client Admin: admin@eazymiles.com / Eazy@123');
    console.log('  All Demo Users: [name]@eazymiles.com / Demo@123\n');
    console.log('🌐 Users:');
    console.log('  - rajesh.verma@eazymiles.com (CFO)');
    console.log('  - meera.singh@eazymiles.com (Finance Controller)');
    console.log('  - vikram.reddy@eazymiles.com (Operations Manager)');
    console.log('  - arun.kumar@eazymiles.com (Hub Incharge)');
    console.log('  - priya.sharma@eazymiles.com (HR Manager)');
    console.log('  - amit.patel@eazymiles.com (Procurement Officer)');
    console.log('  - suresh.yadav@eazymiles.com (Store Incharge)');
    console.log('  - kavita.iyer@eazymiles.com (Compliance Officer)');
    console.log('  - deepak.mishra@eazymiles.com (Legal Head)');
    console.log('  - rohit.desai@eazymiles.com (Accounts Payable)');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

setupEazymilesClient();
