/**
 * Test script for ID Generator
 * Run: node scripts/test-id-generator.js
 */

const idGen = require('../utils/idGenerator');

async function test() {
  console.log('🧪 Testing ID Generator...\n');
  
  try {
    // Generate a test user ID
    console.log('1. Generating User ID...');
    const userId = await idGen.generateUniqueId('user', 1, { test: true });
    console.log('   ✅ Generated User ID:', userId);
    
    // Generate a test task ID
    console.log('\n2. Generating Task ID...');
    const taskId = await idGen.generateUniqueId('task', 1, { test: true });
    console.log('   ✅ Generated Task ID:', taskId);
    
    // Generate another task ID to test sequence
    console.log('\n3. Generating another Task ID...');
    const taskId2 = await idGen.generateUniqueId('task', 2, { test: true });
    console.log('   ✅ Generated Task ID:', taskId2);
    
    // Lookup the ID
    console.log('\n4. Looking up User ID...');
    const lookup = await idGen.lookupByUniqueId(userId);
    console.log('   ✅ Lookup result:', lookup);
    
    // Get stats
    console.log('\n5. Getting ID statistics...');
    const stats = await idGen.getIdStatistics();
    console.log('   ✅ Stats:', stats);
    
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

test();
