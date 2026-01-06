#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// Get passwords from environment variables
const ENTERPRISE_PASSWORD = process.env.ENTERPRISE_ADMIN_PASSWORD;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

async function simpleSetup() {
  // Validate required environment variables
  if (!ENTERPRISE_PASSWORD || !SUPER_ADMIN_PASSWORD) {
    console.error('❌ Missing required environment variables:');
    console.error('   ENTERPRISE_ADMIN_PASSWORD - Password for enterprise admin');
    console.error('   SUPER_ADMIN_PASSWORD - Password for super admins');
    console.error('\nExample:');
    console.error('   ENTERPRISE_ADMIN_PASSWORD=xxx SUPER_ADMIN_PASSWORD=xxx node simple-setup.js');
    process.exit(1);
  }

  console.log('\n🚀 SIMPLE SETUP - Creating Admin Users\n');
  console.log('='.repeat(80) + '\n');
  
  try {
    //  Check for existing client or create one
    let client = await prisma.client.findFirst();
    
    if (!client) {
      console.log('No client found. Creating one...');
      // Find or create enterprise admin first
      let enterpriseAdmin = await prisma.enterprise_admins.findFirst();
      if (!enterpriseAdmin) {
        console.log('Creating Enterprise Admin record...');
        enterpriseAdmin = await prisma.enterprise_admins.create({
          data: {
            name: 'Enterprise Admin',
            email: 'admin@bisman.erp',
            password: await bcrypt.hash(ENTERPRISE_PASSWORD, 10),
            is_active: true,
          }
        });
        console.log(`✅ Enterprise Admin created: ${enterpriseAdmin.email}`);
      }
      
      // Create super admin
      const superAdmin = await prisma.super_admins.create({
        data: {
          name: 'Super Admin',
          email: 'superadmin@bisman.demo',
          password: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10),
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
        password: await bcrypt.hash(ENTERPRISE_PASSWORD, 10),
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
        password: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10),
        role: 'SUPER_ADMIN',
        is_active: true,
        productType: 'BUSINESS_ERP',
        tenant_id: client.id,
      }
    });
    console.log(`  ✅ ${superAdminUser.email}\n`);
    
    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 SETUP COMPLETE!\n');
    console.log('📊 Created:');
    console.log(`  - Client: ${client.name}`);
    console.log(`  - Branch: ${branch.branchName}`);
    console.log(`  - 2 Admin users`);
    console.log(`\n🔐 Login Credentials:`);
    console.log(`  Enterprise Admin: enterprise@bisman.erp / [ENTERPRISE_ADMIN_PASSWORD env var]`);
    console.log(`  Super Admin: business_superadmin@bisman.demo / [SUPER_ADMIN_PASSWORD env var]\n`);
    console.log(`\n🧪 Test Now:`);
    console.log(`  1. Go to http://localhost:3000/auth/login`);
    console.log(`  2. Login with admin credentials!\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) console.error(`Error Code: ${error.code}`);
  } finally {
    await prisma.$disconnect();
  }
}

simpleSetup();
