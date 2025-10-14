# Layout Building Guidelines

> **Comprehensive standards and best practices for building layouts in the BISMAN ERP system**

This document provides detailed guidelines for developers to build consistent, accessible, and performant layouts. Following these guidelines ensures that pages pass all 8 categories of the layout audit system.

---

## Table of Contents

1. [Component Structure & Presence](#1-component-structure--presence)
2. [Responsiveness & Mobile Compatibility](#2-responsiveness--mobile-compatibility)
3. [Positioning & Overlaps](#3-positioning--overlaps)
4. [Spacing & Consistency](#4-spacing--consistency)
5. [Role-Based Visibility & Access](#5-role-based-visibility--access)
6. [Performance & Load](#6-performance--load)
7. [Interactivity & Functionality](#7-interactivity--functionality)
8. [Audit Reporting](#8-audit-reporting)
9. [Quick Reference Checklist](#quick-reference-checklist)

---

## 1. Component Structure & Presence

### Overview
Ensures proper component hierarchy, prevents duplicates, and maintains semantic HTML structure.

### Standards

#### ✅ Single Header/Footer Rule
- **Requirement**: Every page should have exactly ONE header and ONE footer
- **Implementation**:
  ```tsx
  // ✅ GOOD - Using BaseLayout
  import { BaseLayout } from '@/components/layout/BaseLayout';
  
  export default function MyPage() {
    return (
      <BaseLayout>
        <main className="p-6">
          {/* Your content */}
        </main>
      </BaseLayout>
    );
  }
  
  // ❌ BAD - Multiple headers
  export default function MyPage() {
    return (
      <>
        <header>Header 1</header>
        <header>Header 2</header> {/* Duplicate! */}
        <main>Content</main>
      </>
    );
  }
  ```

#### ✅ Main Content Area
- **Requirement**: Use semantic `<main>` tag or `role="main"` for primary content
- **Implementation**:
  ```tsx
  // ✅ GOOD
  <main className="flex-1 p-6">
    <h1>Page Title</h1>
    {/* Content */}
  </main>
  
  // ✅ ALSO GOOD
  <div role="main" className="flex-1 p-6">
    <h1>Page Title</h1>
    {/* Content */}
  </div>
  
  // ❌ BAD - No semantic main
  <div className="content">
    {/* Content */}
  </div>
  ```

#### ✅ Proper Heading Hierarchy
- **Requirement**: Headings must follow sequential order (h1 → h2 → h3, no skipping)
- **Implementation**:
  ```tsx
  // ✅ GOOD
  <main>
    <h1>Main Title</h1>
    <section>
      <h2>Section Title</h2>
      <h3>Subsection Title</h3>
    </section>
  </main>
  
  // ❌ BAD - Skips h2
  <main>
    <h1>Main Title</h1>
    <h3>Subsection Title</h3> {/* Missing h2! */}
  </main>
  ```

#### ✅ No Empty Sections
- **Requirement**: Avoid empty `<section>` tags without content
- **Implementation**:
  ```tsx
  // ✅ GOOD
  {data.length > 0 && (
    <section className="mt-6">
      <h2>Results</h2>
      {data.map(item => <div key={item.id}>{item.name}</div>)}
    </section>
  )}
  
  // ❌ BAD - Empty section
  <section className="mt-6">
    {/* Nothing here */}
  </section>
  ```

### Audit Checks
- ✅ Exactly 1 header element
- ✅ Exactly 1 footer element
- ✅ Main content area present
- ✅ Sequential heading hierarchy
- ✅ No empty sections

---

## 2. Responsiveness & Mobile Compatibility

### Overview
Ensures layouts work seamlessly across all device sizes (mobile, tablet, desktop).

### Standards

#### ✅ Mobile-First Design
- **Requirement**: Design for mobile first, then enhance for larger screens
- **Implementation**:
  ```tsx
  // ✅ GOOD - Mobile-first with Tailwind
  <div className="
    w-full           // Full width on mobile
    p-4              // Padding on mobile
    md:w-1/2         // Half width on tablet
    md:p-6           // More padding on tablet
    lg:w-1/3         // One-third on desktop
    lg:p-8           // Even more padding on desktop
  ">
    Content
  </div>
  
  // ❌ BAD - Fixed width
  <div style={{ width: '1200px' }}>
    Content
  </div>
  ```

#### ✅ No Horizontal Overflow
- **Requirement**: Page should never scroll horizontally on any device
- **Implementation**:
  ```tsx
  // ✅ GOOD
  <div className="w-full max-w-screen-xl mx-auto overflow-hidden">
    <img src="/image.jpg" className="w-full h-auto" />
  </div>
  
  // ❌ BAD - Can cause overflow
  <div>
    <img src="/image.jpg" width="1500" /> {/* Fixed width! */}
  </div>
  ```

#### ✅ Mobile Menu Implementation
- **Requirement**: Provide collapsible menu for mobile screens
- **Implementation**:
  ```tsx
  // ✅ GOOD - BaseLayout handles this automatically
  import { BaseLayout } from '@/components/layout/BaseLayout';
  
  export default function MyPage() {
    return <BaseLayout>{/* content */}</BaseLayout>;
  }
  
  // If implementing custom menu:
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden"
        aria-label="Toggle mobile menu"
      >
        <Menu />
      </button>
      
      {/* Mobile Menu */}
      <nav className={`
        md:block
        ${isMobileMenuOpen ? 'block' : 'hidden'}
      `}>
        {/* Menu items */}
      </nav>
    </>
  );
  ```

#### ✅ Responsive Images
- **Requirement**: Images must scale with container and not exceed max-width
- **Implementation**:
  ```tsx
  // ✅ GOOD
  <img 
    src="/image.jpg" 
    alt="Description"
    className="w-full h-auto max-w-full"
  />
  
  // ✅ BETTER - Next.js Image with optimization
  import Image from 'next/image';
  
  <Image
    src="/image.jpg"
    alt="Description"
    width={800}
    height={600}
    className="w-full h-auto"
  />
  
  // ❌ BAD - Fixed dimensions
  <img src="/image.jpg" width="1200" height="800" />
  ```

#### ✅ Breakpoint Usage
- **Standard Breakpoints** (Tailwind):
  - `sm`: 640px
  - `md`: 768px
  - `lg`: 1024px
  - `xl`: 1280px
  - `2xl`: 1536px

### Audit Checks
- ✅ No horizontal overflow
- ✅ Viewport meta tag present
- ✅ No fixed widths > 768px
- ✅ Mobile menu toggle present
- ✅ Responsive images with max-width

---

## 3. Positioning & Overlaps

### Overview
Prevents z-index conflicts and element overlaps through proper positioning standards.

### Standards

#### ✅ Z-Index Standards
- **Standard Layers**:
  - **Modals/Overlays**: `z-50`
  - **Sidebar**: `z-40`
  - **Header**: `z-30`
  - **Footer**: `z-20`
  - **Content**: `z-10` or `auto`
  
- **Implementation**:
  ```tsx
  // ✅ GOOD - Following standards
  <header className="sticky top-0 z-30">Header</header>
  <aside className="fixed left-0 z-40">Sidebar</aside>
  <footer className="relative z-20">Footer</footer>
  <div className="modal fixed inset-0 z-50">Modal</div>
  
  // ❌ BAD - Random z-index values
  <header className="z-[9999]">Header</header>
  <aside className="z-[10000]">Sidebar</aside>
  ```

#### ✅ Avoid Excessive Absolute Positioning
- **Requirement**: Prefer flexbox/grid over absolute positioning
- **Implementation**:
  ```tsx
  // ✅ GOOD - Flexbox layout
  <div className="flex items-center justify-between">
    <div>Left Content</div>
    <div>Right Content</div>
  </div>
  
  // ✅ GOOD - Grid layout
  <div className="grid grid-cols-3 gap-4">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
  </div>
  
  // ❌ BAD - Unnecessary absolute positioning
  <div className="relative">
    <div className="absolute left-0">Left</div>
    <div className="absolute right-0">Right</div>
  </div>
  ```

#### ✅ Prevent Element Overlaps
- **Requirement**: Ensure elements don't unintentionally overlap
- **Testing**: Use browser dev tools to inspect element boundaries
- **Implementation**:
  ```tsx
  // ✅ GOOD - Proper spacing
  <div className="space-y-4">
    <div className="p-4 bg-white">Card 1</div>
    <div className="p-4 bg-white">Card 2</div>
  </div>
  
  // ❌ BAD - Negative margins causing overlap
  <div>
    <div className="p-4 bg-white -mb-10">Card 1</div>
    <div className="p-4 bg-white">Card 2</div> {/* Overlaps! */}
  </div>
  ```

### Audit Checks
- ✅ Header z-index is 30
- ✅ Sidebar z-index is 40
- ✅ Footer z-index is 20
- ✅ No unintended element overlaps
- ✅ Minimal use of absolute positioning

---

## 4. Spacing & Consistency

### Overview
Maintains consistent spacing throughout the application using design tokens.

### Standards

#### ✅ Tailwind Spacing Scale
- **Standard Values** (in `rem` units):
  - `0`: 0
  - `0.5`: 0.125rem (2px)
  - `1`: 0.25rem (4px)
  - `2`: 0.5rem (8px)
  - `3`: 0.75rem (12px)
  - `4`: 1rem (16px)
  - `5`: 1.25rem (20px)
  - `6`: 1.5rem (24px)
  - `8`: 2rem (32px)
  - `10`: 2.5rem (40px)
  - `12`: 3rem (48px)
  - `16`: 4rem (64px)
  - `20`: 5rem (80px)
  - `24`: 6rem (96px)

- **Implementation**:
  ```tsx
  // ✅ GOOD - Using Tailwind spacing
  <div className="p-6 m-4 space-y-4">
    <div className="mb-8">Content</div>
  </div>
  
  // ❌ BAD - Custom spacing values
  <div style={{ padding: '23px', margin: '17px' }}>
    Content
  </div>
  ```

#### ✅ Consistent Gaps
- **Requirement**: Use consistent gap values for flex/grid containers
- **Recommended Gaps**:
  - Small: `gap-2` (8px)
  - Medium: `gap-4` (16px)
  - Large: `gap-6` (24px)
  
- **Implementation**:
  ```tsx
  // ✅ GOOD
  <div className="flex gap-4">
    <div>Item 1</div>
    <div>Item 2</div>
  </div>
  
  <div className="grid grid-cols-3 gap-6">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
  </div>
  
  // ❌ BAD - Inconsistent gaps
  <div className="flex gap-3">
    <div>Item 1</div>
    <div>Item 2</div>
  </div>
  <div className="flex gap-7">
    <div>Item 3</div>
    <div>Item 4</div>
  </div>
  ```

#### ✅ Content Padding
- **Requirement**: Main content should have minimum 16px padding
- **Implementation**:
  ```tsx
  // ✅ GOOD
  <main className="p-6">
    Content
  </main>
  
  // ✅ ALSO GOOD - Responsive padding
  <main className="p-4 md:p-6 lg:p-8">
    Content
  </main>
  
  // ❌ BAD - Insufficient padding
  <main className="p-1">
    Content
  </main>
  ```

### Audit Checks
- ✅ Spacing values follow Tailwind scale
- ✅ Main content has adequate padding (≥ 16px)
- ✅ Consistent gap values across containers
- ✅ No arbitrary spacing values

---

## 5. Role-Based Visibility & Access

### Overview
Ensures proper role-based access control and visibility for UI elements.

### Standards

#### ✅ Using roleLayoutConfig
- **Requirement**: All role-based visibility should reference `roleLayoutConfig`
- **Implementation**:
  ```tsx
  import { roleLayoutConfig } from '@/config/roleLayoutConfig';
  import { useAuth } from '@/hooks/useAuth';
  
  export default function MyPage() {
    const { user } = useAuth();
    
    if (!user) return <div>Loading...</div>;
    
    // Get role config
    const config = roleLayoutConfig[user.role];
    
    return (
      <div>
        {/* Show dashboard widgets based on role */}
        {config.dashboardWidgets.sales && <SalesWidget />}
        {config.dashboardWidgets.inventory && <InventoryWidget />}
        
        {/* Show menu items based on role */}
        <nav>
          {config.menuItems.map((item) => (
            <Link key={item.path} href={item.path}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    );
  }
  ```

#### ✅ Data Attributes for Role Elements
- **Requirement**: Add `data-role` or `data-roles` attributes to role-specific elements
- **Implementation**:
  ```tsx
  // ✅ GOOD - With data attributes
  {user.role === 'ADMIN' && (
    <div data-role="ADMIN" className="admin-panel">
      Admin Controls
    </div>
  )}
  
  // Multiple roles
  {['ADMIN', 'MANAGER'].includes(user.role) && (
    <div data-roles="ADMIN,MANAGER" className="management-panel">
      Management Controls
    </div>
  )}
  
  // ❌ BAD - No data attributes
  {user.role === 'ADMIN' && (
    <div className="admin-panel">
      Admin Controls
    </div>
  )}
  ```

#### ✅ Proper Role Checking
- **Requirement**: Always check user authentication and role before rendering
- **Implementation**:
  ```tsx
  // ✅ GOOD
  'use client';
  import { useAuth } from '@/hooks/useAuth';
  import { redirect } from 'next/navigation';
  
  export default function AdminPage() {
    const { user, loading } = useAuth();
    
    if (loading) return <div>Loading...</div>;
    if (!user) redirect('/auth/login');
    if (user.role !== 'ADMIN') redirect('/unauthorized');
    
    return <div>Admin Content</div>;
  }
  
  // ❌ BAD - No auth check
  export default function AdminPage() {
    return <div>Admin Content</div>; // Anyone can access!
  }
  ```

#### ✅ Hide vs Remove
- **Best Practice**: Use `display: none` for hiding, not just `opacity: 0`
- **Implementation**:
  ```tsx
  // ✅ GOOD - Completely hidden
  {user.role === 'ADMIN' ? (
    <div>Admin Content</div>
  ) : null}
  
  // ✅ ALSO GOOD - With CSS
  <div className={user.role !== 'ADMIN' ? 'hidden' : ''}>
    Admin Content
  </div>
  
  // ❌ BAD - Still in DOM and accessible
  <div className={user.role !== 'ADMIN' ? 'opacity-0' : ''}>
    Admin Content
  </div>
  ```

### Audit Checks
- ✅ User authentication verified
- ✅ Role-based elements have data attributes
- ✅ Navigation items match role permissions
- ✅ Hidden elements use proper CSS
- ✅ No unauthorized content visible

---

## 6. Performance & Load

### Overview
Optimizes page performance through efficient DOM structure and resource loading.

### Standards

#### ✅ DOM Depth Limit
- **Requirement**: Maximum DOM nesting depth should be ≤ 15 levels
- **Implementation**:
  ```tsx
  // ✅ GOOD - Flat structure
  <div className="container">
    <div className="grid grid-cols-3 gap-4">
      {items.map(item => (
        <Card key={item.id} data={item} />
      ))}
    </div>
  </div>
  
  // ❌ BAD - Deep nesting
  <div><div><div><div><div><div><div><div>
    <div><div><div><div><div><div><div><div>
      Content
    </div></div></div></div></div></div></div></div>
  </div></div></div></div></div></div></div></div>
  ```

#### ✅ DOM Node Limit
- **Requirement**: Keep total DOM nodes under 1500 per page
- **Solutions**:
  - Use pagination for long lists
  - Implement virtual scrolling for large datasets
  - Lazy load content sections
  
- **Implementation**:
  ```tsx
  // ✅ GOOD - Pagination
  import { useState } from 'react';
  
  export default function ItemList({ items }) {
    const [page, setPage] = useState(1);
    const itemsPerPage = 20;
    const displayedItems = items.slice(0, page * itemsPerPage);
    
    return (
      <>
        <div className="grid grid-cols-3 gap-4">
          {displayedItems.map(item => (
            <Card key={item.id} data={item} />
          ))}
        </div>
        {items.length > displayedItems.length && (
          <button onClick={() => setPage(p => p + 1)}>
            Load More
          </button>
        )}
      </>
    );
  }
  
  // ❌ BAD - Rendering everything at once
  export default function ItemList({ items }) {
    return (
      <div>
        {items.map(item => <Card key={item.id} data={item} />)}
      </div>
    );
  }
  ```

#### ✅ Image Optimization
- **Requirement**: Use lazy loading and optimize image sizes
- **Implementation**:
  ```tsx
  // ✅ GOOD - Next.js Image with lazy loading
  import Image from 'next/image';
  
  <Image
    src="/image.jpg"
    alt="Description"
    width={800}
    height={600}
    loading="lazy"
    className="w-full h-auto"
  />
  
  // ✅ ALSO GOOD - Native lazy loading
  <img
    src="/image.jpg"
    alt="Description"
    loading="lazy"
    className="w-full h-auto"
  />
  
  // ❌ BAD - No lazy loading, large file
  <img src="/image.jpg" alt="Description" />
  ```

#### ✅ Avoid Inline Styles
- **Requirement**: Use CSS classes instead of inline styles
- **Implementation**:
  ```tsx
  // ✅ GOOD - Tailwind classes
  <div className="p-6 bg-white rounded-lg shadow-md">
    Content
  </div>
  
  // ❌ BAD - Inline styles
  <div style={{ padding: '24px', background: 'white', borderRadius: '8px' }}>
    Content
  </div>
  ```

### Audit Checks
- ✅ DOM depth ≤ 15 levels
- ✅ Total DOM nodes < 1500
- ✅ Images use lazy loading
- ✅ Large images optimized
- ✅ Minimal inline styles (< 20)

---

## 7. Interactivity & Functionality

### Overview
Ensures interactive elements are functional, accessible, and user-friendly.

### Standards

#### ✅ Button Functionality
- **Requirement**: All buttons must have click handlers or form submission
- **Implementation**:
  ```tsx
  // ✅ GOOD - With onClick
  <button
    onClick={() => handleAction()}
    className="px-4 py-2 bg-blue-500 text-white rounded"
  >
    Click Me
  </button>
  
  // ✅ GOOD - Form submit button
  <form onSubmit={handleSubmit}>
    <button type="submit" className="btn-primary">
      Submit
    </button>
  </form>
  
  // ❌ BAD - No functionality
  <button className="px-4 py-2 bg-blue-500">
    Does Nothing
  </button>
  ```

#### ✅ Link Functionality
- **Requirement**: All links must have valid `href` attributes
- **Implementation**:
  ```tsx
  // ✅ GOOD
  import Link from 'next/link';
  
  <Link href="/dashboard" className="text-blue-500">
    Go to Dashboard
  </Link>
  
  // ✅ ALSO GOOD - External link
  <a href="https://example.com" target="_blank" rel="noopener noreferrer">
    External Link
  </a>
  
  // ❌ BAD - No href
  <a className="text-blue-500">
    Broken Link
  </a>
  ```

#### ✅ Form Accessibility
- **Requirement**: All form inputs must have associated labels
- **Implementation**:
  ```tsx
  // ✅ GOOD - Label with htmlFor
  <div>
    <label htmlFor="email" className="block mb-2">
      Email Address
    </label>
    <input
      id="email"
      type="email"
      className="w-full px-4 py-2 border rounded"
    />
  </div>
  
  // ✅ ALSO GOOD - aria-label
  <input
    type="email"
    aria-label="Email Address"
    className="w-full px-4 py-2 border rounded"
  />
  
  // ❌ BAD - No label
  <input
    type="email"
    className="w-full px-4 py-2 border rounded"
  />
  ```

#### ✅ Keyboard Accessibility
- **Requirement**: Interactive elements must be keyboard accessible
- **Implementation**:
  ```tsx
  // ✅ GOOD - Native button (keyboard accessible by default)
  <button onClick={handleClick}>
    Click Me
  </button>
  
  // ✅ GOOD - Custom element with keyboard support
  <div
    role="button"
    tabIndex={0}
    onClick={handleClick}
    onKeyPress={(e) => e.key === 'Enter' && handleClick()}
    className="cursor-pointer"
  >
    Custom Button
  </div>
  
  // ❌ BAD - Not keyboard accessible
  <div
    onClick={handleClick}
    tabIndex={-1}
    className="cursor-pointer"
  >
    Broken Button
  </div>
  ```

#### ✅ Dark Mode Support
- **Requirement**: Components should support dark mode
- **Implementation**:
  ```tsx
  // ✅ GOOD - Dark mode classes
  <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
    Content
  </div>
  
  // ✅ GOOD - Dark mode toggle
  import { useState, useEffect } from 'react';
  
  export function DarkModeToggle() {
    const [isDark, setIsDark] = useState(false);
    
    useEffect(() => {
      const isDarkMode = localStorage.getItem('darkMode') === 'true';
      setIsDark(isDarkMode);
      document.documentElement.classList.toggle('dark', isDarkMode);
    }, []);
    
    const toggle = () => {
      const newMode = !isDark;
      setIsDark(newMode);
      localStorage.setItem('darkMode', String(newMode));
      document.documentElement.classList.toggle('dark', newMode);
    };
    
    return (
      <button onClick={toggle} aria-label="Toggle dark mode">
        {isDark ? '🌙' : '☀️'}
      </button>
    );
  }
  
  // ❌ BAD - No dark mode support
  <div className="bg-white text-black">
    Content
  </div>
  ```

#### ✅ ARIA Labels
- **Requirement**: Semantic elements should have appropriate ARIA labels
- **Implementation**:
  ```tsx
  // ✅ GOOD
  <nav aria-label="Main navigation">
    <ul>{/* Nav items */}</ul>
  </nav>
  
  <aside aria-label="Sidebar">
    {/* Sidebar content */}
  </aside>
  
  <main aria-label="Main content">
    {/* Page content */}
  </main>
  
  // ❌ BAD - No ARIA labels
  <nav>
    <ul>{/* Nav items */}</ul>
  </nav>
  ```

### Audit Checks
- ✅ Buttons have click handlers
- ✅ Links have valid href
- ✅ Form inputs have labels
- ✅ Elements are keyboard accessible
- ✅ Dark mode toggle present
- ✅ ARIA labels on semantic elements

---

## 8. Audit Reporting

### Overview
Guidelines for running audits and interpreting results.

### Running Audits

#### Manual Audit
```tsx
import { useLayoutAudit } from '@/hooks/useLayoutAudit';

export default function MyPage() {
  const { auditResult, isAuditing, runAudit } = useLayoutAudit({
    verbose: true, // Log to console
    skipCategories: [], // Optional: skip categories
  });
  
  return (
    <div>
      <button onClick={runAudit} disabled={isAuditing}>
        {isAuditing ? 'Running Audit...' : 'Run Audit'}
      </button>
      
      {auditResult && (
        <div className="mt-4">
          <h2>Audit Results</h2>
          <p>Score: {((auditResult.passed / auditResult.totalChecks) * 100).toFixed(1)}%</p>
          <p>Errors: {auditResult.errors.length}</p>
          <p>Warnings: {auditResult.warnings.length}</p>
        </div>
      )}
    </div>
  );
}
```

#### Automatic Audit (On Page Load)
```tsx
import { useLayoutAudit } from '@/hooks/useLayoutAudit';

export default function MyPage() {
  // Audit runs automatically after 1 second
  const { auditResult } = useLayoutAudit({ verbose: true });
  
  // Rest of your component
  return <div>Content</div>;
}
```

### Interpreting Results

#### Severity Levels
- **🔴 Error**: Must be fixed immediately (blocks production)
- **⚠️ Warning**: Should be fixed soon (potential issues)
- **ℹ️ Info**: For reference (passed checks or suggestions)

#### Pass/Fail Indicators
- **✅ Pass**: Check succeeded
- **⚠️ Fail**: Check failed

#### Example Report
```
Layout Audit Report - 12/10/2024, 3:45:00 PM
============================================================

Overall Score: 85.5% (47/55 checks passed)

Severity Breakdown:
  🔴 Errors: 2
  ⚠️  Warnings: 6
  ℹ️  Info: 47

Category Breakdown:
  Component Structure: 5/6 passed
  Responsiveness: 5/5 passed
  Positioning: 4/5 passed
  Spacing: 6/7 passed
  Role-Based Access: 4/4 passed
  Performance: 7/8 passed
  Interactivity: 8/9 passed
  Audit Reporting: 8/8 passed

Detailed Findings:

  1. [✅] Component Structure - Header Presence
     Header component found.
     Severity: INFO

  2. [⚠️] Component Structure - Duplicate Footers
     Found 2 footer elements. Should have only one.
     Severity: ERROR
     Details: {"count":2}

  ...
```

### Best Practices
1. **Run audits frequently** during development
2. **Fix errors immediately** before committing code
3. **Address warnings** in next sprint
4. **Review info logs** for optimization opportunities
5. **Run full audit** before production deployment

---

## Quick Reference Checklist

### Before Committing Code

```markdown
Component Structure ✅
- [ ] Single header and footer
- [ ] Main content area with semantic tag
- [ ] Sequential heading hierarchy (h1 → h2 → h3)
- [ ] No empty sections

Responsiveness ✅
- [ ] No horizontal overflow
- [ ] Mobile menu implemented
- [ ] Responsive images with max-width
- [ ] Mobile-first design with breakpoints

Positioning ✅
- [ ] Z-index follows standards (header: 30, sidebar: 40, footer: 20)
- [ ] No element overlaps
- [ ] Minimal absolute positioning

Spacing ✅
- [ ] Using Tailwind spacing scale
- [ ] Main content has ≥16px padding
- [ ] Consistent gap values

Role-Based Access ✅
- [ ] User authentication checked
- [ ] Using roleLayoutConfig
- [ ] Role-based elements have data attributes
- [ ] Proper visibility controls

Performance ✅
- [ ] DOM depth ≤ 15 levels
- [ ] Total nodes < 1500
- [ ] Images use lazy loading
- [ ] Minimal inline styles

Interactivity ✅
- [ ] Buttons have click handlers
- [ ] Links have valid href
- [ ] Form inputs have labels
- [ ] Keyboard accessible
- [ ] Dark mode supported
- [ ] ARIA labels present

Audit ✅
- [ ] Run useLayoutAudit hook
- [ ] Fix all errors
- [ ] Address warnings
- [ ] Review info logs
```

### Common Mistakes to Avoid

❌ **Don't:**
- Use fixed pixel widths for containers
- Create multiple headers/footers
- Skip heading levels (h1 → h3)
- Use random z-index values
- Put inline styles everywhere
- Forget mobile responsiveness
- Skip accessibility attributes
- Ignore role-based access control

✅ **Do:**
- Use BaseLayout for consistent structure
- Follow Tailwind spacing scale
- Check roleLayoutConfig for permissions
- Add ARIA labels to semantic elements
- Test on mobile devices
- Run audits before committing
- Use semantic HTML tags
- Implement dark mode support

---

## Resources

- [BaseLayout Documentation](../components/layout/README.md)
- [roleLayoutConfig Reference](../config/roleLayoutConfig.ts)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [ARIA Best Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)

---

## Support

For questions or issues with layout building:
1. Check this guidelines document
2. Run the layout audit (`useLayoutAudit` hook)
3. Review audit findings
4. Consult team lead if needed

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintained By**: BISMAN ERP Development Team
