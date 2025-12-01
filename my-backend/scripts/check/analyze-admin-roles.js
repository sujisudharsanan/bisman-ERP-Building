/**
 * Script to analyze and fix duplicate admin roles issue
 * This will help identify if you have actual duplicate roles or if users are assigned inconsistent role values
 */

const { getPrisma } = require('./lib/prisma');

async function analyzeAdminRoles() {
  const prisma = getPrisma();
  
  try {
    console.log('\n========================================');
    console.log('ADMIN ROLES ANALYSIS');
    console.log('========================================\n');
    
    // 1. Find all admin-related roles in rbac_roles table
    console.log('1. ROLES IN rbac_roles TABLE:');
    console.log('----------------------------');
    const roles = await prisma.rbac_roles.findMany({
      where: {
        OR: [
          { name: { contains: 'admin', mode: 'insensitive' } },
          { display_name: { contains: 'admin', mode: 'insensitive' } }
        ]
      },
      orderBy: { id: 'asc' }
    });
    
    roles.forEach(role => {
      console.log(`  ID: ${role.id}`);
      console.log(`  Name: "${role.name}"`);
      console.log(`  Display Name: "${role.display_name}"`);
      console.log(`  Description: "${role.description || 'N/A'}"`);
      console.log(`  Status: ${role.status}`);
      console.log(`  ---`);
    });
    
    // 2. Find all users with admin role
    console.log('\n2. USERS WITH ADMIN ROLES:');
    console.log('----------------------------');
    const users = await prisma.User.findMany({
      where: {
        role: { contains: 'admin', mode: 'insensitive' }
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      },
      orderBy: { role: 'asc' }
    });
    
    users.forEach(user => {
      console.log(`  ID: ${user.id} | Username: ${user.username} | Role: "${user.role}" | Email: ${user.email}`);
    });
    
    // 3. Group users by their exact role value
    console.log('\n3. USERS GROUPED BY ROLE VALUE:');
    console.log('--------------------------------');
    const roleGroups = {};
    users.forEach(user => {
      const roleKey = user.role || 'NULL';
      if (!roleGroups[roleKey]) {
        roleGroups[roleKey] = [];
      }
      roleGroups[roleKey].push(user);
    });
    
    Object.keys(roleGroups).forEach(roleValue => {
      console.log(`  Role Value: "${roleValue}" (${roleGroups[roleValue].length} users)`);
      roleGroups[roleValue].forEach(u => {
        console.log(`    - ${u.username} (ID: ${u.id})`);
      });
    });
    
    // 4. Check for normalization matches
    console.log('\n4. NORMALIZATION ANALYSIS:');
    console.log('--------------------------');
    const normalize = (str) => str.toLowerCase().replace(/[-_\s]+/g, '_');
    
    roles.forEach(role => {
      const normalizedRole = normalize(role.name);
      const matchingUsers = users.filter(u => normalize(u.role) === normalizedRole);
      console.log(`  Role "${role.name}" (normalized: "${normalizedRole}")`);
      console.log(`    Matches ${matchingUsers.length} users: ${matchingUsers.map(u => u.username).join(', ') || 'none'}`);
    });
    
    // 5. Recommendations
    console.log('\n5. RECOMMENDATIONS:');
    console.log('-------------------');
    
    const uniqueNormalizedRoles = new Set(roles.map(r => normalize(r.name)));
    const uniqueNormalizedUserRoles = new Set(users.map(u => normalize(u.role)));
    
    if (uniqueNormalizedRoles.size < roles.length) {
      console.log('  ⚠️  WARNING: You have duplicate roles that normalize to the same value!');
      console.log('     This causes users to appear under multiple roles in reports.');
      console.log('     Consider merging or removing duplicate roles.');
    }
    
    if (Object.keys(roleGroups).length > 1) {
      console.log('  ⚠️  WARNING: Users have different exact role values:');
      Object.keys(roleGroups).forEach(roleValue => {
        console.log(`     - "${roleValue}" (${roleGroups[roleValue].length} users)`);
      });
      console.log('     Consider standardizing to one role value.');
    }
    
    // Check if user roles match any role in rbac_roles
    users.forEach(user => {
      const normalizedUserRole = normalize(user.role);
      const matchingRole = roles.find(r => normalize(r.name) === normalizedUserRole);
      if (!matchingRole) {
        console.log(`  ⚠️  User "${user.username}" has role "${user.role}" which doesn't match any rbac_roles entry!`);
      }
    });
    
    console.log('\n========================================\n');
    
  } catch (error) {
    console.error('Error analyzing roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeAdminRoles();
