const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteDemoSuperAdmins() {
  try {
    // List of emails to delete
    const emailsToDelete = [
      'test_business@bisman.demo',
      'demo_super_admin@bisman.demo'
    ];

    console.log('🔍 Searching for demo super admin accounts to delete...\n');

    // Find the super admins
    const superAdminsToDelete = await prisma.super_admins.findMany({
      where: {
        email: {
          in: emailsToDelete
        }
      },
      include: {
        moduleAssignments: true,
        clients: true,
        users: true
      }
    });

    if (superAdminsToDelete.length === 0) {
      console.log('✅ No demo super admin accounts found. Nothing to delete.');
      return;
    }

    console.log(`Found ${superAdminsToDelete.length} super admin(s) to delete:\n`);

    // Display what will be deleted
    for (const admin of superAdminsToDelete) {
      console.log(`📋 Super Admin: ${admin.name} (${admin.email})`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Product Type: ${admin.productType}`);
      console.log(`   Module Assignments: ${admin.moduleAssignments.length}`);
      console.log(`   Clients: ${admin.clients.length}`);
      console.log(`   Users: ${admin.users.length}`);
      console.log('');
    }

    console.log('🗑️  Starting deletion process...\n');

    // Delete each super admin (CASCADE will handle related records)
    for (const admin of superAdminsToDelete) {
      console.log(`Deleting ${admin.name} (${admin.email})...`);
      
      await prisma.super_admins.delete({
        where: {
          id: admin.id
        }
      });
      
      console.log(`✅ Deleted ${admin.name} successfully`);
    }

    console.log('\n🎉 All demo super admin accounts have been deleted successfully!');

  } catch (error) {
    console.error('❌ Error deleting demo super admins:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
deleteDemoSuperAdmins();
