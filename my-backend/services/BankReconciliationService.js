/**
 * ============================================================================
 * BANK RECONCILIATION SERVICE
 * ============================================================================
 * 
 * Enterprise-grade bank statement reconciliation with:
 * - Multi-bank template engine (configurable parsing per bank)
 * - High-performance streaming for large statements (50K+ rows)
 * - Smart matching algorithms with confidence scoring
 * - Full audit trail for every action
 * 
 * BUSINESS RULES:
 * 1. VERIFICATION ONLY - no payment execution
 * 2. Accountant: Upload, parse, match, finalize
 * 3. CFO/Auditor: View-only, cannot modify
 * 4. All matches are immutable after batch finalization
 * 5. Every modification logged with reason
 * 
 * MATCHING PRIORITY:
 * 1. Exact Match: UTR + Amount + Credit flag
 * 2. Near Match: Amount + Date Window (±3 days)
 * 3. Fuzzy Match: Description parsing + amount
 * 4. Manual Match: User-initiated with mandatory reason
 * 
 * @module services/BankReconciliationService
 */

const { getPrisma } = require('../lib/prisma');
const { Readable } = require('stream');
const crypto = require('crypto');

// ============================================================================
// CONSTANTS
// ============================================================================

const StatementStatus = {
  UPLOADING: 'uploading',
  PARSING: 'parsing',
  PARSED: 'parsed',
  FAILED: 'failed'
};

const LineStatus = {
  PENDING: 'pending',
  MATCHED: 'matched',
  EXCEPTION: 'exception',
  IGNORED: 'ignored'
};

const BatchStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  LOCKED: 'locked',
  FINALIZED: 'finalized'
};

const MatchType = {
  EXACT_UTR: 'exact_utr',
  AMOUNT_DATE: 'amount_date',
  FUZZY: 'fuzzy',
  MANUAL: 'manual',
  SYSTEM: 'system'
};

const MatchConfidence = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  MANUAL: 'manual'
};

const ExceptionType = {
  NO_MATCH: 'no_match',
  DUPLICATE: 'duplicate',
  AMOUNT_MISMATCH: 'amount_mismatch',
  DATE_MISMATCH: 'date_mismatch',
  ALREADY_RECONCILED: 'already_reconciled',
  SUSPICIOUS: 'suspicious'
};

const AuditActions = {
  TEMPLATE_CREATED: 'TEMPLATE_CREATED',
  TEMPLATE_UPDATED: 'TEMPLATE_UPDATED',
  TEMPLATE_DELETED: 'TEMPLATE_DELETED',
  STATEMENT_UPLOADED: 'STATEMENT_UPLOADED',
  STATEMENT_PARSED: 'STATEMENT_PARSED',
  STATEMENT_FAILED: 'STATEMENT_FAILED',
  BATCH_CREATED: 'BATCH_CREATED',
  BATCH_STATUS_CHANGED: 'BATCH_STATUS_CHANGED',
  BATCH_LOCKED: 'BATCH_LOCKED',
  BATCH_FINALIZED: 'BATCH_FINALIZED',
  MATCH_CREATED: 'MATCH_CREATED',
  MATCH_UNMATCH: 'MATCH_UNMATCH',
  MANUAL_MATCH: 'MANUAL_MATCH',
  EXCEPTION_CREATED: 'EXCEPTION_CREATED',
  EXCEPTION_RESOLVED: 'EXCEPTION_RESOLVED',
  AUTO_MATCH_RUN: 'AUTO_MATCH_RUN'
};

// Roles allowed for reconciliation operations
const ReconciliationRoles = {
  CAN_UPLOAD: ['ACCOUNTANT', 'ADMIN'],
  CAN_MATCH: ['ACCOUNTANT', 'ADMIN'],
  CAN_FINALIZE: ['ACCOUNTANT', 'ADMIN'],
  CAN_VIEW: ['ACCOUNTANT', 'FINANCE_CONTROLLER', 'CFO', 'AUDITOR', 'ADMIN'],
  CAN_MANAGE_TEMPLATES: ['ADMIN']
};

// ============================================================================
// BANK RECONCILIATION SERVICE CLASS
// ============================================================================

class BankReconciliationService {
  constructor() {
    this.prisma = null;
    this.batchInsertSize = 1000; // Batch insert size for performance
    this.dateWindowDays = 3; // Date matching window
  }

  getPrisma() {
    if (!this.prisma) {
      this.prisma = getPrisma();
    }
    return this.prisma;
  }

  // ==========================================================================
  // TEMPLATE MANAGEMENT (Part A: Multi-Bank Template Engine)
  // ==========================================================================

  /**
   * Create a new bank parsing template
   * @param {Object} templateData - Template configuration
   * @param {Object} actor - User creating the template
   */
  async createTemplate(templateData, actor) {
    const prisma = this.getPrisma();
    
    // Validate required fields
    const requiredFields = ['bank_name', 'file_type', 'column_mappings'];
    for (const field of requiredFields) {
      if (!templateData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate column mappings have required fields
    const mappings = templateData.column_mappings;
    if (!mappings.date || !mappings.amount) {
      throw new Error('Column mappings must include at least date and amount');
    }

    const template = await prisma.bank_parsing_templates.create({
      data: {
        id: crypto.randomUUID(),
        tenant_id: actor.tenant_id,
        bank_name: templateData.bank_name,
        bank_code: templateData.bank_code || null,
        file_type: templateData.file_type,
        delimiter: templateData.delimiter || ',',
        has_header: templateData.has_header !== false,
        header_row: templateData.header_row || 1,
        data_start_row: templateData.data_start_row || 2,
        column_mappings: mappings,
        date_format: templateData.date_format || 'YYYY-MM-DD',
        amount_format: templateData.amount_format || null,
        utr_extraction_regex: templateData.utr_extraction_regex || null,
        credit_indicator: templateData.credit_indicator || { column: null, value: 'CR' },
        skip_patterns: templateData.skip_patterns || [],
        validation_rules: templateData.validation_rules || {},
        is_active: true,
        created_by: actor.id
      }
    });

    // Audit log
    await this.logAudit(AuditActions.TEMPLATE_CREATED, {
      templateId: template.id,
      bankName: template.bank_name,
      actor
    });

    return template;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId, updates, actor) {
    const prisma = this.getPrisma();

    const existing = await prisma.bank_parsing_templates.findFirst({
      where: { id: templateId, tenant_id: actor.tenant_id }
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    const template = await prisma.bank_parsing_templates.update({
      where: { id: templateId },
      data: {
        ...updates,
        updated_at: new Date()
      }
    });

    await this.logAudit(AuditActions.TEMPLATE_UPDATED, {
      templateId,
      changes: updates,
      actor
    });

    return template;
  }

  /**
   * Get all templates for tenant
   */
  async getTemplates(tenantId, includeInactive = false) {
    const prisma = this.getPrisma();

    const where = { tenant_id: tenantId };
    if (!includeInactive) {
      where.is_active = true;
    }

    return prisma.bank_parsing_templates.findMany({
      where,
      orderBy: { bank_name: 'asc' }
    });
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId, tenantId) {
    const prisma = this.getPrisma();

    return prisma.bank_parsing_templates.findFirst({
      where: { id: templateId, tenant_id: tenantId }
    });
  }

  /**
   * Auto-detect template from file content
   */
  async detectTemplate(fileContent, fileName, tenantId) {
    const prisma = this.getPrisma();
    const templates = await this.getTemplates(tenantId);

    const fileExt = fileName.split('.').pop().toLowerCase();
    
    // Filter by file type first
    const compatibleTemplates = templates.filter(t => {
      if (fileExt === 'csv' && t.file_type === 'csv') return true;
      if ((fileExt === 'xls' || fileExt === 'xlsx') && t.file_type === 'excel') return true;
      return false;
    });

    // Try to match by bank name in file content or headers
    for (const template of compatibleTemplates) {
      const bankKeywords = template.bank_name.toLowerCase().split(' ');
      const contentLower = (typeof fileContent === 'string' ? fileContent : '').toLowerCase();
      
      const matchCount = bankKeywords.filter(kw => contentLower.includes(kw)).length;
      if (matchCount >= bankKeywords.length / 2) {
        return template;
      }
    }

    // Return first compatible template if no specific match
    return compatibleTemplates[0] || null;
  }

  // ==========================================================================
  // STATEMENT PARSING (Part B: High Performance)
  // ==========================================================================

  /**
   * Upload and parse a bank statement
   * Uses streaming for large files
   */
  async uploadStatement(fileBuffer, fileName, templateId, bankAccountId, actor) {
    const prisma = this.getPrisma();
    const statementId = crypto.randomUUID();

    // Create statement record
    const statement = await prisma.bank_statements.create({
      data: {
        id: statementId,
        tenant_id: actor.tenant_id,
        template_id: templateId,
        bank_account_id: bankAccountId,
        original_filename: fileName,
        file_hash: this.computeFileHash(fileBuffer),
        file_size_bytes: fileBuffer.length,
        status: StatementStatus.UPLOADING,
        uploaded_by: actor.id
      }
    });

    await this.logAudit(AuditActions.STATEMENT_UPLOADED, {
      statementId,
      fileName,
      fileSize: fileBuffer.length,
      actor
    });

    // Parse in background for large files (async processing)
    this.parseStatementAsync(statementId, fileBuffer, templateId, actor.tenant_id)
      .catch(err => console.error(`[BankReconciliation] Parse failed for ${statementId}:`, err));

    return statement;
  }

  /**
   * Compute SHA-256 hash of file content
   */
  computeFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Async statement parsing with progress tracking
   */
  async parseStatementAsync(statementId, fileBuffer, templateId, tenantId) {
    const prisma = this.getPrisma();
    const startTime = Date.now();

    try {
      // Update status to parsing
      await prisma.bank_statements.update({
        where: { id: statementId },
        data: { status: StatementStatus.PARSING }
      });

      // Get template
      const template = await prisma.bank_parsing_templates.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Parse based on file type
      let lines;
      if (template.file_type === 'csv') {
        lines = await this.parseCSV(fileBuffer, template);
      } else if (template.file_type === 'excel') {
        lines = await this.parseExcel(fileBuffer, template);
      } else {
        throw new Error(`Unsupported file type: ${template.file_type}`);
      }

      // Batch insert lines for performance
      const insertedCount = await this.batchInsertLines(statementId, lines, tenantId);

      // Update statement with results
      const parseTimeMs = Date.now() - startTime;
      await prisma.bank_statements.update({
        where: { id: statementId },
        data: {
          status: StatementStatus.PARSED,
          total_rows: insertedCount,
          parsed_rows: insertedCount,
          parse_errors: 0,
          statement_date_from: lines.length > 0 ? lines[0].transaction_date : null,
          statement_date_to: lines.length > 0 ? lines[lines.length - 1].transaction_date : null,
          total_credits: lines.filter(l => l.is_credit).reduce((sum, l) => sum + Number(l.amount), 0),
          total_debits: lines.filter(l => !l.is_credit).reduce((sum, l) => sum + Number(l.amount), 0),
          parse_completed_at: new Date()
        }
      });

      await this.logAudit(AuditActions.STATEMENT_PARSED, {
        statementId,
        rowCount: insertedCount,
        parseTimeMs
      });

      console.log(`[BankReconciliation] Parsed ${insertedCount} rows in ${parseTimeMs}ms for statement ${statementId}`);

    } catch (error) {
      await prisma.bank_statements.update({
        where: { id: statementId },
        data: {
          status: StatementStatus.FAILED,
          error_details: { message: error.message, stack: error.stack }
        }
      });

      await this.logAudit(AuditActions.STATEMENT_FAILED, {
        statementId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Parse CSV file using streaming
   */
  async parseCSV(buffer, template) {
    const content = buffer.toString('utf-8');
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    const mappings = template.column_mappings;
    const delimiter = template.delimiter || ',';
    const dataStartRow = template.data_start_row || 2;
    const skipPatterns = template.skip_patterns || [];

    const parsedLines = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      
      // Skip header and pre-data rows
      if (lineNumber < dataStartRow) continue;

      // Skip lines matching skip patterns
      if (skipPatterns.some(pattern => new RegExp(pattern, 'i').test(line))) continue;

      // Parse columns
      const columns = this.parseCSVLine(line, delimiter);

      try {
        const parsedLine = this.mapColumnsToFields(columns, mappings, template, lineNumber);
        if (parsedLine) {
          parsedLines.push(parsedLine);
        }
      } catch (err) {
        console.warn(`[BankReconciliation] Skip line ${lineNumber}: ${err.message}`);
      }
    }

    return parsedLines;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  parseCSVLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  /**
   * Parse Excel file (requires xlsx library)
   */
  async parseExcel(buffer, template) {
    // Dynamic import for xlsx to keep it optional
    let XLSX;
    try {
      XLSX = require('xlsx');
    } catch {
      throw new Error('xlsx library not installed. Run: npm install xlsx');
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(sheet, { 
      header: 1, 
      raw: false,
      defval: '' 
    });

    const mappings = template.column_mappings;
    const dataStartRow = template.data_start_row || 2;
    const skipPatterns = template.skip_patterns || [];

    const parsedLines = [];

    for (let i = dataStartRow - 1; i < rows.length; i++) {
      const row = rows[i];
      const rowStr = row.join(' ');

      // Skip empty rows
      if (!row.some(cell => cell && cell.toString().trim())) continue;

      // Skip lines matching skip patterns
      if (skipPatterns.some(pattern => new RegExp(pattern, 'i').test(rowStr))) continue;

      try {
        const parsedLine = this.mapColumnsToFields(row, mappings, template, i + 1);
        if (parsedLine) {
          parsedLines.push(parsedLine);
        }
      } catch (err) {
        console.warn(`[BankReconciliation] Skip row ${i + 1}: ${err.message}`);
      }
    }

    return parsedLines;
  }

  /**
   * Map raw columns to normalized fields using template mappings
   */
  mapColumnsToFields(columns, mappings, template, lineNumber) {
    // Get column values by index (0-based in mappings)
    const getValue = (key) => {
      const colIndex = mappings[key];
      if (colIndex === undefined || colIndex === null) return null;
      return columns[colIndex]?.toString().trim() || null;
    };

    // Parse date
    const dateStr = getValue('date');
    if (!dateStr) return null;
    
    const transactionDate = this.parseDate(dateStr, template.date_format);
    if (!transactionDate) {
      throw new Error(`Invalid date: ${dateStr}`);
    }

    // Parse amount
    const amountStr = getValue('amount') || getValue('credit') || getValue('debit');
    if (!amountStr) return null;

    const amount = this.parseAmount(amountStr, template.amount_format);
    if (isNaN(amount) || amount === 0) return null;

    // Determine credit/debit
    let isCredit = true;
    if (mappings.credit !== undefined && mappings.debit !== undefined) {
      // Separate credit/debit columns
      const creditVal = getValue('credit');
      const debitVal = getValue('debit');
      isCredit = creditVal && parseFloat(creditVal.replace(/[^0-9.-]/g, '')) > 0;
    } else if (template.credit_indicator?.column !== undefined) {
      // Credit indicator column
      const indicator = columns[template.credit_indicator.column]?.toString().trim();
      isCredit = indicator === template.credit_indicator.value;
    } else {
      // Sign-based (positive = credit)
      isCredit = amount > 0;
    }

    // Extract UTR from description if regex provided
    const description = getValue('description') || getValue('narration') || '';
    let extractedUtr = getValue('utr') || getValue('reference') || null;
    
    if (!extractedUtr && template.utr_extraction_regex && description) {
      const regex = new RegExp(template.utr_extraction_regex, 'i');
      const match = description.match(regex);
      if (match) {
        extractedUtr = match[1] || match[0];
      }
    }

    return {
      line_number: lineNumber,
      transaction_date: transactionDate,
      value_date: this.parseDate(getValue('value_date'), template.date_format) || transactionDate,
      description: description.substring(0, 1000), // Truncate long descriptions
      reference_number: getValue('reference') || null,
      cheque_number: getValue('cheque') || null,
      amount: Math.abs(amount),
      is_credit: isCredit,
      balance: this.parseAmount(getValue('balance'), template.amount_format) || null,
      extracted_utr: extractedUtr,
      raw_data: Object.fromEntries(columns.map((v, i) => [i, v]))
    };
  }

  /**
   * Parse date string using template format
   */
  parseDate(dateStr, format) {
    if (!dateStr) return null;

    // Common date format mappings
    const formatMappings = {
      'YYYY-MM-DD': /(\d{4})-(\d{2})-(\d{2})/,
      'DD-MM-YYYY': /(\d{2})-(\d{2})-(\d{4})/,
      'MM-DD-YYYY': /(\d{2})-(\d{2})-(\d{4})/,
      'DD/MM/YYYY': /(\d{2})\/(\d{2})\/(\d{4})/,
      'MM/DD/YYYY': /(\d{2})\/(\d{2})\/(\d{4})/,
      'YYYY/MM/DD': /(\d{4})\/(\d{2})\/(\d{2})/,
      'DD-MMM-YYYY': /(\d{2})-([A-Za-z]{3})-(\d{4})/,
      'DD MMM YYYY': /(\d{2})\s+([A-Za-z]{3})\s+(\d{4})/
    };

    try {
      const regex = formatMappings[format];
      if (!regex) {
        // Try native Date parsing
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
      }

      const match = dateStr.match(regex);
      if (!match) return null;

      let year, month, day;
      
      if (format.startsWith('YYYY')) {
        [, year, month, day] = match;
      } else if (format.startsWith('DD') && format.includes('MMM')) {
        [, day, month, year] = match;
        // Convert month name to number
        const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, 
                        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
        month = months[month.toLowerCase().substring(0, 3)] || 1;
      } else if (format.startsWith('DD')) {
        [, day, month, year] = match;
      } else if (format.startsWith('MM')) {
        [, month, day, year] = match;
      }

      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } catch {
      return null;
    }
  }

  /**
   * Parse amount string to number
   */
  parseAmount(amountStr, format) {
    if (!amountStr) return 0;

    // Remove currency symbols and whitespace
    let cleaned = amountStr.toString().replace(/[₹$€£¥\s]/g, '');

    // Handle Indian number format (1,00,000.00)
    if (format === 'indian' || /^\d{1,2}(,\d{2})*(,\d{3})?\.\d{2}$/.test(cleaned)) {
      cleaned = cleaned.replace(/,/g, '');
    } 
    // Handle European format (1.000.000,00)
    else if (format === 'european' || /^\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    // Standard format
    else {
      cleaned = cleaned.replace(/,/g, '');
    }

    // Handle parentheses for negative (accounting format)
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }

    return parseFloat(cleaned) || 0;
  }

  /**
   * Batch insert parsed lines for performance
   */
  async batchInsertLines(statementId, lines, tenantId) {
    const prisma = this.getPrisma();
    let insertedCount = 0;

    // Process in batches
    for (let i = 0; i < lines.length; i += this.batchInsertSize) {
      const batch = lines.slice(i, i + this.batchInsertSize);
      
      const insertData = batch.map(line => ({
        id: crypto.randomUUID(),
        statement_id: statementId,
        tenant_id: tenantId,
        line_number: line.line_number,
        transaction_date: line.transaction_date,
        value_date: line.value_date,
        description: line.description,
        reference_number: line.reference_number,
        cheque_number: line.cheque_number,
        amount: line.amount,
        is_credit: line.is_credit,
        balance: line.balance,
        extracted_utr: line.extracted_utr,
        raw_data: line.raw_data,
        status: LineStatus.PENDING
      }));

      await prisma.bank_statement_lines.createMany({
        data: insertData
      });

      insertedCount += batch.length;
    }

    return insertedCount;
  }

  // ==========================================================================
  // MATCHING ALGORITHMS (Part C)
  // ==========================================================================

  /**
   * Run auto-matching on a statement
   * Priority: Exact UTR → Amount+Date → Fuzzy
   */
  async runAutoMatch(statementId, actor) {
    const prisma = this.getPrisma();
    const startTime = Date.now();
    const results = { exact: 0, amountDate: 0, fuzzy: 0, unmatched: 0 };

    // Get statement and verify access
    const statement = await prisma.bank_statements.findFirst({
      where: { id: statementId, tenant_id: actor.tenant_id }
    });

    if (!statement) {
      throw new Error('Statement not found');
    }

    if (statement.status !== StatementStatus.PARSED) {
      throw new Error('Statement must be fully parsed before matching');
    }

    // Get or create reconciliation batch
    let batch = await prisma.reconciliation_batches.findFirst({
      where: { statement_id: statementId, status: { not: BatchStatus.FINALIZED } }
    });

    if (!batch) {
      batch = await this.createBatch(statementId, actor);
    }

    // Get unmatched credit lines
    const pendingLines = await prisma.bank_statement_lines.findMany({
      where: {
        statement_id: statementId,
        status: LineStatus.PENDING,
        is_credit: true // Only match credits (payments received)
      },
      orderBy: { transaction_date: 'asc' }
    });

    // Get unreconciled settlements in date range
    const dateFrom = statement.statement_date_from 
      ? new Date(new Date(statement.statement_date_from).getTime() - this.dateWindowDays * 86400000)
      : new Date(Date.now() - 90 * 86400000);
    
    const dateTo = statement.statement_date_to 
      ? new Date(new Date(statement.statement_date_to).getTime() + this.dateWindowDays * 86400000)
      : new Date();

    const settlements = await prisma.settlements.findMany({
      where: {
        tenant_id: actor.tenant_id,
        status: 'PAID',
        is_reconciled: false,
        payment_date: { gte: dateFrom, lte: dateTo }
      },
      include: {
        payment_requests: {
          select: { id: true, vendor_name: true, amount: true, utr: true }
        }
      }
    });

    // Build lookup maps for performance
    const settlementsByUtr = new Map();
    const settlementsByAmount = new Map();

    for (const settlement of settlements) {
      if (settlement.utr) {
        settlementsByUtr.set(settlement.utr.toLowerCase(), settlement);
      }
      
      const amountKey = Math.round(Number(settlement.total_amount) * 100);
      if (!settlementsByAmount.has(amountKey)) {
        settlementsByAmount.set(amountKey, []);
      }
      settlementsByAmount.get(amountKey).push(settlement);
    }

    // Process each pending line
    for (const line of pendingLines) {
      let matched = false;

      // Priority 1: Exact UTR match
      if (line.extracted_utr) {
        const settlement = settlementsByUtr.get(line.extracted_utr.toLowerCase());
        if (settlement && Math.abs(Number(settlement.total_amount) - Number(line.amount)) < 0.01) {
          await this.createMatch(batch.id, line.id, settlement.id, MatchType.EXACT_UTR, MatchConfidence.HIGH, actor);
          results.exact++;
          matched = true;
          continue;
        }
      }

      // Priority 2: Amount + Date match
      const amountKey = Math.round(Number(line.amount) * 100);
      const amountMatches = settlementsByAmount.get(amountKey) || [];
      
      for (const settlement of amountMatches) {
        const daysDiff = Math.abs(
          (new Date(line.transaction_date).getTime() - new Date(settlement.payment_date).getTime()) / 86400000
        );
        
        if (daysDiff <= this.dateWindowDays) {
          await this.createMatch(batch.id, line.id, settlement.id, MatchType.AMOUNT_DATE, MatchConfidence.MEDIUM, actor);
          results.amountDate++;
          matched = true;
          break;
        }
      }

      if (matched) continue;

      // Priority 3: Fuzzy description match
      if (line.description) {
        const fuzzyMatch = await this.findFuzzyMatch(line, settlements);
        if (fuzzyMatch) {
          await this.createMatch(batch.id, line.id, fuzzyMatch.id, MatchType.FUZZY, MatchConfidence.LOW, actor);
          results.fuzzy++;
          matched = true;
        }
      }

      if (!matched) {
        results.unmatched++;
        // Create exception for review
        await this.createException(batch.id, line.id, ExceptionType.NO_MATCH, 
          'No matching settlement found', actor);
      }
    }

    const matchTimeMs = Date.now() - startTime;

    await this.logAudit(AuditActions.AUTO_MATCH_RUN, {
      statementId,
      batchId: batch.id,
      results,
      matchTimeMs,
      actor
    });

    return { batchId: batch.id, results, matchTimeMs };
  }

  /**
   * Find fuzzy match based on description keywords
   */
  async findFuzzyMatch(line, settlements) {
    const descWords = line.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    let bestMatch = null;
    let bestScore = 0;

    for (const settlement of settlements) {
      // Check if amount is within 5%
      const amountDiff = Math.abs(Number(settlement.total_amount) - Number(line.amount)) / Number(settlement.total_amount);
      if (amountDiff > 0.05) continue;

      // Score based on keyword matches in vendor names
      let score = 0;
      for (const pr of settlement.payment_requests || []) {
        const vendorWords = (pr.vendor_name || '').toLowerCase().split(/\s+/);
        for (const word of descWords) {
          if (vendorWords.some(vw => vw.includes(word) || word.includes(vw))) {
            score += 1;
          }
        }
      }

      // Boost score if UTR partially matches
      if (settlement.utr && line.description.includes(settlement.utr.substring(0, 6))) {
        score += 5;
      }

      if (score > bestScore && score >= 2) {
        bestScore = score;
        bestMatch = settlement;
      }
    }

    return bestMatch;
  }

  /**
   * Create a match record
   */
  async createMatch(batchId, lineId, settlementId, matchType, confidence, actor, notes = null) {
    const prisma = this.getPrisma();

    // Verify line is not already matched
    const existingMatch = await prisma.reconciliation_matches.findFirst({
      where: { bank_line_id: lineId, is_active: true }
    });

    if (existingMatch) {
      throw new Error('Line is already matched');
    }

    const match = await prisma.reconciliation_matches.create({
      data: {
        id: crypto.randomUUID(),
        batch_id: batchId,
        bank_line_id: lineId,
        settlement_id: settlementId,
        match_type: matchType,
        confidence: confidence,
        matched_by: actor.id,
        notes: notes
      }
    });

    // Update line status
    await prisma.bank_statement_lines.update({
      where: { id: lineId },
      data: { status: LineStatus.MATCHED, matched_at: new Date() }
    });

    await this.logAudit(AuditActions.MATCH_CREATED, {
      matchId: match.id,
      lineId,
      settlementId,
      matchType,
      confidence,
      actor
    });

    return match;
  }

  /**
   * Manual match with mandatory reason
   */
  async createManualMatch(batchId, lineId, settlementId, reason, actor) {
    if (!reason || reason.trim().length < 10) {
      throw new Error('Manual match requires a detailed reason (min 10 characters)');
    }

    // Verify batch is not locked
    const batch = await this.getBatchById(batchId, actor.tenant_id);
    if (!batch || batch.status === BatchStatus.LOCKED || batch.status === BatchStatus.FINALIZED) {
      throw new Error('Batch is locked or finalized');
    }

    const match = await this.createMatch(batchId, lineId, settlementId, MatchType.MANUAL, MatchConfidence.MANUAL, actor, reason);

    await this.logAudit(AuditActions.MANUAL_MATCH, {
      matchId: match.id,
      lineId,
      settlementId,
      reason,
      actor
    });

    return match;
  }

  /**
   * Unmatch a line (with reason)
   */
  async unmatch(matchId, reason, actor) {
    const prisma = this.getPrisma();

    if (!reason || reason.trim().length < 10) {
      throw new Error('Unmatch requires a detailed reason (min 10 characters)');
    }

    const match = await prisma.reconciliation_matches.findFirst({
      where: { id: matchId },
      include: { batch: true }
    });

    if (!match) {
      throw new Error('Match not found');
    }

    if (match.batch.status === BatchStatus.LOCKED || match.batch.status === BatchStatus.FINALIZED) {
      throw new Error('Cannot unmatch in locked or finalized batch');
    }

    // Soft delete the match
    await prisma.reconciliation_matches.update({
      where: { id: matchId },
      data: { 
        is_active: false, 
        unmatch_reason: reason,
        unmatched_by: actor.id,
        unmatched_at: new Date()
      }
    });

    // Reset line status
    await prisma.bank_statement_lines.update({
      where: { id: match.bank_line_id },
      data: { status: LineStatus.PENDING, matched_at: null }
    });

    await this.logAudit(AuditActions.MATCH_UNMATCH, {
      matchId,
      lineId: match.bank_line_id,
      settlementId: match.settlement_id,
      reason,
      actor
    });
  }

  // ==========================================================================
  // BATCH MANAGEMENT
  // ==========================================================================

  /**
   * Create a reconciliation batch
   */
  async createBatch(statementId, actor) {
    const prisma = this.getPrisma();

    const statement = await prisma.bank_statements.findFirst({
      where: { id: statementId, tenant_id: actor.tenant_id }
    });

    if (!statement) {
      throw new Error('Statement not found');
    }

    const batch = await prisma.reconciliation_batches.create({
      data: {
        id: crypto.randomUUID(),
        tenant_id: actor.tenant_id,
        statement_id: statementId,
        status: BatchStatus.OPEN,
        created_by: actor.id
      }
    });

    await this.logAudit(AuditActions.BATCH_CREATED, {
      batchId: batch.id,
      statementId,
      actor
    });

    return batch;
  }

  /**
   * Get batch by ID
   */
  async getBatchById(batchId, tenantId) {
    const prisma = this.getPrisma();

    return prisma.reconciliation_batches.findFirst({
      where: { id: batchId, tenant_id: tenantId },
      include: {
        statement: true,
        matches: {
          where: { is_active: true },
          include: { bank_line: true, settlement: true }
        },
        exceptions: {
          where: { is_resolved: false },
          include: { bank_line: true }
        }
      }
    });
  }

  /**
   * Get batch summary with statistics
   */
  async getBatchSummary(batchId, tenantId) {
    const prisma = this.getPrisma();

    const batch = await prisma.reconciliation_batches.findFirst({
      where: { id: batchId, tenant_id: tenantId },
      include: { statement: true }
    });

    if (!batch) {
      throw new Error('Batch not found');
    }

    // Get statistics
    const [lineCounts, matchCount, exceptionCount] = await Promise.all([
      prisma.bank_statement_lines.groupBy({
        by: ['status'],
        where: { statement_id: batch.statement_id },
        _count: true
      }),
      prisma.reconciliation_matches.count({
        where: { batch_id: batchId, is_active: true }
      }),
      prisma.reconciliation_exceptions.count({
        where: { batch_id: batchId, is_resolved: false }
      })
    ]);

    const statusCounts = {};
    for (const item of lineCounts) {
      statusCounts[item.status] = item._count;
    }

    return {
      batch,
      statistics: {
        total_lines: batch.statement.total_rows,
        matched: statusCounts[LineStatus.MATCHED] || 0,
        pending: statusCounts[LineStatus.PENDING] || 0,
        exceptions: statusCounts[LineStatus.EXCEPTION] || 0,
        ignored: statusCounts[LineStatus.IGNORED] || 0,
        match_rate: batch.statement.total_rows > 0 
          ? ((statusCounts[LineStatus.MATCHED] || 0) / batch.statement.total_rows * 100).toFixed(2)
          : 0,
        unresolved_exceptions: exceptionCount
      }
    };
  }

  /**
   * Update batch status with validation
   */
  async updateBatchStatus(batchId, newStatus, actor, notes = null) {
    const prisma = this.getPrisma();

    const batch = await prisma.reconciliation_batches.findFirst({
      where: { id: batchId, tenant_id: actor.tenant_id }
    });

    if (!batch) {
      throw new Error('Batch not found');
    }

    // Validate transition
    const validTransitions = {
      [BatchStatus.OPEN]: [BatchStatus.IN_PROGRESS, BatchStatus.REVIEW],
      [BatchStatus.IN_PROGRESS]: [BatchStatus.REVIEW, BatchStatus.OPEN],
      [BatchStatus.REVIEW]: [BatchStatus.LOCKED, BatchStatus.IN_PROGRESS],
      [BatchStatus.LOCKED]: [BatchStatus.FINALIZED, BatchStatus.REVIEW] // Can unlock for corrections
    };

    if (!validTransitions[batch.status]?.includes(newStatus)) {
      throw new Error(`Invalid transition from ${batch.status} to ${newStatus}`);
    }

    const updateData = { status: newStatus };

    if (newStatus === BatchStatus.LOCKED) {
      updateData.locked_at = new Date();
      updateData.locked_by = actor.id;
    }

    if (newStatus === BatchStatus.FINALIZED) {
      // Check all exceptions are resolved
      const unresolvedCount = await prisma.reconciliation_exceptions.count({
        where: { batch_id: batchId, is_resolved: false }
      });

      if (unresolvedCount > 0) {
        throw new Error(`Cannot finalize: ${unresolvedCount} unresolved exceptions`);
      }

      updateData.finalized_at = new Date();
      updateData.finalized_by = actor.id;
      updateData.finalization_notes = notes;

      // Mark all matched settlements as reconciled
      await this.markSettlementsReconciled(batchId);
    }

    const updated = await prisma.reconciliation_batches.update({
      where: { id: batchId },
      data: updateData
    });

    const action = newStatus === BatchStatus.LOCKED ? AuditActions.BATCH_LOCKED 
                 : newStatus === BatchStatus.FINALIZED ? AuditActions.BATCH_FINALIZED 
                 : AuditActions.BATCH_STATUS_CHANGED;

    await this.logAudit(action, {
      batchId,
      previousStatus: batch.status,
      newStatus,
      notes,
      actor
    });

    return updated;
  }

  /**
   * Mark settlements as reconciled after batch finalization
   */
  async markSettlementsReconciled(batchId) {
    const prisma = this.getPrisma();

    const matches = await prisma.reconciliation_matches.findMany({
      where: { batch_id: batchId, is_active: true },
      select: { settlement_id: true }
    });

    const settlementIds = [...new Set(matches.map(m => m.settlement_id))];

    await prisma.settlements.updateMany({
      where: { id: { in: settlementIds } },
      data: { 
        is_reconciled: true, 
        reconciled_at: new Date(),
        reconciliation_batch_id: batchId
      }
    });
  }

  // ==========================================================================
  // EXCEPTION MANAGEMENT
  // ==========================================================================

  /**
   * Create an exception for a line
   */
  async createException(batchId, lineId, exceptionType, details, actor) {
    const prisma = this.getPrisma();

    const exception = await prisma.reconciliation_exceptions.create({
      data: {
        id: crypto.randomUUID(),
        batch_id: batchId,
        bank_line_id: lineId,
        exception_type: exceptionType,
        details: details,
        created_by: actor?.id || null
      }
    });

    // Update line status
    await prisma.bank_statement_lines.update({
      where: { id: lineId },
      data: { status: LineStatus.EXCEPTION }
    });

    await this.logAudit(AuditActions.EXCEPTION_CREATED, {
      exceptionId: exception.id,
      lineId,
      exceptionType,
      details,
      actor
    });

    return exception;
  }

  /**
   * Resolve an exception
   */
  async resolveException(exceptionId, resolution, action, actor) {
    const prisma = this.getPrisma();

    const exception = await prisma.reconciliation_exceptions.findFirst({
      where: { id: exceptionId },
      include: { batch: true }
    });

    if (!exception) {
      throw new Error('Exception not found');
    }

    if (exception.batch.status === BatchStatus.FINALIZED) {
      throw new Error('Cannot resolve exceptions in finalized batch');
    }

    await prisma.reconciliation_exceptions.update({
      where: { id: exceptionId },
      data: {
        is_resolved: true,
        resolution_action: action,
        resolution_notes: resolution,
        resolved_by: actor.id,
        resolved_at: new Date()
      }
    });

    // Update line status based on action
    const newStatus = action === 'ignore' ? LineStatus.IGNORED : LineStatus.PENDING;
    await prisma.bank_statement_lines.update({
      where: { id: exception.bank_line_id },
      data: { status: newStatus }
    });

    await this.logAudit(AuditActions.EXCEPTION_RESOLVED, {
      exceptionId,
      lineId: exception.bank_line_id,
      resolution,
      action,
      actor
    });
  }

  // ==========================================================================
  // QUERY METHODS (with Virtual Scrolling Support)
  // ==========================================================================

  /**
   * Get statements with pagination
   */
  async getStatements(tenantId, options = {}) {
    const prisma = this.getPrisma();
    const { page = 1, limit = 20, status, bankAccountId } = options;

    const where = { tenant_id: tenantId };
    if (status) where.status = status;
    if (bankAccountId) where.bank_account_id = bankAccountId;

    const [statements, total] = await Promise.all([
      prisma.bank_statements.findMany({
        where,
        include: { template: { select: { bank_name: true } } },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.bank_statements.count({ where })
    ]);

    return { statements, total, page, limit };
  }

  /**
   * Get statement lines with virtual scrolling support
   */
  async getStatementLines(statementId, tenantId, options = {}) {
    const prisma = this.getPrisma();
    const { offset = 0, limit = 100, status, isCredit } = options;

    // Verify access
    const statement = await prisma.bank_statements.findFirst({
      where: { id: statementId, tenant_id: tenantId }
    });

    if (!statement) {
      throw new Error('Statement not found');
    }

    const where = { statement_id: statementId };
    if (status) where.status = status;
    if (isCredit !== undefined) where.is_credit = isCredit;

    const [lines, total] = await Promise.all([
      prisma.bank_statement_lines.findMany({
        where,
        orderBy: { line_number: 'asc' },
        skip: offset,
        take: limit,
        include: {
          matches: {
            where: { is_active: true },
            include: { settlement: { select: { id: true, utr: true, total_amount: true } } }
          }
        }
      }),
      prisma.bank_statement_lines.count({ where })
    ]);

    return { lines, total, offset, limit };
  }

  /**
   * Get unreconciled settlements for matching UI
   */
  async getUnreconciledSettlements(tenantId, options = {}) {
    const prisma = this.getPrisma();
    const { page = 1, limit = 50, dateFrom, dateTo, minAmount, maxAmount } = options;

    const where = {
      tenant_id: tenantId,
      status: 'PAID',
      is_reconciled: false
    };

    if (dateFrom) where.payment_date = { ...where.payment_date, gte: new Date(dateFrom) };
    if (dateTo) where.payment_date = { ...where.payment_date, lte: new Date(dateTo) };
    if (minAmount) where.total_amount = { ...where.total_amount, gte: minAmount };
    if (maxAmount) where.total_amount = { ...where.total_amount, lte: maxAmount };

    const [settlements, total] = await Promise.all([
      prisma.settlements.findMany({
        where,
        select: {
          id: true,
          utr: true,
          total_amount: true,
          payment_date: true,
          payment_requests: {
            select: { vendor_name: true, amount: true }
          }
        },
        orderBy: { payment_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.settlements.count({ where })
    ]);

    return { settlements, total, page, limit };
  }

  /**
   * Get reconciliation batches
   */
  async getBatches(tenantId, options = {}) {
    const prisma = this.getPrisma();
    const { page = 1, limit = 20, status } = options;

    const where = { tenant_id: tenantId };
    if (status) where.status = status;

    const [batches, total] = await Promise.all([
      prisma.reconciliation_batches.findMany({
        where,
        include: {
          statement: { select: { original_filename: true, total_rows: true } },
          _count: {
            select: {
              matches: { where: { is_active: true } },
              exceptions: { where: { is_resolved: false } }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.reconciliation_batches.count({ where })
    ]);

    return { batches, total, page, limit };
  }

  // ==========================================================================
  // AUDIT LOGGING
  // ==========================================================================

  /**
   * Log audit action
   */
  async logAudit(action, details) {
    const prisma = this.getPrisma();

    try {
      await prisma.reconciliation_audit_log.create({
        data: {
          id: crypto.randomUUID(),
          action: action,
          entity_type: this.getEntityType(action),
          entity_id: details.templateId || details.statementId || details.batchId || details.matchId || details.exceptionId || null,
          actor_id: details.actor?.id || null,
          tenant_id: details.actor?.tenant_id || null,
          details: JSON.stringify(details),
          ip_address: details.actor?.ip_address || null
        }
      });
    } catch (error) {
      console.error('[BankReconciliation] Audit log failed:', error.message);
    }
  }

  /**
   * Get entity type from action
   */
  getEntityType(action) {
    if (action.includes('TEMPLATE')) return 'TEMPLATE';
    if (action.includes('STATEMENT')) return 'STATEMENT';
    if (action.includes('BATCH')) return 'BATCH';
    if (action.includes('MATCH')) return 'MATCH';
    if (action.includes('EXCEPTION')) return 'EXCEPTION';
    return 'OTHER';
  }

  /**
   * Get audit log for entity
   */
  async getAuditLog(entityType, entityId, tenantId) {
    const prisma = this.getPrisma();

    return prisma.reconciliation_audit_log.findMany({
      where: {
        entity_type: entityType,
        entity_id: entityId,
        tenant_id: tenantId
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });
  }
}

// Export singleton instance
const bankReconciliationService = new BankReconciliationService();

module.exports = {
  bankReconciliationService,
  BankReconciliationService,
  StatementStatus,
  LineStatus,
  BatchStatus,
  MatchType,
  MatchConfidence,
  ExceptionType,
  AuditActions,
  ReconciliationRoles
};
