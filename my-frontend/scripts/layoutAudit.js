/**
 * Layout Audit Utility Script
 * 
 * Run comprehensive layout audits on all ERP pages.
 * Can be executed via npm script or programmatically.
 * 
 * Usage:
 *   node scripts/layoutAudit.js
 *   node scripts/layoutAudit.js --page=admin
 *   node scripts/layoutAudit.js --export=json
 */

const fs = require('fs');
const path = require('path');

class LayoutAuditor {
  constructor() {
    this.results = [];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Audit a specific page or all pages
   */
  async auditPages(targetPage = null) {
    console.log('🔍 Starting Layout Audit...\n');

    const pagesDir = path.join(process.cwd(), 'src', 'app');
    const pages = this.findPages(pagesDir);

    for (const page of pages) {
      if (targetPage && !page.includes(targetPage)) {
        continue;
      }

      const result = await this.auditPage(page);
      this.results.push(result);
    }

    this.generateReport();
  }

  /**
   * Find all page files in the app directory
   */
  findPages(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (!file.startsWith('_') && !file.startsWith('.')) {
          this.findPages(filePath, fileList);
        }
      } else if (file === 'page.tsx' || file === 'page.ts' || file === 'page.jsx' || file === 'page.js') {
        fileList.push(filePath);
      }
    });

    return fileList;
  }

  /**
   * Audit a single page file
   */
  async auditPage(pagePath) {
    const content = fs.readFileSync(pagePath, 'utf-8');
    const relativePath = pagePath.replace(process.cwd(), '');

    const checks = [
      this.checkBaseLayoutImport(content),
      this.checkBaseLayoutWrapper(content),
      this.checkHeaderComponent(content),
      this.checkSidebarComponent(content),
      this.checkFooterComponent(content),
      this.checkAuthCheck(content),
      this.checkResponsiveClasses(content),
      this.checkAccessibilityProps(content),
      this.checkDuplicateComponents(content),
      this.checkHardcodedStyles(content),
  this.checkDuplicateDarkMode(content),
    ];

    const passed = checks.filter((c) => c.passed).length;
    const score = Math.round((passed / checks.length) * 100);

    return {
      page: relativePath,
      score,
      checks,
      errors: checks.filter((c) => !c.passed && c.severity === 'error').length,
      warnings: checks.filter((c) => !c.passed && c.severity === 'warning').length,
    };
  }

  /**
   * Check if BaseLayout is imported
   */
  checkBaseLayoutImport(content) {
  const hasImport = /import\s+.*(BaseLayout|DashboardLayout).*from\s+['"].*components\/layout\/(BaseLayout|DashboardLayout)['"]/.test(content);

    return {
      id: 'base-layout-import',
      message: hasImport ? '✅ BaseLayout imported' : '❌ BaseLayout not imported',
      passed: hasImport,
      severity: hasImport ? 'info' : 'error',
      suggestion: hasImport ? null : 'Add: import BaseLayout from "@/components/layout/BaseLayout"',
    };
  }

  /**
   * Check if content is wrapped in BaseLayout
   */
  checkBaseLayoutWrapper(content) {
  const hasWrapper = /<BaseLayout|<DashboardLayout/.test(content);

    return {
      id: 'base-layout-wrapper',
      message: hasWrapper ? '✅ Content wrapped in BaseLayout' : '⚠️ Content not wrapped in BaseLayout',
      passed: hasWrapper,
      severity: hasWrapper ? 'info' : 'error',
      suggestion: hasWrapper ? null : 'Wrap your page content in <BaseLayout>...</BaseLayout>',
    };
  }

  /**
   * Check for standalone header component (should use BaseLayout instead)
   */
  checkHeaderComponent(content) {
    const hasStandaloneHeader = /<TopNavbar|<Header(?!>)|<BaseHeader(?!>)/.test(content) && !/<BaseLayout/.test(content);

    return {
      id: 'header-component',
      message: hasStandaloneHeader
        ? '⚠️ Standalone header found (should use BaseLayout)'
        : '✅ No standalone header',
      passed: !hasStandaloneHeader,
      severity: hasStandaloneHeader ? 'warning' : 'info',
      suggestion: hasStandaloneHeader ? 'Remove standalone header and use BaseLayout' : null,
    };
  }

  /**
   * Check for standalone sidebar component
   */
  checkSidebarComponent(content) {
    const hasStandaloneSidebar = /<DashboardSidebar|<Sidebar(?!>)|<BaseSidebar(?!>)/.test(content) && !/<BaseLayout/.test(content);

    return {
      id: 'sidebar-component',
      message: hasStandaloneSidebar
        ? '⚠️ Standalone sidebar found (should use BaseLayout)'
        : '✅ No standalone sidebar',
      passed: !hasStandaloneSidebar,
      severity: hasStandaloneSidebar ? 'warning' : 'info',
      suggestion: hasStandaloneSidebar ? 'Remove standalone sidebar and use BaseLayout' : null,
    };
  }

  /**
   * Check for standalone footer component
   */
  checkFooterComponent(content) {
    const hasStandaloneFooter = /<Footer|<BaseFooter(?!>)/.test(content) && !/<BaseLayout/.test(content);

    return {
      id: 'footer-component',
      message: hasStandaloneFooter
        ? '⚠️ Standalone footer found (should use BaseLayout)'
        : '✅ No standalone footer',
      passed: !hasStandaloneFooter,
      severity: hasStandaloneFooter ? 'warning' : 'info',
      suggestion: hasStandaloneFooter ? 'Remove standalone footer and use BaseLayout' : null,
    };
  }

  /**
   * Check for authentication check
   */
  checkAuthCheck(content) {
    const hasAuthCheck = /useAuth|AuthContext|isAuthenticated/.test(content);

    return {
      id: 'auth-check',
      message: hasAuthCheck ? '✅ Authentication check present' : '⚠️ No authentication check',
      passed: hasAuthCheck,
      severity: hasAuthCheck ? 'info' : 'warning',
      suggestion: hasAuthCheck ? null : 'Add authentication check with useAuth() hook',
    };
  }

  /**
   * Check for responsive Tailwind classes
   */
  checkResponsiveClasses(content) {
    const hasResponsive = /\b(sm:|md:|lg:|xl:|2xl:)/.test(content);

    return {
      id: 'responsive-classes',
      message: hasResponsive ? '✅ Responsive classes found' : '⚠️ No responsive classes',
      passed: hasResponsive,
      severity: hasResponsive ? 'info' : 'warning',
      suggestion: hasResponsive ? null : 'Add responsive Tailwind classes (sm:, md:, lg:)',
    };
  }

  /**
   * Check for accessibility props
   */
  checkAccessibilityProps(content) {
    const hasA11y = /aria-label|aria-describedby|role=|alt=/.test(content);

    return {
      id: 'accessibility',
      message: hasA11y ? '✅ Accessibility props found' : '⚠️ No accessibility props',
      passed: hasA11y,
      severity: hasA11y ? 'info' : 'warning',
      suggestion: hasA11y ? null : 'Add ARIA labels, roles, and alt text for accessibility',
    };
  }

  /**
   * Check for duplicate component definitions
   */
  checkDuplicateComponents(content) {
    const componentMatches = content.match(/const\s+(\w+Header|\w+Sidebar|\w+Footer|\w+Nav)\s*=/g) || [];
    const hasDuplicates = componentMatches.length > 2;

    return {
      id: 'duplicate-components',
      message: hasDuplicates
        ? `⚠️ Found ${componentMatches.length} layout component definitions`
        : '✅ No duplicate layout components',
      passed: !hasDuplicates,
      severity: hasDuplicates ? 'warning' : 'info',
      suggestion: hasDuplicates ? 'Remove duplicate layout components, use BaseLayout instead' : null,
    };
  }

  /**
   * Check for hardcoded styles
   */
  checkHardcodedStyles(content) {
    const hasHardcodedStyles = /style={{/.test(content);

    return {
      id: 'hardcoded-styles',
      message: hasHardcodedStyles ? '⚠️ Hardcoded styles found' : '✅ No hardcoded styles',
      passed: !hasHardcodedStyles,
      severity: hasHardcodedStyles ? 'warning' : 'info',
      suggestion: hasHardcodedStyles ? 'Use Tailwind classes instead of inline styles' : null,
    };
  }

  /**
   * Check for multiple dark mode toggles which can confuse users
   */
  checkDuplicateDarkMode(content) {
    const toggles = (content.match(/DarkModeToggle/g) || []).length;
    const hasDuplicate = toggles > 1;
    return {
      id: 'duplicate-darkmode',
      message: hasDuplicate ? `⚠️ ${toggles} DarkModeToggle instances found` : '✅ Single dark mode toggle',
      passed: !hasDuplicate,
      severity: hasDuplicate ? 'warning' : 'info',
      suggestion: hasDuplicate ? 'Remove extra <DarkModeToggle/> instances or pass a prop to hide duplicates.' : null,
    };
  }

  /**
   * Generate audit report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 LAYOUT AUDIT REPORT');
    console.log('='.repeat(80) + '\n');

    const totalPages = this.results.length;
    const avgScore = Math.round(
      this.results.reduce((sum, r) => sum + r.score, 0) / totalPages
    );

    console.log(`Total Pages Audited: ${totalPages}`);
    console.log(`Average Score: ${avgScore}/100\n`);

    // Pages sorted by score
    const sortedResults = [...this.results].sort((a, b) => a.score - b.score);

    console.log('📋 Pages by Score:\n');
    sortedResults.forEach((result) => {
      const icon = result.score >= 80 ? '✅' : result.score >= 60 ? '⚠️' : '❌';
      console.log(`${icon} ${result.score}/100 - ${result.page}`);

      if (result.errors > 0 || result.warnings > 0) {
        console.log(`   Errors: ${result.errors}, Warnings: ${result.warnings}`);
      }

      result.checks.forEach((check) => {
        if (!check.passed) {
          console.log(`   ${check.message}`);
          if (check.suggestion) {
            console.log(`      💡 ${check.suggestion}`);
          }
        }
      });

      console.log('');
    });

    // Export results
    this.exportResults();
  }

  /**
   * Export results to JSON file
   */
  exportResults() {
    const outputDir = path.join(process.cwd(), 'audit-reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `layout-audit-${timestamp}.json`);

    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          totalPages: this.results.length,
          avgScore: Math.round(
            this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length
          ),
          results: this.results,
        },
        null,
        2
      )
    );

    console.log(`\n📁 Report exported to: ${outputPath}\n`);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const pageArg = args.find(arg => arg.startsWith('--page='));
  const visualArg = args.find(arg => arg === '--visual' || arg.startsWith('--export='));
  const specificPage = pageArg ? pageArg.split('=')[1] : null;

  const auditor = new LayoutAuditor();
  // Correct method name is auditPages
  auditor.auditPages(specificPage);

  // Generate visual summary if requested
  if (visualArg) {
    console.log(`
🎨 Generating visual layout summaries...
`);
    
    const { execSync } = require('child_process');
    const outputDir = path.join(process.cwd(), 'layout-exports');
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate summaries for each role
    const roles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'CFO', 'IT_ADMIN'];
    
    roles.forEach(role => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const roleSlug = role.toLowerCase().replace(/_/g, '-');
      
      console.log(`  Generating summary for ${role}...`);
      
      // Generate summary using the utility (we'll create a CLI wrapper)
      const summaryScript = `
        const { generateLayoutSummary } = require('./src/utils/layoutSummaryGenerator.ts');
        const fs = require('fs');
        const path = require('path');
        
        const summary = generateLayoutSummary('${role}');
        const outputDir = '${outputDir}';
        
        fs.writeFileSync(
          path.join(outputDir, 'layout-${roleSlug}-${timestamp}.json'),
          JSON.stringify(summary.json, null, 2)
        );
        
        fs.writeFileSync(
          path.join(outputDir, 'layout-${roleSlug}-${timestamp}.html'),
          summary.html
        );
        
        fs.writeFileSync(
          path.join(outputDir, 'layout-${roleSlug}-${timestamp}.svg'),
          summary.svg
        );
        
        console.log('    ✓ JSON, HTML, SVG exported');
      `;
      
      try {
        // For now, just create placeholder files since TypeScript execution requires setup
        const jsonPath = path.join(outputDir, `layout-${roleSlug}-${timestamp}.json`);
        const htmlPath = path.join(outputDir, `layout-${roleSlug}-${timestamp}.html`);
        const svgPath = path.join(outputDir, `layout-${roleSlug}-${timestamp}.svg`);
        
        fs.writeFileSync(jsonPath, JSON.stringify({ role, message: 'Visual summary generation requires TypeScript compilation. Use: npm run build && node scripts/generateVisualSummary.js' }, null, 2));
        fs.writeFileSync(htmlPath, `<!DOCTYPE html><html><body><h1>Layout Summary for ${role}</h1><p>Use: npm run build && node scripts/generateVisualSummary.js</p></body></html>`);
        fs.writeFileSync(svgPath, `<svg><text x="10" y="20">Layout Summary for ${role}</text></svg>`);
        
        console.log(`    ✓ Placeholder files created in ${outputDir}`);
      } catch (error) {
        console.error(`    ✗ Error generating summary for ${role}:`, error.message);
      }
    });
    
    console.log(`
✅ Visual summaries exported to: ${outputDir}`);
console.log('📝 Note: For full visual summaries, compile TypeScript first: npm run build');
  }
}

module.exports = LayoutAuditor;
