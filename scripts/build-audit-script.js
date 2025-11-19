#!/usr/bin/env node
/**
 * COMPREHENSIVE BUILD & LAYOUT AUDIT SCRIPT
 * Checks all pages, hooks, layouts, and dependencies
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, 'my-frontend');
const MODULES_DIR = path.join(FRONTEND_DIR, 'src', 'modules');
const HOOKS_DIR = path.join(FRONTEND_DIR, 'src', 'hooks');
const COMPONENTS_DIR = path.join(FRONTEND_DIR, 'src', 'components');
const LAYOUTS_DIR = path.join(FRONTEND_DIR, 'src', 'components', 'layouts');

const auditResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalPages: 0,
    pagesWithHooks: 0,
    pagesWithoutHooks: 0,
    totalHooks: 0,
    totalLayouts: 0,
    buildErrors: [],
    warnings: []
  },
  modules: {},
  hooks: [],
  layouts: [],
  pagesWithoutHooks: [],
  hookUsageMap: {},
  layoutUsageMap: {},
  issues: []
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getAllFiles(dir, extension = '.tsx', fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, extension, fileList);
    } else if (file.endsWith(extension)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function analyzeFileContent(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  // Check for hooks usage
  const hookPatterns = [
    /import\s+{[^}]*use[A-Z][a-zA-Z]*[^}]*}\s+from\s+['"]@\/hooks/g,
    /import\s+use[A-Z][a-zA-Z]*\s+from\s+['"]@\/hooks/g,
    /const\s+.*=\s+use[A-Z][a-zA-Z]*\(/g,
    /use(State|Effect|Context|Reducer|Callback|Memo|Ref|ImperativeHandle|LayoutEffect|DebugValue)\(/g,
    /use(Auth|Permission|RBAC|User|Translation|RolePages|DashboardData|ActionChecker|LayoutAudit)\(/g
  ];
  
  const foundHooks = new Set();
  hookPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const hookName = match.match(/use[A-Z][a-zA-Z]*/)?.[0];
        if (hookName) foundHooks.add(hookName);
      });
    }
  });
  
  // Check for layout usage
  const layoutPatterns = [
    /import\s+.*Layout.*\s+from/g,
    /<[A-Z][a-zA-Z]*Layout/g,
    /ResponsiveDashboardLayout/g,
    /ERP_DashboardLayout/g
  ];
  
  const foundLayouts = new Set();
  layoutPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const layoutName = match.match(/[A-Z][a-zA-Z]*Layout/)?.[0];
        if (layoutName) foundLayouts.add(layoutName);
      });
    }
  });
  
  // Check for potential issues
  const issues = [];
  
  // Check for missing error boundaries
  if (!content.includes('ErrorBoundary') && content.includes('export default')) {
    issues.push('Missing ErrorBoundary wrapper');
  }
  
  // Check for missing key props in lists
  if (content.includes('.map(') && !content.includes('key=')) {
    issues.push('Potential missing key prop in map function');
  }
  
  // Check for inline styles
  if ((content.match(/style={{/g) || []).length > 3) {
    issues.push('Multiple inline styles detected (consider CSS modules)');
  }
  
  // Check for console logs
  if (content.includes('console.log') || content.includes('console.error')) {
    issues.push('Console statements found (should be removed in production)');
  }
  
  // Check for TODO/FIXME comments
  const todoMatches = content.match(/\/\/\s*(TODO|FIXME|HACK|XXX):/gi);
  if (todoMatches) {
    issues.push(`Found ${todoMatches.length} TODO/FIXME comment(s)`);
  }
  
  return {
    fileName,
    filePath,
    hooks: Array.from(foundHooks),
    layouts: Array.from(foundLayouts),
    hasHooks: foundHooks.size > 0,
    hasLayout: foundLayouts.size > 0,
    issues,
    lineCount: content.split('\n').length,
    size: Buffer.byteLength(content, 'utf-8')
  };
}

function auditHooks() {
  log('\n📋 Auditing Hooks...', 'cyan');
  
  const hookFiles = getAllFiles(HOOKS_DIR, '.ts');
  hookFiles.forEach(hookPath => {
    const hookName = path.basename(hookPath, '.ts');
    const content = fs.readFileSync(hookPath, 'utf-8');
    
    auditResults.hooks.push({
      name: hookName,
      path: hookPath,
      exported: content.includes('export default') || content.includes('export const') || content.includes('export function'),
      lineCount: content.split('\n').length,
      dependencies: (content.match(/import\s+.*\s+from/g) || []).length
    });
  });
  
  auditResults.summary.totalHooks = auditResults.hooks.length;
  log(`   ✓ Found ${auditResults.hooks.length} hooks`, 'green');
}

function auditLayouts() {
  log('\n🎨 Auditing Layouts...', 'cyan');
  
  const layoutFiles = getAllFiles(LAYOUTS_DIR, '.tsx');
  layoutFiles.forEach(layoutPath => {
    const layoutName = path.basename(layoutPath, '.tsx');
    const content = fs.readFileSync(layoutPath, 'utf-8');
    
    auditResults.layouts.push({
      name: layoutName,
      path: layoutPath,
      exported: content.includes('export default'),
      lineCount: content.split('\n').length,
      hasErrorBoundary: content.includes('ErrorBoundary'),
      isResponsive: content.includes('responsive') || content.includes('Responsive')
    });
  });
  
  auditResults.summary.totalLayouts = auditResults.layouts.length;
  log(`   ✓ Found ${auditResults.layouts.length} layouts`, 'green');
}

function auditModulePages() {
  log('\n📄 Auditing Module Pages...', 'cyan');
  
  if (!fs.existsSync(MODULES_DIR)) {
    log('   ⚠ Modules directory not found', 'yellow');
    return;
  }
  
  const modules = fs.readdirSync(MODULES_DIR).filter(f => 
    fs.statSync(path.join(MODULES_DIR, f)).isDirectory()
  );
  
  modules.forEach(moduleName => {
    const modulePath = path.join(MODULES_DIR, moduleName);
    const pagesDir = path.join(modulePath, 'pages');
    
    if (!fs.existsSync(pagesDir)) {
      log(`   ⚠ No pages directory in ${moduleName}`, 'yellow');
      return;
    }
    
    const pageFiles = getAllFiles(pagesDir, '.tsx');
    
    auditResults.modules[moduleName] = {
      totalPages: pageFiles.length,
      pages: []
    };
    
    pageFiles.forEach(pagePath => {
      const analysis = analyzeFileContent(pagePath);
      auditResults.modules[moduleName].pages.push(analysis);
      auditResults.summary.totalPages++;
      
      if (analysis.hasHooks) {
        auditResults.summary.pagesWithHooks++;
        analysis.hooks.forEach(hook => {
          if (!auditResults.hookUsageMap[hook]) {
            auditResults.hookUsageMap[hook] = [];
          }
          auditResults.hookUsageMap[hook].push(pagePath);
        });
      } else {
        auditResults.summary.pagesWithoutHooks++;
        auditResults.pagesWithoutHooks.push({
          module: moduleName,
          file: analysis.fileName,
          path: pagePath
        });
      }
      
      if (analysis.layouts.length > 0) {
        analysis.layouts.forEach(layout => {
          if (!auditResults.layoutUsageMap[layout]) {
            auditResults.layoutUsageMap[layout] = [];
          }
          auditResults.layoutUsageMap[layout].push(pagePath);
        });
      }
      
      if (analysis.issues.length > 0) {
        auditResults.issues.push({
          file: pagePath,
          issues: analysis.issues
        });
      }
    });
    
    log(`   ✓ ${moduleName}: ${pageFiles.length} pages`, 'green');
  });
}

function checkBuildConfiguration() {
  log('\n🔧 Checking Build Configuration...', 'cyan');
  
  const configFiles = [
    'package.json',
    'next.config.js',
    'tsconfig.json',
    'tailwind.config.js',
    '.env.example'
  ];
  
  configFiles.forEach(file => {
    const filePath = path.join(FRONTEND_DIR, file);
    if (fs.existsSync(filePath)) {
      log(`   ✓ ${file} exists`, 'green');
    } else {
      log(`   ✗ ${file} missing`, 'red');
      auditResults.summary.buildErrors.push(`Missing ${file}`);
    }
  });
}

function generateReport() {
  log('\n' + '='.repeat(60), 'bright');
  log('📊 AUDIT REPORT SUMMARY', 'bright');
  log('='.repeat(60), 'bright');
  
  log(`\n📈 Statistics:`, 'cyan');
  log(`   Total Modules: ${Object.keys(auditResults.modules).length}`, 'white');
  log(`   Total Pages: ${auditResults.summary.totalPages}`, 'white');
  log(`   Total Hooks: ${auditResults.summary.totalHooks}`, 'white');
  log(`   Total Layouts: ${auditResults.summary.totalLayouts}`, 'white');
  
  log(`\n🎯 Hook Usage:`, 'cyan');
  log(`   Pages WITH hooks: ${auditResults.summary.pagesWithHooks} (${Math.round(auditResults.summary.pagesWithHooks / auditResults.summary.totalPages * 100)}%)`, 'green');
  log(`   Pages WITHOUT hooks: ${auditResults.summary.pagesWithoutHooks} (${Math.round(auditResults.summary.pagesWithoutHooks / auditResults.summary.totalPages * 100)}%)`, 'yellow');
  
  if (auditResults.pagesWithoutHooks.length > 0) {
    log(`\n⚠️  Pages Without Hooks (${auditResults.pagesWithoutHooks.length}):`, 'yellow');
    auditResults.pagesWithoutHooks.forEach(page => {
      log(`   • ${page.module}/${page.file}`, 'yellow');
    });
  }
  
  log(`\n🔧 Hook Usage Breakdown:`, 'cyan');
  Object.entries(auditResults.hookUsageMap).forEach(([hook, files]) => {
    log(`   ${hook}: used in ${files.length} file(s)`, 'white');
  });
  
  log(`\n🎨 Layout Usage Breakdown:`, 'cyan');
  Object.entries(auditResults.layoutUsageMap).forEach(([layout, files]) => {
    log(`   ${layout}: used in ${files.length} file(s)`, 'white');
  });
  
  if (auditResults.issues.length > 0) {
    log(`\n⚠️  Issues Found (${auditResults.issues.length}):`, 'yellow');
    auditResults.issues.slice(0, 10).forEach(issue => {
      log(`   ${path.basename(issue.file)}:`, 'yellow');
      issue.issues.forEach(i => log(`      - ${i}`, 'yellow'));
    });
    if (auditResults.issues.length > 10) {
      log(`   ... and ${auditResults.issues.length - 10} more`, 'yellow');
    }
  }
  
  if (auditResults.summary.buildErrors.length > 0) {
    log(`\n❌ Build Errors (${auditResults.summary.buildErrors.length}):`, 'red');
    auditResults.summary.buildErrors.forEach(error => {
      log(`   • ${error}`, 'red');
    });
  }
  
  // Write detailed JSON report
  const reportPath = path.join(__dirname, 'AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  log(`\n📝 Detailed report saved to: ${reportPath}`, 'green');
  
  // Generate markdown report
  generateMarkdownReport();
}

function generateMarkdownReport() {
  const reportPath = path.join(__dirname, 'BUILD_LAYOUT_AUDIT_REPORT.md');
  
  let markdown = `# 🔍 Build & Layout Audit Report\n\n`;
  markdown += `**Generated:** ${auditResults.timestamp}\n\n`;
  markdown += `---\n\n`;
  
  markdown += `## 📊 Executive Summary\n\n`;
  markdown += `| Metric | Count |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total Modules | ${Object.keys(auditResults.modules).length} |\n`;
  markdown += `| Total Pages | ${auditResults.summary.totalPages} |\n`;
  markdown += `| Total Hooks | ${auditResults.summary.totalHooks} |\n`;
  markdown += `| Total Layouts | ${auditResults.summary.totalLayouts} |\n`;
  markdown += `| Pages with Hooks | ${auditResults.summary.pagesWithHooks} (${Math.round(auditResults.summary.pagesWithHooks / auditResults.summary.totalPages * 100)}%) |\n`;
  markdown += `| Pages without Hooks | ${auditResults.summary.pagesWithoutHooks} (${Math.round(auditResults.summary.pagesWithoutHooks / auditResults.summary.totalPages * 100)}%) |\n\n`;
  
  markdown += `## 🎯 Hook Coverage Analysis\n\n`;
  if (auditResults.pagesWithoutHooks.length > 0) {
    markdown += `### ⚠️ Pages Without Hooks (${auditResults.pagesWithoutHooks.length})\n\n`;
    markdown += `| Module | Page | Path |\n`;
    markdown += `|--------|------|------|\n`;
    auditResults.pagesWithoutHooks.forEach(page => {
      markdown += `| ${page.module} | ${page.file} | \`${page.path}\` |\n`;
    });
    markdown += `\n`;
  }
  
  markdown += `### 📚 Hook Usage Statistics\n\n`;
  markdown += `| Hook Name | Usage Count |\n`;
  markdown += `|-----------|-------------|\n`;
  const sortedHooks = Object.entries(auditResults.hookUsageMap).sort((a, b) => b[1].length - a[1].length);
  sortedHooks.forEach(([hook, files]) => {
    markdown += `| ${hook} | ${files.length} |\n`;
  });
  markdown += `\n`;
  
  markdown += `## 🎨 Layout Analysis\n\n`;
  markdown += `### Available Layouts\n\n`;
  auditResults.layouts.forEach(layout => {
    markdown += `- **${layout.name}**\n`;
    markdown += `  - Lines: ${layout.lineCount}\n`;
    markdown += `  - Has Error Boundary: ${layout.hasErrorBoundary ? '✅' : '❌'}\n`;
    markdown += `  - Responsive: ${layout.isResponsive ? '✅' : '❌'}\n\n`;
  });
  
  markdown += `### Layout Usage\n\n`;
  markdown += `| Layout | Usage Count |\n`;
  markdown += `|--------|-------------|\n`;
  Object.entries(auditResults.layoutUsageMap).forEach(([layout, files]) => {
    markdown += `| ${layout} | ${files.length} |\n`;
  });
  markdown += `\n`;
  
  markdown += `## 📦 Module Breakdown\n\n`;
  Object.entries(auditResults.modules).forEach(([moduleName, moduleData]) => {
    markdown += `### ${moduleName} (${moduleData.totalPages} pages)\n\n`;
    
    const pagesWithHooks = moduleData.pages.filter(p => p.hasHooks).length;
    const pagesWithoutHooks = moduleData.pages.filter(p => !p.hasHooks).length;
    
    markdown += `- Pages with hooks: ${pagesWithHooks}\n`;
    markdown += `- Pages without hooks: ${pagesWithoutHooks}\n\n`;
    
    if (pagesWithoutHooks > 0) {
      markdown += `**Pages needing hooks:**\n`;
      moduleData.pages.filter(p => !p.hasHooks).forEach(page => {
        markdown += `- ${page.fileName}\n`;
      });
      markdown += `\n`;
    }
  });
  
  if (auditResults.issues.length > 0) {
    markdown += `## ⚠️ Issues & Recommendations\n\n`;
    markdown += `Found ${auditResults.issues.length} files with potential issues:\n\n`;
    auditResults.issues.forEach(issue => {
      markdown += `### ${path.basename(issue.file)}\n\n`;
      issue.issues.forEach(i => {
        markdown += `- ⚠️ ${i}\n`;
      });
      markdown += `\n`;
    });
  }
  
  markdown += `## 🚀 Recommendations\n\n`;
  markdown += `1. **Hook Integration**: ${auditResults.pagesWithoutHooks.length} pages need hook integration\n`;
  markdown += `2. **Error Boundaries**: Ensure all pages have proper error handling\n`;
  markdown += `3. **Code Quality**: Address ${auditResults.issues.length} potential issues\n`;
  markdown += `4. **Performance**: Review pages with multiple inline styles\n`;
  markdown += `5. **Consistency**: Standardize layout usage across modules\n\n`;
  
  markdown += `---\n\n`;
  markdown += `*Generated by Build & Layout Audit Script*\n`;
  
  fs.writeFileSync(reportPath, markdown);
  log(`\n📝 Markdown report saved to: ${reportPath}`, 'green');
}

// Main execution
log('🚀 Starting Build & Layout Audit...', 'bright');
log('='.repeat(60), 'bright');

try {
  auditHooks();
  auditLayouts();
  auditModulePages();
  checkBuildConfiguration();
  generateReport();
  
  log('\n' + '='.repeat(60), 'bright');
  log('✅ Audit Complete!', 'green');
  log('='.repeat(60), 'bright');
  
  // Exit with appropriate code
  if (auditResults.summary.buildErrors.length > 0) {
    process.exit(1);
  }
} catch (error) {
  log('\n❌ Audit failed:', 'red');
  log(error.message, 'red');
  process.exit(1);
}
