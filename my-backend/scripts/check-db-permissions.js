const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== ALL MODULES IN DATABASE ===\n");
  const modules = await prisma.module.findMany({ orderBy: { id: "asc" } });
  
  console.log("ID | module_name | display_name | always_accessible | productType | active");
  console.log("-".repeat(90));
  modules.forEach(m => {
    console.log(`${m.id} | ${m.module_name} | ${m.display_name} | ${m.is_always_accessible} | ${m.productType} | ${m.is_active}`);
  });
  
  console.log("\n=== MODULE ASSIGNMENTS ===\n");
  const assigns = await prisma.moduleAssignment.findMany({
    include: { 
      superAdmin: { select: { id: true, name: true, email: true } }, 
      module: { select: { id: true, module_name: true, display_name: true } } 
    }
  });
  
  if (assigns.length === 0) {
    console.log("No module assignments found.");
  } else {
    assigns.forEach(a => {
      console.log(`SuperAdmin: ${a.superAdmin.name} (ID: ${a.superAdmin.id})`);
      console.log(`  -> Module: ${a.module.display_name} (${a.module.module_name})`);
      console.log(`  -> Page Permissions: ${JSON.stringify(a.page_permissions)}`);
      console.log("");
    });
  }
  
  console.log("\n=== SUPER ADMINS SUMMARY ===\n");
  const superAdmins = await prisma.superAdmin.findMany({
    include: { moduleAssignments: { include: { module: true } } }
  });
  
  superAdmins.forEach(sa => {
    console.log(`${sa.name} (${sa.email}) - ${sa.productType}`);
    console.log(`  Assigned: ${sa.moduleAssignments.map(ma => ma.module.module_name).join(", ") || "None"}`);
  });
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
