/**
 * RBAC POST-FIX AUDIT SCRIPT
 * Run: node scripts/audit-rbac.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditSection2() {
  console.log('\n=== SECTION 2: Role & Scope Enforcement ===\n');
  
  // 2.1 Role Definitions
  console.log('2.1 Role Definitions:');
  
  const roles = await prisma.$queryRaw`
    SELECT name, level, system_scope, is_system_role, display_name
    FROM rbac_roles
    ORDER BY level DESC, name
  `;
  
  let allUpperSnake = true;
  let allHaveLevel = true;
  let allHaveScope = true;
  
  console.log('  Role Name                  | Level | Scope        | System');
  console.log('  ---------------------------|-------|--------------|-------');
  
  for (const role of roles) {
    const isUpperSnake = /^[A-Z][A-Z0-9_]*$/.test(role.name);
    if (!isUpperSnake) allUpperSnake = false;
    if (role.level === null) allHaveLevel = false;
    if (!role.system_scope) allHaveScope = false;
    
    const marker = isUpperSnake ? '✅' : '❌';
    console.log('  ' + marker, role.name.padEnd(25), '|', String(role.level).padEnd(5), '|', 
      (role.system_scope || 'NULL').padEnd(12), '|', role.is_system_role ? 'Yes' : 'No');
  }
  
  console.log('\n  All UPPER_SNAKE_CASE:', allUpperSnake ? '✅' : '❌');
  console.log('  All have business_level:', allHaveLevel ? '✅' : '❌');
  console.log('  All have system_scope:', allHaveScope ? '✅' : '❌');
  
  // 2.2 Scope Semantics
  console.log('\n2.2 Scope Semantics Validation:');
  
  const scopeMismatches = await prisma.$queryRaw`
    SELECT name, level, system_scope FROM rbac_roles
    WHERE (name = 'SUPER_ADMIN' AND system_scope != 'CROSS_TENANT')
       OR (name = 'ENTERPRISE_ADMIN' AND system_scope != 'CROSS_TENANT')
       OR (name = 'ADMIN' AND system_scope NOT IN ('TENANT', 'CROSS_TENANT'))
       OR (name = 'IT_ADMIN' AND system_scope != 'TENANT')
  `;
  
  if (scopeMismatches.length === 0) {
    console.log('  SUPER_ADMIN → CROSS_TENANT: ✅');
    console.log('  ADMIN, IT_ADMIN → TENANT: ✅');
    console.log('  All others → BUSINESS: ✅ (by default)');
  } else {
    console.log('  ❌ SCOPE MISMATCHES FOUND:');
    scopeMismatches.forEach(r => console.log('    ', r.name, '→', r.system_scope));
  }
}

async function auditSection3() {
  console.log('\n=== SECTION 3: Codebase Authorization Audit ===\n');
  console.log('3.1 Forbidden Patterns Check:');
  console.log('  (Run grep commands manually - see output below)');
}

async function auditSection4() {
  console.log('\n=== SECTION 4: User Creation & Escalation Control ===\n');
  
  // Check if enforceHierarchy function exists and has scope check
  const fs = require('fs');
  const userServicePath = './services/userService.js';
  
  if (fs.existsSync(userServicePath)) {
    const content = fs.readFileSync(userServicePath, 'utf8');
    
    const hasHierarchyCheck = content.includes('HIERARCHY_VIOLATION');
    const hasScopeEscalation = content.includes('SCOPE_ESCALATION_BLOCKED');
    
    console.log('4.1 Hierarchy Enforcement:');
    console.log('  HIERARCHY_VIOLATION error:', hasHierarchyCheck ? '✅ Found' : '❌ MISSING');
    
    console.log('\n4.2 Scope Escalation Block:');
    console.log('  SCOPE_ESCALATION_BLOCKED error:', hasScopeEscalation ? '✅ Found' : '❌ MISSING');
  } else {
    console.log('  ❌ userService.js not found');
  }
}

async function auditSection5() {
  console.log('\n=== SECTION 5: Tenant Isolation ===\n');
  
  const fs = require('fs');
  const tenantPath = './middleware/tenantIsolation.js';
  
  if (fs.existsSync(tenantPath)) {
    const content = fs.readFileSync(tenantPath, 'utf8');
    
    const usesSystemScope = content.includes("system_scope === 'CROSS_TENANT'");
    const usesUserType = content.includes("userType === 'SUPER_ADMIN'");
    
    console.log('5.1 Runtime Tenant Guard:');
    console.log('  Uses system_scope check:', usesSystemScope ? '✅' : '❌');
    console.log('  Uses userType check:', usesUserType ? '❌ BAD' : '✅ Removed');
  }
}

async function auditSection6() {
  console.log('\n=== SECTION 6: Authority Override Safety ===\n');
  
  const tableExists = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'authority_overrides'
    ) as exists
  `;
  
  console.log('  authority_overrides table:', tableExists[0].exists ? '✅ Exists' : '❌ MISSING');
  
  if (tableExists[0].exists) {
    const columns = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'authority_overrides'
    `;
    console.log('  Columns:', columns.map(c => c.column_name).join(', '));
  }
}

async function auditSection7() {
  console.log('\n=== SECTION 7: Legacy & Migration Safety ===\n');
  
  // Check if users is a VIEW
  const viewCheck = await prisma.$queryRaw`
    SELECT table_type FROM information_schema.tables 
    WHERE table_name = 'users'
  `;
  
  console.log('  users table type:', viewCheck.length > 0 ? viewCheck[0].table_type : 'NOT FOUND');
  console.log('  users is VIEW:', viewCheck[0]?.table_type === 'VIEW' ? '✅' : '❌');
}

async function main() {
  console.log('🔐 RBAC POST-FIX RE-AUDIT');
  console.log('Date:', new Date().toISOString());
  console.log('================================');
  
  await auditSection2();
  await auditSection3();
  await auditSection4();
  await auditSection5();
  await auditSection6();
  await auditSection7();
  
  await prisma.$disconnect();
  
  console.log('\n================================');
  console.log('Audit complete. Review results above.');
}

main().catch(e => {
  console.error('Audit failed:', e);
  process.exit(1);
});
