/* global console */
import { getPrisma } from './my-backend/lib/prisma.js';

async function check() {
  const prisma = getPrisma();
  // Get super admins
  const superAdmins = await prisma.super_admins.findMany({
    select: { id: true, name: true, email: true }
  });
  console.log('Super Admins:');
  console.log(JSON.stringify(superAdmins, null, 2));
  
  // Check module assignments for all super admins
  console.log('\nModule Assignments (module_assignments table):');
  for (const sa of superAdmins) {
    const moduleAssignments = await prisma.module_assignments.findMany({
      where: { super_admin_id: sa.id },
      include: { modules: { select: { id: true, module_name: true, display_name: true } } }
    });
    console.log(`  Super Admin ${sa.id} (${sa.name}): ${moduleAssignments.length} modules`);
    moduleAssignments.forEach(ma => {
      console.log(`    - Module ID ${ma.module_id}: ${ma.modules?.display_name || ma.modules?.module_name}`);
    });
  }
  
  // Check role assignments
  console.log('\nRole Assignments (admin_role_assignments table):');
  for (const sa of superAdmins) {
    const roleAssignments = await prisma.admin_role_assignments.findMany({
      where: { 
        assignee_type: 'SUPER_ADMIN',
        assignee_id: sa.id,
        is_active: true
      },
      include: { rbac_roles: { select: { id: true, name: true, display_name: true } } }
    });
    console.log(`  Super Admin ${sa.id} (${sa.name}): ${roleAssignments.length} roles`);
    roleAssignments.forEach(ra => {
      console.log(`    - Role ID ${ra.role_id}: ${ra.rbac_roles?.display_name || ra.rbac_roles?.name}`);
    });
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
