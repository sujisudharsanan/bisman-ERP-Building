const { getPrisma } = require('../lib/prisma');

async function addAdminOps() {
  const prisma = getPrisma();
  
  // Check if ADMIN_OPS role exists
  const existing = await prisma.$queryRaw`SELECT id, name FROM roles WHERE name = 'Admin Ops' OR name = 'ADMIN_OPS'`;
  console.log('Existing Admin Ops roles:', existing);
  
  if (existing.length === 0) {
    // Create the role
    await prisma.$queryRaw`INSERT INTO roles (name, description, created_at, updated_at) VALUES ('Admin Ops', 'Operations Administrator - handles day-to-day operations management', NOW(), NOW())`;
    console.log('✅ Admin Ops role created');
  } else {
    console.log('✅ Admin Ops role already exists');
  }
  
  // List all roles
  const roles = await prisma.$queryRaw`SELECT id, name, description FROM roles ORDER BY name`;
  console.log('\nAll roles:', JSON.stringify(roles, null, 2));
  
  await prisma.$disconnect();
}

addAdminOps().catch(e => console.error(e));
