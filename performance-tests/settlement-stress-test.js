/**
 * ============================================================================
 * SETTLEMENT SYSTEM STRESS TEST
 * ============================================================================
 * 
 * Tests for:
 * - 10,000 payment requests
 * - 1,000 settlements
 * - Concurrent approvals
 * - No deadlocks
 * - No timeouts
 * - No incorrect balances
 * 
 * Run: node performance-tests/settlement-stress-test.js
 * 
 * Prerequisites:
 * - Database running with settlement schema applied
 * - Test users created (see fixtures)
 */

const path = require('path');
// Use the backend's Prisma client
const { PrismaClient } = require(path.join(__dirname, '../my-backend/node_modules/@prisma/client'));
const crypto = require('crypto');

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Test scale
  TOTAL_PAYMENT_REQUESTS: 10000,
  TOTAL_SETTLEMENTS: 1000,
  REQUESTS_PER_SETTLEMENT: 10,
  
  // Concurrency
  CONCURRENT_APPROVALS: 50,
  CONCURRENT_EXECUTIONS: 20,
  
  // Timeouts
  OPERATION_TIMEOUT_MS: 30000,
  BATCH_SIZE: 100,
  
  // Test data
  TENANT_ID: null, // Will be set during setup
  USERS: {
    accountant: null,
    financeController: null,
    cfo: null,
    banker: null
  }
};

// ============================================================================
// METRICS TRACKING
// ============================================================================

const metrics = {
  startTime: null,
  endTime: null,
  
  // Counts
  requestsCreated: 0,
  settlementsCreated: 0,
  approvalsCompleted: 0,
  executionsCompleted: 0,
  
  // Errors
  deadlocks: 0,
  timeouts: 0,
  balanceErrors: 0,
  otherErrors: [],
  
  // Timing
  timings: {
    requestCreation: [],
    settlementCreation: [],
    fcApproval: [],
    cfoApproval: [],
    execution: []
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateUUID() {
  return crypto.randomUUID();
}

function generateRequestNumber(index) {
  return `STRESS-REQ-${Date.now()}-${index.toString().padStart(5, '0')}`;
}

function generateSettlementNumber(index) {
  return `STRESS-STL-${Date.now()}-${index.toString().padStart(5, '0')}`;
}

function generateUTR(index) {
  return `UTR${Date.now()}${index.toString().padStart(6, '0')}`;
}

function randomAmount(min = 1000, max = 100000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withTimeout(promise, ms, operation) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`TIMEOUT: ${operation} exceeded ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
}

function trackTiming(category, durationMs) {
  metrics.timings[category].push(durationMs);
}

function calculateStats(arr) {
  if (arr.length === 0) return { avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  return {
    avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

// ============================================================================
// SETUP
// ============================================================================

async function setup() {
  console.log('🔧 Setting up test environment...\n');
  
  // Get or create tenant
  let tenant = await prisma.tenant.findFirst({ where: { name: 'Stress Test Tenant' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: generateUUID(),
        name: 'Stress Test Tenant',
        code: 'STRESS',
        status: 'active'
      }
    });
  }
  CONFIG.TENANT_ID = tenant.id;
  
  // Create test users
  const roles = ['accountant', 'financeController', 'cfo', 'banker'];
  for (const roleName of roles) {
    const email = `stress_${roleName}@test.com`;
    let user = await prisma.user.findFirst({ where: { email } });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: generateUUID(),
          email,
          full_name: `Stress Test ${roleName}`,
          password_hash: 'test-hash',
          tenant_id: CONFIG.TENANT_ID,
          status: 'active',
          business_level: roleName === 'cfo' ? 90 : roleName === 'financeController' ? 80 : 50
        }
      });
    }
    
    CONFIG.USERS[roleName] = user;
  }
  
  console.log(`✅ Tenant: ${CONFIG.TENANT_ID}`);
  console.log(`✅ Users created: ${Object.keys(CONFIG.USERS).join(', ')}\n`);
}

// ============================================================================
// PHASE 1: CREATE PAYMENT REQUESTS
// ============================================================================

async function createPaymentRequests() {
  console.log(`📝 Creating ${CONFIG.TOTAL_PAYMENT_REQUESTS} payment requests...\n`);
  
  const batchSize = CONFIG.BATCH_SIZE;
  const batches = Math.ceil(CONFIG.TOTAL_PAYMENT_REQUESTS / batchSize);
  
  for (let batch = 0; batch < batches; batch++) {
    const start = batch * batchSize;
    const end = Math.min(start + batchSize, CONFIG.TOTAL_PAYMENT_REQUESTS);
    
    const batchStart = Date.now();
    const requests = [];
    
    for (let i = start; i < end; i++) {
      const amount = randomAmount();
      requests.push({
        id: generateUUID(),
        requestId: generateRequestNumber(i),
        totalAmount: amount,
        approved_amount: amount,
        paid_amount_total: 0,
        remaining_amount: amount,
        status: 'APPROVED',
        workflow_status: 'APPROVED',
        clientName: `Vendor ${i % 100}`,
        clientId: generateUUID(),
        description: `Stress test request ${i}`,
        currency: 'INR',
        tenant_id: CONFIG.TENANT_ID,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    try {
      await prisma.$executeRaw`
        INSERT INTO payment_requests (
          id, "requestId", "totalAmount", approved_amount, paid_amount_total, 
          remaining_amount, status, workflow_status, "clientName", "clientId",
          description, currency, tenant_id, "createdAt", "updatedAt"
        )
        SELECT * FROM UNNEST(
          ${requests.map(r => r.id)}::uuid[],
          ${requests.map(r => r.requestId)}::varchar[],
          ${requests.map(r => r.totalAmount)}::decimal[],
          ${requests.map(r => r.approved_amount)}::decimal[],
          ${requests.map(r => r.paid_amount_total)}::decimal[],
          ${requests.map(r => r.remaining_amount)}::decimal[],
          ${requests.map(r => r.status)}::varchar[],
          ${requests.map(r => r.workflow_status)}::varchar[],
          ${requests.map(r => r.clientName)}::varchar[],
          ${requests.map(r => r.clientId)}::uuid[],
          ${requests.map(r => r.description)}::text[],
          ${requests.map(r => r.currency)}::varchar[],
          ${requests.map(() => CONFIG.TENANT_ID)}::uuid[],
          ${requests.map(() => new Date())}::timestamptz[],
          ${requests.map(() => new Date())}::timestamptz[]
        )
      `;
      
      metrics.requestsCreated += (end - start);
      trackTiming('requestCreation', Date.now() - batchStart);
      
      if ((batch + 1) % 10 === 0) {
        console.log(`  ✓ Batch ${batch + 1}/${batches} complete (${metrics.requestsCreated} requests)`);
      }
    } catch (error) {
      if (error.message.includes('deadlock')) {
        metrics.deadlocks++;
        console.error(`  ⚠️ Deadlock in batch ${batch}, retrying...`);
        await sleep(100);
        batch--; // Retry
      } else {
        metrics.otherErrors.push({ phase: 'requestCreation', batch, error: error.message });
      }
    }
  }
  
  console.log(`\n✅ Created ${metrics.requestsCreated} payment requests\n`);
}

// ============================================================================
// PHASE 2: CREATE SETTLEMENTS (ACCOUNTANT)
// ============================================================================

async function createSettlements() {
  console.log(`📦 Creating ${CONFIG.TOTAL_SETTLEMENTS} settlements...\n`);
  
  // Get approved requests
  const requests = await prisma.$queryRaw`
    SELECT id, "requestId", approved_amount, "clientName", "clientId", description
    FROM payment_requests
    WHERE status = 'APPROVED' 
      AND tenant_id = ${CONFIG.TENANT_ID}::uuid
      AND remaining_amount > 0
    ORDER BY "createdAt"
    LIMIT ${CONFIG.TOTAL_SETTLEMENTS * CONFIG.REQUESTS_PER_SETTLEMENT}
  `;
  
  console.log(`  Found ${requests.length} approved requests to consolidate\n`);
  
  for (let i = 0; i < CONFIG.TOTAL_SETTLEMENTS; i++) {
    const start = i * CONFIG.REQUESTS_PER_SETTLEMENT;
    const settlementRequests = requests.slice(start, start + CONFIG.REQUESTS_PER_SETTLEMENT);
    
    if (settlementRequests.length === 0) break;
    
    const settlementStart = Date.now();
    
    try {
      const settlementId = generateUUID();
      const settlementNumber = generateSettlementNumber(i);
      const totalAmount = settlementRequests.reduce((sum, r) => sum + parseFloat(r.approved_amount), 0);
      
      // Create settlement
      await prisma.$executeRaw`
        INSERT INTO settlements (
          id, settlement_number, purpose, total_amount, currency,
          request_count, vendor_count, status, current_stage,
          created_by, tenant_id, created_at, updated_at
        ) VALUES (
          ${settlementId}::uuid, ${settlementNumber}, ${'Stress test settlement'},
          ${totalAmount}, 'INR', ${settlementRequests.length}, 
          ${new Set(settlementRequests.map(r => r.clientId)).size},
          'DRAFT', 'ACCOUNTANT_DRAFT',
          ${CONFIG.USERS.accountant.id}::uuid, ${CONFIG.TENANT_ID}::uuid,
          NOW(), NOW()
        )
      `;
      
      // Create line items
      for (const req of settlementRequests) {
        await prisma.$executeRaw`
          INSERT INTO settlement_line_items (
            id, settlement_id, payment_request_id, approved_amount,
            amount_in_settlement, paid_before_this, remaining_after_this,
            request_number, vendor_name, vendor_id, description,
            created_at, updated_at
          ) VALUES (
            ${generateUUID()}::uuid, ${settlementId}::uuid, ${req.id}::uuid,
            ${req.approved_amount}, ${req.approved_amount}, 0, 0,
            ${req.requestId}, ${req.clientName}, ${req.clientId}::uuid,
            ${req.description}, NOW(), NOW()
          )
        `;
        
        // Update request status
        await prisma.$executeRaw`
          UPDATE payment_requests
          SET status = 'QUEUED_FOR_SETTLEMENT', workflow_status = 'QUEUED_FOR_SETTLEMENT',
              updated_at = NOW()
          WHERE id = ${req.id}::uuid
        `;
      }
      
      // Submit settlement
      await prisma.$executeRaw`
        UPDATE settlements
        SET status = 'SUBMITTED_TO_FINANCE', current_stage = 'FINANCE_CONTROLLER_REVIEW',
            current_approver_id = ${CONFIG.USERS.financeController.id}::uuid,
            submitted_at = NOW(), submitted_by = ${CONFIG.USERS.accountant.id}::uuid,
            updated_at = NOW()
        WHERE id = ${settlementId}::uuid
      `;
      
      metrics.settlementsCreated++;
      trackTiming('settlementCreation', Date.now() - settlementStart);
      
      if ((i + 1) % 100 === 0) {
        console.log(`  ✓ ${i + 1}/${CONFIG.TOTAL_SETTLEMENTS} settlements created`);
      }
    } catch (error) {
      if (error.message.includes('deadlock')) {
        metrics.deadlocks++;
        console.error(`  ⚠️ Deadlock creating settlement ${i}, retrying...`);
        await sleep(100);
        i--; // Retry
      } else if (error.message.includes('timeout')) {
        metrics.timeouts++;
        metrics.otherErrors.push({ phase: 'settlementCreation', index: i, error: error.message });
      } else {
        metrics.otherErrors.push({ phase: 'settlementCreation', index: i, error: error.message });
      }
    }
  }
  
  console.log(`\n✅ Created ${metrics.settlementsCreated} settlements\n`);
}

// ============================================================================
// PHASE 3: CONCURRENT FC APPROVALS
// ============================================================================

async function runConcurrentFCApprovals() {
  console.log(`⚡ Running ${CONFIG.CONCURRENT_APPROVALS} concurrent FC approvals...\n`);
  
  const settlements = await prisma.$queryRaw`
    SELECT id, settlement_number
    FROM settlements
    WHERE status = 'SUBMITTED_TO_FINANCE'
      AND tenant_id = ${CONFIG.TENANT_ID}::uuid
    LIMIT ${CONFIG.CONCURRENT_APPROVALS}
  `;
  
  const approvalPromises = settlements.map(async (settlement, index) => {
    const start = Date.now();
    
    try {
      await withTimeout(
        prisma.$executeRaw`
          UPDATE settlements
          SET status = 'FINANCE_CONTROLLER_APPROVED',
              current_stage = 'CFO_REVIEW',
              current_approver_id = ${CONFIG.USERS.cfo.id}::uuid,
              finance_approved_by = ${CONFIG.USERS.financeController.id}::uuid,
              finance_approved_at = NOW(),
              updated_at = NOW()
          WHERE id = ${settlement.id}::uuid
            AND status = 'SUBMITTED_TO_FINANCE'
        `,
        CONFIG.OPERATION_TIMEOUT_MS,
        `FC approval ${index}`
      );
      
      metrics.approvalsCompleted++;
      trackTiming('fcApproval', Date.now() - start);
      return { success: true, settlement: settlement.id };
    } catch (error) {
      if (error.message.includes('deadlock')) {
        metrics.deadlocks++;
        return { success: false, settlement: settlement.id, error: 'deadlock' };
      } else if (error.message.includes('TIMEOUT')) {
        metrics.timeouts++;
        return { success: false, settlement: settlement.id, error: 'timeout' };
      }
      return { success: false, settlement: settlement.id, error: error.message };
    }
  });
  
  const results = await Promise.all(approvalPromises);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success);
  
  console.log(`  ✓ FC Approvals: ${successful}/${settlements.length} successful`);
  if (failed.length > 0) {
    console.log(`  ⚠️ Failed: ${failed.map(f => f.error).join(', ')}`);
  }
  console.log('');
}

// ============================================================================
// PHASE 4: CONCURRENT CFO APPROVALS
// ============================================================================

async function runConcurrentCFOApprovals() {
  console.log(`⚡ Running concurrent CFO approvals...\n`);
  
  const settlements = await prisma.$queryRaw`
    SELECT id, settlement_number
    FROM settlements
    WHERE status = 'FINANCE_CONTROLLER_APPROVED'
      AND tenant_id = ${CONFIG.TENANT_ID}::uuid
    LIMIT ${CONFIG.CONCURRENT_APPROVALS}
  `;
  
  const approvalPromises = settlements.map(async (settlement, index) => {
    const start = Date.now();
    
    try {
      await withTimeout(
        prisma.$executeRaw`
          UPDATE settlements
          SET status = 'CFO_APPROVED',
              current_stage = 'BANKER_EXECUTION',
              current_approver_id = ${CONFIG.USERS.banker.id}::uuid,
              cfo_approved_by = ${CONFIG.USERS.cfo.id}::uuid,
              cfo_approved_at = NOW(),
              updated_at = NOW()
          WHERE id = ${settlement.id}::uuid
            AND status = 'FINANCE_CONTROLLER_APPROVED'
        `,
        CONFIG.OPERATION_TIMEOUT_MS,
        `CFO approval ${index}`
      );
      
      trackTiming('cfoApproval', Date.now() - start);
      return { success: true };
    } catch (error) {
      if (error.message.includes('deadlock')) {
        metrics.deadlocks++;
      } else if (error.message.includes('TIMEOUT')) {
        metrics.timeouts++;
      }
      return { success: false, error: error.message };
    }
  });
  
  const results = await Promise.all(approvalPromises);
  const successful = results.filter(r => r.success).length;
  
  console.log(`  ✓ CFO Approvals: ${successful}/${settlements.length} successful\n`);
}

// ============================================================================
// PHASE 5: CONCURRENT BANKER EXECUTIONS
// ============================================================================

async function runConcurrentExecutions() {
  console.log(`💰 Running ${CONFIG.CONCURRENT_EXECUTIONS} concurrent banker executions...\n`);
  
  // First send to bank
  await prisma.$executeRaw`
    UPDATE settlements
    SET status = 'SENT_TO_BANK',
        sent_to_bank_at = NOW(),
        updated_at = NOW()
    WHERE status = 'CFO_APPROVED'
      AND tenant_id = ${CONFIG.TENANT_ID}::uuid
  `;
  
  const settlements = await prisma.$queryRaw`
    SELECT id, settlement_number, total_amount
    FROM settlements
    WHERE status = 'SENT_TO_BANK'
      AND tenant_id = ${CONFIG.TENANT_ID}::uuid
    LIMIT ${CONFIG.CONCURRENT_EXECUTIONS}
  `;
  
  const executionPromises = settlements.map(async (settlement, index) => {
    const start = Date.now();
    const utr = generateUTR(index);
    
    try {
      await withTimeout(
        prisma.$transaction(async (tx) => {
          // Update settlement to PAID
          await tx.$executeRaw`
            UPDATE settlements
            SET status = 'PAID',
                current_stage = 'COMPLETED',
                utr_number = ${utr},
                executed_by = ${CONFIG.USERS.banker.id}::uuid,
                executed_at = NOW(),
                paid_at = NOW(),
                updated_at = NOW()
            WHERE id = ${settlement.id}::uuid
              AND status = 'SENT_TO_BANK'
          `;
          
          // Update linked payment requests
          await tx.$executeRaw`
            UPDATE payment_requests pr
            SET status = 'PAID',
                workflow_status = 'PAID',
                paid_amount_total = COALESCE(pr.paid_amount_total, 0) + sli.amount_in_settlement,
                remaining_amount = COALESCE(pr.approved_amount, pr."totalAmount") - 
                  (COALESCE(pr.paid_amount_total, 0) + sli.amount_in_settlement),
                updated_at = NOW()
            FROM settlement_line_items sli
            WHERE sli.settlement_id = ${settlement.id}::uuid
              AND sli.payment_request_id = pr.id
          `;
        }),
        CONFIG.OPERATION_TIMEOUT_MS,
        `Execution ${index}`
      );
      
      metrics.executionsCompleted++;
      trackTiming('execution', Date.now() - start);
      return { success: true, utr };
    } catch (error) {
      if (error.message.includes('deadlock')) {
        metrics.deadlocks++;
      } else if (error.message.includes('TIMEOUT')) {
        metrics.timeouts++;
      }
      return { success: false, error: error.message };
    }
  });
  
  const results = await Promise.all(executionPromises);
  const successful = results.filter(r => r.success).length;
  
  console.log(`  ✓ Executions: ${successful}/${settlements.length} successful\n`);
}

// ============================================================================
// PHASE 6: BALANCE VERIFICATION
// ============================================================================

async function verifyBalances() {
  console.log('🔍 Verifying payment request balances...\n');
  
  // Check for negative remaining amounts
  const negativeBalances = await prisma.$queryRaw`
    SELECT id, "requestId", approved_amount, paid_amount_total, remaining_amount
    FROM payment_requests
    WHERE tenant_id = ${CONFIG.TENANT_ID}::uuid
      AND remaining_amount < 0
  `;
  
  if (negativeBalances.length > 0) {
    metrics.balanceErrors += negativeBalances.length;
    console.error(`  ⚠️ Found ${negativeBalances.length} requests with negative remaining amount!`);
  }
  
  // Check for overpaid requests
  const overpaid = await prisma.$queryRaw`
    SELECT id, "requestId", approved_amount, paid_amount_total
    FROM payment_requests
    WHERE tenant_id = ${CONFIG.TENANT_ID}::uuid
      AND paid_amount_total > COALESCE(approved_amount, "totalAmount")
  `;
  
  if (overpaid.length > 0) {
    metrics.balanceErrors += overpaid.length;
    console.error(`  ⚠️ Found ${overpaid.length} overpaid requests!`);
  }
  
  // Check for mismatched amounts
  const mismatched = await prisma.$queryRaw`
    SELECT id, "requestId", approved_amount, paid_amount_total, remaining_amount
    FROM payment_requests
    WHERE tenant_id = ${CONFIG.TENANT_ID}::uuid
      AND ABS(COALESCE(approved_amount, "totalAmount") - 
          COALESCE(paid_amount_total, 0) - COALESCE(remaining_amount, 0)) > 0.01
  `;
  
  if (mismatched.length > 0) {
    metrics.balanceErrors += mismatched.length;
    console.error(`  ⚠️ Found ${mismatched.length} requests with balance mismatch!`);
  }
  
  // Verify settlement totals match line items
  const settlementMismatch = await prisma.$queryRaw`
    SELECT s.id, s.settlement_number, s.total_amount,
           COALESCE(SUM(sli.amount_in_settlement), 0) AS line_item_total
    FROM settlements s
    LEFT JOIN settlement_line_items sli ON s.id = sli.settlement_id
    WHERE s.tenant_id = ${CONFIG.TENANT_ID}::uuid
    GROUP BY s.id, s.settlement_number, s.total_amount
    HAVING ABS(s.total_amount - COALESCE(SUM(sli.amount_in_settlement), 0)) > 0.01
  `;
  
  if (settlementMismatch.length > 0) {
    metrics.balanceErrors += settlementMismatch.length;
    console.error(`  ⚠️ Found ${settlementMismatch.length} settlements with total mismatch!`);
  }
  
  if (metrics.balanceErrors === 0) {
    console.log('  ✅ All balances verified correctly!\n');
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

async function cleanup() {
  console.log('🧹 Cleaning up test data...\n');
  
  try {
    // Delete in correct order for foreign keys
    await prisma.$executeRaw`
      DELETE FROM settlement_line_items
      WHERE settlement_id IN (
        SELECT id FROM settlements WHERE tenant_id = ${CONFIG.TENANT_ID}::uuid
      )
    `;
    
    await prisma.$executeRaw`
      DELETE FROM settlement_approvals
      WHERE settlement_id IN (
        SELECT id FROM settlements WHERE tenant_id = ${CONFIG.TENANT_ID}::uuid
      )
    `;
    
    await prisma.$executeRaw`
      DELETE FROM settlements WHERE tenant_id = ${CONFIG.TENANT_ID}::uuid
    `;
    
    await prisma.$executeRaw`
      DELETE FROM payment_requests WHERE tenant_id = ${CONFIG.TENANT_ID}::uuid
    `;
    
    console.log('  ✅ Test data cleaned up\n');
  } catch (error) {
    console.error('  ⚠️ Cleanup failed:', error.message);
  }
}

// ============================================================================
// REPORT
// ============================================================================

function generateReport() {
  metrics.endTime = Date.now();
  const totalDuration = (metrics.endTime - metrics.startTime) / 1000;
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 STRESS TEST REPORT');
  console.log('='.repeat(70) + '\n');
  
  console.log('SUMMARY');
  console.log('-'.repeat(40));
  console.log(`Total Duration:        ${totalDuration.toFixed(2)} seconds`);
  console.log(`Payment Requests:      ${metrics.requestsCreated}/${CONFIG.TOTAL_PAYMENT_REQUESTS}`);
  console.log(`Settlements Created:   ${metrics.settlementsCreated}/${CONFIG.TOTAL_SETTLEMENTS}`);
  console.log(`Approvals Completed:   ${metrics.approvalsCompleted}`);
  console.log(`Executions Completed:  ${metrics.executionsCompleted}`);
  console.log('');
  
  console.log('ERRORS');
  console.log('-'.repeat(40));
  console.log(`Deadlocks:             ${metrics.deadlocks}`);
  console.log(`Timeouts:              ${metrics.timeouts}`);
  console.log(`Balance Errors:        ${metrics.balanceErrors}`);
  console.log(`Other Errors:          ${metrics.otherErrors.length}`);
  console.log('');
  
  console.log('TIMING (ms)');
  console.log('-'.repeat(40));
  
  const categories = ['requestCreation', 'settlementCreation', 'fcApproval', 'cfoApproval', 'execution'];
  for (const category of categories) {
    const stats = calculateStats(metrics.timings[category]);
    console.log(`${category}:`);
    console.log(`  avg=${stats.avg}ms  min=${stats.min}ms  max=${stats.max}ms  p95=${stats.p95}ms  p99=${stats.p99}ms`);
  }
  console.log('');
  
  console.log('CHECKLIST');
  console.log('-'.repeat(40));
  console.log(`✓ No deadlocks:        ${metrics.deadlocks === 0 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✓ No timeouts:         ${metrics.timeouts === 0 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✓ No balance errors:   ${metrics.balanceErrors === 0 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  const overallPass = metrics.deadlocks === 0 && 
                      metrics.timeouts === 0 && 
                      metrics.balanceErrors === 0;
  
  console.log('='.repeat(70));
  console.log(`OVERALL RESULT: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(70) + '\n');
  
  if (metrics.otherErrors.length > 0) {
    console.log('OTHER ERRORS:');
    metrics.otherErrors.slice(0, 10).forEach((e, i) => {
      console.log(`  ${i + 1}. [${e.phase}] ${e.error}`);
    });
    if (metrics.otherErrors.length > 10) {
      console.log(`  ... and ${metrics.otherErrors.length - 10} more`);
    }
  }
  
  return overallPass;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 SETTLEMENT SYSTEM STRESS TEST');
  console.log('='.repeat(70) + '\n');
  
  console.log(`Configuration:`);
  console.log(`  - Payment Requests: ${CONFIG.TOTAL_PAYMENT_REQUESTS}`);
  console.log(`  - Settlements: ${CONFIG.TOTAL_SETTLEMENTS}`);
  console.log(`  - Concurrent Approvals: ${CONFIG.CONCURRENT_APPROVALS}`);
  console.log(`  - Concurrent Executions: ${CONFIG.CONCURRENT_EXECUTIONS}`);
  console.log('');
  
  metrics.startTime = Date.now();
  
  try {
    await setup();
    await createPaymentRequests();
    await createSettlements();
    await runConcurrentFCApprovals();
    await runConcurrentCFOApprovals();
    await runConcurrentExecutions();
    await verifyBalances();
    
    const passed = generateReport();
    
    // Uncomment to cleanup after test
    // await cleanup();
    
    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
