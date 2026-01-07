const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.rbac_roles.findMany({
    select: { id: true, name: true, display_name: true, level: true, status: true },
    orderBy: { name: 'asc' }
  });
  
  console.log('All roles:');
  roles.forEach(r => {
    console.log(`  ID: ${r.id}, Name: "${r.name}", Display: "${r.display_name}", Level: ${r.level}, Status: ${r.status}`);
  });
  
  // Find duplicates by case-insensitive name
  const nameMap = {};
  roles.forEach(r => {
    const key = r.name.toUpperCase().replace(/[\s_]+/g, '_');
    if (!nameMap[key]) nameMap[key] = [];
    nameMap[key].push(r);
  });
  
  console.log('\nPotential duplicates (same name, different casing):');
  Object.entries(nameMap).filter(([_k, v]) => v.length > 1).forEach(([key, dups]) => {
    console.log(`  ${key}:`);
    dups.forEach(d => console.log(`    - ID: ${d.id}, Name: "${d.name}", Level: ${d.level}`));
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
