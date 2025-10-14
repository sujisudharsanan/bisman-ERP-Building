# Base Layout System - Complete Documentation

## 📚 Overview

The Base Layout System is a comprehensive, role-based layout framework for the BISMAN ERP application. It provides a unified, maintainable structure for all dashboard pages with built-in audit capabilities, responsive design, and dark mode support.

## 🎯 Features

- ✅ **Unified Layout Structure**: Single import for consistent layout across all pages
- ✅ **Role-Based Configuration**: Automatic menu and page access control based on user roles
- ✅ **Responsive Design**: Optimized for mobile, tablet, and desktop devices
- ✅ **Dark Mode Support**: Seamless theme switching
- ✅ **Layout Audit System**: Real-time and batch auditing for layout consistency
- ✅ **Collapsible Sidebar**: Space-efficient navigation
- ✅ **User Profile Integration**: Avatar, role badge, and profile display
- ✅ **Accessibility Compliant**: WCAG 2.1 AA standards
- ✅ **Version Tracking**: Automated component version management
- ✅ **Visual Documentation**: JSON, HTML, and SVG layout summaries

## 📦 Components

### 1. BaseLayout (`src/components/layout/BaseLayout.tsx`)

Main wrapper component that orchestrates the entire layout structure.

**Props:**
```typescript
interface BaseLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;        // Show/hide header (default: true)
  showSidebar?: boolean;        // Show/hide sidebar (default: true)
  showFooter?: boolean;         // Show/hide footer (default: true)
  pageId?: string;              // Unique page identifier for audit
  enableAudit?: boolean;        // Enable layout audit (default: false)
}
```

**Usage Example:**
```tsx
import BaseLayout from '@/components/layout/BaseLayout';

export default function DashboardPage() {
  return (
    <BaseLayout 
      pageId="admin-dashboard"
      enableAudit={process.env.NODE_ENV === 'development'}
    >
      <h1>Dashboard Content</h1>
      {/* Your page content */}
    </BaseLayout>
  );
}
```

**Features:**
- Automatic role detection via `useAuth` hook
- Responsive sidebar collapse on mobile
- Loading states for authentication
- Layout audit integration
- Flexible component visibility control

---

### 2. BaseHeader (`src/components/layout/BaseHeader.tsx`)

Responsive header with user profile, navigation, and actions.

**Features:**
- Mobile menu toggle button
- Breadcrumb navigation
- User profile display with avatar
- Role name badge
- Desktop navigation links (Dashboard, Reports, Settings)
- Dark mode toggle
- Logout button
- Separate mobile user info bar

**Mobile Behavior:**
- Hamburger menu toggle
- Collapsible navigation
- User info moves below header bar

---

### 3. BaseSidebar (`src/components/layout/BaseSidebar.tsx`)

Collapsible sidebar with role-based menu items.

**Features:**
- Dynamic menu items based on user role
- Icon mapping from lucide-react
- Active route highlighting
- Mobile overlay with backdrop
- Collapsible for desktop
- Role badge display
- Version information in footer

**Mobile Behavior:**
- Slides in from left
- Overlay backdrop
- Closes on navigation
- Swipe gesture support (optional)

---

### 4. BaseFooter (`src/components/layout/BaseFooter.tsx`)

Footer with copyright, legal links, and system status.

**Features:**
- Dynamic copyright year
- Legal links (Privacy Policy, Terms of Service, Support)
- System operational status indicator
- Responsive layout

---

## ⚙️ Configuration

### Role Layout Configuration (`src/config/roleLayoutConfig.ts`)

Central configuration file defining role-based layout behavior.

**Structure:**
```typescript
interface RoleLayoutConfig {
  showHeader: boolean;
  showSidebar: boolean;
  showFooter: boolean;
  menuItems: MenuItem[];
  allowedPages: string[];
}

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: string;          // lucide-react icon name
  badge?: string;        // Optional badge text
}
```

**Supported Roles:**
- `SUPER_ADMIN` - Full system access
- `ADMIN` - Administrative functions
- `MANAGER` - Management operations
- `STAFF` - Hub operations
- `CFO` - Financial oversight
- `IT_ADMIN` - Technical administration
- `DEFAULT` - Basic access

**Helper Functions:**
```typescript
// Check if role has access to a page
hasPageAccess(role: UserRole, pagePath: string): boolean

// Get menu items for a role
getMenuItemsForRole(role: UserRole): MenuItem[]
```

**Adding a New Role:**
```typescript
// In roleLayoutConfig.ts
export const roleLayoutConfig: Record<string, RoleLayoutConfig> = {
  // ... existing roles
  
  CUSTOM_ROLE: {
    showHeader: true,
    showSidebar: true,
    showFooter: true,
    menuItems: [
      {
        id: 'custom-home',
        label: 'Home',
        href: '/custom/home',
        icon: 'Home'
      },
      // ... more items
    ],
    allowedPages: ['/custom/*']
  }
};
```

---

## 🔍 Layout Audit System

### Runtime Audit Hook (`src/hooks/useLayoutAudit.ts`)

React hook that performs real-time layout checks during development.

**Checks Performed:**
1. ✅ Header presence
2. ✅ Sidebar presence
3. ✅ Footer presence
4. ✅ Horizontal overflow detection
5. ✅ Z-index conflicts
6. ✅ Duplicate ID detection
7. ✅ Main content area presence
8. ✅ Consistent padding
9. ✅ Viewport meta tag
10. ✅ Logout button presence

**Usage:**
```typescript
import { useLayoutAudit } from '@/hooks/useLayoutAudit';

function MyPage() {
  const auditResults = useLayoutAudit('my-page', true);
  
  // Access audit results
  console.log(auditResults.score);      // 0-100
  console.log(auditResults.errors);     // Error count
  console.log(auditResults.warnings);   // Warning count
  console.log(auditResults.checks);     // Detailed checks
}
```

**Output Example:**
```javascript
{
  checks: [
    { name: 'Header Presence', passed: true, message: 'Header component found', level: 'critical' },
    { name: 'Horizontal Overflow', passed: false, message: 'Overflow detected', level: 'warning' }
  ],
  score: 85,
  errors: 1,
  warnings: 2
}
```

---

### Batch Audit Script (`scripts/layoutAudit.js`)

Node.js script for auditing all pages in the application.

**Checks Performed:**
1. ✅ BaseLayout import statement
2. ✅ BaseLayout wrapper usage
3. ✅ Standalone header/sidebar/footer components (should be removed)
4. ✅ Authentication check
5. ✅ Responsive CSS classes
6. ✅ Accessibility props
7. ✅ Duplicate component usage
8. ✅ Hardcoded styles (should use Tailwind)

**Usage:**
```bash
# Audit all pages
npm run layout:audit

# Audit specific page
npm run layout:audit:page -- admin

# Generate visual summary
npm run layout:audit:visual
```

**Output:**
```
🔍 Layout Audit Report
====================

📄 Page: /admin/page.tsx
  ✓ BaseLayout import found
  ✓ BaseLayout wrapper used
  ✓ No standalone components
  ✓ Auth check present
  ✗ Missing responsive classes
  ✓ Accessibility props present
  
  Score: 85/100
  Errors: 1
  Warnings: 2
  
Summary:
  Total pages: 12
  Passed: 8
  Failed: 4
  Average score: 78/100
```

---

## 🎨 Visual Layout Summaries

### Layout Summary Generator (`src/utils/layoutSummaryGenerator.ts`)

TypeScript utility for generating visual layout documentation.

**Features:**
- JSON structure export
- HTML visual report
- SVG diagram generation
- Component position mapping
- Responsive breakpoint documentation

**Usage:**
```typescript
import { generateLayoutSummary } from '@/utils/layoutSummaryGenerator';

const summary = generateLayoutSummary('ADMIN', {
  showHeader: true,
  showSidebar: true,
  showFooter: true
});

console.log(summary.json);   // JSON structure
console.log(summary.html);   // HTML report
console.log(summary.svg);    // SVG diagram
```

---

### Visual Summary CLI (`scripts/generateVisualSummary.js`)

Node.js script for batch generation of visual summaries.

**Usage:**
```bash
# Generate for all roles
npm run layout:visual

# Generate for specific role
npm run layout:visual:role -- ADMIN

# Generate specific format only
npm run layout:visual:format -- html
```

**Output Files:**
```
layout-exports/
  ├── layout-admin-2025-01-14.json
  ├── layout-admin-2025-01-14.html
  ├── layout-admin-2025-01-14.svg
  ├── layout-manager-2025-01-14.json
  ├── layout-manager-2025-01-14.html
  └── layout-manager-2025-01-14.svg
```

**HTML Report Features:**
- Interactive component visualization
- Metadata display (version, timestamp, role)
- Visual layout diagram with hover effects
- Component details cards
- Responsive breakpoints
- Feature badges
- Color-coded legend

---

## 📌 Version Management

### Version Tracking (`layoutVersion.json`)

JSON file tracking layout system versions and changes.

**Structure:**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-14T12:00:00.000Z",
  "hash": "abc123def456",
  "components": {
    "BaseLayout": {
      "version": "1.0.0",
      "path": "src/components/layout/BaseLayout.tsx",
      "lastModified": "2025-01-14T12:00:00.000Z"
    }
  },
  "features": [
    "role-based-visibility",
    "responsive-design",
    "dark-mode-support"
  ],
  "changelog": [
    {
      "version": "1.0.0",
      "date": "2025-01-14",
      "changes": ["Initial release"]
    }
  ]
}
```

---

### Version Update Script (`scripts/updateLayoutVersion.js`)

Automatically updates version tracking when layout components change.

**Usage:**
```bash
npm run layout:version
```

**Features:**
- Calculates MD5 hash of all layout components
- Detects changes automatically
- Increments version number
- Updates component timestamps
- Adds changelog entries
- Creates notification file for dependent modules

**Output:**
```
🔄 Updating layout version...

✅ Version updated: 1.0.0 → 1.0.1
📝 Hash: abc123def456
📅 Last updated: 2025-01-14T12:00:00.000Z

📢 Notifying dependent modules...
✅ Notification created: .layout-update-notification
```

---

## 📖 Migration Guide

### Converting Existing Pages to BaseLayout

**Before:**
```tsx
// Old approach with separate components
import TopNavbar from '@/components/TopNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import Footer from '@/components/Footer';

export default function DashboardPage() {
  return (
    <>
      <TopNavbar title="Dashboard" />
      <div className="flex">
        <DashboardSidebar />
        <main className="flex-1 p-6">
          {/* Content */}
        </main>
      </div>
      <Footer />
    </>
  );
}
```

**After:**
```tsx
// New approach with BaseLayout
import BaseLayout from '@/components/layout/BaseLayout';

export default function DashboardPage() {
  return (
    <BaseLayout pageId="dashboard" enableAudit={true}>
      {/* Content - layout handled automatically */}
    </BaseLayout>
  );
}
```

**Migration Steps:**

1. **Remove old imports:**
   ```tsx
   // Remove these
   import TopNavbar from '@/components/TopNavbar';
   import DashboardSidebar from '@/components/DashboardSidebar';
   import Footer from '@/components/Footer';
   ```

2. **Add BaseLayout import:**
   ```tsx
   import BaseLayout from '@/components/layout/BaseLayout';
   ```

3. **Wrap content with BaseLayout:**
   ```tsx
   <BaseLayout pageId="unique-page-id">
     {/* Your existing content */}
   </BaseLayout>
   ```

4. **Remove layout wrapper divs:**
   - Remove flex containers
   - Remove sidebar/main structure
   - Keep only your page content

5. **Test responsive behavior:**
   - Mobile view
   - Tablet view
   - Desktop view

6. **Run layout audit:**
   ```bash
   npm run layout:audit:page -- your-page
   ```

---

## 🚀 npm Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Audit all pages | `npm run layout:audit` | Run layout audit on all pages |
| Audit specific page | `npm run layout:audit:page -- admin` | Audit single page |
| Audit with visuals | `npm run layout:audit:visual` | Audit + generate visual summaries |
| Generate visuals | `npm run layout:visual` | Generate visual summaries for all roles |
| Visual for role | `npm run layout:visual:role -- ADMIN` | Generate for specific role |
| Visual format | `npm run layout:visual:format -- html` | Generate specific format |
| Update version | `npm run layout:version` | Update layout version tracking |

---

## 🛠️ Customization

### Adding Custom Menu Items

Edit `src/config/roleLayoutConfig.ts`:

```typescript
export const roleLayoutConfig: Record<string, RoleLayoutConfig> = {
  ADMIN: {
    menuItems: [
      // ... existing items
      {
        id: 'custom-reports',
        label: 'Custom Reports',
        href: '/admin/custom-reports',
        icon: 'FileText',
        badge: 'New'
      }
    ]
  }
};
```

### Customizing Header

Edit `src/components/layout/BaseHeader.tsx`:

```tsx
// Add custom navigation links
const navLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Reports', href: '/reports' },
  { label: 'Settings', href: '/settings' },
  { label: 'Custom', href: '/custom' }  // Add here
];
```

### Customizing Sidebar Width

Edit `src/components/layout/BaseSidebar.tsx`:

```tsx
// Change width classes
<div className={`
  fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 
  border-r border-gray-200 dark:border-gray-700 transition-all duration-300
  ${isCollapsed ? 'w-20' : 'w-72'}  // Change from w-64 to w-72
`}>
```

### Adding New Audit Checks

Edit `src/hooks/useLayoutAudit.ts`:

```typescript
// Add custom check
const checkCustomFeature = useCallback(() => {
  const hasFeature = document.querySelector('[data-custom-feature]');
  checks.push({
    name: 'Custom Feature',
    passed: !!hasFeature,
    message: hasFeature 
      ? 'Custom feature implemented' 
      : 'Custom feature missing',
    level: 'warning'
  });
}, []);

// Call in useEffect
useEffect(() => {
  // ... existing checks
  checkCustomFeature();
}, [/* dependencies */]);
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Sidebar not showing on mobile:**
- Ensure mobile menu toggle button is working
- Check `isMobile` state detection
- Verify z-index values

**2. Dark mode not switching:**
- Check DarkModeToggle component integration
- Verify Tailwind dark mode configuration
- Ensure `dark` class on html element

**3. Role-based menus not working:**
- Verify user is authenticated
- Check role value from useAuth hook
- Confirm role exists in roleLayoutConfig

**4. Layout audit failing:**
- Run `npm run layout:audit` to see specific issues
- Check console for detailed error messages
- Verify BaseLayout wrapper is used correctly

**5. Avatar not displaying:**
- Check user data from useAuth
- Verify image URL is valid
- Fallback to initials should work automatically

---

## 📊 Performance Considerations

### Optimizations Included

1. **Code Splitting:** Layout components are bundled separately
2. **Lazy Loading:** Sidebar icons loaded on demand
3. **Memoization:** Menu items and audit checks memoized
4. **Debouncing:** Resize events debounced
5. **CSS Transitions:** GPU-accelerated animations

### Best Practices

- Enable audit only in development
- Use `pageId` for better audit tracking
- Minimize custom styles, use Tailwind
- Keep menu items under 10 per role
- Test on mobile devices regularly

---

## 📝 API Reference

### BaseLayout Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | Required | Page content |
| `showHeader` | `boolean` | `true` | Show/hide header |
| `showSidebar` | `boolean` | `true` | Show/hide sidebar |
| `showFooter` | `boolean` | `true` | Show/hide footer |
| `pageId` | `string` | `undefined` | Unique page identifier |
| `enableAudit` | `boolean` | `false` | Enable layout audit |

### useLayoutAudit Return Value

```typescript
interface LayoutAuditResult {
  checks: AuditCheck[];
  score: number;          // 0-100
  errors: number;         // Count of errors
  warnings: number;       // Count of warnings
}

interface AuditCheck {
  name: string;
  passed: boolean;
  message: string;
  level: 'critical' | 'error' | 'warning' | 'info';
}
```

---

## 🎓 Examples

See the example page at `/example` for a complete demonstration of BaseLayout features.

**File:** `src/app/example/page.tsx`

---

## 📞 Support

For questions or issues:
1. Check this documentation
2. Run layout audit for diagnostics
3. Review example page implementation
4. Contact development team

---

## 📜 License

This layout system is part of the BISMAN ERP project and follows the project's licensing terms.

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Maintainer:** BISMAN ERP Development Team
