const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Enterprise Data (Modules & Super Admins)...\n');

  // 1. Create Modules with correct field names
  console.log('📦 Creating Modules...');
  const modules = [
    { module_name: 'dashboard', display_name: 'Dashboard', route: '/dashboard', icon: 'LayoutDashboard', productType: 'ALL' },
    { module_name: 'users', display_name: 'Users', route: '/users', icon: 'Users', productType: 'ALL' },
    { module_name: 'settings', display_name: 'Settings', route: '/settings', icon: 'Settings', productType: 'ALL' },
    { module_name: 'payments', display_name: 'Payments', route: '/payments', icon: 'CreditCard', productType: 'ALL' },
    { module_name: 'reports', display_name: 'Reports', route: '/reports', icon: 'FileText', productType: 'ALL' },
    { module_name: 'hr', display_name: 'HR Management', route: '/hr', icon: 'Users', productType: 'BUSINESS_ERP' },
    { module_name: 'inventory', display_name: 'Inventory', route: '/inventory', icon: 'Package', productType: 'BUSINESS_ERP' },
    { module_name: 'fuel_sales', display_name: 'Fuel Sales', route: '/fuel-sales', icon: 'Fuel', productType: 'PUMP_ERP' },
    { module_name: 'tank_inventory', display_name: 'Tank Inventory', route: '/tank-inventory', icon: 'Database', productType: 'PUMP_ERP' },
    { module_name: 'shifts', display_name: 'Shift Management', route: '/shifts', icon: 'Clock', productType: 'PUMP_ERP' },
    { module_name: 'suppliers', display_name: 'Suppliers', route: '/suppliers', icon: 'Truck', productType: 'PUMP_ERP' },
  ];

  for (const module of modules) {
    try {
      await prisma.module.upsert({
        where: { module_name: module.module_name },
        update: {},
        create: {
          module_name: module.module_name,
          display_name: module.display_name,
          route: module.route,
          icon: module.icon,
          productType: module.productType,
          description: `${module.display_name} module`,
          is_active: true,
          sort_order: 0,
        },
      });
      console.log(`✅ Module: ${module.display_name} (${module.productType})`);
    } catch (error) {
      console.error(`❌ Failed to create module ${module.display_name}:`, error.message);
    }
  }

  // 2. Get Enterprise Admin
  const enterpriseAdmin = await prisma.enterprise_admins.findFirst({
    where: { email: 'enterprise@bisman.erp' }
  });

  if (!enterpriseAdmin) {
    console.error('\n❌ Enterprise Admin not found!');
    return;
  }

  console.log(`\n👤 Found Enterprise Admin: ${enterpriseAdmin.name} (ID: ${enterpriseAdmin.id})`);

  // 3. Create Super Admins with correct schema
  console.log('\n🏢 Creating Super Admin Businesses...');

  const superAdmins = [
    {
      name: 'Rajesh Kumar',
      email: 'pump_superadmin@bisman.demo',
      password: 'Super@123',
      productType: 'PUMP_ERP',
    },
    {
      name: 'Amit Shah',
      email: 'business_superadmin@bisman.demo',
      password: 'Super@123',
      productType: 'BUSINESS_ERP',
    },
  ];

  for (const sa of superAdmins) {
    try {
      const hashedPassword = await bcrypt.hash(sa.password, 10);
      
      const superAdmin = await prisma.super_admins.upsert({
        where: { email: sa.email },
        update: {
          is_active: true,
        },
        create: {
          name: sa.name,
          email: sa.email,
          password: hashedPassword,
          productType: sa.productType,
          created_by: enterpriseAdmin.id,
          is_active: true,
        },
      });

      // Update user to link to SuperAdmin
      await prisma.user.update({
        where: { email: sa.email },
        data: { super_admin_id: superAdmin.id },
      });

      console.log(`✅ Super Admin: ${sa.name} (${sa.productType})`);
      console.log(`   📧 ${sa.email} | ID: ${superAdmin.id}`);

      // Assign modules
      const relevantModules = await prisma.module.findMany({
        where: {
          OR: [
            { productType: sa.productType },
            { productType: 'ALL' },
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
            is_active: true,
          },
        });
      }

      console.log(`   ✅ Assigned ${relevantModules.length} modules\n`);
    } catch (error) {
      console.error(`❌ Failed to create ${sa.name}:`, error.message);
    }
  }

  console.log('\n✨ Enterprise data seed complete!');
  const moduleCount = await prisma.module.count();
  const superAdminCount = await prisma.super_admins.count();
  const assignmentCount = await prisma.moduleAssignment.count();
  
  console.log(`\n📊 Summary:`);
  console.log(`   Modules: ${moduleCount}`);
  console.log(`   Super Admins: ${superAdminCount}`);
  console.log(`   Module Assignments: ${assignmentCount}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
