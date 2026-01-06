#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// Get passwords from environment variables
const ENTERPRISE_PASSWORD = process.env.ENTERPRISE_ADMIN_PASSWORD;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

async function setupEverything() {
  // Validate required environment variables
  if (!ENTERPRISE_PASSWORD || !SUPER_ADMIN_PASSWORD) {
    console.error('❌ Missing required environment variables:');
    console.error('   ENTERPRISE_ADMIN_PASSWORD - Password for enterprise admin');
    console.error('   SUPER_ADMIN_PASSWORD - Password for super admins');
    process.exit(1);
  }

  console.log('\n🚀 COMPLETE SETUP - Creating Super Admin and Client\n');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Step 1: Create Super Admin
    console.log('Step 1: Creating Super Admin...');
    const superAdmin = await prisma.super_admins.upsert({
      where: { email: 'business_superadmin@bisman.demo' },
      update: {},
      create: {
        name: 'Business Super Admin',
        email: 'business_superadmin@bisman.demo',
        password: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10),
        productType: 'BUSINESS_ERP',
        is_active: true,
      }
    });
    console.log(`✅ Super Admin: ${superAdmin.email} (ID: ${superAdmin.id})\n`);
    
    // Step 2: Create Client
    console.log('Step 2: Creating Client...');
    const client = await prisma.client.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Demo Company',
        productType: 'BUSINESS_ERP',
        super_admin_id: superAdmin.id,
        is_active: true,
        subscriptionPlan: 'trial',
        subscriptionStatus: 'active',
      }
    });
    console.log(`✅ Client: ${client.name} (ID: ${client.id})\n`);
    
    // Step 3: Create Branch
    console.log('Step 3: Creating Headquarters Branch...');
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
    
    // Step 4: Create Base Admin Users
    console.log('Step 4: Creating Base Admin Users...');
    
    const enterpriseAdmin = await prisma.user.upsert({
      where: { email: 'enterprise@bisman.erp' },
      update: {},
      create: {
        username: 'enterprise_admin',
        email: 'enterprise@bisman.erp',
        password: await bcrypt.hash(ENTERPRISE_PASSWORD, 10),
        role: 'ENTERPRISE_ADMIN',
        is_active: true,
        productType: 'BUSINESS_ERP',
        tenant_id: client.id,
        super_admin_id: superAdmin.id,
      }
    });
    console.log(`  ✅ ${enterpriseAdmin.email}`);
    
    const superAdminUser = await prisma.user.upsert({
      where: { email: 'business_superadmin@bisman.demo' },
      update: {},
      create: {
        username: 'business_superadmin',
        email: 'business_superadmin@bisman.demo',
        password: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10),
        role: 'SUPER_ADMIN',
        is_active: true,
        productType: 'BUSINESS_ERP',
        tenant_id: client.id,
        super_admin_id: superAdmin.id,
      }
    });
    console.log(`  ✅ ${superAdminUser.email}\n`);
    
    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 SETUP COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`  - 1 Super Admin`);
    console.log(`  - 1 Client (${client.name})`);
    console.log(`  - 1 Branch (${branch.branchName})`);
    console.log(`  - 2 Admin users`);
    console.log(`\n🔐 Login Credentials:`);
    console.log(`  Enterprise Admin: enterprise@bisman.erp / [ENTERPRISE_ADMIN_PASSWORD env var]`);
    console.log(`  Super Admin: business_superadmin@bisman.demo / [SUPER_ADMIN_PASSWORD env var]\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

setupEverything();
