const dbModules = [
  'finance', 'hr', 'admin', 'procurement', 'inventory', 
  'compliance', 'legal', 'common', 'pump-management', 
  'operations', 'fuel-management', 'pump-sales', 
  'pump-inventory', 'pump-reports', 'analytics', 
  'subscriptions', 'system', 'super-admin', 'task-management'
];

const configModules = [
  'common', 'finance', 'operations', 'procurement', 
  'compliance', 'system', 'super-admin', 'admin', 
  'task-management'
];

console.log('\n=== MODULE AUDIT REPORT ===\n');

// Modules in DB but NOT in config
const inDbNotInConfig = dbModules.filter(m => !configModules.includes(m));
console.log('📋 Modules in DATABASE but NOT in CONFIG (' + inDbNotInConfig.length + '):');
inDbNotInConfig.forEach(m => console.log('   ❌', m));

// Modules in config but NOT in DB
const inConfigNotInDb = configModules.filter(m => !dbModules.includes(m));
console.log('\n📋 Modules in CONFIG but NOT in DATABASE (' + inConfigNotInDb.length + '):');
inConfigNotInDb.forEach(m => console.log('   ❌', m));

// Modules in BOTH
const inBoth = configModules.filter(m => dbModules.includes(m));
console.log('\n✅ Modules in BOTH config and database (' + inBoth.length + '):');
inBoth.forEach(m => console.log('   ✓', m));

console.log('\n=== SUMMARY ===');
console.log('Total DB modules:', dbModules.length);
console.log('Total Config modules:', configModules.length);
console.log('Matched modules:', inBoth.length);
console.log('Missing from config:', inDbNotInConfig.length);
console.log('Missing from database:', inConfigNotInDb.length);

console.log('\n=== RECOMMENDATIONS ===');
if (inConfigNotInDb.length > 0) {
  console.log('\n⚠️  CRITICAL: These modules need to be added to database:');
  inConfigNotInDb.forEach(m => {
    console.log('   → ' + m + ' (Enterprise Admins cannot assign this module)');
  });
}

if (inDbNotInConfig.length > 0) {
  console.log('\n💡 INFO: These database modules have no pages defined in config:');
  inDbNotInConfig.forEach(m => {
    console.log('   → ' + m + ' (Can be assigned but has no pages to display)');
  });
}

if (inConfigNotInDb.length === 0 && inDbNotInConfig.length === 0) {
  console.log('\n✅ Perfect! All modules are synchronized between config and database.');
}
