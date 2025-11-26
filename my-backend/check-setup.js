const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSetup() {
  console.log('\n🔍 Checking database setup...\n');
  
  try {
    // Check for super admin
    const superAdmin = await prisma.superAdmin.findFirst({
      where: { email: 'super_admin@bisman.erp' }
    });
    
    if (!superAdmin) {
      console.log('❌ No Super Admin found with email: super_admin@bisman.erp');
      console.log('   Available Super Admins:');
      const allSuperAdmins = await prisma.superAdmin.findMany({
        select: { id: true, email: true, name: true }
      });
      allSuperAdmins.forEach(sa => {
        console.log(`   - ${sa.email} (ID: ${sa.id})`);
      });
    } else {
      console.log(`✅ Super Admin found: ${superAdmin.email} (ID: ${superAdmin.id})`);
    }
    
    // Check for client
    if (superAdmin) {
      const client = await prisma.client.findFirst({
        where: { super_admin_id: superAdmin.id }
      });
      
      if (!client) {
        console.log('❌ No client found for this super admin');
        const allClients = await prisma.client.findMany({
          select: { id: true, name: true, super_admin_id: true }
        });
        console.log(`   Total clients in DB: ${allClients.length}`);
        if (allClients.length > 0) {
          console.log('   Using first available client:', allClients[0].name);
        }
      } else {
        console.log(`✅ Client found: ${client.name} (ID: ${client.id})`);
      }
    }
    
    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSetup();
