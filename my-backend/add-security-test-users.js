/**
 * Add Security Test Users
 * Creates test users for security testing suite
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Adding Security Test Users...\n');

  try {
    // Get the first two organizations for testing
    const orgs = await prisma.client.findMany({
      take: 2,
      orderBy: { id: 'asc' }
    });

    if (orgs.length < 2) {
      console.log('⚠️  Need at least 2 organizations. Run seed-multi-tenant.js first.');
      return;
    }

    const org1 = orgs[0];
    const org2 = orgs[1];

    console.log(`Using organizations:`);
    console.log(`  - ${org1.name} (ID: ${org1.id})`);
    console.log(`  - ${org2.name} (ID: ${org2.id})\n`);

    // Hash passwords
    const managerPassword = bcrypt.hashSync('Manager@123!', 10);
    const adminPassword = bcrypt.hashSync('Admin@123!', 10);

    // Create Manager for Org 1
    const manager1 = await prisma.user.upsert({
      where: { email: 'manager@abc.com' },
      update: {},
      create: {
        email: 'manager@abc.com',
        username: 'manager_abc',
        password: managerPassword,
        role: 'MANAGER',
        tenant_id: org1.id,
        productType: org1.product_type || 'BUSINESS_ERP',
        is_active: true
      }
    });
    console.log(`✅ Created Manager: ${manager1.email} (Org: ${org1.name})`);

    // Create Admin for Org 1
    const admin1 = await prisma.user.upsert({
      where: { email: 'admin@abc.com' },
      update: {},
      create: {
        email: 'admin@abc.com',
        username: 'admin_abc',
        password: adminPassword,
        role: 'ADMIN',
        tenant_id: org1.id,
        productType: org1.product_type || 'BUSINESS_ERP',
        is_active: true
      }
    });
    console.log(`✅ Created Admin: ${admin1.email} (Org: ${org1.name})`);

    // Create Manager for Org 2
    const manager2 = await prisma.user.upsert({
      where: { email: 'manager@xyz.com' },
      update: {},
      create: {
        email: 'manager@xyz.com',
        username: 'manager_xyz',
        password: managerPassword,
        role: 'MANAGER',
        tenant_id: org2.id,
        productType: org2.product_type || 'BUSINESS_ERP',
        is_active: true
      }
    });
    console.log(`✅ Created Manager: ${manager2.email} (Org: ${org2.name})`);

    // Create Admin for Org 2
    const admin2 = await prisma.user.upsert({
      where: { email: 'admin@xyz.com' },
      update: {},
      create: {
        email: 'admin@xyz.com',
        username: 'admin_xyz',
        password: adminPassword,
        role: 'ADMIN',
        tenant_id: org2.id,
        productType: org2.product_type || 'BUSINESS_ERP',
        is_active: true
      }
    });
    console.log(`✅ Created Admin: ${admin2.email} (Org: ${org2.name})`);

    console.log('\n================================================================================');
    console.log('✨ SECURITY TEST USERS CREATED!');
    console.log('================================================================================');
    console.log('\n📊 Test Users Summary:');
    console.log(`\n${org1.name}:`);
    console.log(`  - Manager: ${manager1.email} / Manager@123!`);
    console.log(`  - Admin: ${admin1.email} / Admin@123!`);
    console.log(`\n${org2.name}:`);
    console.log(`  - Manager: ${manager2.email} / Manager@123!`);
    console.log(`  - Admin: ${admin2.email} / Admin@123!`);
    console.log('\n================================================================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
