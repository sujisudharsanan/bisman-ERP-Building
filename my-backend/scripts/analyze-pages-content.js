/**
 * Analyze Pages Content Script
 * 
 * This script analyzes all page.tsx files in the frontend to identify:
 * - Empty pages (no content)
 * - Placeholder pages (Under Construction, Coming Soon, etc.)
 * - Fully implemented pages
 * - Pages that need enhancement
 */

const fs = require('fs');
const path = require('path');

// Configuration
const frontendDir = path.join(__dirname, '../../my-frontend');
const appDir = path.join(frontendDir, 'src/app');

// Patterns to detect placeholder content
const PLACEHOLDER_PATTERNS = [
  /Under Construction/i,
  /Coming Soon/i,
  /Page Under Construction/i,
  /not implemented yet/i,
  /This page is currently being developed/i,
  /Feature Under Development/i,
  /Ready for implementation/i,
  /TODO.*implement/i,
  /Placeholder/i,
];

// Patterns to detect empty or minimal content
const MINIMAL_CONTENT_PATTERNS = [
  /return\s*\(\s*<div[^>]*>\s*<\/div>\s*\)/,
  /return\s*null/,
  /return\s*\(\s*<>\s*<\/>\s*\)/,
];

// Categories for page classification
const categories = {
  empty: [],
  placeholder: [],
  minimal: [],
  implemented: [],
  error: [],
};

/**
 * Recursively find all page.tsx files
 */
function findPageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!file.startsWith('.') && file !== 'node_modules' && file !== '_templates') {
        findPageFiles(filePath, fileList);
      }
    } else if (file === 'page.tsx') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Analyze a single page file
 */
function analyzePage(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(appDir, filePath);
    
    // Check if file is empty or very small
    if (content.trim().length < 50) {
      return {
        path: relativePath,
        category: 'empty',
        reason: 'File is empty or has minimal content',
        size: content.length,
      };
    }

    // Check for placeholder patterns
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(content)) {
        return {
          path: relativePath,
          category: 'placeholder',
          reason: `Contains placeholder text: "${content.match(pattern)[0]}"`,
          size: content.length,
        };
      }
    }

    // Check for minimal content patterns
    for (const pattern of MINIMAL_CONTENT_PATTERNS) {
      if (pattern.test(content)) {
        return {
          path: relativePath,
          category: 'minimal',
          reason: 'Has minimal component structure',
          size: content.length,
        };
      }
    }

    // Check if page has substantial content
    const hasDataFetching = /fetch|axios|useSWR|useQuery|useState|useEffect/.test(content);
    const hasComponents = /<[A-Z][a-zA-Z]*[^>]*>/.test(content);
    const linesOfCode = content.split('\n').length;

    if (linesOfCode > 100 && hasDataFetching && hasComponents) {
      return {
        path: relativePath,
        category: 'implemented',
        reason: 'Has substantial implementation',
        size: content.length,
        linesOfCode,
      };
    } else {
      return {
        path: relativePath,
        category: 'minimal',
        reason: 'Has basic structure but may need enhancement',
        size: content.length,
        linesOfCode,
      };
    }
  } catch (error) {
    return {
      path: path.relative(appDir, filePath),
      category: 'error',
      reason: error.message,
    };
  }
}

/**
 * Generate route from file path
 */
function getRouteFromPath(relativePath) {
  return '/' + relativePath
    .replace(/\\/g, '/')
    .replace(/\/page\.tsx$/, '')
    .replace(/\/\(([^)]+)\)\//g, '/'); // Remove route groups like (dashboard)
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing page content...\n');
  console.log(`Frontend directory: ${frontendDir}`);
  console.log(`App directory: ${appDir}\n`);

  // Find all page files
  const pageFiles = findPageFiles(appDir);
  console.log(`Found ${pageFiles.length} page files\n`);

  // Analyze each page
  pageFiles.forEach(filePath => {
    const result = analyzePage(filePath);
    categories[result.category].push(result);
  });

  // Generate report
  console.log('=' .repeat(80));
  console.log('📊 PAGE CONTENT ANALYSIS REPORT');
  console.log('='.repeat(80));
  console.log();

  // Summary statistics
  console.log('📈 SUMMARY:');
  console.log(`   Total Pages: ${pageFiles.length}`);
  console.log(`   ✅ Implemented: ${categories.implemented.length}`);
  console.log(`   ⚠️  Placeholder: ${categories.placeholder.length}`);
  console.log(`   🔶 Minimal: ${categories.minimal.length}`);
  console.log(`   ❌ Empty: ${categories.empty.length}`);
  console.log(`   ⛔ Error: ${categories.error.length}`);
  console.log();

  // Detail each category
  if (categories.empty.length > 0) {
    console.log('❌ EMPTY PAGES:');
    console.log('-'.repeat(80));
    categories.empty.forEach((page, index) => {
      console.log(`${index + 1}. ${page.path}`);
      console.log(`   Route: ${getRouteFromPath(page.path)}`);
      console.log(`   Reason: ${page.reason}`);
      console.log();
    });
  }

  if (categories.placeholder.length > 0) {
    console.log('⚠️  PLACEHOLDER PAGES (Under Construction):');
    console.log('-'.repeat(80));
    categories.placeholder.forEach((page, index) => {
      console.log(`${index + 1}. ${page.path}`);
      console.log(`   Route: ${getRouteFromPath(page.path)}`);
      console.log(`   Reason: ${page.reason}`);
      console.log(`   Size: ${page.size} bytes`);
      console.log();
    });
  }

  if (categories.minimal.length > 0) {
    console.log('🔶 MINIMAL CONTENT PAGES (May Need Enhancement):');
    console.log('-'.repeat(80));
    categories.minimal.forEach((page, index) => {
      console.log(`${index + 1}. ${page.path}`);
      console.log(`   Route: ${getRouteFromPath(page.path)}`);
      console.log(`   Reason: ${page.reason}`);
      console.log(`   Lines: ${page.linesOfCode || 'N/A'}`);
      console.log();
    });
  }

  if (categories.implemented.length > 0) {
    console.log('✅ FULLY IMPLEMENTED PAGES:');
    console.log('-'.repeat(80));
    console.log(`${categories.implemented.length} pages have substantial implementation`);
    console.log();
    categories.implemented.slice(0, 10).forEach((page, index) => {
      console.log(`${index + 1}. ${page.path} (${page.linesOfCode} lines)`);
    });
    if (categories.implemented.length > 10) {
      console.log(`   ... and ${categories.implemented.length - 10} more`);
    }
    console.log();
  }

  if (categories.error.length > 0) {
    console.log('⛔ PAGES WITH ERRORS:');
    console.log('-'.repeat(80));
    categories.error.forEach((page, index) => {
      console.log(`${index + 1}. ${page.path}`);
      console.log(`   Error: ${page.reason}`);
      console.log();
    });
  }

  // Recommendations
  console.log('💡 RECOMMENDATIONS:');
  console.log('-'.repeat(80));
  const needsWork = categories.empty.length + categories.placeholder.length + categories.minimal.length;
  
  if (needsWork === 0) {
    console.log('✅ All pages have been implemented! Great job!');
  } else {
    console.log(`📌 ${needsWork} pages need attention:`);
    console.log();
    
    if (categories.empty.length > 0) {
      console.log(`   1. Empty Pages (${categories.empty.length}): Add basic page structure`);
    }
    
    if (categories.placeholder.length > 0) {
      console.log(`   2. Placeholder Pages (${categories.placeholder.length}): Implement actual functionality`);
    }
    
    if (categories.minimal.length > 0) {
      console.log(`   3. Minimal Pages (${categories.minimal.length}): Enhance with data fetching and UI`);
    }
    
    console.log();
    console.log('📚 Use the page templates in /templates/ directory to standardize pages');
    console.log('🔧 Run: npm run pages:enhance to auto-generate basic content');
  }
  
  console.log();
  console.log('='.repeat(80));

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: pageFiles.length,
      implemented: categories.implemented.length,
      placeholder: categories.placeholder.length,
      minimal: categories.minimal.length,
      empty: categories.empty.length,
      error: categories.error.length,
    },
    categories,
  };

  const reportPath = path.join(__dirname, '../reports/page-content-analysis.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Detailed JSON report saved to: ${reportPath}`);
  console.log();

  // Exit code based on results
  if (categories.error.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { analyzePage, findPageFiles };
