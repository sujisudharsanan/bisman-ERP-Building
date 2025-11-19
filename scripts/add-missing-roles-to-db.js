// Script to add missing roles to the database
// Run: node add-missing-roles-to-db.js

const { getPrisma } = require('./my-backend/lib/prisma');
const prisma = getPrisma();

const MISSING_ROLES = [
  'CFO',
  'Finance Controller',
  'IT Admin',
  'System Administrator',
  'Operations Manager',
  'Treasury',
  'Accounts',
  'Accounts Payable',
  'Banker',
  'Procurement Officer',
  'Store Incharge',
  'Hub Incharge',
  'Compliance',
  'Legal',
];

async function main() {
  console.log('Adding missing roles to database...\n');
  
  for (const roleName of MISSING_ROLES) {
    try {
      // Check if role already exists
      const existing = await prisma.role.findFirst({
        where: { name: roleName }
      });
      
      if (existing) {
        console.log(`✓ Role "${roleName}" already exists (ID: ${existing.id})`);
        continue;
      }
      
      // Create the role
      const created = await prisma.role.create({
        data: {
          name: roleName
        }
      });
      
      console.log(`✓ Created role "${roleName}" (ID: ${created.id})`);
    } catch (error) {
      console.error(`✗ Failed to create role "${roleName}":`, error.message);
    }
  }
  
  console.log('\n=== VERIFICATION ===');
  const allRoles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
  console.log(`Total roles in database: ${allRoles.length}`);
  
  console.log('\n=== ALL ROLES ===');
  allRoles.forEach(r => console.log(`ID: ${r.id}, Name: ${r.name}`));
  
  console.log('\nDone!');
  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
