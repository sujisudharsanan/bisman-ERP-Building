/**
 * Contract Accounting Service
 * Handles all accounting operations for contracts:
 * - Ledger mapping
 * - Payable schedule generation
 * - Journal entry creation
 * - Payment processing
 */

const { getPrisma } = require('../lib/prisma');

// Default ledger codes for contract types
const DEFAULT_LEDGER_MAPPINGS = {
  'RENT': {
    expense: 'RENT-EXPENSE',
    advance: 'SECURITY-DEPOSIT',
    payable: 'ACCOUNTS-PAYABLE'
  },
  'VEHICLE': {
    expense: 'VEHICLE-HIRE-EXPENSE',
    advance: 'VEHICLE-ADVANCE',
    payable: 'ACCOUNTS-PAYABLE'
  },
  'VENDOR': {
    expense: 'SERVICE-EXPENSE',
    advance: 'VENDOR-ADVANCE',
    payable: 'ACCOUNTS-PAYABLE'
  },
  'CUSTOM': {
    expense: 'OTHER-EXPENSE',
    advance: 'OTHER-ADVANCE',
    payable: 'ACCOUNTS-PAYABLE'
  }
};

/**
 * Generate journal entry number
 */
function generateJournalNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `JE-${year}${month}-${random}`;
}

/**
 * Get or create default ledgers for a tenant
 */
async function ensureDefaultLedgers(tenantId) {
  const prisma = getPrisma();
  
  const ledgerDefaults = [
    { code: 'RENT-EXPENSE', name: 'Rent Expense', type: 'EXPENSE' },
    { code: 'VEHICLE-HIRE-EXPENSE', name: 'Vehicle Hire Expense', type: 'EXPENSE' },
    { code: 'SERVICE-EXPENSE', name: 'Service Expense', type: 'EXPENSE' },
    { code: 'OTHER-EXPENSE', name: 'Other Expense', type: 'EXPENSE' },
    { code: 'SECURITY-DEPOSIT', name: 'Security Deposit', type: 'ASSET' },
    { code: 'VEHICLE-ADVANCE', name: 'Vehicle Advance', type: 'ASSET' },
    { code: 'VENDOR-ADVANCE', name: 'Vendor Advance', type: 'ASSET' },
    { code: 'OTHER-ADVANCE', name: 'Other Advance', type: 'ASSET' },
    { code: 'ACCOUNTS-PAYABLE', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: 'CASH', name: 'Cash', type: 'ASSET' },
    { code: 'BANK', name: 'Bank Account', type: 'ASSET' }
  ];

  const results = {};
  
  for (const ledger of ledgerDefaults) {
    const existing = await prisma.ledger.findFirst({
      where: { 
        tenant_id: tenantId,
        code: ledger.code
      }
    });
    
    if (existing) {
      results[ledger.code] = existing;
    } else {
      const created = await prisma.ledger.create({
        data: {
          tenant_id: tenantId,
          code: ledger.code,
          name: ledger.name,
          ledger_type: ledger.type,
          is_system: true,
          is_active: true
        }
      });
      results[ledger.code] = created;
    }
  }
  
  return results;
}

/**
 * Create accounting map for a contract
 */
async function createContractAccountingMap(contractId, contractType, tenantId) {
  const prisma = getPrisma();
  
  // Ensure default ledgers exist
  const ledgers = await ensureDefaultLedgers(tenantId);
  
  // Get mapping for contract type
  const mapping = DEFAULT_LEDGER_MAPPINGS[contractType] || DEFAULT_LEDGER_MAPPINGS['CUSTOM'];
  
  const expenseLedger = ledgers[mapping.expense];
  const advanceLedger = ledgers[mapping.advance];
  const payableLedger = ledgers[mapping.payable];
  
  if (!expenseLedger) {
    throw new Error(`Expense ledger not found for contract type: ${contractType}`);
  }
  
  // Create or update the accounting map
  const accountingMap = await prisma.contractAccountingMap.upsert({
    where: { contract_id: contractId },
    create: {
      contract_id: contractId,
      expense_ledger_id: expenseLedger.id,
      advance_ledger_id: advanceLedger?.id,
      payable_ledger_id: payableLedger?.id,
      is_activated: false
    },
    update: {
      expense_ledger_id: expenseLedger.id,
      advance_ledger_id: advanceLedger?.id,
      payable_ledger_id: payableLedger?.id
    }
  });
  
  return accountingMap;
}

/**
 * Generate scheduled payables for a contract
 */
async function generateScheduledPayables(contractId, _userId) {
  const prisma = getPrisma();
  
  // Get contract with financials
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      financials: true
    }
  });
  
  if (!contract) {
    throw new Error('Contract not found');
  }
  
  if (contract.status !== 'ACTIVE') {
    throw new Error('Can only generate payables for active contracts');
  }
  
  if (!contract.financials) {
    throw new Error('Contract has no financial details');
  }
  
  const { monthly_amount, tax_percentage, payment_cycle, payment_due_day } = contract.financials;
  
  if (!monthly_amount || parseFloat(monthly_amount) <= 0) {
    throw new Error('Monthly amount must be greater than 0');
  }
  
  // Calculate number of periods
  const startDate = new Date(contract.start_date);
  const endDate = new Date(contract.end_date);
  
  // Delete any existing pending payables
  await prisma.scheduledPayable.deleteMany({
    where: {
      contract_id: contractId,
      status: 'PENDING'
    }
  });
  
  const payables = [];
  const currentDate = new Date(startDate);
  
  // Set to payment due day
  const dueDay = payment_due_day || 1;
  
  while (currentDate <= endDate) {
    const periodStart = new Date(currentDate);
    
    // Calculate period end (next month)
    const periodEnd = new Date(currentDate);
    if (payment_cycle === 'WEEKLY') {
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else if (payment_cycle === 'QUARTERLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 3);
    } else if (payment_cycle === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      // Default: MONTHLY
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    periodEnd.setDate(periodEnd.getDate() - 1);
    
    // Calculate due date
    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDay);
    
    // Calculate amounts
    const amount = parseFloat(monthly_amount);
    const taxRate = parseFloat(tax_percentage) || 0;
    const taxAmount = amount * (taxRate / 100);
    const totalAmount = amount + taxAmount;
    
    payables.push({
      tenant_id: contract.tenant_id,
      contract_id: contractId,
      due_date: dueDate,
      amount: amount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      description: `${contract.contract_type} payment for ${periodStart.toISOString().slice(0, 7)}`,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'PENDING'
    });
    
    // Move to next period
    if (payment_cycle === 'WEEKLY') {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (payment_cycle === 'QUARTERLY') {
      currentDate.setMonth(currentDate.getMonth() + 3);
    } else if (payment_cycle === 'YEARLY') {
      currentDate.setFullYear(currentDate.getFullYear() + 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }
  
  // Create all payables
  const createdPayables = await prisma.scheduledPayable.createMany({
    data: payables
  });
  
  return {
    count: createdPayables.count,
    message: `Generated ${createdPayables.count} scheduled payables`
  };
}

/**
 * Post a payable (create accrual journal entry)
 */
async function postPayable(payableId, userId) {
  const prisma = getPrisma();
  
  const payable = await prisma.scheduledPayable.findUnique({
    where: { id: payableId }
  });
  
  if (!payable) {
    throw new Error('Payable not found');
  }
  
  if (payable.status !== 'PENDING') {
    throw new Error('Can only post pending payables');
  }
  
  // Get contract accounting map
  const accountingMap = await prisma.contractAccountingMap.findUnique({
    where: { contract_id: payable.contract_id }
  });
  
  if (!accountingMap) {
    throw new Error('Contract has no accounting mapping. Please set up ledger mapping first.');
  }
  
  // Get payable ledger (Accounts Payable)
  const payableLedger = await prisma.ledger.findFirst({
    where: { code: 'ACCOUNTS-PAYABLE', tenant_id: payable.tenant_id }
  });
  
  if (!payableLedger) {
    throw new Error('Accounts Payable ledger not found');
  }
  
  // Create journal entry
  const entryNumber = generateJournalNumber();
  const totalAmount = parseFloat(payable.total_amount);
  
  const journalEntry = await prisma.journalEntry.create({
    data: {
      tenant_id: payable.tenant_id,
      entry_number: entryNumber,
      entry_date: payable.due_date,
      reference_type: 'CONTRACT_ACCRUAL',
      reference_id: payable.contract_id,
      description: payable.description || 'Contract expense accrual',
      total_debit: totalAmount,
      total_credit: totalAmount,
      status: 'POSTED',
      posted_at: new Date(),
      posted_by: userId,
      created_by: userId,
      lines: {
        create: [
          {
            ledger_id: accountingMap.expense_ledger_id,
            debit: totalAmount,
            credit: 0,
            description: 'Expense'
          },
          {
            ledger_id: payableLedger.id,
            debit: 0,
            credit: totalAmount,
            description: 'Payable'
          }
        ]
      }
    }
  });
  
  // Update payable status
  await prisma.scheduledPayable.update({
    where: { id: payableId },
    data: {
      status: 'POSTED',
      posted_at: new Date(),
      posted_by: userId,
      journal_entry_id: journalEntry.id
    }
  });
  
  // Update ledger balances
  await prisma.ledger.update({
    where: { id: accountingMap.expense_ledger_id },
    data: {
      current_balance: { increment: totalAmount }
    }
  });
  
  await prisma.ledger.update({
    where: { id: payableLedger.id },
    data: {
      current_balance: { increment: totalAmount }
    }
  });
  
  return {
    journalEntry,
    message: 'Payable posted successfully'
  };
}

/**
 * Pay a posted payable
 */
async function payPayable(payableId, paymentDetails, userId) {
  const prisma = getPrisma();
  
  const payable = await prisma.scheduledPayable.findUnique({
    where: { id: payableId }
  });
  
  if (!payable) {
    throw new Error('Payable not found');
  }
  
  if (payable.status !== 'POSTED') {
    throw new Error('Can only pay posted payables');
  }
  
  const { payment_mode = 'BANK', payment_reference } = paymentDetails;
  
  // Get ledgers
  const payableLedger = await prisma.ledger.findFirst({
    where: { code: 'ACCOUNTS-PAYABLE', tenant_id: payable.tenant_id }
  });
  
  const cashLedger = await prisma.ledger.findFirst({
    where: { code: payment_mode === 'CASH' ? 'CASH' : 'BANK', tenant_id: payable.tenant_id }
  });
  
  if (!payableLedger || !cashLedger) {
    throw new Error('Required ledgers not found');
  }
  
  // Create payment journal entry
  const entryNumber = generateJournalNumber();
  const totalAmount = parseFloat(payable.total_amount);
  
  const journalEntry = await prisma.journalEntry.create({
    data: {
      tenant_id: payable.tenant_id,
      entry_number: entryNumber,
      entry_date: new Date(),
      reference_type: 'CONTRACT_PAYMENT',
      reference_id: payable.contract_id,
      description: `Payment for ${payable.description || 'contract payable'}`,
      total_debit: totalAmount,
      total_credit: totalAmount,
      status: 'POSTED',
      posted_at: new Date(),
      posted_by: userId,
      created_by: userId,
      lines: {
        create: [
          {
            ledger_id: payableLedger.id,
            debit: totalAmount,
            credit: 0,
            description: 'Clear payable'
          },
          {
            ledger_id: cashLedger.id,
            debit: 0,
            credit: totalAmount,
            description: `Payment via ${payment_mode}`
          }
        ]
      }
    }
  });
  
  // Update payable status
  await prisma.scheduledPayable.update({
    where: { id: payableId },
    data: {
      status: 'PAID',
      paid_at: new Date(),
      paid_by: userId,
      payment_reference: payment_reference,
      payment_journal_id: journalEntry.id
    }
  });
  
  // Update ledger balances
  await prisma.ledger.update({
    where: { id: payableLedger.id },
    data: {
      current_balance: { decrement: totalAmount }
    }
  });
  
  await prisma.ledger.update({
    where: { id: cashLedger.id },
    data: {
      current_balance: { decrement: totalAmount }
    }
  });
  
  return {
    journalEntry,
    message: 'Payment recorded successfully'
  };
}

/**
 * Record advance payment for a contract
 */
async function recordAdvancePayment(contractId, amount, paymentDetails, userId) {
  const prisma = getPrisma();
  
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { financials: true }
  });
  
  if (!contract) {
    throw new Error('Contract not found');
  }
  
  // Get accounting map
  const accountingMap = await prisma.contractAccountingMap.findUnique({
    where: { contract_id: contractId }
  });
  
  if (!accountingMap || !accountingMap.advance_ledger_id) {
    throw new Error('Contract has no advance ledger mapping');
  }
  
  const { payment_mode = 'BANK', payment_reference } = paymentDetails;
  
  // Get cash/bank ledger
  const cashLedger = await prisma.ledger.findFirst({
    where: { code: payment_mode === 'CASH' ? 'CASH' : 'BANK', tenant_id: contract.tenant_id }
  });
  
  if (!cashLedger) {
    throw new Error('Cash/Bank ledger not found');
  }
  
  // Create advance journal entry
  // Dr Advance Ledger, Cr Cash/Bank
  const entryNumber = generateJournalNumber();
  const advanceAmount = parseFloat(amount);
  
  const journalEntry = await prisma.journalEntry.create({
    data: {
      tenant_id: contract.tenant_id,
      entry_number: entryNumber,
      entry_date: new Date(),
      reference_type: 'CONTRACT_ADVANCE',
      reference_id: contractId,
      description: `Advance/Security deposit for ${contract.title}${payment_reference ? ` (Ref: ${payment_reference})` : ''}`,
      total_debit: advanceAmount,
      total_credit: advanceAmount,
      status: 'POSTED',
      posted_at: new Date(),
      posted_by: userId,
      created_by: userId,
      lines: {
        create: [
          {
            ledger_id: accountingMap.advance_ledger_id,
            debit: advanceAmount,
            credit: 0,
            description: 'Advance paid'
          },
          {
            ledger_id: cashLedger.id,
            debit: 0,
            credit: advanceAmount,
            description: `Payment via ${payment_mode}`
          }
        ]
      }
    }
  });
  
  // Update ledger balances
  await prisma.ledger.update({
    where: { id: accountingMap.advance_ledger_id },
    data: {
      current_balance: { increment: advanceAmount }
    }
  });
  
  await prisma.ledger.update({
    where: { id: cashLedger.id },
    data: {
      current_balance: { decrement: advanceAmount }
    }
  });
  
  return {
    journalEntry,
    message: 'Advance payment recorded successfully'
  };
}

/**
 * Get ledger view for a contract
 */
async function getContractLedgerView(contractId) {
  const prisma = getPrisma();
  
  // Get all journal entries related to this contract
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      reference_id: contractId,
      reference_type: { in: ['CONTRACT_ACCRUAL', 'CONTRACT_PAYMENT', 'CONTRACT_ADVANCE'] }
    },
    include: {
      lines: {
        include: {
          ledger: true
        }
      }
    },
    orderBy: { entry_date: 'asc' }
  });
  
  // Get scheduled payables
  const payables = await prisma.scheduledPayable.findMany({
    where: { contract_id: contractId },
    orderBy: { due_date: 'asc' }
  });
  
  // Get accounting map
  const accountingMap = await prisma.contractAccountingMap.findUnique({
    where: { contract_id: contractId },
    include: {
      expense_ledger: true,
      advance_ledger: true
    }
  });
  
  // Calculate summary
  const totalExpense = journalEntries
    .filter(je => je.reference_type === 'CONTRACT_ACCRUAL')
    .reduce((sum, je) => sum + parseFloat(je.total_debit), 0);
    
  const totalPaid = journalEntries
    .filter(je => je.reference_type === 'CONTRACT_PAYMENT')
    .reduce((sum, je) => sum + parseFloat(je.total_debit), 0);
    
  const totalAdvance = journalEntries
    .filter(je => je.reference_type === 'CONTRACT_ADVANCE')
    .reduce((sum, je) => sum + parseFloat(je.total_debit), 0);
  
  const pendingPayables = payables.filter(p => p.status === 'PENDING');
  const postedPayables = payables.filter(p => p.status === 'POSTED');
  const paidPayables = payables.filter(p => p.status === 'PAID');
  
  return {
    accounting_map: accountingMap,
    summary: {
      total_expense_accrued: totalExpense,
      total_paid: totalPaid,
      total_advance: totalAdvance,
      outstanding: totalExpense - totalPaid,
      advance_remaining: totalAdvance
    },
    payables: {
      pending: pendingPayables.length,
      pending_amount: pendingPayables.reduce((sum, p) => sum + parseFloat(p.total_amount), 0),
      posted: postedPayables.length,
      posted_amount: postedPayables.reduce((sum, p) => sum + parseFloat(p.total_amount), 0),
      paid: paidPayables.length,
      paid_amount: paidPayables.reduce((sum, p) => sum + parseFloat(p.total_amount), 0)
    },
    journal_entries: journalEntries,
    scheduled_payables: payables
  };
}

/**
 * Check if contract can be terminated (no unpaid posted entries)
 */
async function canTerminateContract(contractId) {
  const prisma = getPrisma();
  
  const unpostedPayables = await prisma.scheduledPayable.count({
    where: {
      contract_id: contractId,
      status: 'POSTED'
    }
  });
  
  return {
    canTerminate: unpostedPayables === 0,
    blockedBy: unpostedPayables > 0 ? `${unpostedPayables} unpaid posted entries exist` : null
  };
}

/**
 * Activate contract accounting (set up ledger mapping and mark as activated)
 */
async function activateContractAccounting(contractId, userId) {
  const prisma = getPrisma();
  
  const contract = await prisma.contract.findUnique({
    where: { id: contractId }
  });
  
  if (!contract) {
    throw new Error('Contract not found');
  }
  
  // Create accounting map if not exists
  let accountingMap = await prisma.contractAccountingMap.findUnique({
    where: { contract_id: contractId }
  });
  
  if (!accountingMap) {
    accountingMap = await createContractAccountingMap(contractId, contract.contract_type, contract.tenant_id);
  }
  
  // Activate it
  await prisma.contractAccountingMap.update({
    where: { contract_id: contractId },
    data: {
      is_activated: true,
      activated_at: new Date(),
      activated_by: userId
    }
  });
  
  return {
    message: 'Contract accounting activated',
    accounting_map: accountingMap
  };
}

module.exports = {
  ensureDefaultLedgers,
  createContractAccountingMap,
  generateScheduledPayables,
  postPayable,
  payPayable,
  recordAdvancePayment,
  getContractLedgerView,
  canTerminateContract,
  activateContractAccounting
};
