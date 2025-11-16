const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Enterprise Data (Modules & Super Admins)...\n');

  // 1. Create Modules
  console.log('📦 Creating Modules...');
  const modules = [
    { name: 'Dashboard', category: 'BUSINESS_ERP', slug: 'dashboard', icon: 'LayoutDashboard' },
    { name: 'Users', category: 'BUSINESS_ERP', slug: 'users', icon: 'Users' },
    { name: 'Settings', category: 'BUSINESS_ERP', slug: 'settings', icon: 'Settings' },
    { name: 'Payments', category: 'BUSINESS_ERP', slug: 'payments', icon: 'CreditCard' },
    { name: 'Reports', category: 'BUSINESS_ERP', slug: 'reports', icon: 'FileText' },
    { name: 'HR Management', category: 'BUSINESS_ERP', slug: 'hr', icon: 'Users' },
    { name: 'Inventory', category: 'BUSINESS_ERP', slug: 'inventory', icon: 'Package' },
    { name: 'Fuel Sales', category: 'PUMP_MANAGEMENT', slug: 'fuel-sales', icon: 'Fuel' },
    { name: 'Tank Inventory', category: 'PUMP_MANAGEMENT', slug: 'tank-inventory', icon: 'Database' },
    { name: 'Shift Management', category: 'PUMP_MANAGEMENT', slug: 'shifts', icon: 'Clock' },
    { name: 'Suppliers', category: 'PUMP_MANAGEMENT', slug: 'suppliers', icon: 'Truck' },
  ];

  for (const module of modules) {
    try {
      await prisma.module.upsert({
        where: { slug: module.slug },
        update: {},
        create: {
          name: module.name,
          category: module.category,
          slug: module.slug,
          icon: module.icon,
          description: `${module.name} module`,
          isActive: true,
        },
      });
      console.log(`✅ Module: ${module.name} (${module.category})`);
    } catch (error) {
      console.error(`❌ Failed to create module ${module.name}:`, error.message);
    }
  }

  // 2. Get Enterprise Admin
  const enterpriseAdmin = await prisma.enterpriseAdmin.findFirst({
    where: { email: 'enterprise@bisman.erp' }
  });

  if (!enterpriseAdmin) {
    console.error('\n❌ Enterprise Admin not found! Run seed-enterprise-admin.js first.');
    return;
  }

  console.log(`\n👤 Found Enterprise Admin: ${enterpriseAdmin.name} (ID: ${enterpriseAdmin.id})`);

  // 3. Create Super Admins (Businesses)
  console.log('\n🏢 Creating Super Admin Businesses...');

  const hashedPassword = await bcrypt.hash('Super@123', 10);

  const superAdmins = [
    {
      businessName: 'Rajesh Petrol Pump',
      businessType: 'PUMP_MANAGEMENT',
      location: 'Highway 44, Karnataka',
      email: 'pump_superadmin@bisman.demo',
      username: 'pump_superadmin',
      contactPerson: 'Rajesh Kumar',
      phone: '+91 9876543210',
    },
    {
      businessName: 'ABC Logistics Pvt Ltd',
      businessType: 'BUSINESS_ERP',
      location: 'Mumbai, Maharashtra',
      email: 'business_superadmin@bisman.demo',
      username: 'business_superadmin',
      contactPerson: 'Amit Shah',
      phone: '+91 9876543211',
    },
  ];

  for (const sa of superAdmins) {
    try {
      // First, check if user exists and update their super_admin_id
      const user = await prisma.user.findUnique({
        where: { email: sa.email }
      });

      // Create SuperAdmin entry
      const superAdmin = await prisma.superAdmin.upsert({
        where: { email: sa.email },
        update: {
          businessName: sa.businessName,
          businessType: sa.businessType,
          isActive: true,
        },
        create: {
          businessName: sa.businessName,
          businessType: sa.businessType,
          contactPerson: sa.contactPerson,
          email: sa.email,
          phone: sa.phone,
          location: sa.location,
          isActive: true,
          subscriptionStatus: 'ACTIVE',
          subscriptionPlan: 'PREMIUM',
          createdByEnterpriseAdminId: enterpriseAdmin.id,
        },
      });

      // Update user to link to SuperAdmin
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { super_admin_id: superAdmin.id },
        });
      }

      console.log(`✅ Super Admin: ${sa.businessName} (${sa.businessType})`);
      console.log(`   📧 ${sa.email} | ID: ${superAdmin.id}`);

      // Assign modules to this Super Admin
      const relevantModules = await prisma.module.findMany({
        where: {
          OR: [
            { category: sa.businessType },
            { category: 'BUSINESS_ERP' }, // Everyone gets business ERP modules
          ],
        },
      });

      console.log(`   📦 Assigning ${relevantModules.length} modules...`);

      for (const module of relevantModules) {
        await prisma.moduleAssignment.upsert({
          where: {
            super_admin_id_module_id: {
              super_admin_id: superAdmin.id,
              module_id: module.id,
            },
          },
          update: {},
          create: {
            super_admin_id: superAdmin.id,
            module_id: module.id,
            isActive: true,
          },
        });
      }

      console.log(`   ✅ Assigned ${relevantModules.length} modules\n`);
    } catch (error) {
      console.error(`❌ Failed to create ${sa.businessName}:`, error.message);
    }
  }

  console.log('\n✨ Enterprise data seed complete!');
  console.log('\n📊 Summary:');
  const moduleCount = await prisma.module.count();
  const superAdminCount = await prisma.superAdmin.count();
  const assignmentCount = await prisma.moduleAssignment.count();
  
  console.log(`   Modules: ${moduleCount}`);
  console.log(`   Super Admins: ${superAdminCount}`);
  console.log(`   Module Assignments: ${assignmentCount}`);
  
  console.log('\n🔐 Login as Enterprise Admin to see the data:');
  console.log('   Email: enterprise@bisman.erp');
  console.log('   Password: enterprise123');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
