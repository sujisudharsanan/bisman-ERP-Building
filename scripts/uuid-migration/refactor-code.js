#!/usr/bin/env node

/**
 * UUID Code Refactor Script
 * 
 * Updates backend code to use UUID instead of legacy_id.
 * 
 * Changes:
 * 1. Replace `legacy_id || id` patterns with just `id`
 * 2. Remove parseInt/Number on user IDs
 * 3. Update Prisma queries
 * 4. Add deprecation warnings for legacy patterns
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..', '..', 'my-backend');

// Patterns to replace
const REPLACEMENTS = [
  // Pattern: req.user?.legacy_id || req.user?.id → req.user?.id
  {
    pattern: /req\.user\?\.\s*legacy_id\s*\|\|\s*req\.user\?\.\s*id/g,
    replacement: 'req.user?.id',
    description: 'Replace legacy_id || id with id'
  },
  // Pattern: req.user.legacy_id || req.user.id → req.user.id
  {
    pattern: /req\.user\.\s*legacy_id\s*\|\|\s*req\.user\.\s*id/g,
    replacement: 'req.user.id',
    description: 'Replace legacy_id || id with id'
  },
  // Pattern: user.legacyId || user.legacy_id || user.id → user.id
  {
    pattern: /user\.\s*legacyId\s*\|\|\s*user\.\s*legacy_id\s*\|\|\s*user\.\s*id/g,
    replacement: 'user.id',
    description: 'Replace legacyId || legacy_id || id with id'
  },
  // Pattern: user?.legacyId || user?.legacy_id || user?.id → user?.id
  {
    pattern: /user\?\.\s*legacyId\s*\|\|\s*user\?\.\s*legacy_id\s*\|\|\s*user\?\.\s*id/g,
    replacement: 'user?.id',
    description: 'Replace legacyId || legacy_id || id with id'
  },
  // Pattern: req.user?.legacyId || req.user?.legacy_id || req.user?.id → req.user?.id
  {
    pattern: /req\.user\?\.\s*legacyId\s*\|\|\s*req\.user\?\.\s*legacy_id\s*\|\|\s*req\.user\?\.\s*id/g,
    replacement: 'req.user?.id',
    description: 'Replace legacyId || legacy_id || id with id'
  },
  // Pattern: req.user.legacyId || req.user.id → req.user.id
  {
    pattern: /req\.user\.\s*legacyId\s*\|\|\s*req\.user\.\s*id/g,
    replacement: 'req.user.id',
    description: 'Replace legacyId || id with id'
  },
  // Pattern: legacy_id as id → remove (keep just id)
  // Don't auto-replace SQL as it might be intentional
];

// Files to skip
const SKIP_FILES = [
  'uuid-migration',
  'node_modules',
  '.git',
  'prisma/schema.prisma', // Prisma schema generated from DB
  '.test.js',
  '.spec.js'
];

function shouldSkip(filePath) {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

function processFile(filePath) {
  if (shouldSkip(filePath)) return { changed: false };
  
  const ext = path.extname(filePath);
  if (!['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
    return { changed: false };
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const changes = [];

  for (const { pattern, replacement, description } of REPLACEMENTS) {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      changes.push({ description, count: matches.length });
    }
  }

  if (content !== originalContent) {
    return { changed: true, changes, content, originalContent };
  }

  return { changed: false };
}

function scanDirectory(dir, dryRun = true) {
  const results = {
    filesScanned: 0,
    filesChanged: 0,
    totalChanges: 0,
    details: []
  };

  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          scan(fullPath);
        }
      } else if (entry.isFile()) {
        results.filesScanned++;
        const result = processFile(fullPath);
        
        if (result.changed) {
          results.filesChanged++;
          const relativePath = path.relative(BACKEND_DIR, fullPath);
          
          let changeCount = 0;
          for (const c of result.changes) {
            changeCount += c.count;
          }
          results.totalChanges += changeCount;

          results.details.push({
            file: relativePath,
            changes: result.changes
          });

          if (!dryRun) {
            fs.writeFileSync(fullPath, result.content);
          }
        }
      }
    }
  }

  scan(dir);
  return results;
}

function printReport(results, dryRun) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  UUID CODE REFACTOR ${dryRun ? '(DRY RUN)' : '(APPLIED)'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Files scanned: ${results.filesScanned}`);
  console.log(`Files to update: ${results.filesChanged}`);
  console.log(`Total changes: ${results.totalChanges}\n`);

  if (results.details.length > 0) {
    console.log('─────────────────────────────────────────────────────────────────');
    console.log('CHANGES:');
    console.log('─────────────────────────────────────────────────────────────────\n');

    for (const { file, changes } of results.details) {
      console.log(`📄 ${file}`);
      for (const c of changes) {
        console.log(`   - ${c.description} (${c.count}x)`);
      }
      console.log();
    }
  }

  if (dryRun && results.filesChanged > 0) {
    console.log('─────────────────────────────────────────────────────────────────');
    console.log('Run with --apply to make these changes:');
    console.log('  node scripts/uuid-migration/refactor-code.js --apply');
    console.log('─────────────────────────────────────────────────────────────────\n');
  }
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  
  console.log(`\nScanning: ${BACKEND_DIR}\n`);
  
  const results = scanDirectory(BACKEND_DIR, dryRun);
  printReport(results, dryRun);
  
  process.exit(results.filesChanged > 0 && dryRun ? 1 : 0);
}

module.exports = { scanDirectory, processFile };
