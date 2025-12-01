const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function setupRailway() {
  console.log('🚀 Setting up Railway database from scratch...\n');

  try {
    // Step 1: Create Super Admin
    console.log('Step 1: Creating Super Admin...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    const superAdmin = await prisma.superAdmin.upsert({
      where: { email: 'admin@bisman.com' },
      update: {},
      create: {
        email: 'admin@bisman.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        phone: '+91-9999999999'
      }
    });
    console.log(`✅ Super Admin created: ${superAdmin.email}\n`);

    // Step 2: Create Client
    console.log('Step 2: Creating Client/Tenant...');
    const client = await prisma.client.upsert({
      where: { email: 'eazymiles@bisman.demo' },
      update: {},
      create: {
        name: 'EazyMiles Fuel Station',
        email: 'eazymiles@bisman.demo',
        phone: '+91-9876543210',
        address: 'NH-48, Gurgaon, Haryana',
        super_admin_id: superAdmin.id,
        industry: 'Petrol Pump',
        subscription_plan: 'PREMIUM',
        subscription_status: 'ACTIVE'
      }
    });
    console.log(`✅ Client created: ${client.name}\n`);

    // Step 3: Create Branch
    console.log('Step 3: Creating Branch...');
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
        isActive: true
      }
    });
    console.log(`✅ Branch created: ${branch.branchName}\n`);

    // Step 4: Create Demo User
    console.log('Step 4: Creating Demo User...');
    const userPassword = await bcrypt.hash('Demo@123', 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'demo_hub_incharge@bisman.demo' },
      update: {},
      create: {
        username: 'demo_hub',
        email: 'demo_hub_incharge@bisman.demo',
        password: userPassword,
        role: 'HUB_INCHARGE',
        is_active: true,
        productType: 'PUMP_ERP',
        tenant_id: client.id,
        super_admin_id: superAdmin.id
      }
    });
    console.log(`✅ Demo User created: ${user.email}\n`);

    // Step 5: Assign user to branch
    console.log('Step 5: Assigning user to branch...');
    await prisma.userBranch.upsert({
      where: {
        userId_branchId: {
          userId: user.id,
          branchId: branch.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        branchId: branch.id,
        isPrimary: true
      }
    });
    console.log(`✅ User assigned to branch\n`);

    console.log('🎉 SUCCESS! Railway database is ready!\n');
    console.log('Login Credentials:');
    console.log('  Super Admin: admin@bisman.com / Admin@123');
    console.log('  Demo User: demo_hub_incharge@bisman.demo / Demo@123');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupRailway();
