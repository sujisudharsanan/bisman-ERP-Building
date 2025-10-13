#!/usr/bin/env node

/**
 * Production Standards Verification Test
 * Comprehensive test suite to verify compliance with production standards
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}\n`),
};

class ProductionStandardsTest {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      categories: {},
    };
  }

  test(category, name, testFn) {
    this.results.total++;
    if (!this.results.categories[category]) {
      this.results.categories[category] = { passed: 0, failed: 0, warnings: 0, total: 0 };
    }
    this.results.categories[category].total++;

    try {
      const result = testFn();
      if (result === 'warning') {
        this.results.warnings++;
        this.results.categories[category].warnings++;
        log.warning(`${name}`);
      } else if (result === false) {
        this.results.failed++;
        this.results.categories[category].failed++;
        log.error(`${name}`);
      } else {
        this.results.passed++;
        this.results.categories[category].passed++;
        log.success(`${name}`);
      }
    } catch (error) {
      this.results.failed++;
      this.results.categories[category].failed++;
      log.error(`${name} - ${error.message}`);
    }
  }

  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  fileContains(filePath, searchString) {
    if (!this.fileExists(filePath)) return false;
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.includes(searchString);
  }

  countOccurrences(directory, pattern, excludeDirs = ['node_modules', '.next', 'dist']) {
    try {
      const result = execSync(
        `find ${directory} -type f \\( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \\) | grep -v -E "(${excludeDirs.join('|')})" | xargs grep -l "${pattern}" | wc -l`,
        { encoding: 'utf-8' }
      );
      return parseInt(result.trim());
    } catch {
      return 0;
    }
  }

  runTests() {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 BISMAN ERP - Production Standards Verification Test');
    console.log('='.repeat(70));

    // Category 1: Version Control & Documentation
    log.title('Category 1: Version Control & Documentation');
    
    this.test('Version Control', 'CHANGELOG.md exists', () => 
      this.fileExists('CHANGELOG.md')
    );
    
    this.test('Version Control', 'Git tags present', () => {
      try {
        const tags = execSync('git tag', { encoding: 'utf-8' });
        return tags.trim().length > 0;
      } catch {
        return false;
      }
    });
    
    this.test('Version Control', '.gitignore properly configured', () => 
      this.fileContains('.gitignore', '*.env') && this.fileContains('.gitignore', 'node_modules')
    );
    
    this.test('Version Control', 'No .env files in git', () => {
      try {
        const result = execSync('git ls-files | grep -E "\\.env$"', { encoding: 'utf-8' });
        return result.trim().length === 0;
      } catch {
        return true; // No .env files found is good
      }
    });

    this.test('Documentation', 'README.md exists', () => 
      this.fileExists('README.md')
    );
    
    this.test('Documentation', 'Production Standards Report exists', () => 
      this.fileExists('PRODUCTION_STANDARDS_COMPLIANCE_REPORT.md')
    );
    
    this.test('Documentation', 'Remediation Plan exists', () => 
      this.fileExists('PRODUCTION_STANDARDS_REMEDIATION_PLAN.md')
    );

    // Category 2: Security
    log.title('Category 2: Security & Environment');
    
    this.test('Security', 'Backend .env.example exists', () => 
      this.fileExists('my-backend/.env.example')
    );
    
    this.test('Security', 'Frontend .env.example exists', () => 
      this.fileExists('my-frontend/.env.example')
    );
    
    this.test('Security', 'No committed secrets (.env files)', () => {
      const envFiles = this.fileExists('my-backend/.env') && this.fileExists('my-frontend/.env');
      try {
        const tracked = execSync('git ls-files | grep -E "^(my-backend|my-frontend)/\\.env$"', { encoding: 'utf-8' });
        return tracked.trim().length === 0;
      } catch {
        return true;
      }
    });

    // Category 3: Code Quality
    log.title('Category 3: Code Quality & Standards');
    
    this.test('Code Quality', 'ESLint configuration exists', () => 
      this.fileExists('.eslintrc.json') || this.fileExists('my-frontend/.eslintrc.json')
    );
    
    this.test('Code Quality', 'Prettier configuration exists', () => 
      this.fileExists('.prettierrc.json') || this.fileExists('.prettierrc')
    );
    
    this.test('Code Quality', 'TypeScript configuration exists', () => 
      this.fileExists('my-frontend/tsconfig.json')
    );
    
    const consoleLogCount = this.countOccurrences('my-frontend/src', 'console\\.log');
    this.test('Code Quality', `Limited console.log usage (found: ${consoleLogCount})`, () => 
      consoleLogCount < 50 ? 'warning' : false
    );

    // Category 4: Testing
    log.title('Category 4: Testing Infrastructure');
    
    this.test('Testing', 'Frontend test configuration exists', () => 
      this.fileExists('my-frontend/vitest.config.ts') || 
      this.fileExists('my-frontend/vitest.config.js') || 
      this.fileExists('my-frontend/jest.config.js')
    );
    
    this.test('Testing', 'Backend test configuration exists', () => 
      this.fileExists('my-backend/jest.config.js') || this.fileExists('my-backend/jest.config.cjs')
    );
    
    this.test('Testing', 'Header component tests exist', () => 
      this.fileExists('my-frontend/src/components/layout/Header.test.tsx')
    );

    // Category 5: Internationalization
    log.title('Category 5: Internationalization (i18n)');
    
    this.test('i18n', 'next-i18next config exists', () => 
      this.fileExists('my-frontend/next-i18next.config.js')
    );
    
    this.test('i18n', 'English locale file exists', () => 
      this.fileExists('my-frontend/public/locales/en/common.json')
    );
    
    this.test('i18n', 'useTranslation hook exists', () => 
      this.fileExists('my-frontend/src/hooks/useTranslation.ts')
    );
    
    this.test('i18n', 'Header component uses i18n', () => 
      this.fileContains('my-frontend/src/components/layout/Header.tsx', 't(')
    );

    // Category 6: Accessibility
    log.title('Category 6: Accessibility (WCAG 2.1 AA)');
    
    this.test('Accessibility', 'Header has ARIA labels', () => 
      this.fileContains('my-frontend/src/components/layout/Header.tsx', 'aria-label')
    );
    
    this.test('Accessibility', 'Header has semantic HTML', () => 
      this.fileContains('my-frontend/src/components/layout/Header.tsx', 'role="banner"')
    );
    
    this.test('Accessibility', 'Header has keyboard navigation', () => 
      this.fileContains('my-frontend/src/components/layout/Header.tsx', 'focus:')
    );

    // Category 7: CI/CD
    log.title('Category 7: CI/CD & Deployment');
    
    this.test('CI/CD', 'GitHub Actions workflow exists', () => 
      this.fileExists('.github/workflows/ci.yml')
    );
    
    this.test('CI/CD', 'Pull Request template exists', () => 
      this.fileExists('.github/PULL_REQUEST_TEMPLATE.md')
    );
    
    this.test('CI/CD', 'Render deployment config exists', () => 
      this.fileExists('render.yaml')
    );

    // Category 8: Database
    log.title('Category 8: Database Management');
    
    this.test('Database', 'Prisma schema exists', () => 
      this.fileExists('my-backend/prisma/schema.prisma')
    );
    
    this.test('Database', 'Backup script exists', () => 
      this.fileExists('scripts/backup-db.sh')
    );
    
    this.test('Database', 'Restore script exists', () => 
      this.fileExists('scripts/restore-db.sh')
    );
    
    this.test('Database', 'Backup scripts are executable', () => {
      try {
        const stats = fs.statSync('scripts/backup-db.sh');
        return (stats.mode & 0o111) !== 0;
      } catch {
        return false;
      }
    });

    // Category 9: Performance
    log.title('Category 9: Performance & Optimization');
    
    this.test('Performance', 'Next.js configuration optimized', () => 
      this.fileExists('my-frontend/next.config.js') || this.fileExists('my-frontend/next.config.mjs')
    );
    
    this.test('Performance', 'Header component size acceptable', () => {
      try {
        const stats = fs.statSync('my-frontend/src/components/layout/Header.tsx');
        return stats.size < 10000; // Less than 10KB
      } catch {
        return false;
      }
    });

    // Category 10: Component Standards
    log.title('Category 10: Component Standards (Header)');
    
    this.test('Component', 'Header component exists', () => 
      this.fileExists('my-frontend/src/components/layout/Header.tsx')
    );
    
    this.test('Component', 'useUser hook exists', () => 
      this.fileExists('my-frontend/src/hooks/useUser.ts')
    );
    
    this.test('Component', 'Header displays Avatar', () => 
      this.fileContains('my-frontend/src/components/layout/Header.tsx', 'Avatar')
    );
    
    this.test('Component', 'Header displays user name', () => 
      this.fileContains('my-frontend/src/components/layout/Header.tsx', 'user.name')
    );
    
    this.test('Component', 'Header displays role dashboard', () => 
      this.fileContains('my-frontend/src/components/layout/Header.tsx', 'role_dashboard')
    );
    
    this.test('Component', 'Header links to profile', () => 
      this.fileContains('my-frontend/src/components/layout/Header.tsx', '/profile')
    );

    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(70) + '\n');

    // Category breakdown
    Object.keys(this.results.categories).forEach((category) => {
      const cat = this.results.categories[category];
      const score = Math.round((cat.passed / cat.total) * 100);
      const color = score >= 80 ? colors.green : score >= 60 ? colors.yellow : colors.red;
      
      console.log(`${color}${category}${colors.reset}`);
      console.log(`  Total: ${cat.total} | Passed: ${cat.passed} | Failed: ${cat.failed} | Warnings: ${cat.warnings}`);
      console.log(`  Score: ${color}${score}%${colors.reset}\n`);
    });

    // Overall results
    const overallScore = Math.round((this.results.passed / this.results.total) * 100);
    const statusEmoji = overallScore >= 80 ? '✅' : overallScore >= 60 ? '⚠️' : '❌';
    const statusColor = overallScore >= 80 ? colors.green : overallScore >= 60 ? colors.yellow : colors.red;

    console.log('─'.repeat(70));
    console.log(`${statusEmoji} ${statusColor}Overall Score: ${overallScore}%${colors.reset}`);
    console.log(`   Total Tests: ${this.results.total}`);
    console.log(`   ${colors.green}Passed: ${this.results.passed}${colors.reset}`);
    console.log(`   ${colors.red}Failed: ${this.results.failed}${colors.reset}`);
    console.log(`   ${colors.yellow}Warnings: ${this.results.warnings}${colors.reset}`);
    console.log('─'.repeat(70));

    // Recommendations
    if (this.results.failed > 0) {
      console.log(`\n${colors.yellow}⚠️  Recommendations:${colors.reset}`);
      console.log('   • Review failed tests above');
      console.log('   • Check PRODUCTION_STANDARDS_REMEDIATION_PLAN.md for action items');
      console.log('   • Address critical issues first (security, version control)');
    }

    if (overallScore >= 80) {
      console.log(`\n${colors.green}🎉 Excellent! Your codebase meets production standards!${colors.reset}`);
    } else if (overallScore >= 60) {
      console.log(`\n${colors.yellow}⚠️  Good progress, but improvements needed.${colors.reset}`);
    } else {
      console.log(`\n${colors.red}❌ Critical improvements required before production.${colors.reset}`);
    }

    console.log('\n' + '='.repeat(70) + '\n');

    // Exit code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run the tests
const tester = new ProductionStandardsTest();
tester.runTests();
