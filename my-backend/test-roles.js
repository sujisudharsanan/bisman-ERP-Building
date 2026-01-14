const { getPrisma } = require('./lib/prisma');
async function test() {
  const prisma = getPrisma();
  
  // Simulate what the API does for SUPER_ADMIN with ID 3
  const superAdminId = 3;
  
  // Get role assignments
  const roleAssignments = await prisma.admin_role_assignments.findMany({
    where: {
      assignee_type: 'SUPER_ADMIN',
      assignee_id: superAdminId,
      is_active: true
    },
    select: { role_id: true }
  });
  
  const assignedRoleIds = roleAssignments.map(ra => ra.role_id);
  console.log('Assigned role IDs:', assignedRoleIds);
  
  // Get all roles
  let roles = await prisma.rbac_roles.findMany();
  console.log('Total roles before filter:', roles.length);
  
  // Filter SUPER_ADMIN and ENTERPRISE_ADMIN
  roles = roles.filter(role => {
    const roleName = String(role.name).toUpperCase();
    return roleName !== 'SUPER_ADMIN' && roleName !== 'ENTERPRISE_ADMIN';
  });
  console.log('Roles after filtering SUPER_ADMIN/ENTERPRISE_ADMIN:', roles.length);
  
  // Filter by assigned role IDs
  const assignedRoleNames = [];
  const beforeCount = roles.length;
  roles = roles.filter(role => {
    const roleIdMatch = assignedRoleIds.includes(role.id);
    const roleNameMatch = assignedRoleNames.includes(String(role.name).toUpperCase());
    return roleIdMatch || roleNameMatch;
  });
  console.log('Roles after assignment filter:', roles.length);
  console.log('Final roles:', roles.map(r => ({ id: r.id, name: r.name })));
  
  process.exit(0);
}
test();
