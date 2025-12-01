const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seedMultiTenantData() {
  try {
    console.log('🌱 Starting Multi-Tenant Seed Data...\n');

    // ==========================================
    // 1. CREATE ENTERPRISE ADMIN
    // ==========================================
    console.log('1️⃣  Creating Enterprise Admin...');
    
    const enterpriseAdminPassword = bcrypt.hashSync('enterprise123', 10);
    
    const enterpriseAdmin = await prisma.enterpriseAdmin.upsert({
      where: { email: 'enterprise@bisman.erp' },
      update: {},
      create: {
        name: 'Enterprise Administrator',
        email: 'enterprise@bisman.erp',
        password: enterpriseAdminPassword,
        is_active: true
      }
    });
    
    console.log(`   ✅ Enterprise Admin created: ${enterpriseAdmin.email}\n`);

    // ==========================================
    // 2. CREATE MODULES
    // ==========================================
    console.log('2️⃣  Creating Modules...');
    
    const modulesData = [
      // Business ERP Modules
      { module_name: 'finance', display_name: 'Finance', route: '/finance', icon: 'Banknote', productType: 'BUSINESS_ERP', sort_order: 1 },
      { module_name: 'hr', display_name: 'Human Resources', route: '/hr', icon: 'Users', productType: 'BUSINESS_ERP', sort_order: 2 },
      { module_name: 'admin', display_name: 'Administration', route: '/admin', icon: 'Shield', productType: 'BUSINESS_ERP', sort_order: 3 },
      { module_name: 'procurement', display_name: 'Procurement', route: '/procurement', icon: 'ShoppingCart', productType: 'BUSINESS_ERP', sort_order: 4 },
      { module_name: 'inventory', display_name: 'Inventory', route: '/inventory', icon: 'Boxes', productType: 'BUSINESS_ERP', sort_order: 5 },
      { module_name: 'compliance', display_name: 'Compliance', route: '/compliance', icon: 'ClipboardCheck', productType: 'BUSINESS_ERP', sort_order: 6 },
      { module_name: 'legal', display_name: 'Legal', route: '/legal', icon: 'Scale', productType: 'BUSINESS_ERP', sort_order: 7 },
      { module_name: 'common', display_name: 'Common', route: '/common', icon: 'Settings', productType: 'BUSINESS_ERP', sort_order: 99 },
      
      // Pump ERP Modules
      { module_name: 'pump-management', display_name: 'Pump Management', route: '/pump-management', icon: 'Fuel', productType: 'PUMP_ERP', sort_order: 1 },
      { module_name: 'operations', display_name: 'Operations', route: '/operations', icon: 'Briefcase', productType: 'PUMP_ERP', sort_order: 2 },
      { module_name: 'fuel-management', display_name: 'Fuel Management', route: '/fuel-management', icon: 'Droplet', productType: 'PUMP_ERP', sort_order: 3 },
      { module_name: 'pump-sales', display_name: 'Sales & POS', route: '/pump-sales', icon: 'DollarSign', productType: 'PUMP_ERP', sort_order: 4 },
      { module_name: 'pump-inventory', display_name: 'Pump Inventory', route: '/pump-inventory', icon: 'Package', productType: 'PUMP_ERP', sort_order: 5 },
      { module_name: 'pump-reports', display_name: 'Reports & Analytics', route: '/pump-reports', icon: 'BarChart', productType: 'PUMP_ERP', sort_order: 6 },
      
      // Enterprise Modules (ALL)
      { module_name: 'analytics', display_name: 'Analytics', route: '/analytics', icon: 'TrendingUp', productType: 'ALL', sort_order: 1 },
      { module_name: 'subscriptions', display_name: 'Subscriptions', route: '/subscriptions', icon: 'CreditCard', productType: 'ALL', sort_order: 2 },
    ];

    for (const moduleData of modulesData) {
      await prisma.module.upsert({
        where: { module_name: moduleData.module_name },
        update: {},
        create: moduleData
      });
      console.log(`   ✅ Module: ${moduleData.display_name} (${moduleData.productType})`);
    }
    
    console.log('');

    // ==========================================
    // 3. CREATE SUPER ADMINS
    // ==========================================
    console.log('3️⃣  Creating Super Admins...');
    
    const superAdminPassword = bcrypt.hashSync('Super@123', 10);
    
    // Business ERP Super Admin
    const businessSuperAdmin = await prisma.superAdmin.upsert({
      where: { email: 'business_superadmin@bisman.demo' },
      update: {},
      create: {
        name: 'Business Super Admin',
        email: 'business_superadmin@bisman.demo',
        password: superAdminPassword,
        productType: 'BUSINESS_ERP',
        created_by: enterpriseAdmin.id,
        is_active: true
      }
    });
    
    console.log(`   ✅ Business Super Admin: ${businessSuperAdmin.email}`);

    // Pump ERP Super Admin
    const pumpSuperAdmin = await prisma.superAdmin.upsert({
      where: { email: 'pump_superadmin@bisman.demo' },
      update: {},
      create: {
        name: 'Pump Super Admin',
        email: 'pump_superadmin@bisman.demo',
        password: superAdminPassword,
        productType: 'PUMP_ERP',
        created_by: enterpriseAdmin.id,
        is_active: true
      }
    });
    
    console.log(`   ✅ Pump Super Admin: ${pumpSuperAdmin.email}\n`);

    // ==========================================
    // 4. ASSIGN MODULES TO SUPER ADMINS
    // ==========================================
    console.log('4️⃣  Assigning Modules to Super Admins...');
    
    // Get Business ERP modules
    const businessModules = await prisma.module.findMany({
      where: { productType: 'BUSINESS_ERP' }
    });
    
    for (const module of businessModules) {
      await prisma.moduleAssignment.upsert({
        where: {
          super_admin_id_module_id: {
            super_admin_id: businessSuperAdmin.id,
            module_id: module.id
          }
        },
        update: {},
        create: {
          super_admin_id: businessSuperAdmin.id,
          module_id: module.id
        }
      });
    }
    console.log(`   ✅ Assigned ${businessModules.length} modules to Business Super Admin`);

    // Get Pump ERP modules
    const pumpModules = await prisma.module.findMany({
      where: { productType: 'PUMP_ERP' }
    });
    
    for (const module of pumpModules) {
      await prisma.moduleAssignment.upsert({
        where: {
          super_admin_id_module_id: {
            super_admin_id: pumpSuperAdmin.id,
            module_id: module.id
          }
        },
        update: {},
        create: {
          super_admin_id: pumpSuperAdmin.id,
          module_id: module.id
        }
      });
    }
    console.log(`   ✅ Assigned ${pumpModules.length} modules to Pump Super Admin\n`);

    // ==========================================
    // 5. CREATE TEST CLIENTS
    // ==========================================
    console.log('5️⃣  Creating Test Clients...');
    
    // Business Clients
    const businessClient1 = await prisma.client.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440001' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'ABC Manufacturing Ltd',
        productType: 'BUSINESS_ERP',
        super_admin_id: businessSuperAdmin.id,
        subscriptionPlan: 'premium',
        subscriptionStatus: 'active',
        is_active: true
      }
    });
    
    console.log(`   ✅ Business Client: ${businessClient1.name}`);

    const businessClient2 = await prisma.client.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440002' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'XYZ Industries Pvt Ltd',
        productType: 'BUSINESS_ERP',
        super_admin_id: businessSuperAdmin.id,
        subscriptionPlan: 'basic',
        subscriptionStatus: 'active',
        is_active: true
      }
    });
    
    console.log(`   ✅ Business Client: ${businessClient2.name}`);

    // Pump Clients
    const pumpClient1 = await prisma.client.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440003' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'HP Petrol Pump - Station A',
        productType: 'PUMP_ERP',
        super_admin_id: pumpSuperAdmin.id,
        subscriptionPlan: 'premium',
        subscriptionStatus: 'active',
        is_active: true
      }
    });
    
    console.log(`   ✅ Pump Client: ${pumpClient1.name}`);

    const pumpClient2 = await prisma.client.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440004' },
      update: {},
      create: {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Shell Fuel Station - Highway',
        productType: 'PUMP_ERP',
        super_admin_id: pumpSuperAdmin.id,
        subscriptionPlan: 'basic',
        subscriptionStatus: 'active',
        is_active: true
      }
    });
    
    console.log(`   ✅ Pump Client: ${pumpClient2.name}\n`);

    // ==========================================
    // 6. CREATE PERMISSIONS FOR ROLES
    // ==========================================
    console.log('6️⃣  Creating Permissions...');
    
  const roles = ['SYSTEM_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'CFO', 'FINANCE_CONTROLLER', 'HUB_INCHARGE'];
    const allModules = await prisma.module.findMany();
    
    let permissionCount = 0;
    for (const role of roles) {
      for (const module of allModules) {
  // Platform + tenant admins get full access
  const isFullAccess = role === 'SYSTEM_ADMIN' || role === 'ADMIN';
        
        await prisma.permission.upsert({
          where: {
            role_module_id: {
              role: role,
              module_id: module.id
            }
          },
          update: {},
          create: {
            role: role,
            module_id: module.id,
            can_view: true,
            can_create: isFullAccess,
            can_edit: isFullAccess,
            can_delete: isFullAccess
          }
        });
        permissionCount++;
      }
    }
    
    console.log(`   ✅ Created ${permissionCount} permissions for ${roles.length} roles\n`);

    // ==========================================
    // 7. UPDATE EXISTING DEMO USERS
    // ==========================================
    console.log('7️⃣  Updating Existing Demo Users with productType...');
    
    // Update enterprise admin user
    await prisma.user.update({
      where: { email: 'enterprise@bisman.erp' },
      data: { 
        productType: 'ALL',
        role: 'ENTERPRISE_ADMIN'
      }
    }).catch(() => console.log('   ⚠️  Enterprise admin user not found in users table'));

    // Update pump super admin
    await prisma.user.update({
      where: { email: 'pump_superadmin@bisman.demo' },
      data: { 
        productType: 'PUMP_ERP',
        role: 'SUPER_ADMIN',
        assignedModules: ['pump-management', 'operations', 'fuel-management', 'pump-sales', 'pump-inventory', 'pump-reports']
      }
    }).catch(() => console.log('   ℹ️  Pump super admin will be created separately'));

    console.log('   ✅ Updated existing users\n');

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('='.repeat(80));
    console.log('✨ MULTI-TENANT SEED DATA COMPLETE!\n');
    
    console.log('📊 Summary:');
    console.log(`   • Enterprise Admins: 1`);
    console.log(`   • Super Admins: 2 (1 Business, 1 Pump)`);
    console.log(`   • Modules: ${modulesData.length}`);
    console.log(`   • Clients: 4 (2 Business, 2 Pump)`);
    console.log(`   • Permissions: ${permissionCount}\n`);
    
    console.log('🔑 Login Credentials:');
    console.log('   Enterprise Admin:');
    console.log('   • Email: enterprise@bisman.erp');
    console.log('   • Password: enterprise123\n');
    
    console.log('   Business Super Admin:');
    console.log('   • Email: business_superadmin@bisman.demo');
    console.log('   • Password: Super@123\n');
    
    console.log('   Pump Super Admin:');
    console.log('   • Email: pump_superadmin@bisman.demo');
    console.log('   • Password: Super@123\n');
    
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMultiTenantData();
