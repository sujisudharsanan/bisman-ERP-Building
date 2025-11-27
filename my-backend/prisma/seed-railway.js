// Simple seed script for Railway - uses JavaScript to avoid ts-node issues
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Railway seed...');
  console.log('📡 DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

  // Get existing super admin and client
  const superAdmin = await prisma.superAdmin.findFirst({
    orderBy: { id: 'asc' }
  });

  if (!superAdmin) {
    console.error('❌ Super Admin not found!');
    return;
  }

  const client = await prisma.client.findFirst({
    where: { super_admin_id: superAdmin.id },
  });

  if (!client) {
    console.error('❌ No client found!');
    return;
  }

  console.log(`✅ Using Super Admin: ${superAdmin.email}`);
  console.log(`✅ Using Client: ${client.name}`);

  // Create branch
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

  console.log(`✅ Branch: ${branch.branchName}`);

  // Demo user 1: Hub Incharge
  const hashedPassword = await bcrypt.hash('Demo@123', 10);
  
  const user1 = await prisma.user.upsert({
    where: { email: 'arun.kumar@bisman.demo' },
    update: { is_active: true, role: 'HUB_INCHARGE' },
    create: {
      username: 'arun_kumar',
      email: 'arun.kumar@bisman.demo',
      password: hashedPassword,
      role: 'HUB_INCHARGE',
      is_active: true,
      productType: 'PUMP_ERP',
      tenant_id: client.id,
      super_admin_id: superAdmin.id,
    },
  });

  console.log(`✅ User created: ${user1.email}`);

  // Create profile
  await prisma.userProfile.upsert({
    where: { userId: user1.id },
    update: {
      fullName: 'Arun Kumar',
      employeeCode: 'BIS-HUB-001',
      phone: '+91-9876543210',
    },
    create: {
      userId: user1.id,
      fullName: 'Arun Kumar',
      employeeCode: 'BIS-HUB-001',
      phone: '+91-9876543210',
      alternatePhone: '+91-9876543211',
      dateOfBirth: new Date('1988-05-15'),
      gender: 'MALE',
      bloodGroup: 'O+',
      fatherName: 'Rajesh Kumar',
      motherName: 'Sunita Devi',
      maritalStatus: 'MARRIED',
    },
  });

  console.log(`✅ Profile created for ${user1.email}`);

  // Assign to branch
  await prisma.userBranch.upsert({
    where: {
      userId_branchId: {
        userId: user1.id,
        branchId: branch.id,
      },
    },
    update: {},
    create: {
      userId: user1.id,
      branchId: branch.id,
      isPrimary: true,
    },
  });

  console.log('✅ Branch assigned');
  console.log('\n🎉 Railway seed completed!');
  console.log('🔐 Demo user: arun.kumar@bisman.demo / Demo@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
