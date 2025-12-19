const { getPrisma } = require('./lib/prisma');

async function test() {
  const prisma = getPrisma();
  
  // Get super admins
  const superAdmins = await prisma.superAdmin.findMany();
  console.log('Super Admins:', superAdmins.map(s => ({ id: s.id, user_id: s.user_id, email: s.email })));
  
  // Get all admin role assignments
  const assignments = await prisma.adminRoleAssignment.findMany();
  console.log('\nAdmin Role Assignments:', assignments.length);
  assignments.forEach(a => console.log('  -', { 
    id: a.id, 
    assignee_type: a.assignee_type, 
    assignee_id: a.assignee_id, 
    role_id: a.role_id,
    is_active: a.is_active 
  }));

  // Get all rbac_roles
  const roles = await prisma.rbac_roles.findMany({ select: { id: true, name: true } });
  console.log('\nRBAC Roles:', roles.length);
  roles.forEach(r => console.log('  -', r.id, r.name));
  
  process.exit(0);
}
test();
