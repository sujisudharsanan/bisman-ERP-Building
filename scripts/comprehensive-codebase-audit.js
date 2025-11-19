#!/usr/bin/env node

/**
 * 🔍 COMPREHENSIVE CODEBASE AUDIT SYSTEM
 * 
 * Senior Code Auditor for Full-Stack TypeScript + JavaScript ERP System
 * Framework: Next.js (Frontend) + Express.js (Backend)
 * 
 * This script performs a deep analysis of the entire project:
 * - Incomplete/Unfinished Code
 * - Duplicate/Redundant Files
 * - Useless/Unreferenced Documents
 * - Dump/Log/Unused Assets
 * - Unused Imports & Dependencies
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 🎯 Configuration
const CONFIG = {
  rootDir: __dirname,
  ignorePaths: [
    'node_modules',
    '.next',
    'dist',
    'build',
    'coverage',
    'prisma/migrations',
    '.git',
    '.vscode',
    'out',
    'tmp',
  ],
  codeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
  docExtensions: ['.md', '.txt', '.pdf', '.docx', '.doc'],
  dumpExtensions: ['.log', '.sql', '.dump', '.bak', '.csv', '.zip', '.tar', '.tmp', '.swp', '.swo'],
  imageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'],
  incompletePatterns: [
    /TODO/gi,
    /FIXME/gi,
    /PENDING/gi,
    /INCOMPLETE/gi,
    /XXX/gi,
    /HACK/gi,
    /NOTE:/gi,
    /BUG:/gi,
  ],
  debugPatterns: [
    /console\.log\(/g,
    /console\.warn\(/g,
    /console\.error\(/g,
    /console\.debug\(/g,
    /debugger;?/g,
  ],
};

// 📊 Audit Results Storage
const auditResults = {
  incompleteCode: [],
  duplicateFiles: [],
  unusedDocuments: [],
  dumpFiles: [],
  unusedImports: [],
  statistics: {
    totalFiles: 0,
    codeFiles: 0,
    docFiles: 0,
    assetFiles: 0,
  },
};

// 🛠️ Utility Functions

/**
 * Check if path should be ignored
 */
function shouldIgnore(filePath) {
  return CONFIG.ignorePaths.some(ignorePath => 
    filePath.includes(ignorePath)
  );
}

/**
 * Get all files recursively
 */
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
          auditResults.statistics.totalFiles++;
        }
      } catch (err) {
        console.warn(`⚠️ Cannot access: ${filePath}`);
      }
    });
  } catch (err) {
    console.warn(`⚠️ Cannot read directory: ${dirPath}`);
  }

  return fileList;
}

/**
 * Calculate file hash for duplicate detection
 */
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (err) {
    return null;
  }
}

/**
 * Calculate content similarity
 */
function calculateSimilarity(content1, content2) {
  const lines1 = content1.split('\n').filter(line => line.trim());
  const lines2 = content2.split('\n').filter(line => line.trim());
  
  const commonLines = lines1.filter(line => lines2.includes(line));
  const similarity = (commonLines.length / Math.max(lines1.length, lines2.length)) * 100;
  
  return Math.round(similarity);
}

/**
 * Check if file is referenced in codebase
 */
function isFileReferenced(fileName, allFiles) {
  const baseName = path.basename(fileName, path.extname(fileName));
  const references = allFiles.filter(file => {
    if (file === fileName) return false;
    try {
      const content = fs.readFileSync(file, 'utf8');
      return content.includes(baseName) || content.includes(path.basename(fileName));
    } catch {
      return false;
    }
  });
  return references.length > 0;
}

// 🧩 Audit Functions

/**
 * 1. Audit Incomplete/Unfinished Code
 */
function auditIncompleteCode(files) {
  console.log('\n🔍 Auditing Incomplete/Unfinished Code...');
  
  const codeFiles = files.filter(file => 
    CONFIG.codeExtensions.some(ext => file.endsWith(ext))
  );
  
  auditResults.statistics.codeFiles = codeFiles.length;

  codeFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const relativePath = path.relative(CONFIG.rootDir, filePath);

      // Check for incomplete patterns
      CONFIG.incompletePatterns.forEach(pattern => {
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            auditResults.incompleteCode.push({
              file: relativePath,
              line: index + 1,
              type: 'Incomplete Marker',
              description: line.trim().substring(0, 100),
              suggestion: 'Complete the implementation or remove the marker',
            });
          }
        });
      });

      // Check for debug statements
      CONFIG.debugPatterns.forEach(pattern => {
        let match;
        const globalPattern = new RegExp(pattern.source, 'g');
        while ((match = globalPattern.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          auditResults.incompleteCode.push({
            file: relativePath,
            line: lineNumber,
            type: 'Debug Statement',
            description: match[0],
            suggestion: 'Remove debug statement before production',
          });
        }
      });

      // Check for empty functions
      const emptyFunctionPattern = /function\s+\w+\s*\([^)]*\)\s*{\s*}/g;
      let match;
      while ((match = emptyFunctionPattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        auditResults.incompleteCode.push({
          file: relativePath,
          line: lineNumber,
          type: 'Empty Function',
          description: match[0].substring(0, 50),
          suggestion: 'Implement function logic or remove if unused',
        });
      }

      // Check for commented code blocks (>3 consecutive commented lines)
      let commentedBlock = 0;
      let blockStartLine = 0;
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') && trimmed.length > 5) {
          if (commentedBlock === 0) blockStartLine = index + 1;
          commentedBlock++;
        } else {
          if (commentedBlock >= 3) {
            auditResults.incompleteCode.push({
              file: relativePath,
              line: blockStartLine,
              type: 'Commented Code Block',
              description: `${commentedBlock} lines of commented code`,
              suggestion: 'Remove commented code or uncomment if needed',
            });
          }
          commentedBlock = 0;
        }
      });

    } catch (err) {
      console.warn(`⚠️ Cannot read: ${filePath}`);
    }
  });

  console.log(`✅ Found ${auditResults.incompleteCode.length} incomplete code issues`);
}

/**
 * 2. Audit Duplicate/Redundant Files
 */
function auditDuplicateFiles(files) {
  console.log('\n🔍 Auditing Duplicate/Redundant Files...');
  
  const codeFiles = files.filter(file => 
    CONFIG.codeExtensions.some(ext => file.endsWith(ext))
  );

  const fileContents = new Map();
  const fileHashes = new Map();

  // Build hash map
  codeFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.trim().length > 100) { // Skip very small files
        const hash = getFileHash(filePath);
        if (hash) {
          if (!fileHashes.has(hash)) {
            fileHashes.set(hash, []);
          }
          fileHashes.get(hash).push(filePath);
          fileContents.set(filePath, content);
        }
      }
    } catch (err) {
      // Skip unreadable files
    }
  });

  // Find exact duplicates
  fileHashes.forEach((paths, hash) => {
    if (paths.length > 1) {
      for (let i = 0; i < paths.length - 1; i++) {
        auditResults.duplicateFiles.push({
          file1: path.relative(CONFIG.rootDir, paths[i]),
          file2: path.relative(CONFIG.rootDir, paths[i + 1]),
          similarity: 100,
          action: 'Exact duplicate - remove one and update imports',
        });
      }
    }
  });

  // Find similar files (90%+ similarity)
  const checkedPairs = new Set();
  codeFiles.forEach((file1, index) => {
    if (index % 10 === 0) {
      process.stdout.write(`\r  Checking similarity... ${Math.round((index / codeFiles.length) * 100)}%`);
    }

    for (let i = index + 1; i < codeFiles.length; i++) {
      const file2 = codeFiles[i];
      const pairKey = [file1, file2].sort().join('|');
      
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      if (path.basename(file1) === path.basename(file2) && 
          fileContents.has(file1) && fileContents.has(file2)) {
        
        const content1 = fileContents.get(file1);
        const content2 = fileContents.get(file2);
        const similarity = calculateSimilarity(content1, content2);

        if (similarity >= 90 && similarity < 100) {
          auditResults.duplicateFiles.push({
            file1: path.relative(CONFIG.rootDir, file1),
            file2: path.relative(CONFIG.rootDir, file2),
            similarity: similarity,
            action: 'High similarity - merge or remove duplicate',
          });
        }
      }
    }
  });

  console.log(`\n✅ Found ${auditResults.duplicateFiles.length} duplicate/similar files`);
}

/**
 * 3. Audit Useless/Unreferenced Documents
 */
function auditUnusedDocuments(files) {
  console.log('\n🔍 Auditing Unreferenced Documents...');
  
  const docFiles = files.filter(file => 
    CONFIG.docExtensions.some(ext => file.endsWith(ext))
  );
  
  auditResults.statistics.docFiles = docFiles.length;

  docFiles.forEach(docPath => {
    try {
      const isReferenced = isFileReferenced(docPath, files);
      const stats = fs.statSync(docPath);
      const fileName = path.basename(docPath);
      
      // Skip important docs
      if (['README.md', 'CHANGELOG.md', 'LICENSE', 'package.json'].includes(fileName)) {
        return;
      }

      if (!isReferenced) {
        auditResults.unusedDocuments.push({
          file: path.relative(CONFIG.rootDir, docPath),
          reason: 'Not referenced in any code or documentation',
          lastModified: stats.mtime.toISOString().split('T')[0],
          action: 'Review and archive or delete if obsolete',
        });
      }
    } catch (err) {
      console.warn(`⚠️ Cannot stat: ${docPath}`);
    }
  });

  console.log(`✅ Found ${auditResults.unusedDocuments.length} unreferenced documents`);
}

/**
 * 4. Audit Dump/Log/Unused Assets
 */
function auditDumpFiles(files) {
  console.log('\n🔍 Auditing Dump/Log/Unused Assets...');
  
  files.forEach(filePath => {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    // Check for dump/log files
    if (CONFIG.dumpExtensions.includes(ext) || 
        fileName.includes('.backup') || 
        fileName.includes('.old') ||
        fileName.includes('dump')) {
      
      auditResults.dumpFiles.push({
        file: path.relative(CONFIG.rootDir, filePath),
        type: 'Dump/Log/Backup',
        location: path.dirname(path.relative(CONFIG.rootDir, filePath)),
        action: 'Delete - temporary or generated file',
      });
    }

    // Check for unused images in public folder
    if (CONFIG.imageExtensions.includes(ext) && filePath.includes('/public')) {
      const isReferenced = isFileReferenced(filePath, files);
      if (!isReferenced) {
        auditResults.dumpFiles.push({
          file: path.relative(CONFIG.rootDir, filePath),
          type: 'Unused Asset',
          location: 'public folder',
          action: 'Review and remove if not used',
        });
      }
    }
  });

  console.log(`✅ Found ${auditResults.dumpFiles.length} dump/unused files`);
}

/**
 * 5. Audit Unused Imports
 */
function auditUnusedImports(files) {
  console.log('\n🔍 Auditing Unused Imports...');
  
  const codeFiles = files.filter(file => 
    CONFIG.codeExtensions.some(ext => file.endsWith(ext))
  );

  codeFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(CONFIG.rootDir, filePath);
      
      // Match import statements
      const importPattern = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importPattern.exec(content)) !== null) {
        const namedImports = match[1] ? match[1].split(',').map(s => s.trim()) : [];
        const defaultImport = match[2];
        const allImports = [...namedImports, defaultImport].filter(Boolean);
        
        allImports.forEach(importName => {
          // Simple check: if import name only appears once (in import statement), it's unused
          const cleanName = importName.replace(/\s+as\s+\w+/, '').trim();
          const usagePattern = new RegExp(`\\b${cleanName}\\b`, 'g');
          const matches = content.match(usagePattern);
          
          if (matches && matches.length <= 1) {
            auditResults.unusedImports.push({
              file: relativePath,
              dependency: cleanName,
              status: 'Possibly Unused',
              action: 'Verify and remove if not used',
            });
          }
        });
      }
    } catch (err) {
      // Skip unreadable files
    }
  });

  console.log(`✅ Found ${auditResults.unusedImports.length} potentially unused imports`);
}

/**
 * 📊 Generate Markdown Report
 */
function generateReport() {
  console.log('\n📝 Generating Audit Report...');
  
  let report = `# 🔍 COMPREHENSIVE CODEBASE AUDIT REPORT

**Generated:** ${new Date().toLocaleString()}  
**Project:** Full-Stack TypeScript + JavaScript ERP System  
**Tech Stack:** Next.js (Frontend) + Express.js (Backend) + PostgreSQL  

---

## 📊 EXECUTIVE SUMMARY

| Category | Count | Status |
|----------|-------|--------|
| 📁 Total Files Scanned | ${auditResults.statistics.totalFiles} | ✅ Complete |
| 💻 Code Files | ${auditResults.statistics.codeFiles} | ✅ Analyzed |
| 📄 Document Files | ${auditResults.statistics.docFiles} | ✅ Reviewed |
| ⚠️ Incomplete Code Issues | ${auditResults.incompleteCode.length} | ${auditResults.incompleteCode.length > 0 ? '🔴 Action Needed' : '✅ Clean'} |
| 🌀 Duplicate Files | ${auditResults.duplicateFiles.length} | ${auditResults.duplicateFiles.length > 0 ? '🟡 Review Required' : '✅ Clean'} |
| 🗑️ Unused Documents | ${auditResults.unusedDocuments.length} | ${auditResults.unusedDocuments.length > 0 ? '🟡 Review Required' : '✅ Clean'} |
| 🗂️ Dump/Unused Files | ${auditResults.dumpFiles.length} | ${auditResults.dumpFiles.length > 0 ? '🔴 Cleanup Required' : '✅ Clean'} |
| 📦 Unused Imports | ${auditResults.unusedImports.length} | ${auditResults.unusedImports.length > 0 ? '🟡 Optimization Needed' : '✅ Clean'} |

---

## ⚠️ 1. INCOMPLETE / UNFINISHED CODE

${auditResults.incompleteCode.length === 0 ? '✅ **No incomplete code issues found!**' : `
Found **${auditResults.incompleteCode.length}** incomplete code issues:

| File Path | Line | Issue Type | Description | Suggested Fix |
|-----------|------|------------|-------------|---------------|
${auditResults.incompleteCode.slice(0, 50).map(issue => 
  `| \`${issue.file}\` | ${issue.line} | ${issue.type} | ${issue.description.replace(/\|/g, '\\|')} | ${issue.suggestion} |`
).join('\n')}

${auditResults.incompleteCode.length > 50 ? `\n*Showing first 50 of ${auditResults.incompleteCode.length} issues*\n` : ''}
`}

---

## 🌀 2. DUPLICATE / REDUNDANT FILES

${auditResults.duplicateFiles.length === 0 ? '✅ **No duplicate files found!**' : `
Found **${auditResults.duplicateFiles.length}** duplicate or similar files:

| File 1 | File 2 | % Similarity | Suggested Action |
|--------|--------|--------------|------------------|
${auditResults.duplicateFiles.slice(0, 30).map(dup => 
  `| \`${dup.file1}\` | \`${dup.file2}\` | ${dup.similarity}% | ${dup.action} |`
).join('\n')}

${auditResults.duplicateFiles.length > 30 ? `\n*Showing first 30 of ${auditResults.duplicateFiles.length} duplicates*\n` : ''}
`}

---

## 🗑️ 3. USELESS / UNREFERENCED DOCUMENTS

${auditResults.unusedDocuments.length === 0 ? '✅ **No unreferenced documents found!**' : `
Found **${auditResults.unusedDocuments.length}** unreferenced documents:

| File Path | Reason | Last Modified | Suggested Action |
|-----------|--------|---------------|------------------|
${auditResults.unusedDocuments.slice(0, 30).map(doc => 
  `| \`${doc.file}\` | ${doc.reason} | ${doc.lastModified} | ${doc.action} |`
).join('\n')}

${auditResults.unusedDocuments.length > 30 ? `\n*Showing first 30 of ${auditResults.unusedDocuments.length} documents*\n` : ''}
`}

---

## 🗂️ 4. DUMP / LOG / UNUSED ASSETS

${auditResults.dumpFiles.length === 0 ? '✅ **No dump or unused files found!**' : `
Found **${auditResults.dumpFiles.length}** dump/log/unused files:

| File Path | File Type | Found In | Suggested Action |
|-----------|-----------|----------|------------------|
${auditResults.dumpFiles.slice(0, 40).map(dump => 
  `| \`${dump.file}\` | ${dump.type} | ${dump.location} | ${dump.action} |`
).join('\n')}

${auditResults.dumpFiles.length > 40 ? `\n*Showing first 40 of ${auditResults.dumpFiles.length} files*\n` : ''}
`}

---

## 📦 5. UNUSED IMPORTS & DEPENDENCIES

${auditResults.unusedImports.length === 0 ? '✅ **No unused imports detected!**' : `
Found **${auditResults.unusedImports.length}** potentially unused imports:

| File Path | Dependency | Status | Suggested Action |
|-----------|------------|--------|------------------|
${auditResults.unusedImports.slice(0, 50).map(imp => 
  `| \`${imp.file}\` | \`${imp.dependency}\` | ${imp.status} | ${imp.action} |`
).join('\n')}

${auditResults.unusedImports.length > 50 ? `\n*Showing first 50 of ${auditResults.unusedImports.length} imports*\n` : ''}

> **Note:** Run \`npx depcheck\` in frontend and backend folders for unused npm dependencies.
`}

---

## 🎯 TOP PRIORITY RECOMMENDATIONS

${getPriorityRecommendations()}

---

## 📋 NEXT STEPS

1. **High Priority** 🔴
   - Remove all debug statements (console.log, debugger)
   - Delete dump files and backups
   - Clean up commented code blocks

2. **Medium Priority** 🟡
   - Resolve duplicate files (merge or remove)
   - Complete TODO/FIXME markers
   - Review and archive unused documents

3. **Low Priority** 🟢
   - Optimize unused imports
   - Verify image asset usage
   - Update documentation references

---

**Audit Complete!** ✅  
*Review each section and take appropriate action based on priority.*

`;

  return report;
}

/**
 * Get priority recommendations
 */
function getPriorityRecommendations() {
  const recommendations = [];
  
  if (auditResults.incompleteCode.filter(i => i.type === 'Debug Statement').length > 10) {
    recommendations.push('🔴 **Critical:** Remove ' + auditResults.incompleteCode.filter(i => i.type === 'Debug Statement').length + ' debug statements before production');
  }
  
  if (auditResults.dumpFiles.length > 5) {
    recommendations.push('🔴 **Critical:** Delete ' + auditResults.dumpFiles.length + ' dump/backup files to reduce repository size');
  }
  
  if (auditResults.duplicateFiles.filter(d => d.similarity === 100).length > 0) {
    recommendations.push('🟡 **Important:** Merge or remove ' + auditResults.duplicateFiles.filter(d => d.similarity === 100).length + ' exact duplicate files');
  }
  
  if (auditResults.incompleteCode.filter(i => i.type === 'Commented Code Block').length > 5) {
    recommendations.push('🟡 **Important:** Clean up ' + auditResults.incompleteCode.filter(i => i.type === 'Commented Code Block').length + ' blocks of commented code');
  }
  
  if (auditResults.unusedDocuments.length > 10) {
    recommendations.push('🟢 **Optional:** Archive ' + auditResults.unusedDocuments.length + ' unreferenced documents to /docs/archive');
  }
  
  if (recommendations.length === 0) {
    return '✅ **Excellent!** Your codebase is clean and well-maintained.';
  }
  
  return recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n');
}

/**
 * 🚀 Main Execution
 */
async function runAudit() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 COMPREHENSIVE CODEBASE AUDIT SYSTEM                        ║');
  console.log('║  Full-Stack TypeScript + JavaScript ERP Analysis               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  
  // Get all files
  console.log('\n📁 Scanning project files...');
  const allFiles = getAllFiles(CONFIG.rootDir);
  console.log(`✅ Found ${allFiles.length} files to analyze`);
  
  // Run audits
  auditIncompleteCode(allFiles);
  auditDuplicateFiles(allFiles);
  auditUnusedDocuments(allFiles);
  auditDumpFiles(allFiles);
  auditUnusedImports(allFiles);
  
  // Generate report
  const report = generateReport();
  const reportPath = path.join(CONFIG.rootDir, 'CODEBASE_AUDIT_REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ AUDIT COMPLETE!                                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n📄 Report saved to: ${reportPath}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Incomplete Code Issues: ${auditResults.incompleteCode.length}`);
  console.log(`   - Duplicate Files: ${auditResults.duplicateFiles.length}`);
  console.log(`   - Unused Documents: ${auditResults.unusedDocuments.length}`);
  console.log(`   - Dump Files: ${auditResults.dumpFiles.length}`);
  console.log(`   - Unused Imports: ${auditResults.unusedImports.length}`);
  console.log(`\n🎯 Open CODEBASE_AUDIT_REPORT.md in VS Code to review details.\n`);
}

// Execute audit
runAudit().catch(err => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
