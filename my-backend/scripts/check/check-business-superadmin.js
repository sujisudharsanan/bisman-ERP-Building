const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBusinessSuperAdmin() {
  try {
    const superAdmin = await prisma.super_admins.findFirst({
      where: {
        email: 'business_superadmin@bisman.demo'
      },
      include: {
        moduleAssignments: {
          include: {
            module: true
          }
        }
      }
    });

    if (!superAdmin) {
      console.log('❌ Business Super Admin not found');
      return;
    }

    console.log('\n=== BUSINESS SUPER ADMIN CHECK ===\n');
    console.log(`Name: ${superAdmin.name}`);
    console.log(`Email: ${superAdmin.email}`);
    console.log(`Product Type: ${superAdmin.productType}`);
    console.log(`Active: ${superAdmin.is_active}`);
    console.log(`\nModule Assignments: ${superAdmin.moduleAssignments.length}\n`);

    let totalPages = 0;
    superAdmin.moduleAssignments.forEach((assignment, index) => {
      const pageCount = assignment.page_permissions ? assignment.page_permissions.length : 0;
      totalPages += pageCount;
      
      console.log(`${index + 1}. Module: ${assignment.module.display_name} (${assignment.module.module_name})`);
      console.log(`   Module ID: ${assignment.module.id}`);
      console.log(`   Pages Assigned: ${pageCount}`);
      if (assignment.page_permissions && assignment.page_permissions.length > 0) {
        console.log(`   Page IDs: ${assignment.page_permissions.join(', ')}`);
      } else {
        console.log(`   ⚠️  NO PAGES ASSIGNED!`);
      }
      console.log('');
    });

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Modules: ${superAdmin.moduleAssignments.length}`);
    console.log(`   Total Pages: ${totalPages}`);
    
    if (totalPages === 0) {
      console.log(`\n⚠️  WARNING: No pages assigned! Super Admin won't be able to access any pages.`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBusinessSuperAdmin();
