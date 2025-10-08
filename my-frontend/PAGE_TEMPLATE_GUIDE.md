# Page Template Guide - Tab Persistence Implementation

## Overview
This guide ensures all new pages implement proper authentication checks and tab persistence across page refreshes.

---

## 1. Page-Level Template (e.g., `/app/your-page/page.tsx`)

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import YourComponent from '@/components/YourComponent';

export default function YourPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // CRITICAL: Wait for auth to complete before checking
    if (loading) {
      return;
    }

    // Check if user is authenticated
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Role-based access control (customize roles as needed)
    if (!user.roleName || !['ALLOWED_ROLE_1', 'ALLOWED_ROLE_2'].includes(user.roleName)) {
      router.push('/dashboard');
      return;
    }
  }, [user, loading, router]);

  // Show loading state while auth is checking
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user || !user.roleName || !['ALLOWED_ROLE_1', 'ALLOWED_ROLE_2'].includes(user.roleName)) {
    return null;
  }

  return <YourComponent />;
}
```

**Key Points:**
- ✅ Always check `if (loading) return;` FIRST
- ✅ Wait for loading to complete before checking user
- ✅ Show loading spinner during auth check
- ✅ Return null if user doesn't have permission

---

## 2. Component-Level Template (with Tabs)

### For Components with Tab Navigation:

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type TabName = 'tab1' | 'tab2' | 'tab3';

export default function YourComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, loading: authLoading } = useAuth();
  
  // Initialize tab from URL or default
  const [activeTab, setActiveTab] = useState<TabName>(
    (searchParams.get('tab') as TabName) || 'tab1'
  );

  // CRITICAL: Wait for auth loading before security checks
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // Security check AFTER loading completes
  if (!user?.roleName || !['ALLOWED_ROLE'].includes(user.roleName)) {
    router.push('/');
    return <div>Access denied. Redirecting...</div>;
  }

  // Sync URL when tab changes
  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    // Update URL to preserve tab on refresh
    router.replace(`/your-page?tab=${tab}`, { scroll: false });
  };

  // Sync state when URL changes (browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get('tab') as TabName;
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => handleTabChange('tab1')}
          className={activeTab === 'tab1' ? 'border-b-2 border-blue-500' : ''}
        >
          Tab 1
        </button>
        <button
          onClick={() => handleTabChange('tab2')}
          className={activeTab === 'tab2' ? 'border-b-2 border-blue-500' : ''}
        >
          Tab 2
        </button>
        <button
          onClick={() => handleTabChange('tab3')}
          className={activeTab === 'tab3' ? 'border-b-2 border-blue-500' : ''}
        >
          Tab 3
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'tab1' && <Tab1Content />}
        {activeTab === 'tab2' && <Tab2Content />}
        {activeTab === 'tab3' && <Tab3Content />}
      </div>
    </div>
  );
}
```

**Key Points:**
- ✅ Initialize tab from `searchParams.get('tab')`
- ✅ Update URL with `router.replace(?tab=...)` when tab changes
- ✅ Use `{ scroll: false }` to prevent page jump
- ✅ Sync state when URL changes (back/forward buttons)
- ✅ Check `authLoading` BEFORE security checks

---

## 3. Component Without Tabs (Simple Page)

```tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function SimpleComponent() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();

  // CRITICAL: Wait for auth loading before security checks
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // Security check AFTER loading completes
  if (!user?.roleName || !['ALLOWED_ROLE'].includes(user.roleName)) {
    router.push('/');
    return <div>Access denied. Redirecting...</div>;
  }

  return (
    <div>
      {/* Your component content */}
      <h1>Your Page Content</h1>
    </div>
  );
}
```

---

## 4. Using localStorage for Complex State (Alternative)

For more complex state that can't be easily stored in URL:

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'your-component-state';

export default function ComponentWithState() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  
  // Load state from localStorage on mount
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || 'default-tab';
    }
    return 'default-tab';
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user?.roleName || !['ALLOWED_ROLE'].includes(user.roleName)) {
    router.push('/');
    return <div>Access denied. Redirecting...</div>;
  }

  return (
    <div>
      {/* Your component with persistent state */}
    </div>
  );
}
```

---

## 5. Checklist for New Pages

When creating a new page, ensure:

### Page Level (`/app/your-page/page.tsx`):
- [ ] Import `useAuth` from `@/hooks/useAuth`
- [ ] Destructure `{ user, loading }` from `useAuth()`
- [ ] Check `if (loading) return;` FIRST in useEffect
- [ ] Check authentication: `if (!user) router.push('/auth/login')`
- [ ] Check authorization: verify `user.roleName` is allowed
- [ ] Show loading spinner while `loading === true`
- [ ] Return `null` if unauthorized

### Component Level (with tabs):
- [ ] Import `useSearchParams` from `next/navigation`
- [ ] Initialize state from URL: `searchParams.get('tab')`
- [ ] Destructure `{ loading: authLoading }` from `useAuth()`
- [ ] Check `if (authLoading) return <Loading />` BEFORE security checks
- [ ] Update URL when tab changes: `router.replace(?tab=...)`
- [ ] Use `{ scroll: false }` option in router.replace
- [ ] Sync state when URL changes in useEffect
- [ ] Run security checks AFTER authLoading is false

---

## 6. Common Pitfalls to Avoid

### ❌ WRONG - Checking before loading completes:
```tsx
useEffect(() => {
  if (!loading) {  // ❌ BAD PATTERN
    if (!user) {
      router.push('/login');
    }
  }
}, [loading, user]);
```

### ✅ CORRECT - Wait for loading first:
```tsx
useEffect(() => {
  if (loading) {  // ✅ GOOD PATTERN
    return;
  }
  if (!user) {
    router.push('/login');
  }
}, [loading, user]);
```

### ❌ WRONG - Security check without loading guard:
```tsx
export default function Component() {
  const { user, logout } = useAuth();  // ❌ Missing loading
  
  if (!user?.roleName) {  // ❌ Runs during loading
    router.push('/');
  }
}
```

### ✅ CORRECT - Check loading first:
```tsx
export default function Component() {
  const { user, logout, loading: authLoading } = useAuth();  // ✅ Get loading
  
  if (authLoading) {  // ✅ Wait for auth
    return <Loading />;
  }
  
  if (!user?.roleName) {  // ✅ Safe to check now
    router.push('/');
  }
}
```

---

## 7. Role-Based Access Control Reference

Common role combinations:

```tsx
// Super Admin only
!['SUPER_ADMIN'].includes(user.roleName)

// Admin and Super Admin
!['ADMIN', 'SUPER_ADMIN'].includes(user.roleName)

// Staff/Hub Incharge
!['STAFF', 'ADMIN', 'MANAGER'].includes(user.roleName)

// Manager and Admin
!['MANAGER', 'ADMIN'].includes(user.roleName)

// All authenticated users (no role check)
if (!user) router.push('/auth/login');
```

---

## 8. Testing Checklist

After creating a new page, test:

- [ ] Login redirects to correct dashboard
- [ ] Unauthorized users are redirected away
- [ ] Page refresh stays on same page
- [ ] Tab refresh stays on same tab (if applicable)
- [ ] Browser back/forward buttons work
- [ ] Direct URL access to specific tab works
- [ ] Loading spinner shows during auth check
- [ ] No flash of wrong content during loading
- [ ] Logout redirects to login page
- [ ] Session expiry redirects to login

---

## 9. Example: Complete Implementation

See working examples in:
- `/app/super-admin/page.tsx` + `/components/SuperAdminControlPanel.tsx`
- `/app/hub-incharge/page.tsx` + `/components/hub-incharge/HubInchargeApp.tsx`
- `/app/admin/page.tsx` + `/components/admin/AdminDashboard.tsx`

---

## 10. Quick Reference

### Must-Have Imports:
```tsx
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
```

### Must-Have Pattern:
```tsx
const { user, loading } = useAuth();

if (loading) return <Loading />;
if (!user) router.push('/login');
if (!allowedRoles.includes(user.roleName)) router.push('/');
```

### Tab Persistence Pattern:
```tsx
const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'default');
const handleTabChange = (tab) => {
  setActiveTab(tab);
  router.replace(`?tab=${tab}`, { scroll: false });
};
```

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify auth middleware is running
3. Check cookie settings in backend
4. Test with different roles
5. Clear browser cache/cookies if behavior is inconsistent

---

**Last Updated:** October 9, 2025
**Version:** 1.0
