#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function simpleSetup() {
  console.log('\n🚀 SIMPLE SETUP - Creating Demo Users\n');
  console.log('='.repeat(80) + '\n');
  
  try {
    //  Check for existing client or create one
    let client = await prisma.client.findFirst();
    
    if (!client) {
      console.log('No client found. Creating one...');
      // Find or create enterprise admin first
      let enterpriseAdmin = await prisma.enterpriseAdmin.findFirst();
      if (!enterpriseAdmin) {
        console.log('Creating Enterprise Admin record...');
        enterpriseAdmin = await prisma.enterpriseAdmin.create({
          data: {
            name: 'Enterprise Admin',
            email: 'admin@bisman.erp',
            password: await bcrypt.hash('admin123', 10),
            is_active: true,
          }
        });
        console.log(`✅ Enterprise Admin created: ${enterpriseAdmin.email}`);
      }
      
      // Create super admin
      const superAdmin = await prisma.superAdmin.create({
        data: {
          name: 'Super Admin',
          email: 'superadmin@bisman.demo',
          password: await bcrypt.hash('Super@123', 10),
          productType: 'BUSINESS_ERP',
          is_active: true,
          created_by: enterpriseAdmin.id,
        }
      });
      console.log(`✅ Super Admin created: ${superAdmin.email}`);
      
      // Create client
      client = await prisma.client.create({
        data: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Demo Company',
          productType: 'BUSINESS_ERP',
          super_admin_id: superAdmin.id,
          is_active: true,
          subscriptionPlan: 'trial',
          subscriptionStatus: 'active',
        }
      });
      console.log(`✅ Client created: ${client.name}`);
    } else {
      console.log(`✅ Using existing client: ${client.name} (ID: ${client.id})`);
    }
    
    // Create Branch
    console.log('\nCreating Headquarters Branch...');
    const branch = await prisma.branch.upsert({
      where: { branchCode: 'BIS-HQ-001' },
      update: {},
      create: {
        tenantId: client.id,
        branchCode: 'BIS-HQ-001',
        branchName: 'Bisman Headquarters',
        addressLine1: 'Cyber City, Tower B',
        addressLine2: '10th Floor',
        city: 'Gurgaon',
        state: 'Haryana',
        postalCode: '122002',
        country: 'India',
        isActive: true,
      },
    });
    console.log(`✅ Branch: ${branch.branchName}\n`);
    
    // Create Base Admin Users
    console.log('Creating Base Admin Users...');
    
    const enterpriseAdminUser = await prisma.user.upsert({
      where: { email: 'enterprise@bisman.erp' },
      update: {},
      create: {
        username: 'enterprise_admin',
        email: 'enterprise@bisman.erp',
        password: await bcrypt.hash('enterprise123', 10),
        role: 'ENTERPRISE_ADMIN',
        is_active: true,
        productType: 'BUSINESS_ERP',
        tenant_id: client.id,
      }
    });
    console.log(`  ✅ ${enterpriseAdminUser.email}`);
    
    const superAdminUser = await prisma.user.upsert({
      where: { email: 'business_superadmin@bisman.demo' },
      update: {},
      create: {
        username: 'business_superadmin',
        email: 'business_superadmin@bisman.demo',
        password: await bcrypt.hash('Super@123', 10),
        role: 'SUPER_ADMIN',
        is_active: true,
        productType: 'BUSINESS_ERP',
        tenant_id: client.id,
      }
    });
    console.log(`  ✅ ${superAdminUser.email}\n`);
    
    // Create 10 Demo Users
    console.log('Creating 10 Demo Users...\n');
    
    const demoUsers = [
      { username: 'rajesh_verma', email: 'rajesh.verma@bisman.demo', role: 'CFO',
        profile: { fullName: 'Rajesh Verma', employeeCode: 'BIS-CFO-001', phone: '+91-9876540001' } },
      { username: 'meera_singh', email: 'meera.singh@bisman.demo', role: 'FINANCE_CONTROLLER',
        profile: { fullName: 'Meera Singh', employeeCode: 'BIS-FC-001', phone: '+91-9876541001' } },
      { username: 'vikram_reddy', email: 'vikram.reddy@bisman.demo', role: 'OPERATIONS_MANAGER',
        profile: { fullName: 'Vikram Reddy', employeeCode: 'BIS-OPS-001', phone: '+91-9876542001' } },
      { username: 'arun_kumar', email: 'arun.kumar@bisman.demo', role: 'HUB_INCHARGE',
        profile: { fullName: 'Arun Kumar', employeeCode: 'BIS-HUB-001', phone: '+91-9876543210' } },
      { username: 'priya_sharma', email: 'priya.sharma@bisman.demo', role: 'HR_MANAGER',
        profile: { fullName: 'Priya Sharma', employeeCode: 'BIS-HR-001', phone: '+91-9876543001' } },
      { username: 'amit_patel', email: 'amit.patel@bisman.demo', role: 'PROCUREMENT_OFFICER',
        profile: { fullName: 'Amit Patel', employeeCode: 'BIS-PRO-001', phone: '+91-9876544001' } },
      { username: 'suresh_yadav', email: 'suresh.yadav@bisman.demo', role: 'STORE_INCHARGE',
        profile: { fullName: 'Suresh Yadav', employeeCode: 'BIS-ST-001', phone: '+91-9876545001' } },
      { username: 'kavita_iyer', email: 'kavita.iyer@bisman.demo', role: 'COMPLIANCE_OFFICER',
        profile: { fullName: 'Kavita Iyer', employeeCode: 'BIS-CO-001', phone: '+91-9876546001' } },
      { username: 'deepak_mishra', email: 'deepak.mishra@bisman.demo', role: 'LEGAL_HEAD',
        profile: { fullName: 'Deepak Mishra', employeeCode: 'BIS-LEG-001', phone: '+91-9876547001' } },
      { username: 'rohit_desai', email: 'rohit.desai@bisman.demo', role: 'ACCOUNTS_PAYABLE',
        profile: { fullName: 'Rohit Desai', employeeCode: 'BIS-AP-001', phone: '+91-9876548001' } }
    ];
    
    const password = await bcrypt.hash('Demo@123', 10);
    
    for (const userData of demoUsers) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          username: userData.username,
          email: userData.email,
          password: password,
          role: userData.role,
          is_active: true,
          productType: 'BUSINESS_ERP',
          tenant_id: client.id,
        }
      });
      
      // Create profile
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
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
      await prisma.userBranch.upsert({
        where: {
          userId_branchId: {
            userId: user.id,
            branchId: branch.id,
          }
        },
        update: {},
        create: {
          userId: user.id,
          branchId: branch.id,
          isPrimary: true,
        }
      });
      
      console.log(`  ✅ ${userData.profile.fullName} (${userData.email})`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 SETUP COMPLETE!\n');
    console.log('📊 Created:');
    console.log(`  - Client: ${client.name}`);
    console.log(`  - Branch: ${branch.branchName}`);
    console.log(`  - 2 Base admin users`);
    console.log(`  - 10 Demo users with profiles`);
    console.log(`\n🔐 Login Credentials:`);
    console.log(`  Enterprise Admin: enterprise@bisman.erp / enterprise123`);
    console.log(`  Super Admin: business_superadmin@bisman.demo / Super@123`);
    console.log(`  Demo Users: [any email above] / Demo@123\n`);
    console.log(`\n🧪 Test Now:`);
    console.log(`  1. Go to http://localhost:3000/auth/login`);
    console.log(`  2. Try logging in with any demo user!\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) console.error(`Error Code: ${error.code}`);
  } finally {
    await prisma.$disconnect();
  }
}

simpleSetup();
