# 📋 ERP Module Integration - Quick Reference Card

## 🚀 Quick Start (5 Minutes)

### 1. Create a New Page
```bash
# Create page file
touch my-frontend/src/modules/[module]/pages/[page-name].tsx
```

### 2. Copy Template
```tsx
'use client';
import React from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import { AlertCircle } from 'lucide-react';

export default function PageName() {
  const { hasAccess } = useAuth();
  
  if (!hasAccess('permission-key')) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout title="Page Title" description="Description">
      <div className="space-y-6">
        {/* Your content here */}
      </div>
    </SuperAdminLayout>
  );
}
```

### 3. Create App Route
```bash
mkdir -p my-frontend/src/app/[module]/[page-name]
echo "export { default } from '@/modules/[module]/pages/[page-name]';" > my-frontend/src/app/[module]/[page-name]/page.tsx
```

---

## 📦 Common Imports

```tsx
// Always needed
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';

// Icons (pick what you need)
import {
  AlertCircle, CheckCircle, XCircle, Clock,
  Users, Shield, Settings, BarChart3, DollarSign,
  Plus, Edit, Trash2, Eye, Download, Search, Filter,
  TrendingUp, TrendingDown, Package, Truck, Calendar
} from 'lucide-react';

// React hooks
import { useState, useEffect, useCallback } from 'react';
```

---

## 🎨 UI Components Snippets

### Stats Card
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400">Label</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">Value</p>
    </div>
    <Icon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
  </div>
</div>
```

### Data Table
```tsx
<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
  <thead className="bg-gray-50 dark:bg-gray-700">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
        Header
      </th>
    </tr>
  </thead>
  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
    {data.map(item => (
      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
        <td className="px-6 py-4 text-sm">{item.value}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### Status Badge
```tsx
<span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
  status === 'active'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : status === 'pending'
    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
}`}>
  {status}
</span>
```

### Button (Primary)
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
  <Icon className="w-4 h-4" />
  <span>Button Text</span>
</button>
```

### Button (Secondary)
```tsx
<button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
  Button Text
</button>
```

### Search Input
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
  <input
    type="text"
    placeholder="Search..."
    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
  />
</div>
```

### Alert Box
```tsx
<div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
  <div className="flex items-center">
    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3" />
    <span className="text-yellow-800 dark:text-yellow-300">Alert message</span>
  </div>
</div>
```

---

## 🔑 Permission Keys by Module

### System
```
system-settings, user-management, permission-manager, 
audit-logs, backup-restore, scheduler, system-health, 
integration-settings, error-logs
```

### Finance
```
financial-statements, budgeting, cash-flow, executive-dashboard,
general-ledger, trial-balance, journal-entries, reconciliation,
tax-reports, treasury-management, cash-management, investment-tracking,
accounts-payable, vendor-payments, payment-schedules,
banking-operations, bank-reconciliation
```

### Procurement
```
purchase-request, purchase-order, supplier-master,
material-request, rfq-management
```

### Operations
```
stock-entry, stock-ledger, delivery-note, quality-inspection,
sales-order, work-order, shipping-logistics, kpi-dashboard,
stock-transfer, asset-register
```

### Compliance
```
audit-trail, policy-management, compliance-dashboard,
contract-management, litigation-tracker, document-repository
```

---

## 🎯 Role Default Routes

```tsx
SUPER_ADMIN: '/super-admin'
SYSTEM_ADMINISTRATOR: '/system/system-settings'
IT_ADMIN: '/system/system-health'
CFO: '/finance/executive-dashboard'
FINANCE_CONTROLLER: '/finance/general-ledger'
TREASURY: '/finance/treasury-management'
ACCOUNTS: '/finance/journal-entries'
ACCOUNTS_PAYABLE: '/finance/accounts-payable'
BANKER: '/finance/banking-operations'
PROCUREMENT_OFFICER: '/procurement/purchase-request'
STORE_INCHARGE: '/operations/stock-entry'
OPERATIONS_MANAGER: '/operations/kpi-dashboard'
HUB_INCHARGE: '/hub-incharge'
COMPLIANCE: '/compliance/compliance-dashboard'
LEGAL: '/compliance/contract-management'
```

---

## 🎨 Dark Mode Classes

```tsx
// Backgrounds
bg-white dark:bg-gray-800
bg-gray-50 dark:bg-gray-900
bg-gray-100 dark:bg-gray-700

// Text
text-gray-900 dark:text-gray-100
text-gray-700 dark:text-gray-300
text-gray-500 dark:text-gray-400

// Borders
border-gray-300 dark:border-gray-600
border-gray-200 dark:border-gray-700

// Hover
hover:bg-gray-50 dark:hover:bg-gray-700
hover:text-gray-700 dark:hover:text-gray-300
```

---

## 📱 Responsive Grid Classes

```tsx
// 1 col mobile, 2 tablet, 4 desktop
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4

// Full width mobile, limited desktop
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8

// Hide on mobile
hidden md:block

// Show only on mobile
block md:hidden
```

---

## 🔄 API Call Pattern

```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState([]);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/v1/module/endpoint', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Fetch failed');
    
    const result = await response.json();
    setData(result.data || result);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchData();
}, []);
```

---

## ✅ Checklist for New Page

- [ ] Created file in `/modules/[module]/pages/[name].tsx`
- [ ] Imported `SuperAdminLayout` and `useAuth`
- [ ] Added permission guard with `hasAccess()`
- [ ] Used correct permission key from `rolePermissions.ts`
- [ ] Applied dark mode classes throughout
- [ ] Made responsive with Tailwind breakpoints
- [ ] Created App Router route in `/app/`
- [ ] Tested with appropriate role
- [ ] Verified no TypeScript errors
- [ ] Added to module documentation

---

## 🆘 Common Issues

**Import Error**: Check `tsconfig.json` has `"@/*": ["./src/*"]`  
**Access Denied**: Verify permission key matches `rolePermissions.ts`  
**Dark Mode Broken**: Ensure all classes have `dark:` variants  
**Layout Issue**: Always wrap content in `<SuperAdminLayout>`  

---

## 📚 Files to Reference

1. Sample pages: `/modules/*/pages/*.tsx`
2. RBAC config: `/common/rbac/rolePermissions.ts`
3. Full guide: `ERP_MODULE_INTEGRATION_GUIDE.md`
4. Summary: `ERP_INTEGRATION_SUMMARY.md`

---

**Print this card** and keep it handy while developing! 🖨️
