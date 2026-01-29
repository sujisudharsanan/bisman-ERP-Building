/**
 * Data Isolation Error Handler Tests
 * ===================================
 * 
 * Verifies the secure error handling implementation.
 */

const {
  isRLSViolation,
  isSelfScopeViolation,
  mapDataIsolationError,
  createSafeErrorResponse,
  createEmptyStateResponse,
  checkSelfScopeAccess,
  DATA_ISOLATION_ERROR_CODES,
  USER_MESSAGES,
} = require('../middleware/dataIsolationErrorHandler');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

console.log('='.repeat(60));
console.log('DATA ISOLATION ERROR HANDLER TESTS');
console.log('='.repeat(60));
console.log('');

// ============================================================================
// Test 1: RLS Violation Detection
// ============================================================================
console.log('--- RLS Violation Detection ---');

test('Detects PostgreSQL 42501 error code', () => {
  const err = { code: '42501', message: 'insufficient privilege' };
  assert(isRLSViolation(err) === true, 'Should detect 42501 as RLS');
});

test('Detects "permission denied for relation" message', () => {
  const err = { message: 'ERROR: permission denied for relation users' };
  assert(isRLSViolation(err) === true, 'Should detect permission denied');
});

test('Detects "row-level security policy" message', () => {
  const err = { message: 'ERROR: new row violates row-level security policy for table tasks' };
  assert(isRLSViolation(err) === true, 'Should detect RLS policy violation');
});

test('Does not flag normal errors as RLS', () => {
  const err = { code: 'ECONNRESET', message: 'Connection reset' };
  assert(isRLSViolation(err) === false, 'Should not flag connection errors');
});

test('Does not flag validation errors as RLS', () => {
  const err = { name: 'ValidationError', message: 'Email is required' };
  assert(isRLSViolation(err) === false, 'Should not flag validation errors');
});

// ============================================================================
// Test 2: Self-Scope Violation Detection
// ============================================================================
console.log('');
console.log('--- Self-Scope Violation Detection ---');

test('Detects SELF scope user accessing other user data', () => {
  const err = new Error('Access denied');
  const context = { dataScope: 'SELF', currentUserId: 1, targetUserId: 2 };
  assert(isSelfScopeViolation(err, context) === true, 'Should detect self-scope violation');
});

test('Allows SELF scope user accessing own data', () => {
  const err = new Error('Access denied');
  const context = { dataScope: 'SELF', currentUserId: 1, targetUserId: 1 };
  assert(isSelfScopeViolation(err, context) === false, 'Should allow own data access');
});

test('Does not flag BRANCH scope as self-violation', () => {
  const err = new Error('Access denied');
  const context = { dataScope: 'BRANCH', currentUserId: 1, targetUserId: 2 };
  assert(isSelfScopeViolation(err, context) === false, 'BRANCH scope should not be self-violation');
});

// ============================================================================
// Test 3: Error Mapping
// ============================================================================
console.log('');
console.log('--- Error Mapping ---');

test('Maps RLS error to DATA_ACCESS_DENIED', () => {
  const err = { code: '42501', message: 'permission denied for relation tasks' };
  const mapped = mapDataIsolationError(err, { operation: 'view' });
  assert(mapped.code === DATA_ISOLATION_ERROR_CODES.DATA_ACCESS_DENIED, 'Should map to DATA_ACCESS_DENIED');
  assert(mapped.status === 403, 'Should be 403');
});

test('Maps edit operation to DATA_MODIFY_DENIED', () => {
  const err = { code: '42501', message: 'permission denied' };
  const mapped = mapDataIsolationError(err, { operation: 'edit' });
  assert(mapped.code === DATA_ISOLATION_ERROR_CODES.DATA_MODIFY_DENIED, 'Should map to DATA_MODIFY_DENIED');
});

test('Maps delete operation to DATA_DELETE_DENIED', () => {
  const err = { code: '42501', message: 'permission denied' };
  const mapped = mapDataIsolationError(err, { operation: 'delete' });
  assert(mapped.code === DATA_ISOLATION_ERROR_CODES.DATA_DELETE_DENIED, 'Should map to DATA_DELETE_DENIED');
});

test('Maps self-scope violation correctly', () => {
  const err = new Error('Access denied');
  const context = { dataScope: 'SELF', currentUserId: 1, targetUserId: 2 };
  const mapped = mapDataIsolationError(err, context);
  assert(mapped.code === DATA_ISOLATION_ERROR_CODES.SELF_SCOPE_VIOLATION, 'Should map to SELF_SCOPE_VIOLATION');
  assert(mapped.message === USER_MESSAGES.SELF_SCOPE_VIOLATION, 'Should have correct message');
});

// ============================================================================
// Test 4: Safe Response Creation
// ============================================================================
console.log('');
console.log('--- Safe Response Creation ---');

test('Safe response does not include internal details', () => {
  const mapped = {
    status: 403,
    code: 'DATA_ACCESS_DENIED',
    message: "You don't have permission",
    action: 'Contact admin',
    _internal: {
      originalError: 'permission denied for relation tasks',
      errorCode: '42501',
      tableName: 'tasks',
    }
  };
  const safe = createSafeErrorResponse(mapped);
  assert(safe._internal === undefined, 'Should not include _internal');
  assert(safe.originalError === undefined, 'Should not include originalError');
  assert(safe.errorCode === 'DATA_ACCESS_DENIED', 'Should include safe errorCode');
  assert(safe.message !== undefined, 'Should include message');
});

test('Safe response includes action hint', () => {
  const mapped = {
    status: 403,
    code: 'DATA_ACCESS_DENIED',
    message: 'Test',
    action: 'Contact your administrator.',
  };
  const safe = createSafeErrorResponse(mapped);
  assert(safe.action === 'Contact your administrator.', 'Should include action');
});

// ============================================================================
// Test 5: Empty State Response
// ============================================================================
console.log('');
console.log('--- Empty State Response ---');

test('Empty state response has correct structure', () => {
  const resp = createEmptyStateResponse('tasks');
  assert(resp.success === true, 'Should be success: true');
  assert(Array.isArray(resp.data) && resp.data.length === 0, 'Should have empty data array');
  assert(resp.isEmpty === true, 'Should have isEmpty: true');
  assert(resp.count === 0, 'Should have count: 0');
  assert(resp.message === USER_MESSAGES.EMPTY_STATE, 'Should have empty state message');
});

test('Empty state response includes pagination when provided', () => {
  const resp = createEmptyStateResponse('tasks', { page: 2, limit: 25 });
  assert(resp.pagination !== undefined, 'Should have pagination');
  assert(resp.pagination.page === 2, 'Should have correct page');
  assert(resp.pagination.limit === 25, 'Should have correct limit');
  assert(resp.pagination.total === 0, 'Should have total: 0');
  assert(resp.pagination.totalPages === 0, 'Should have totalPages: 0');
});

// ============================================================================
// Test 6: Self-Scope Access Check
// ============================================================================
console.log('');
console.log('--- Self-Scope Access Check ---');

test('checkSelfScopeAccess allows own data', () => {
  const req = { user: { dataScope: 'SELF', id: 123 } };
  const result = checkSelfScopeAccess(req, '123');
  assert(result.allowed === true, 'Should allow own data');
  assert(result.error === undefined, 'Should not have error');
});

test('checkSelfScopeAccess blocks other user data', () => {
  const req = { user: { dataScope: 'SELF', id: 123 } };
  const result = checkSelfScopeAccess(req, '456');
  assert(result.allowed === false, 'Should block other user data');
  assert(result.error !== undefined, 'Should have error');
  assert(result.error.status === 403, 'Should be 403');
  assert(result.error.code === DATA_ISOLATION_ERROR_CODES.SELF_SCOPE_VIOLATION, 'Should have correct code');
});

test('checkSelfScopeAccess allows BRANCH scope to access other users', () => {
  const req = { user: { dataScope: 'BRANCH', id: 123 } };
  const result = checkSelfScopeAccess(req, '456');
  assert(result.allowed === true, 'BRANCH scope should allow');
});

// ============================================================================
// Test 7: Message Security
// ============================================================================
console.log('');
console.log('--- Message Security ---');

test('User messages do not contain RLS/scope keywords', () => {
  const forbidden = ['RLS', 'row-level', 'scope', 'role', 'policy', 'tenant', 'admin restricted'];
  for (const [key, msg] of Object.entries(USER_MESSAGES)) {
    const lower = msg.toLowerCase();
    for (const word of forbidden) {
      if (lower.includes(word.toLowerCase())) {
        throw new Error(`Message "${key}" contains forbidden word "${word}"`);
      }
    }
  }
});

test('User messages are helpful and clear', () => {
  assert(USER_MESSAGES.EMPTY_STATE.includes('available'), 'EMPTY_STATE should mention availability');
  assert(USER_MESSAGES.DATA_ACCESS_DENIED.includes('permission'), 'DATA_ACCESS_DENIED should mention permission');
  assert(USER_MESSAGES.SELF_SCOPE_VIOLATION.includes('own'), 'SELF_SCOPE_VIOLATION should mention own');
});

// ============================================================================
// Summary
// ============================================================================
console.log('');
console.log('='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('');
  console.log('🟢 ALL TESTS PASSED');
  console.log('');
  console.log('Key Security Guarantees:');
  console.log('  ✅ RLS/PostgreSQL errors properly detected');
  console.log('  ✅ Self-scope violations caught');
  console.log('  ✅ Internal details never exposed to users');
  console.log('  ✅ Empty data returns success (not error)');
  console.log('  ✅ User messages are helpful but vague to attackers');
}
