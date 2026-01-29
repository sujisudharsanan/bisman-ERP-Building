// Quick integration test
const { createEmptyStateResponse, getDataIsolationHandler } = require('../middleware/errorHandler');

const diHandler = getDataIsolationHandler();

console.log('=== Integration Test ===');
console.log('');

// Test 1: RLS error is detected
const rlsError = { code: '42501', message: 'permission denied for relation tasks' };
console.log('1. RLS Error Detection:', diHandler.isRLSViolation(rlsError) ? '✅ PASS' : '❌ FAIL');

// Test 2: Error is mapped securely
const mapped = diHandler.mapDataIsolationError(rlsError, { operation: 'view' });
console.log('2. Error Mapped:', mapped.code === 'DATA_ACCESS_DENIED' ? '✅ PASS' : '❌ FAIL');
console.log('   Status:', mapped.status);
console.log('   Message:', mapped.message);

// Test 3: Safe response created
const safe = diHandler.createSafeErrorResponse(mapped);
console.log('3. Safe Response:', !safe._internal ? '✅ PASS' : '❌ FAIL');
console.log('   Response:', JSON.stringify(safe));

// Test 4: Empty state response
const empty = createEmptyStateResponse('tasks', { page: 1, limit: 10 });
console.log('4. Empty State:', empty.success === true && empty.isEmpty === true ? '✅ PASS' : '❌ FAIL');
console.log('   Response:', JSON.stringify(empty));

console.log('');
console.log('🟢 INTEGRATION COMPLETE');
