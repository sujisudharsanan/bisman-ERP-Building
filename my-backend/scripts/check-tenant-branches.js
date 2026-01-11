const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Check all branches
    console.log('=== All Branches ===');
    const branches = await prisma.branches.findMany({ 
      take: 10, 
      select: { id: true, branch_code: true, branch_name: true, tenant_id: true } 
    });
    branches.forEach(b => console.log('  Code:', b.branch_code, '| Tenant:', b.tenant_id));
    if (branches.length === 0) console.log('  (no branches)');
    
    // Check all clients/tenants
    console.log('\n=== All Clients/Tenants ===');
    const clients = await prisma.clients.findMany({ 
      take: 10, 
      select: { id: true, name: true } 
    });
    clients.forEach(c => console.log('  ID:', c.id, '| Name:', c.name));
    
    // Check users_enhanced to see which tenant is 'Suji'
    console.log('\n=== Users (looking for Suji) ===');
    const users = await prisma.users_enhanced.findMany({ 
      where: { 
        OR: [
          { full_name: { contains: 'Suji', mode: 'insensitive' } },
          { username: { contains: 'Suji', mode: 'insensitive' } }
        ]
      },
      select: { id: true, full_name: true, username: true, tenant_id: true, role: true } 
    });
    users.forEach(u => console.log('  User:', u.full_name || u.username, '| Tenant:', u.tenant_id, '| Role:', u.role));
    if (users.length === 0) console.log('  (no matching users)');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
