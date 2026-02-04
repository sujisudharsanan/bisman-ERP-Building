#!/usr/bin/env node

/**
 * UUID Audit Scanner
 * 
 * Scans the codebase for legacy integer ID usage patterns.
 * Fails CI if legacy patterns are found after migration deadline.
 * 
 * Usage:
 *   node scripts/uuid-migration/uuid-audit-scanner.js [--strict] [--fix-suggestions]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns that indicate legacy integer ID usage
const LEGACY_PATTERNS = [
  // Direct legacy_id references (after migration, these should be removed)
  {
    pattern: /\.legacy_id\b/g,
    severity: 'warning',
    message: 'Reference to legacy_id - should use UUID id instead',
    allowedFiles: ['uuid-migration/', 'migration_', 'prisma/schema.prisma']
  },
  {
    pattern: /legacyId\b/g,
    severity: 'warning',
    message: 'Reference to legacyId - should use UUID id instead',
    allowedFiles: ['uuid-migration/', 'migration_']
  },
  
  // parseInt/Number on user IDs
  {
    pattern: /parseInt\s*\(\s*(req\.user\.|user\.|userId|user_id)/gi,
    severity: 'error',
    message: 'parseInt on user ID - IDs should be UUIDs (strings)',
    allowedFiles: []
  },
  {
    pattern: /Number\s*\(\s*(req\.user\.|user\.|userId|user_id)/gi,
    severity: 'error',
    message: 'Number() on user ID - IDs should be UUIDs (strings)',
    allowedFiles: []
  },
  
  // Type coercion to integer
  {
    pattern: /::INTEGER|::INT4|::BIGINT/gi,
    severity: 'warning',
    message: 'SQL cast to INTEGER - user IDs should be TEXT/UUID',
    allowedFiles: ['_seq', 'id_seq', 'serial']
  },
  
  // Legacy ID fallback patterns
  {
    pattern: /\|\|\s*req\.user\.legacy_id/g,
    severity: 'warning',
    message: 'Fallback to legacy_id - remove after migration',
    allowedFiles: []
  },
  {
    pattern: /legacy_id\s*\|\|/g,
    severity: 'warning',
    message: 'Legacy ID in OR chain - remove after migration',
    allowedFiles: []
  },
  
  // Integer ID in API routes
  {
    pattern: /\/:id\(\\d\+\)/g,
    severity: 'warning',
    message: 'Route param restricted to digits - should accept UUIDs',
    allowedFiles: []
  },
  
  // SQL with integer comparison
  {
    pattern: /user_id\s*=\s*\$\d+::integer/gi,
    severity: 'error',
    message: 'SQL comparing user_id as integer',
    allowedFiles: []
  },
  
  // Prisma integer ID queries
  {
    pattern: /where:\s*{\s*legacy_id:/g,
    severity: 'warning',
    message: 'Prisma query using legacy_id - use id (UUID) instead',
    allowedFiles: ['migration_']
  }
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.sql', '.prisma'];

// Directories to skip
const SKIP_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '__snapshots__'
];

class UUIDAuditScanner {
  constructor(options = {}) {
    this.strict = options.strict || false;
    this.showSuggestions = options.showSuggestions || false;
    this.findings = [];
    this.stats = {
      filesScanned: 0,
      errors: 0,
      warnings: 0
    };
  }

  scan(directory) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  UUID AUDIT SCANNER');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Scanning: ${directory}`);
    console.log(`Mode: ${this.strict ? 'STRICT (warnings = errors)' : 'NORMAL'}\n`);

    this.scanDirectory(directory);
    this.printReport();
    
    return this.getExitCode();
  }

  scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.includes(entry.name)) {
          this.scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SCAN_EXTENSIONS.includes(ext)) {
          this.scanFile(fullPath);
        }
      }
    }
  }

  scanFile(filePath) {
    this.stats.filesScanned++;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(process.cwd(), filePath);

    for (const { pattern, severity, message, allowedFiles } of LEGACY_PATTERNS) {
      // Check if file is in allowed list
      const isAllowed = allowedFiles.some(allowed => relativePath.includes(allowed));
      if (isAllowed) continue;

      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Find line number
        let charCount = 0;
        let lineNum = 0;
        for (let i = 0; i < lines.length; i++) {
          charCount += lines[i].length + 1; // +1 for newline
          if (charCount > match.index) {
            lineNum = i + 1;
            break;
          }
        }

        this.findings.push({
          file: relativePath,
          line: lineNum,
          severity: this.strict && severity === 'warning' ? 'error' : severity,
          message,
          match: match[0],
          context: lines[lineNum - 1]?.trim().substring(0, 100)
        });

        if (severity === 'error' || (this.strict && severity === 'warning')) {
          this.stats.errors++;
        } else {
          this.stats.warnings++;
        }
      }
    }
  }

  printReport() {
    console.log('─────────────────────────────────────────────────────────────────');
    console.log('FINDINGS');
    console.log('─────────────────────────────────────────────────────────────────\n');

    if (this.findings.length === 0) {
      console.log('  ✅ No legacy ID patterns found!\n');
    } else {
      // Group by file
      const byFile = {};
      for (const finding of this.findings) {
        if (!byFile[finding.file]) {
          byFile[finding.file] = [];
        }
        byFile[finding.file].push(finding);
      }

      for (const [file, findings] of Object.entries(byFile)) {
        console.log(`\n📄 ${file}`);
        for (const f of findings) {
          const icon = f.severity === 'error' ? '❌' : '⚠️';
          console.log(`   ${icon} Line ${f.line}: ${f.message}`);
          console.log(`      Found: "${f.match}"`);
          if (f.context) {
            console.log(`      Context: ${f.context}`);
          }
        }
      }
    }

    // Print suggestions
    if (this.showSuggestions && this.findings.length > 0) {
      console.log('\n─────────────────────────────────────────────────────────────────');
      console.log('FIX SUGGESTIONS');
      console.log('─────────────────────────────────────────────────────────────────\n');
      
      console.log('1. Replace legacy_id references with id (UUID):');
      console.log('   Before: const userId = req.user.legacy_id || req.user.id;');
      console.log('   After:  const userId = req.user.id;\n');
      
      console.log('2. Remove parseInt/Number on user IDs:');
      console.log('   Before: const userId = parseInt(req.user.id);');
      console.log('   After:  const userId = req.user.id;\n');
      
      console.log('3. Update SQL casts:');
      console.log('   Before: user_id::INTEGER');
      console.log('   After:  user_id (no cast, TEXT/UUID)\n');
      
      console.log('4. Update Prisma queries:');
      console.log('   Before: where: { legacy_id: userId }');
      console.log('   After:  where: { id: userId }\n');
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  AUDIT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Files scanned: ${this.stats.filesScanned}`);
    console.log(`  Errors: ${this.stats.errors}`);
    console.log(`  Warnings: ${this.stats.warnings}`);
    console.log(`  Total findings: ${this.findings.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  }

  getExitCode() {
    return this.stats.errors > 0 ? 1 : 0;
  }

  getReport() {
    return {
      findings: this.findings,
      stats: this.stats
    };
  }
}

// Database audit
async function auditDatabase() {
  const { Pool } = require('pg');
  
  const CONNECTION_STRING = process.env.DATABASE_URL || 
    'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

  const pool = new Pool({ connectionString: CONNECTION_STRING });
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  DATABASE AUDIT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Check for remaining INTEGER user columns
    const intCols = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type = 'integer'
        AND (
          column_name = 'user_id'
          OR column_name LIKE '%_by'
          OR column_name LIKE '%_user_id'
        )
        AND table_name NOT LIKE '%_p20%'
        AND table_name NOT LIKE '%_p_default'
      ORDER BY table_name
      LIMIT 20
    `);

    if (intCols.rows.length > 0) {
      console.log('⚠️  INTEGER user-related columns still exist:\n');
      console.table(intCols.rows);
    } else {
      console.log('✅ No INTEGER user-related columns found!\n');
    }

    // Check for integer values in TEXT columns
    const tables = ['audit_logs', 'security_access_log', 'error_logs'];
    for (const table of tables) {
      try {
        const intValues = await pool.query(`
          SELECT COUNT(*) as cnt
          FROM "${table}"
          WHERE user_id IS NOT NULL
            AND user_id ~ '^[0-9]+$'
        `);
        
        if (intValues.rows[0].cnt > 0) {
          console.log(`⚠️  ${table}: ${intValues.rows[0].cnt} rows with integer user_id values`);
        } else {
          console.log(`✅ ${table}: No integer values in user_id`);
        }
      } catch (e) {
        // Table might not exist
      }
    }

  } catch (error) {
    console.error('Database audit error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run scanner
if (require.main === module) {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const showSuggestions = args.includes('--fix-suggestions');
  const includeDb = args.includes('--database');
  
  const scanner = new UUIDAuditScanner({ strict, showSuggestions });
  const scanDir = path.resolve(process.cwd(), 'my-backend');
  
  const exitCode = scanner.scan(scanDir);
  
  if (includeDb) {
    auditDatabase().then(() => {
      process.exit(exitCode);
    });
  } else {
    process.exit(exitCode);
  }
}

module.exports = { UUIDAuditScanner };
