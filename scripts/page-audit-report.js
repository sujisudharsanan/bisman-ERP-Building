/**
 * PAGE MATCHING AUDIT REPORT GENERATOR
 * =====================================
 * 
 * This script analyzes the PAGE_REGISTRY to identify:
 * 1. Duplicate role blocks (same role with different page sets)
 * 2. Duplicate pages within same role
 * 3. Page name collisions across modules
 * 4. Module mismatches
 * 5. Suspicious/unmatched pages
 */

const fs = require('fs');
const path = require('path');

// Read the page-registry.ts file
const registryPath = path.join(__dirname, '../my-frontend/src/common/config/page-registry.ts');
const registryContent = fs.readFileSync(registryPath, 'utf-8');

// Extract PAGE_REGISTRY array using regex
const registryMatch = registryContent.match(/export const PAGE_REGISTRY[^=]*=\s*\[([\s\S]*?)\n\];/);
if (!registryMatch) {
  console.log('Could not find PAGE_REGISTRY in file');
  process.exit(1);
}

// Parse page entries - simplified extraction
const pageEntries = [];
const pagePattern = /\{\s*id:\s*['"]([^'"]+)['"][^}]*name:\s*['"]([^'"]+)['"][^}]*path:\s*['"]([^'"]+)['"][^}]*module:\s*['"]([^'"]+)['"][^}]*roles:\s*\[([^\]]*)\][^}]*status:\s*['"]([^'"]+)['"][^}]*\}/g;

let match;
while ((match = pagePattern.exec(registryContent)) !== null) {
  const [, id, name, pagePath, module, rolesStr, status] = match;
  const roles = rolesStr.split(',').map(r => r.trim().replace(/['"]/g, '')).filter(r => r);
  pageEntries.push({ id, name, path: pagePath, module, roles, status });
}

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                      PAGE MATCHING AUDIT REPORT                              ║');
console.log('║                      Generated:', new Date().toISOString().split('T')[0], '                              ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`Total pages found in registry: ${pageEntries.length}`);
console.log('');

// ============================================================================
// A) ANALYZE ROLE -> PAGES MAPPING
// ============================================================================
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('SECTION A: ROLE -> PAGES MAPPING ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════════════════════');

const roleToPages = new Map();
for (const page of pageEntries) {
  for (const role of page.roles) {
    if (!roleToPages.has(role)) {
      roleToPages.set(role, []);
    }
    roleToPages.get(role).push({
      id: page.id,
      name: page.name,
      path: page.path,
      module: page.module
    });
  }
}

console.log(`\nTotal unique roles: ${roleToPages.size}`);
console.log('');

// Sort roles by page count
const sortedRoles = [...roleToPages.entries()].sort((a, b) => b[1].length - a[1].length);
console.log('ROLES BY PAGE COUNT:');
console.log('─────────────────────');
for (const [role, pages] of sortedRoles) {
  console.log(`  ${role.padEnd(30)} : ${pages.length} pages`);
}

// ============================================================================
// STRICT VALIDATION: No roles with spaces allowed
// ============================================================================
console.log('');
console.log('ROLE NAME VALIDATION:');
console.log('─────────────────────');
const rolesWithSpaces = [...roleToPages.keys()].filter(r => r.includes(' '));
if (rolesWithSpaces.length > 0) {
  console.log('');
  console.log('❌ CRITICAL ERROR: Roles with spaces detected!');
  console.log('   The following roles must be normalized to underscore format:');
  for (const role of rolesWithSpaces) {
    const normalized = role.replace(/\s+/g, '_');
    console.log(`   - '${role}' → '${normalized}'`);
  }
  console.log('');
  console.log('   Run this command to fix:');
  for (const role of rolesWithSpaces) {
    const normalized = role.replace(/\s+/g, '_');
    console.log(`   sed -i '' "s/'${role}'/'${normalized}'/g" my-frontend/src/common/config/page-registry.ts`);
  }
  console.log('');
  // Exit with error code to fail builds
  process.exitCode = 1;
} else {
  console.log('✅ All roles use underscore format (no spaces)');
}

// ============================================================================
// B) DUPLICATE PAGE NAMES WITHIN SAME ROLE
// ============================================================================
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('SECTION B: DUPLICATE PAGE NAMES WITHIN SAME ROLE');
console.log('═══════════════════════════════════════════════════════════════════════════════');

let duplicatesFound = false;
for (const [role, pages] of roleToPages) {
  const nameCount = new Map();
  for (const page of pages) {
    const count = nameCount.get(page.name) || 0;
    nameCount.set(page.name, count + 1);
  }
  
  const duplicates = [...nameCount.entries()].filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    duplicatesFound = true;
    console.log(`\n⚠️  ${role} has duplicate page names:`);
    for (const [name, count] of duplicates) {
      console.log(`    "${name}" appears ${count} times:`);
      const dupePages = pages.filter(p => p.name === name);
      for (const dp of dupePages) {
        console.log(`      - ${dp.module}:${dp.path} (id: ${dp.id})`);
      }
    }
  }
}
if (!duplicatesFound) {
  console.log('\n✅ No duplicate page names found within any role');
}

// ============================================================================
// C) PAGE NAME COLLISIONS ACROSS MODULES
// ============================================================================
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('SECTION C: PAGE NAME COLLISIONS ACROSS MODULES');
console.log('═══════════════════════════════════════════════════════════════════════════════');

const nameToModules = new Map();
for (const page of pageEntries) {
  if (!nameToModules.has(page.name)) {
    nameToModules.set(page.name, []);
  }
  nameToModules.get(page.name).push({
    module: page.module,
    path: page.path,
    id: page.id,
    roles: page.roles
  });
}

const collisions = [...nameToModules.entries()].filter(([, entries]) => entries.length > 1);
console.log(`\nFound ${collisions.length} page names that exist in multiple modules:\n`);

for (const [name, entries] of collisions) {
  console.log(`⚠️  "${name}" exists in ${entries.length} modules:`);
  for (const entry of entries) {
    console.log(`    - ${entry.module.padEnd(20)} : ${entry.path}`);
    console.log(`      ID: ${entry.id}`);
    console.log(`      Roles: ${entry.roles.join(', ') || 'none'}`);
  }
  console.log('');
}

// ============================================================================
// D) UNIQUE PAGE KEY ANALYSIS
// ============================================================================
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('SECTION D: UNIQUE PAGE KEY ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════════════════════');

// Check for duplicate IDs
const idCount = new Map();
for (const page of pageEntries) {
  const count = idCount.get(page.id) || 0;
  idCount.set(page.id, count + 1);
}
const duplicateIds = [...idCount.entries()].filter(([, count]) => count > 1);
if (duplicateIds.length > 0) {
  console.log('\n❌ DUPLICATE IDs FOUND (CRITICAL):');
  for (const [id, count] of duplicateIds) {
    console.log(`    "${id}" appears ${count} times`);
  }
} else {
  console.log('\n✅ All page IDs are unique');
}

// Check for duplicate paths
const pathCount = new Map();
for (const page of pageEntries) {
  const count = pathCount.get(page.path) || 0;
  pathCount.set(page.path, count + 1);
}
const duplicatePaths = [...pathCount.entries()].filter(([, count]) => count > 1);
if (duplicatePaths.length > 0) {
  console.log('\n❌ DUPLICATE PATHS FOUND (CRITICAL):');
  for (const [p, count] of duplicatePaths) {
    console.log(`    "${p}" appears ${count} times`);
  }
} else {
  console.log('✅ All page paths are unique');
}

// ============================================================================
// E) RECOMMENDED UNIQUE KEYS
// ============================================================================
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('SECTION E: RECOMMENDED UNIQUE PAGE KEYS');
console.log('═══════════════════════════════════════════════════════════════════════════════');

console.log('\nFor pages with name collisions, use this format: module:path');
console.log('');
for (const [name, entries] of collisions) {
  console.log(`"${name}":`);
  for (const entry of entries) {
    console.log(`  → ${entry.module}:${entry.path}`);
  }
}

// ============================================================================
// F) PAGES WITHOUT ROLES
// ============================================================================
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('SECTION F: PAGES WITHOUT ROLES ASSIGNED');
console.log('═══════════════════════════════════════════════════════════════════════════════');

const noRolePages = pageEntries.filter(p => p.roles.length === 0);
if (noRolePages.length > 0) {
  console.log(`\n⚠️  ${noRolePages.length} pages have no roles assigned:`);
  for (const page of noRolePages) {
    console.log(`    - ${page.module}:${page.path} (${page.name})`);
  }
} else {
  console.log('\n✅ All pages have at least one role assigned');
}

// ============================================================================
// G) SUMMARY & RECOMMENDATIONS
// ============================================================================
console.log('');
console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                          SUMMARY & RECOMMENDATIONS                           ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('CRITICAL CHECKS (must pass):');
console.log('────────────────────────────');
const criticalErrors = [];
if (duplicateIds.length > 0) criticalErrors.push(`Duplicate page IDs: ${duplicateIds.length}`);
if (duplicatePaths.length > 0) criticalErrors.push(`Duplicate page paths: ${duplicatePaths.length}`);
const rolesWithSpacesFinal = [...roleToPages.keys()].filter(r => r.includes(' '));
if (rolesWithSpacesFinal.length > 0) criticalErrors.push(`Roles with spaces: ${rolesWithSpacesFinal.length}`);

if (criticalErrors.length === 0) {
  console.log('  ✅ All page IDs are unique');
  console.log('  ✅ All page paths are unique');
  console.log('  ✅ All roles use underscore format');
  console.log('');
  console.log('RESULT: ✅ AUDIT PASSED');
} else {
  console.log('  ❌ Critical errors found:');
  for (const err of criticalErrors) {
    console.log(`     - ${err}`);
  }
  console.log('');
  console.log('RESULT: ❌ AUDIT FAILED');
  process.exitCode = 1;
}

console.log('');
console.log('INFORMATIONAL (not errors):');
console.log('───────────────────────────');
console.log(`  • Page name collisions across modules: ${collisions.length} (intentional design)`);
console.log(`  • Pages without roles: ${noRolePages.length} (may be public pages)`);
console.log('');
console.log('RECOMMENDATIONS:');
console.log('────────────────');
console.log('  1. Use unique page IDs that include module prefix: {module}-{page-name}');
console.log('  2. For matching in DB, use path as primary key (guaranteed unique)');
console.log('  3. When displaying role assignments, group by module:path, not just name');
console.log('');

