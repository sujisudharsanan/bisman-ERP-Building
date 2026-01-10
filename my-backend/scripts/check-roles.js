const { getPrisma } = require('../lib/prisma');

(async () => {
  const prisma = getPrisma();
  const roles = await prisma.rbac_roles.findMany({
    select: { id: true, name: true, level: true },
    orderBy: { level: 'asc' }
  });
  console.log('L1 roles:', roles.filter(r => r.level === 1).map(r => r.name));
  console.log('L2 roles:', roles.filter(r => r.level === 2).map(r => r.name));
  console.log('L3 roles:', roles.filter(r => r.level === 3).map(r => r.name));
  console.log('Admin Ops:', roles.find(r => r.name.includes('Admin Ops')));
  console.log('Total roles:', roles.length);
  console.log('\nAll roles by level:');
  roles.forEach(r => console.log('L' + r.level + ' - ' + r.name));
  prisma.$disconnect();
})();
