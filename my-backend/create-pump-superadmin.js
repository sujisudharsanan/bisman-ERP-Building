const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createPumpSuperAdmin() {
  try {
    const password = bcrypt.hashSync('Pump@123', 10);
    
    console.log('🏭 Creating Pump Management Super Admin...\n');
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'pump_superadmin@bisman.demo' }
    });
    
    if (existingUser) {
      console.log('⚠️  User already exists. Updating...\n');
      
      const updatedUser = await prisma.user.update({
        where: { email: 'pump_superadmin@bisman.demo' },
        data: {
          password: password,
          role: 'SUPER_ADMIN',
          assignedModules: ['pump-management', 'operations', 'common'],
          pagePermissions: {
            'pump-management': ['dashboard', 'pumps', 'fuel', 'sales', 'inventory', 'reports'],
            'operations': ['dashboard', 'overview'],
            'common': ['settings', 'profile']
          }
        }
      });
      
      console.log('✅ Updated Pump Management Super Admin');
    } else {
      const newUser = await prisma.user.create({
        data: {
          email: 'pump_superadmin@bisman.demo',
          username: 'pump_superadmin',
          password: password,
          role: 'SUPER_ADMIN',
          assignedModules: ['pump-management', 'operations', 'common'],
          pagePermissions: {
            'pump-management': ['dashboard', 'pumps', 'fuel', 'sales', 'inventory', 'reports'],
            'operations': ['dashboard', 'overview'],
            'common': ['settings', 'profile']
          }
        }
      });
      
      console.log('✅ Created Pump Management Super Admin');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✨ Pump Management Super Admin Ready!\n');
    console.log('🔑 Login Credentials:');
    console.log('   Email: pump_superadmin@bisman.demo');
    console.log('   Password: Pump@123');
    console.log('   Role: SUPER_ADMIN\n');
    console.log('📦 Assigned Modules:');
    console.log('   • pump-management (Full access)');
    console.log('   • operations');
    console.log('   • common\n');
    console.log('🎯 Purpose: Dedicated admin for petrol pump management operations');
    console.log('='.repeat(80));
    
    // Show all users count
    const totalUsers = await prisma.user.count();
    console.log(`\n📊 Total users in database: ${totalUsers}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createPumpSuperAdmin();
