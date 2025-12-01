#!/usr/bin/env node
/**
 * Seed Demo Data for Multi-Business ERP
 * 
 * This script creates:
 * - Enterprise Admin user
 * - 2 Super Admins (Petrol Pump + Logistics)
 * - Assigns modules to each Super Admin
 * - Creates sample users under each business
 * 
 * Usage: node seed-demo-data.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting demo data seeding...\n');

  try {
    // =====================================================
    // 1. CREATE ENTERPRISE ADMIN USER
    // =====================================================
    console.log('👤 Creating Enterprise Admin...');
    
    const enterpriseAdminPassword = await bcrypt.hash('enterprise123', 10);
    
    const enterpriseAdmin = await prisma.user.upsert({
      where: { email: 'enterprise@bisman.erp' },
      update: {},
      create: {
        email: 'enterprise@bisman.erp',
        password: enterpriseAdminPassword,
        role: 'ENTERPRISE_ADMIN',
        username: 'enterprise_admin',
        name: 'Enterprise Administrator',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    
    console.log('✅ Enterprise Admin created: enterprise@bisman.erp / enterprise123\n');

    // =====================================================
    // 2. GET BUSINESS TYPES
    // =====================================================
    const petrolPumpType = await prisma.businessType.findUnique({
      where: { slug: 'petrol-pump' },
    });
    
    const logisticsType = await prisma.businessType.findUnique({
      where: { slug: 'logistics' },
    });

    if (!petrolPumpType || !logisticsType) {
      console.error('❌ Business types not found. Please run migration first.');
      process.exit(1);
    }

    // =====================================================
    // 3. CREATE PETROL PUMP SUPER ADMIN
    // =====================================================
    console.log('⛽ Creating Petrol Pump Super Admin...');
    
    const petrolSuperAdminPassword = await bcrypt.hash('petrol123', 10);
    
    const petrolSuperAdminUser = await prisma.user.upsert({
      where: { email: 'rajesh@petrolpump.com' },
      update: {},
      create: {
        email: 'rajesh@petrolpump.com',
        password: petrolSuperAdminPassword,
        role: 'SUPER_ADMIN',
        username: 'rajesh_petrol',
        name: 'Rajesh Kumar',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const petrolSuperAdmin = await prisma.superAdmin.upsert({
      where: { email: 'rajesh@petrolpump.com' },
      update: {},
      create: {
        user_id: petrolSuperAdminUser.id,
        business_type_id: petrolPumpType.id,
        business_name: 'Rajesh Petrol Pump - Highway 44',
        business_slug: 'rajesh-petrol-pump',
        email: 'rajesh@petrolpump.com',
        phone: '9876543210',
        address: 'Highway 44, Bypass Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        gst_number: '29AAAAA1234A1Z5',
        pan_number: 'AAAAA1234A',
        is_active: true,
        subscription_status: 'active',
        subscription_plan: 'professional',
        max_users: 25,
        max_storage_gb: 10,
        created_by: enterpriseAdmin.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Update user with super_admin_id
    await prisma.user.update({
      where: { id: petrolSuperAdminUser.id },
      data: { super_admin_id: petrolSuperAdmin.id },
    });

    console.log('✅ Petrol Pump Super Admin created: rajesh@petrolpump.com / petrol123');
    console.log(`   Business: ${petrolSuperAdmin.business_name}\n`);

    // =====================================================
    // 4. CREATE LOGISTICS SUPER ADMIN
    // =====================================================
    console.log('🚚 Creating Logistics Super Admin...');
    
    const logisticsSuperAdminPassword = await bcrypt.hash('logistics123', 10);
    
    const logisticsSuperAdminUser = await prisma.user.upsert({
      where: { email: 'amit@abclogistics.com' },
      update: {},
      create: {
        email: 'amit@abclogistics.com',
        password: logisticsSuperAdminPassword,
        role: 'SUPER_ADMIN',
        username: 'amit_logistics',
        name: 'Amit Patel',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const logisticsSuperAdmin = await prisma.superAdmin.upsert({
      where: { email: 'amit@abclogistics.com' },
      update: {},
      create: {
        user_id: logisticsSuperAdminUser.id,
        business_type_id: logisticsType.id,
        business_name: 'ABC Logistics Pvt Ltd',
        business_slug: 'abc-logistics',
        email: 'amit@abclogistics.com',
        phone: '9876543211',
        address: 'Industrial Area, Phase 2',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        gst_number: '27BBBBB5678B1Z5',
        pan_number: 'BBBBB5678B',
        is_active: true,
        subscription_status: 'active',
        subscription_plan: 'enterprise',
        max_users: 50,
        max_storage_gb: 25,
        created_by: enterpriseAdmin.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Update user with super_admin_id
    await prisma.user.update({
      where: { id: logisticsSuperAdminUser.id },
      data: { super_admin_id: logisticsSuperAdmin.id },
    });

    console.log('✅ Logistics Super Admin created: amit@abclogistics.com / logistics123');
    console.log(`   Business: ${logisticsSuperAdmin.business_name}\n`);

    // =====================================================
    // 5. CREATE STAFF USERS FOR PETROL PUMP
    // =====================================================
    console.log('👥 Creating staff users for Petrol Pump...');

    const petrolManagerPassword = await bcrypt.hash('manager123', 10);
    await prisma.user.upsert({
      where: { email: 'manager@petrolpump.com' },
      update: {},
      create: {
        email: 'manager@petrolpump.com',
        password: petrolManagerPassword,
        role: 'MANAGER',
        username: 'petrol_manager',
        name: 'Suresh Manager',
        super_admin_id: petrolSuperAdmin.id,
        is_active: true,
      },
    });

    const petrolStaffPassword = await bcrypt.hash('staff123', 10);
    await prisma.user.upsert({
      where: { email: 'staff@petrolpump.com' },
      update: {},
      create: {
        email: 'staff@petrolpump.com',
        password: petrolStaffPassword,
        role: 'STAFF',
        username: 'petrol_staff',
        name: 'Ramesh Staff',
        super_admin_id: petrolSuperAdmin.id,
        is_active: true,
      },
    });

    console.log('✅ Petrol Pump staff created:');
    console.log('   Manager: manager@petrolpump.com / manager123');
    console.log('   Staff: staff@petrolpump.com / staff123\n');

    // =====================================================
    // 6. CREATE STAFF USERS FOR LOGISTICS
    // =====================================================
    console.log('👥 Creating staff users for Logistics...');

    const logisticsManagerPassword = await bcrypt.hash('manager123', 10);
    await prisma.user.upsert({
      where: { email: 'manager@abclogistics.com' },
      update: {},
      create: {
        email: 'manager@abclogistics.com',
        password: logisticsManagerPassword,
        role: 'MANAGER',
        username: 'logistics_manager',
        name: 'Priya Manager',
        super_admin_id: logisticsSuperAdmin.id,
        is_active: true,
      },
    });

    const logisticsStaffPassword = await bcrypt.hash('staff123', 10);
    await prisma.user.upsert({
      where: { email: 'staff@abclogistics.com' },
      update: {},
      create: {
        email: 'staff@abclogistics.com',
        password: logisticsStaffPassword,
        role: 'STAFF',
        username: 'logistics_staff',
        name: 'Vijay Staff',
        super_admin_id: logisticsSuperAdmin.id,
        is_active: true,
      },
    });

    console.log('✅ Logistics staff created:');
    console.log('   Manager: manager@abclogistics.com / manager123');
    console.log('   Staff: staff@abclogistics.com / staff123\n');

    // =====================================================
    // 7. VERIFY MODULE ASSIGNMENTS
    // =====================================================
    console.log('🔍 Verifying module assignments...');

    const petrolModules = await prisma.superAdminModule.count({
      where: { super_admin_id: petrolSuperAdmin.id },
    });

    const logisticsModules = await prisma.superAdminModule.count({
      where: { super_admin_id: logisticsSuperAdmin.id },
    });

    console.log(`✅ Petrol Pump has ${petrolModules} modules assigned`);
    console.log(`✅ Logistics has ${logisticsModules} modules assigned\n`);

    // =====================================================
    // SUMMARY
    // =====================================================
    console.log('═'.repeat(60));
    console.log('✅ DEMO DATA SEEDING COMPLETE!');
    console.log('═'.repeat(60));
    console.log('\n📋 Login Credentials:\n');
    
    console.log('🏢 ENTERPRISE ADMIN:');
    console.log('   Email: enterprise@bisman.erp');
    console.log('   Password: enterprise123');
    console.log('   Role: Can manage all businesses\n');

    console.log('⛽ PETROL PUMP SUPER ADMIN:');
    console.log('   Email: rajesh@petrolpump.com');
    console.log('   Password: petrol123');
    console.log('   Business: Rajesh Petrol Pump - Highway 44');
    console.log('   Modules: Fuel Sales, Tank Inventory, etc.\n');

    console.log('🚚 LOGISTICS SUPER ADMIN:');
    console.log('   Email: amit@abclogistics.com');
    console.log('   Password: logistics123');
    console.log('   Business: ABC Logistics Pvt Ltd');
    console.log('   Modules: Shipments, Fleet, Routes, etc.\n');

    console.log('👥 STAFF USERS:');
    console.log('   Petrol Pump Manager: manager@petrolpump.com / manager123');
    console.log('   Petrol Pump Staff: staff@petrolpump.com / staff123');
    console.log('   Logistics Manager: manager@abclogistics.com / manager123');
    console.log('   Logistics Staff: staff@abclogistics.com / staff123\n');

    console.log('═'.repeat(60));
    console.log('🎉 You can now login and test the multi-business system!');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\n✅ Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  });
