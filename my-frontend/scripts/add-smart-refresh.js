#!/usr/bin/env node
/**
 * Script to add smart refresh pattern to all pages
 * This adds usePageRefresh hook to pages that have data fetching
 */

const fs = require('fs');
const path = require('path');

// Pages to process (enterprise-admin)
const enterpriseAdminPages = [
  'organizations',
  'ai-handling', 
  'settings',
  'super-admins',
  'integrations',
  'logs',
  'audit',
  'support',
  'users',
  'monitoring/database',
  'monitoring/system-health',
  'monitoring/performance',
  'monitoring',
  'modules',
  'notifications',
  'billing',
  'security-operations',
  'activity-logs',
  'reports',
];

// Super-admin pages
const superAdminPages = [
  'ai-handling',
  'fallback-logs',
  'orders',
  'security',
  'system/backup-restore',
  'system/deployment-tools',
  'system/permission-manager',
  'system/system-health-dashboard',
  'system/user-management',
  'system/integration-settings',
  'system/role-access-explorer',
  'system/roles-users-report',
  'system/it-admin',
  'system/about-me',
  'system/pages-roles-report',
];

function addSmartRefreshToPage(filePath, pageName) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has usePageRefresh
  if (content.includes('usePageRefresh')) {
    console.log(`  ✓ Already has usePageRefresh: ${pageName}`);
    return false;
  }

  // Skip if no fetch or useEffect (static pages)
  if (!content.includes('fetch(') && !content.includes('useEffect')) {
    console.log(`  ○ Static page (no fetch): ${pageName}`);
    return false;
  }

  let modified = false;

  // 1. Add usePageRefresh import if not present
  if (!content.includes("from '@/contexts/RefreshContext'")) {
    // Find where to insert - after other imports
    const importPattern = /^(import .+ from .+;\n)+/m;
    const match = content.match(importPattern);
    if (match) {
      const lastImportEnd = match.index + match[0].length;
      const importLine = "import { usePageRefresh } from '@/contexts/RefreshContext';\n";
      content = content.slice(0, lastImportEnd) + importLine + content.slice(lastImportEnd);
      modified = true;
    }
  }

  // 2. Add isDataRefreshing state if page has useState for loading
  if (content.includes('useState(true)') || content.includes('setIsLoading') || content.includes('setLoading')) {
    // Check if already has isDataRefreshing
    if (!content.includes('isDataRefreshing')) {
      // Find the loading state and add isDataRefreshing after it
      const loadingStatePattern = /const \[(isLoading|loading), set(IsLoading|Loading)\] = useState\((true|false)\);/;
      const loadingMatch = content.match(loadingStatePattern);
      if (loadingMatch) {
        const insertPos = loadingMatch.index + loadingMatch[0].length;
        const newState = '\n  const [isDataRefreshing, setIsDataRefreshing] = useState(false);';
        content = content.slice(0, insertPos) + newState + content.slice(insertPos);
        modified = true;
      }
    }
  }

  // 3. Find the main fetch function and wrap it to support refresh mode
  // Look for functions like fetchData, loadData, getData, etc.
  const fetchFnPattern = /const (fetch\w+|load\w+|get\w+Data?) = (useCallback\()?async/;
  const fetchMatch = content.match(fetchFnPattern);
  
  if (fetchMatch && !content.includes('isRefresh = false')) {
    const fnName = fetchMatch[1];
    // This is more complex - we'd need AST parsing to do this safely
    // For now, just add the usePageRefresh hook call at component level
  }

  // 4. Add usePageRefresh hook call
  // Find the component function and add hook after other hooks
  if (modified || content.includes('fetch(')) {
    // Find a good place to add the hook - after useEffect or other hooks
    const hookPattern = /useEffect\(\(\) => \{[\s\S]*?\}, \[.*?\]\);/;
    const hookMatch = content.match(hookPattern);
    
    if (hookMatch && !content.includes('usePageRefresh(')) {
      // Get the function name for the refresh
      let refreshFn = 'fetchData';
      const fnMatch = content.match(/const (fetch\w+|load\w+) = /);
      if (fnMatch) {
        refreshFn = fnMatch[1];
      }
      
      const insertPos = hookMatch.index + hookMatch[0].length;
      const pageKey = pageName.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase();
      const hookCall = `\n\n  // Register refresh handler for navbar refresh button\n  usePageRefresh('${pageKey}', ${refreshFn});`;
      content = content.slice(0, insertPos) + hookCall + content.slice(insertPos);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Updated: ${pageName}`);
    return true;
  }

  console.log(`  ○ No changes needed: ${pageName}`);
  return false;
}

function main() {
  const baseDir = path.join(__dirname, '..');
  let updatedCount = 0;

  console.log('\n🔄 Adding Smart Refresh Pattern to Pages\n');
  console.log('═'.repeat(50));

  // Process enterprise-admin pages
  console.log('\n📁 Enterprise Admin Pages:');
  for (const page of enterpriseAdminPages) {
    const filePath = path.join(baseDir, 'src/app/enterprise-admin', page, 'page.tsx');
    if (addSmartRefreshToPage(filePath, `enterprise-admin/${page}`)) {
      updatedCount++;
    }
  }

  // Process super-admin pages
  console.log('\n📁 Super Admin Pages:');
  for (const page of superAdminPages) {
    const filePath = path.join(baseDir, 'src/app/super-admin', page, 'page.tsx');
    if (addSmartRefreshToPage(filePath, `super-admin/${page}`)) {
      updatedCount++;
    }
  }

  // Process main super-admin page
  const mainSuperAdminPage = path.join(baseDir, 'src/app/super-admin/page.tsx');
  if (addSmartRefreshToPage(mainSuperAdminPage, 'super-admin/main')) {
    updatedCount++;
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`\n✅ Updated ${updatedCount} pages with smart refresh pattern\n`);
}

main();
