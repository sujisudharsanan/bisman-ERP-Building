#!/usr/bin/env node

/**
 * 🚀 QUICK CODEBASE AUDIT - Optimized Version
 * Focuses on critical issues without slow file-by-file reference checking
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
  rootDir: __dirname,
  ignorePaths: [
    'node_modules', '.next', 'dist', 'build', 'coverage',
    'prisma/migrations', '.git', '.vscode', 'out', 'tmp',
  ],
  codeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
  docExtensions: ['.md', '.txt'],
  dumpExtensions: ['.log', '.sql', '.dump', '.bak', '.csv', '.zip', '.tar', '.tmp', '.swp'],
};

const results = {
  incompleteCode: [],
  duplicateFiles: [],
  unusedDocuments: [],
  dumpFiles: [],
  statistics: { totalFiles: 0, codeFiles: 0, docFiles: 0 },
};

function shouldIgnore(filePath) {
  return CONFIG.ignorePaths.some(ignorePath => filePath.includes(ignorePath));
}

function getAllFiles(dirPath, fileList = []) {
  if (shouldIgnore(dirPath)) return fileList;
  try {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      if (shouldIgnore(filePath)) return;
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          getAllFiles(filePath, fileList);
        } else {
          fileList.push(filePath);
          results.statistics.totalFiles++;
        }
      } catch (err) {}
    });
  } catch (err) {}
  return fileList;
}

function auditIncompleteCode(files) {
  console.log('\n🔍 Auditing Incomplete/Unfinished Code...');
  const codeFiles = files.filter(file => CONFIG.codeExtensions.some(ext => file.endsWith(ext)));
  results.statistics.codeFiles = codeFiles.length;

  const patterns = {
    todos: /TODO|FIXME|PENDING|INCOMPLETE|XXX|HACK/gi,
    debug: /console\.(log|warn|error|debug)\(|debugger;?/g,
  };

  codeFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const relativePath = path.relative(CONFIG.rootDir, filePath);

      // Check for TODO/FIXME
      lines.forEach((line, index) => {
        if (patterns.todos.test(line)) {
          results.incompleteCode.push({
            file: relativePath,
            line: index + 1,
            type: 'Incomplete Marker',
            description: line.trim().substring(0, 80),
            suggestion: 'Complete or remove',
          });
        }
      });

      // Check for debug statements
      let match;
      while ((match = patterns.debug.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        results.incompleteCode.push({
          file: relativePath,
          line: lineNumber,
          type: 'Debug Statement',
          description: match[0],
          suggestion: 'Remove before production',
        });
      }
    } catch (err) {}
  });

  console.log(`✅ Found ${results.incompleteCode.length} issues`);
}

function auditDuplicateFiles(files) {
  console.log('\n🔍 Auditing Duplicate Files (exact matches only)...');
  const codeFiles = files.filter(file => CONFIG.codeExtensions.some(ext => file.endsWith(ext)));
  const fileHashes = new Map();

  codeFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.trim().length > 100) {
        const hash = crypto.createHash('md5').update(content).digest('hex');
        if (!fileHashes.has(hash)) fileHashes.set(hash, []);
        fileHashes.get(hash).push(filePath);
      }
    } catch (err) {}
  });

  fileHashes.forEach((paths, hash) => {
    if (paths.length > 1) {
      for (let i = 0; i < paths.length - 1; i++) {
        results.duplicateFiles.push({
          file1: path.relative(CONFIG.rootDir, paths[i]),
          file2: path.relative(CONFIG.rootDir, paths[i + 1]),
          similarity: 100,
          action: 'Exact duplicate - remove one',
        });
      }
    }
  });

  console.log(`✅ Found ${results.duplicateFiles.length} duplicates`);
}

function auditDocuments(files) {
  console.log('\n🔍 Auditing Documents (simple check)...');
  const docFiles = files.filter(file => CONFIG.docExtensions.some(ext => file.endsWith(ext)));
  results.statistics.docFiles = docFiles.length;

  docFiles.forEach(docPath => {
    const fileName = path.basename(docPath);
    // Skip important docs
    if (['README.md', 'CHANGELOG.md', 'LICENSE'].some(imp => fileName.includes(imp))) return;
    
    // Flag old/archived docs
    if (fileName.includes('OLD') || fileName.includes('BACKUP') || fileName.includes('ARCHIVE')) {
      results.unusedDocuments.push({
        file: path.relative(CONFIG.rootDir, docPath),
        reason: 'Contains OLD/BACKUP/ARCHIVE in name',
        action: 'Review and delete if obsolete',
      });
    }
  });

  console.log(`✅ Found ${results.unusedDocuments.length} potentially unused docs`);
}

function auditDumpFiles(files) {
  console.log('\n🔍 Auditing Dump/Log Files...');
  
  files.forEach(filePath => {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    if (CONFIG.dumpExtensions.includes(ext) || 
        fileName.includes('.backup') || 
        fileName.includes('.old') ||
        fileName.includes('dump')) {
      
      results.dumpFiles.push({
        file: path.relative(CONFIG.rootDir, filePath),
        type: 'Dump/Log/Backup',
        action: 'Delete - temporary file',
      });
    }
  });

  console.log(`✅ Found ${results.dumpFiles.length} dump files`);
}

function generateReport() {
  console.log('\n📝 Generating Report...');
  
  let report = `# 🔍 CODEBASE AUDIT REPORT

**Generated:** ${new Date().toLocaleString()}  
**Project:** Full-Stack TypeScript + JavaScript ERP System  
**Tech Stack:** Next.js + Express.js + PostgreSQL + Prisma ORM  

---

## 📊 EXECUTIVE SUMMARY

| Category | Count | Status |
|----------|-------|--------|
| 📁 Total Files Scanned | ${results.statistics.totalFiles} | ✅ |
| 💻 Code Files | ${results.statistics.codeFiles} | ✅ |
| 📄 Documents | ${results.statistics.docFiles} | ✅ |
| ⚠️ Incomplete Code | ${results.incompleteCode.length} | ${results.incompleteCode.length > 50 ? '🔴' : results.incompleteCode.length > 10 ? '🟡' : '✅'} |
| 🌀 Exact Duplicates | ${results.duplicateFiles.length} | ${results.duplicateFiles.length > 0 ? '🟡' : '✅'} |
| 🗑️ Unused Docs | ${results.unusedDocuments.length} | ${results.unusedDocuments.length > 0 ? '🟡' : '✅'} |
| 🗂️ Dump Files | ${results.dumpFiles.length} | ${results.dumpFiles.length > 0 ? '🔴' : '✅'} |

---

## ⚠️ 1. INCOMPLETE / UNFINISHED CODE

${results.incompleteCode.length === 0 ? '✅ **No issues found!**' : `
Found **${results.incompleteCode.length}** issues:

| File | Line | Type | Description | Fix |
|------|------|------|-------------|-----|
${results.incompleteCode.slice(0, 100).map(i => 
  `| \`${i.file}\` | ${i.line} | ${i.type} | ${i.description.replace(/\|/g, '\\|')} | ${i.suggestion} |`
).join('\n')}

${results.incompleteCode.length > 100 ? `\n*Showing first 100 of ${results.incompleteCode.length} issues*` : ''}
`}

---

## 🌀 2. DUPLICATE FILES (Exact Matches)

${results.duplicateFiles.length === 0 ? '✅ **No duplicates!**' : `
Found **${results.duplicateFiles.length}** exact duplicates:

| File 1 | File 2 | Similarity | Action |
|--------|--------|------------|--------|
${results.duplicateFiles.map(d => 
  `| \`${d.file1}\` | \`${d.file2}\` | ${d.similarity}% | ${d.action} |`
).join('\n')}
`}

---

## 🗑️ 3. POTENTIALLY UNUSED DOCUMENTS

${results.unusedDocuments.length === 0 ? '✅ **All clean!**' : `
Found **${results.unusedDocuments.length}** documents:

| File | Reason | Action |
|------|--------|--------|
${results.unusedDocuments.map(d => 
  `| \`${d.file}\` | ${d.reason} | ${d.action} |`
).join('\n')}
`}

---

## 🗂️ 4. DUMP / LOG / BACKUP FILES

${results.dumpFiles.length === 0 ? '✅ **No dump files!**' : `
Found **${results.dumpFiles.length}** files to clean:

| File | Type | Action |
|------|------|--------|
${results.dumpFiles.map(d => 
  `| \`${d.file}\` | ${d.type} | ${d.action} |`
).join('\n')}
`}

---

## 🎯 TOP PRIORITY ACTIONS

${getPriorityActions()}

---

## 📋 CLEANUP COMMANDS

\`\`\`bash
# Remove dump/log files
${results.dumpFiles.slice(0, 10).map(d => `rm "${d.file}"`).join('\n')}

# Check for unused npm dependencies
cd my-frontend && npx depcheck
cd my-backend && npx depcheck
\`\`\`

---

**✅ Audit Complete!**  
*Review priorities and clean up your codebase.*

`;

  return report;
}

function getPriorityActions() {
  const actions = [];
  const debugCount = results.incompleteCode.filter(i => i.type === 'Debug Statement').length;
  
  if (debugCount > 20) actions.push(`🔴 **CRITICAL:** Remove ${debugCount} debug statements (console.log, debugger)`);
  if (results.dumpFiles.length > 10) actions.push(`🔴 **CRITICAL:** Delete ${results.dumpFiles.length} dump/backup/log files`);
  if (results.duplicateFiles.length > 5) actions.push(`🟡 **IMPORTANT:** Merge or remove ${results.duplicateFiles.length} duplicate files`);
  if (results.incompleteCode.filter(i => i.type === 'Incomplete Marker').length > 20) {
    actions.push(`🟡 **IMPORTANT:** Complete ${results.incompleteCode.filter(i => i.type === 'Incomplete Marker').length} TODO/FIXME markers`);
  }
  if (results.unusedDocuments.length > 5) actions.push(`🟢 **OPTIONAL:** Archive ${results.unusedDocuments.length} old documents`);
  
  return actions.length > 0 ? actions.map((a, i) => `${i + 1}. ${a}`).join('\n') : '✅ **Excellent!** Codebase is clean.';
}

async function runAudit() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 QUICK CODEBASE AUDIT                                       ║');
  console.log('║  Full-Stack TypeScript + JavaScript ERP                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  
  console.log('\n📁 Scanning files...');
  const allFiles = getAllFiles(CONFIG.rootDir);
  console.log(`✅ Found ${allFiles.length} files`);
  
  auditIncompleteCode(allFiles);
  auditDuplicateFiles(allFiles);
  auditDocuments(allFiles);
  auditDumpFiles(allFiles);
  
  const report = generateReport();
  const reportPath = path.join(CONFIG.rootDir, 'CODEBASE_AUDIT_REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ AUDIT COMPLETE!                                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n📄 Report: ${reportPath}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`\n📊 Quick Summary:`);
  console.log(`   ⚠️  Incomplete Code: ${results.incompleteCode.length}`);
  console.log(`   🌀 Duplicates: ${results.duplicateFiles.length}`);
  console.log(`   🗑️  Unused Docs: ${results.unusedDocuments.length}`);
  console.log(`   🗂️  Dump Files: ${results.dumpFiles.length}`);
  console.log(`\n🎯 Open CODEBASE_AUDIT_REPORT.md in VS Code!\n`);
}

runAudit().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
