const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function setupInitialData() {
  console.log('\n🔧 Setting up initial data...\n');
  
  try {
    // Create Super Admin
    const superAdmin = await prisma.superAdmin.upsert({
      where: { email: 'business_superadmin@bisman.demo' },
      update: {},
      create: {
        name: 'Business Super Admin',
        email: 'business_superadmin@bisman.demo',
        password: await bcrypt.hash('Super@123', 10),
        productType: 'BUSINESS_ERP',
        is_active: true,
      }
    });
    
    console.log(`✅ Super Admin created: ${superAdmin.email} (ID: ${superAdmin.id})`);
    
    // Create a default client
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
    
    console.log(`✅ Client created: ${client.name} (ID: ${client.id})`);
    
    // Create Enterprise Admin user
    const hashedPassword = await bcrypt.hash('enterprise123', 10);
    const enterpriseAdmin = await prisma.user.upsert({
      where: { email: 'enterprise@bisman.erp' },
      update: {},
      create: {
        username: 'enterprise_admin',
        email: 'enterprise@bisman.erp',
        password: hashedPassword,
        role: 'ENTERPRISE_ADMIN',
        is_active: true,
        productType: 'BUSINESS_ERP',
        tenant_id: client.id,
        super_admin_id: superAdmin.id,
      }
    });
    
    console.log(`✅ Enterprise Admin created: ${enterpriseAdmin.email}`);
    
    // Create Super Admin User
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
        super_admin_id: superAdmin.id,
      }
    });
    
    console.log(`✅ Super Admin User created: ${superAdminUser.email}`);
    
    console.log('\n✅ Initial setup complete!\n');
    console.log('You can now run: npx tsx prisma/seed-complete-users.ts\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

setupInitialData();
