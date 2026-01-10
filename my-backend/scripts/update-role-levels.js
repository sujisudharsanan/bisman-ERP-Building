const { getPrisma } = require('../lib/prisma');

async function updateRoleLevels() {
  const prisma = getPrisma();
  
  // New level mapping: L1 = Entry (first), L10 = Executive (top)
  const levelUpdates = [
    // Level 10 - Executive (CEO/CFO/Admin)
    { id: 1, level: 10, name: 'SUPER_ADMIN' },
    { id: 2, level: 10, name: 'ADMIN' },
    { id: 13, level: 10, name: 'CEO' },
    { id: 14, level: 10, name: 'CFO' },
    { id: 15, level: 10, name: 'COO' },
    { id: 16, level: 10, name: 'CTO' },
    
    // Level 9 - Director (HR/Finance Head)
    { id: 3, level: 9, name: 'HR_MANAGER' },
    { id: 4, level: 9, name: 'FINANCE_CONTROLLER' },
    { id: 57, level: 9, name: 'Admin Ops' },
    
    // Level 8 - Sr. Manager (Department Head)
    { id: 34, level: 8, name: 'Store Incharge' },
    { id: 35, level: 8, name: 'Hub Incharge' },
    
    // Level 7 - Manager (Operations)
    { id: 5, level: 7, name: 'OPERATIONS_MANAGER' },
    { id: 18, level: 7, name: 'MANAGER' },
    { id: 33, level: 7, name: 'Procurement Officer' },
    { id: 31, level: 7, name: 'Accounts Payable' },
    
    // Level 6 - Supervisor (Compliance)
    { id: 9, level: 6, name: 'SUPERVISOR' },
    { id: 36, level: 6, name: 'Compliance' },
    { id: 37, level: 6, name: 'Legal' },
    
    // Level 5 - Team Lead (Incharge)
    { id: 6, level: 5, name: 'HUB_INCHARGE' },
    { id: 7, level: 5, name: 'STORE_INCHARGE' },
    { id: 8, level: 5, name: 'BRANCH_INCHARGE' },
    
    // Level 4 - Senior Staff (Accounts)
    { id: 11, level: 4, name: 'ACCOUNTANT' },
    { id: 17, level: 4, name: 'HR' },
    { id: 30, level: 4, name: 'Accounts' },
    { id: 32, level: 4, name: 'Banker' },
    { id: 29, level: 4, name: 'Treasury' },
    
    // Level 3 - Staff (Support)
    { id: 10, level: 3, name: 'STAFF' },
    { id: 22, level: 3, name: 'IT Admin' },
    
    // Level 2 - Junior Staff (Data Entry)
    { id: 12, level: 2, name: 'DATA_ENTRY' },
  ];
  
  console.log("Updating role levels (L1 = Entry, L10 = Executive)...\n");
  
  for (const update of levelUpdates) {
    try {
      await prisma.rbac_roles.update({
        where: { id: update.id },
        data: { level: update.level }
      });
      console.log(`✅ ${update.name} -> Level ${update.level}`);
    } catch (e) {
      console.log(`⚠️ ${update.name} (id: ${update.id}) - ${e.message}`);
    }
  }
  
  // List final roles
  console.log("\n📋 Final role list:");
  const roles = await prisma.rbac_roles.findMany({
    select: { id: true, name: true, level: true },
    orderBy: { level: 'desc' } // Highest level (executives) first
  });
  
  console.log("\nLevel\tID\tName");
  console.log("-----\t--\t----");
  roles.forEach(r => console.log(`${r.level}\t${r.id}\t${r.name}`));
  
  await prisma.$disconnect();
  console.log("\n✅ Done!");
}

updateRoleLevels().catch(e => console.error(e));
