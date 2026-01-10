const { getPrisma } = require('../lib/prisma');

async function cleanRoles() {
  const prisma = getPrisma();
  
  // Roles to delete (duplicates with wrong levels)
  const rolesToDelete = [
    19, // "Super Admin" at level 10 (duplicate of SUPER_ADMIN at level 1)
    20, // "Admin" at level 9 (duplicate of ADMIN at level 2)
    21, // "System Administrator" at level 9 (should be removed)
    25, // "Staff" at level 1 (duplicate of STAFF at level 7)
    26, // "Demo User" at level 1 (not needed)
    24, // "Manager" at level 6 (duplicate of MANAGER at level 4)
    23, // "Operations Manager" at level 7 (duplicate of OPERATIONS_MANAGER at level 4)
    28, // "Finance Controller" at level 8 (duplicate of FINANCE_CONTROLLER at level 3)
  ];
  
  console.log("Roles to delete:", rolesToDelete);
  
  // Check if any users have these roles before deleting
  for (const roleId of rolesToDelete) {
    try {
      const usersWithRole = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM user_roles WHERE role_id = ${roleId}
      `;
      console.log("Role", roleId, "has", usersWithRole[0]?.count || 0, "users");
    } catch (e) {
      console.log("Role", roleId, "- user_roles table check skipped");
    }
  }
  
  // Delete the roles
  const result = await prisma.rbac_roles.deleteMany({
    where: { id: { in: rolesToDelete } }
  });
  
  console.log("\n✅ Deleted", result.count, "duplicate roles");
  
  // Fix CFO level (should be 2 for C-Suite, not 9)
  await prisma.rbac_roles.update({
    where: { id: 14 },
    data: { level: 2 }
  });
  console.log("✅ Fixed CFO level to 2 (C-Suite)");
  
  // Fix IT Admin level (should be 5 for support staff)
  await prisma.rbac_roles.update({
    where: { id: 22 },
    data: { level: 5 }
  });
  console.log("✅ Fixed IT Admin level to 5 (Support Staff)");
  
  // Fix DATA_ENTRY level (should be 7 for staff)
  await prisma.rbac_roles.update({
    where: { id: 12 },
    data: { level: 7 }
  });
  console.log("✅ Fixed DATA_ENTRY level to 7 (Staff)");
  
  // List remaining roles
  console.log("\n📋 Remaining roles:");
  const roles = await prisma.rbac_roles.findMany({
    select: { id: true, name: true, level: true },
    orderBy: { level: 'asc' }
  });
  
  console.log("\nLevel\tID\tName");
  console.log("-----\t--\t----");
  roles.forEach(r => console.log(`${r.level}\t${r.id}\t${r.name}`));
  
  await prisma.$disconnect();
  console.log("\n✅ Done!");
}

cleanRoles().catch(e => console.error(e));
