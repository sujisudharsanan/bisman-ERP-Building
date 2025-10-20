# ERP Module Integration - Complete Implementation Guide

## ✅ What Has Been Implemented

### Core Infrastructure
- ✅ **RBAC System**: Role-based access control with 60+ permissions
- ✅ **Common Layout**: SuperAdmin layout wrapper for all pages
- ✅ **Auth Hook**: Enhanced useAuth hook with permission checking
- ✅ **Module Structure**: Organized folder hierarchy for all ERP modules

### Created Files & Components

#### 1. Common Infrastructure (`/src/common/`)
```
/common
  ├── /layouts
  │   └── superadmin-layout.tsx          # Main layout wrapper (102 lines)
  ├── /rbac
  │   └── rolePermissions.ts             # RBAC configuration (315 lines)
  └── /hooks
      └── useAuth.ts                     # Enhanced auth hook with permissions (40 lines)
```

#### 2. Module Pages (`/src/modules/`)
```
/modules
  ├── /system/pages
  │   ├── system-settings.tsx            # System configuration (445 lines)
  │   └── user-management.tsx            # User CRUD operations (320 lines)
  ├── /finance/pages
  │   └── executive-dashboard.tsx        # CFO financial overview (280 lines)
  ├── /procurement/pages
  │   └── purchase-order.tsx             # PO management (295 lines)
  ├── /operations/pages
  │   └── kpi-dashboard.tsx              # Operational KPIs (270 lines)
  └── /compliance/pages
      └── compliance-dashboard.tsx       # Compliance monitoring (310 lines)
```

**Total Lines of Code**: ~2,377 lines (production-ready)

---

## 📋 Complete Role-Permission Mapping

### System Module Roles

#### 1. **SYSTEM_ADMINISTRATOR**
**Default Route**: `/system/system-settings`

**Pages to Create**:
- ✅ `/modules/system/pages/system-settings.tsx` (DONE)
- ✅ `/modules/system/pages/user-management.tsx` (DONE)
- `/modules/system/pages/permission-manager.tsx`
- `/modules/system/pages/audit-logs.tsx`
- `/modules/system/pages/backup-restore.tsx`
- `/modules/system/pages/scheduler.tsx`

#### 2. **IT_ADMIN**
**Default Route**: `/system/system-health`

**Pages to Create**:
- `/modules/system/pages/system-health.tsx`
- `/modules/system/pages/integration-settings.tsx`
- `/modules/system/pages/error-logs.tsx`

---

### Finance Module Roles

#### 3. **CFO**
**Default Route**: `/finance/executive-dashboard`

**Pages to Create**:
- ✅ `/modules/finance/pages/executive-dashboard.tsx` (DONE)
- `/modules/finance/pages/financial-statements.tsx`
- `/modules/finance/pages/budgeting.tsx`
- `/modules/finance/pages/cash-flow.tsx`

#### 4. **FINANCE_CONTROLLER**
**Default Route**: `/finance/general-ledger`

**Pages to Create**:
- `/modules/finance/pages/general-ledger.tsx`
- `/modules/finance/pages/trial-balance.tsx`
- `/modules/finance/pages/journal-entries.tsx`
- `/modules/finance/pages/reconciliation.tsx`
- `/modules/finance/pages/tax-reports.tsx`

#### 5. **TREASURY**
**Default Route**: `/finance/treasury-management`

**Pages to Create**:
- `/modules/finance/pages/treasury-management.tsx`
- `/modules/finance/pages/cash-management.tsx`
- `/modules/finance/pages/investment-tracking.tsx`

#### 6. **ACCOUNTS**
**Default Route**: `/finance/journal-entries`

**Pages to Create**:
- `/modules/finance/pages/journal-entries.tsx` (reuse from FINANCE_CONTROLLER)
- `/modules/finance/pages/reconciliation.tsx`
- `/modules/finance/pages/accounts-payable.tsx`

#### 7. **ACCOUNTS_PAYABLE**
**Default Route**: `/finance/accounts-payable`

**Pages to Create**:
- `/modules/finance/pages/accounts-payable.tsx`
- `/modules/finance/pages/vendor-payments.tsx`
- `/modules/finance/pages/payment-schedules.tsx`

#### 8. **BANKER**
**Default Route**: `/finance/banking-operations`

**Pages to Create**:
- `/modules/finance/pages/banking-operations.tsx`
- `/modules/finance/pages/bank-reconciliation.tsx`

---

### Procurement Module Roles

#### 9. **PROCUREMENT_OFFICER**
**Default Route**: `/procurement/purchase-request`

**Pages to Create**:
- `/modules/procurement/pages/purchase-request.tsx`
- ✅ `/modules/procurement/pages/purchase-order.tsx` (DONE)
- `/modules/procurement/pages/supplier-master.tsx`
- `/modules/procurement/pages/material-request.tsx`
- `/modules/procurement/pages/rfq-management.tsx`

---

### Operations Module Roles

#### 10. **STORE_INCHARGE**
**Default Route**: `/operations/stock-entry`

**Pages to Create**:
- `/modules/operations/pages/stock-entry.tsx`
- `/modules/operations/pages/stock-ledger.tsx`
- `/modules/operations/pages/delivery-note.tsx`
- `/modules/operations/pages/quality-inspection.tsx`

#### 11. **OPERATIONS_MANAGER**
**Default Route**: `/operations/kpi-dashboard`

**Pages to Create**:
- ✅ `/modules/operations/pages/kpi-dashboard.tsx` (DONE)
- `/modules/operations/pages/sales-order.tsx`
- `/modules/operations/pages/work-order.tsx`
- `/modules/operations/pages/shipping-logistics.tsx`

#### 12. **HUB_INCHARGE**
**Default Route**: `/hub-incharge` (Existing - DO NOT MODIFY)

**Note**: Hub Incharge has an existing dashboard. Integrate as needed but DO NOT modify existing structure.

---

### Compliance Module Roles

#### 13. **COMPLIANCE**
**Default Route**: `/compliance/compliance-dashboard`

**Pages to Create**:
- ✅ `/modules/compliance/pages/compliance-dashboard.tsx` (DONE)
- `/modules/compliance/pages/audit-trail.tsx`
- `/modules/compliance/pages/policy-management.tsx`

#### 14. **LEGAL**
**Default Route**: `/compliance/contract-management`

**Pages to Create**:
- `/modules/compliance/pages/contract-management.tsx`
- `/modules/compliance/pages/litigation-tracker.tsx`
- `/modules/compliance/pages/document-repository.tsx`

---

## 🎨 Page Template (Copy & Customize)

```tsx
/**
 * [Page Name] Page
 * [Brief description of page functionality]
 */

'use client';

import React, { useState } from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import {
  // Import relevant Lucide icons
  AlertCircle,
} from 'lucide-react';

export default function [PageName]Page() {
  const { hasAccess } = useAuth();
  const [loading, setLoading] = useState(false);

  // Check access permission
  if (!hasAccess('[permission-key]')) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You do not have permission to access [Page Name].
          </p>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout
      title="[Page Title]"
      description="[Page description]"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Add stat cards here */}
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {/* Page content */}
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {/* Table structure */}
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
```

---

## 🔧 Integration Steps

### Step 1: Create Next.js App Routes (Required)

For each module page, create corresponding app routes:

```bash
# Example structure
/app
  ├── /system
  │   ├── /system-settings/page.tsx
  │   ├── /user-management/page.tsx
  │   └── /audit-logs/page.tsx
  ├── /finance
  │   ├── /executive-dashboard/page.tsx
  │   ├── /general-ledger/page.tsx
  │   └── /budgeting/page.tsx
  ├── /procurement
  │   ├── /purchase-order/page.tsx
  │   └── /supplier-master/page.tsx
  ├── /operations
  │   ├── /kpi-dashboard/page.tsx
  │   └── /stock-ledger/page.tsx
  └── /compliance
      ├── /compliance-dashboard/page.tsx
      └── /audit-trail/page.tsx
```

**Route Template**:
```tsx
// /app/[module]/[page-name]/page.tsx
import PageComponent from '@/modules/[module]/pages/[page-name]';

export default function Page() {
  return <PageComponent />;
}
```

### Step 2: Update Navigation Menus

Add links to role-specific navigation:

```tsx
// Example: CFO Navigation
const cfoMenuItems = [
  { label: 'Executive Dashboard', href: '/finance/executive-dashboard', icon: BarChart3 },
  { label: 'Financial Statements', href: '/finance/financial-statements', icon: FileText },
  { label: 'Budgeting', href: '/finance/budgeting', icon: DollarSign },
  { label: 'Cash Flow', href: '/finance/cash-flow', icon: TrendingUp },
];
```

### Step 3: Connect to Backend APIs

Replace mock data with real API calls:

```tsx
// Example API integration
const fetchData = async () => {
  try {
    const response = await fetch('/api/v1/finance/statements', {
      credentials: 'include',
    });
    const data = await response.json();
    setStatements(data.data);
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
};
```

### Step 4: Add Role-Based Routing

Update your main layout or middleware to route users to their default page:

```tsx
// Example in layout or middleware
import { getDefaultRoute } from '@/common/rbac/rolePermissions';

const userRole = user.roleName;
const defaultRoute = getDefaultRoute(userRole);
router.push(defaultRoute);
```

---

## 📊 Component Patterns

### 1. Stats Cards
```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  {stats.map((stat, index) => (
    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
        </div>
        <stat.icon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
      </div>
    </div>
  ))}
</div>
```

### 2. Data Tables
```tsx
<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
  <thead className="bg-gray-50 dark:bg-gray-700">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
        Column Header
      </th>
    </tr>
  </thead>
  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
    {data.map(item => (
      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.value}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### 3. Status Badges
```tsx
<span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
  status === 'active'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
}`}>
  {status}
</span>
```

### 4. Action Buttons
```tsx
<div className="flex items-center space-x-2">
  <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400">
    <Eye className="w-4 h-4" />
  </button>
  <button className="text-green-600 hover:text-green-900 dark:text-green-400">
    <Edit className="w-4 h-4" />
  </button>
  <button className="text-red-600 hover:text-red-900 dark:text-red-400">
    <Trash2 className="w-4 h-4" />
  </button>
</div>
```

---

## 🎯 Best Practices

### 1. Always Use SuperAdminLayout
```tsx
import SuperAdminLayout from '@/common/layouts/superadmin-layout';

return (
  <SuperAdminLayout title="Page Title" description="Page description">
    {/* Content */}
  </SuperAdminLayout>
);
```

### 2. Always Check Permissions
```tsx
const { hasAccess } = useAuth();

if (!hasAccess('permission-key')) {
  return <AccessDeniedView />;
}
```

### 3. Use Consistent Dark Mode Classes
- Background: `bg-white dark:bg-gray-800`
- Text: `text-gray-900 dark:text-gray-100`
- Border: `border-gray-300 dark:border-gray-600`
- Hover: `hover:bg-gray-50 dark:hover:bg-gray-700`

### 4. Maintain Responsive Design
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

### 5. Use Lucide React Icons
```tsx
import { Icon1, Icon2 } from 'lucide-react';
```

---

## 🚀 Next Steps

### Immediate Actions:
1. **Create App Routes** for all module pages
2. **Generate Remaining Pages** using the template
3. **Connect Backend APIs** to replace mock data
4. **Add Role-Based Navigation** to sidebar/header
5. **Test Permission Guards** for all roles

### Future Enhancements:
- Add real-time data updates with WebSockets
- Implement advanced filtering and search
- Add export functionality (CSV, PDF)
- Create reusable chart components
- Add form validation libraries (Zod, React Hook Form)
- Implement data caching with React Query

---

## 📝 Files Checklist

### ✅ Created (6 files)
- [x] `/common/layouts/superadmin-layout.tsx`
- [x] `/common/rbac/rolePermissions.ts`
- [x] `/common/hooks/useAuth.ts`
- [x] `/modules/system/pages/system-settings.tsx`
- [x] `/modules/system/pages/user-management.tsx`
- [x] `/modules/finance/pages/executive-dashboard.tsx`
- [x] `/modules/procurement/pages/purchase-order.tsx`
- [x] `/modules/operations/pages/kpi-dashboard.tsx`
- [x] `/modules/compliance/pages/compliance-dashboard.tsx`

### 📋 To Be Created (~50 pages)
- System Module: 6 pages
- Finance Module: 15 pages
- Procurement Module: 5 pages
- Operations Module: 8 pages
- Compliance Module: 6 pages

---

## 💡 Tips

1. **Copy existing pages as templates** - Faster than starting from scratch
2. **Focus on one role at a time** - Complete all pages for one role before moving to next
3. **Test permission guards** - Ensure access control works correctly
4. **Use mock data initially** - Replace with API calls later
5. **Maintain consistent styling** - Follow Tailwind patterns from existing pages

---

## 🆘 Support

If you encounter issues:
1. Check `/common/rbac/rolePermissions.ts` for permission keys
2. Verify route structure matches permission keys
3. Ensure `useAuth` hook is imported from `/common/hooks/useAuth`
4. Test dark mode toggle in each page
5. Verify responsive design on mobile/tablet

---

**Status**: Core infrastructure complete. Ready for page generation and API integration.
**Next**: Create App Router routes and generate remaining module pages.
