const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const superAdmins = await prisma.superAdmin.findMany({
      where: {
        email: 'test_business@bisman.demo'
      },
      include: {
        moduleAssignments: {
          include: {
            module: {
              select: {
                id: true,
                module_name: true,
                display_name: true,
                productType: true
              }
            }
          }
        }
      }
    });

    console.log('Super Admins found:', superAdmins.length);
    
    superAdmins.forEach(admin => {
      console.log('\n========================================');
      console.log('Admin:', admin.name, '(' + admin.email + ')');
      console.log('Product Type:', admin.productType);
      console.log('Module Assignments:');
      
      // Format like the API does
      const assignedModules = admin.moduleAssignments.map(ma => ma.module.id);
      const pagePermissions = {};
      admin.moduleAssignments.forEach(ma => {
        if (ma.page_permissions && Array.isArray(ma.page_permissions)) {
          pagePermissions[ma.module.id] = ma.page_permissions;
        }
      });
      
      console.log('Assigned Modules (array):', assignedModules);
      console.log('Page Permissions (object):');
      console.log(JSON.stringify(pagePermissions, null, 2));
      
      admin.moduleAssignments.forEach(ma => {
        console.log(`\n  Module ID: ${ma.module.id}`);
        console.log(`  Module Name: ${ma.module.display_name}`);
        console.log(`  Page Permissions:`, ma.page_permissions);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
