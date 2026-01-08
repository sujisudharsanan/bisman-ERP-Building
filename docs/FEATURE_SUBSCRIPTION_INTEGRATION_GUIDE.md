# BISMAN ERP - Feature Subscription Integration Guide

## 🎯 Purpose

This document establishes **mandatory development guidelines** for integrating new features with the BISMAN ERP Subscription Control System. Every new feature MUST be connected to the subscription system to enable:

- Feature availability control per subscription plan
- Usage limits and tracking
- Unlock pricing and monetization
- Approval thresholds
- Lock modes (none/soft/hard)

---

## 📋 Quick Checklist for New Features

Before your feature PR can be merged, ensure ALL of these are completed:

- [ ] Feature registered in `master_feature_definitions` table
- [ ] Feature controls added to `plan_feature_controls` for each plan
- [ ] Backend API protected with `checkFeatureAccess` middleware
- [ ] Frontend components wrapped with `FeatureGate` component
- [ ] Usage tracking implemented if feature has limits
- [ ] Feature appears in Super Admin Subscription Control page

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN DASHBOARD                        │
│         /super-admin/subscriptions (God Mode Page)              │
│  - Controls ALL feature availability                            │
│  - Sets limits, pricing, lock modes                             │
│  - Manages subscription plans                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 DATABASE TABLES (Source of Truth)               │
│  ┌─────────────────────────┐  ┌───────────────────────────┐    │
│  │ master_feature_definitions│  │ plan_feature_controls    │    │
│  │ - feature_code (unique)   │  │ - plan_id + feature_code │    │
│  │ - feature_name            │  │ - free_limit             │    │
│  │ - category                │  │ - lock_mode              │    │
│  │ - description             │  │ - unlock_price           │    │
│  └─────────────────────────┘  └───────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌─────────────────────┐             ┌─────────────────────────┐
│     BACKEND API     │             │       FRONTEND UI       │
│ checkFeatureAccess()│             │    <FeatureGate />      │
│ trackFeatureUsage() │             │    useFeatureAccess()   │
└─────────────────────┘             └─────────────────────────┘
```

---

## 📝 Step-by-Step Implementation

### Step 1: Register Feature in Database

Create a migration file to add your feature to `master_feature_definitions`:

```sql
-- Migration: XXX_add_[feature_name]_feature.sql

-- 1. Add feature definition
INSERT INTO master_feature_definitions (
  feature_code,
  feature_name,
  description,
  category,
  icon,
  sort_order,
  is_active
) VALUES (
  'your_feature_code',           -- UNIQUE, snake_case, e.g., 'bulk_invoice_export'
  'Your Feature Name',           -- Human readable name
  'Description of what this feature does',
  'finance',                     -- Category: see CATEGORIES section below
  'FileText',                    -- Lucide icon name
  100,                           -- Sort order within category
  TRUE
) ON CONFLICT (feature_code) DO NOTHING;

-- 2. Add feature controls for EACH subscription plan
INSERT INTO plan_feature_controls (
  plan_id,
  feature_code,
  free_limit,
  limit_period,
  unlock_price,
  unlock_unit,
  lock_mode,
  is_visible,
  show_in_pricing
)
SELECT 
  msp.id,
  'your_feature_code',
  CASE 
    WHEN msp.code = 'FREE' THEN 5           -- 5 free uses for FREE plan
    WHEN msp.code = 'BASIC' THEN 20         -- 20 for BASIC
    WHEN msp.code = 'STANDARD' THEN 100     -- 100 for STANDARD
    WHEN msp.code = 'PREMIUM' THEN -1       -- Unlimited for PREMIUM (-1)
    WHEN msp.code = 'ENTERPRISE' THEN -1    -- Unlimited for ENTERPRISE
    ELSE 0
  END,
  'monthly',                                -- Limit resets monthly
  CASE 
    WHEN msp.code IN ('FREE', 'BASIC') THEN 99.00  -- Unlock price
    ELSE 0
  END,
  'per month',
  CASE 
    WHEN msp.code = 'FREE' THEN 'soft'      -- Soft lock for FREE (can pay to unlock)
    WHEN msp.code = 'BASIC' THEN 'none'     -- No lock for BASIC
    ELSE 'none'
  END::lock_mode_type,
  TRUE,
  TRUE
FROM master_subscription_plans msp
ON CONFLICT (plan_id, feature_code) DO NOTHING;
```

### Step 2: Create Backend Middleware Protection

Use the `checkFeatureAccess` middleware in your routes:

```javascript
// my-backend/routes/yourFeatureRoutes.js

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { checkFeatureAccess, trackFeatureUsage } = require('../middleware/subscriptionEnforcement');

// Protected route with feature check
router.post('/your-feature-action',
  authenticate,
  checkFeatureAccess('your_feature_code'),  // <-- ADD THIS
  async (req, res) => {
    try {
      // Your feature logic here
      
      // Track usage AFTER successful action
      await trackFeatureUsage(req.user.tenantId, 'your_feature_code');
      
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ error: 'Feature action failed' });
    }
  }
);

module.exports = router;
```

### Step 3: Create the Subscription Enforcement Middleware

If not already exists, create/update the middleware:

```javascript
// my-backend/middleware/subscriptionEnforcement.js

const { getPrisma } = require('../lib/prisma');

/**
 * Check if tenant has access to a feature based on their subscription
 * @param {string} featureCode - The feature code to check
 */
const checkFeatureAccess = (featureCode) => {
  return async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const tenantId = req.user?.tenantId || req.user?.clientId;
      
      if (!tenantId) {
        return res.status(403).json({ 
          error: 'Tenant not identified',
          featureCode 
        });
      }

      // Get tenant's current plan and feature controls
      const result = await prisma.$queryRaw`
        SELECT 
          pfc.free_limit,
          pfc.limit_period,
          pfc.lock_mode,
          pfc.unlock_price,
          COALESCE(fuc.used_count, 0) as used_count
        FROM tenant_plan_assignments tpa
        JOIN plan_feature_controls pfc ON pfc.plan_id = tpa.plan_id
        LEFT JOIN feature_usage_counters fuc ON fuc.tenant_id = tpa.tenant_id 
          AND fuc.feature_code = pfc.feature_code
          AND fuc.period_end > NOW()
        WHERE tpa.tenant_id = ${tenantId}::uuid
          AND tpa.is_active = TRUE
          AND pfc.feature_code = ${featureCode}
      `;

      if (!result || result.length === 0) {
        // Feature not configured for this plan - check if it's a custom plan
        const customCheck = await prisma.$queryRaw`
          SELECT ctfc.is_enabled, ctfc.free_limit, ctfc.lock_mode
          FROM custom_tenant_feature_controls ctfc
          WHERE ctfc.tenant_id = ${tenantId}::uuid
            AND ctfc.feature_code = ${featureCode}
        `;
        
        if (customCheck && customCheck.length > 0 && customCheck[0].is_enabled) {
          req.featureAccess = customCheck[0];
          return next();
        }
        
        return res.status(403).json({ 
          error: 'Feature not available in your plan',
          featureCode,
          upgrade: true
        });
      }

      const control = result[0];

      // Check lock mode
      if (control.lock_mode === 'hard') {
        return res.status(403).json({ 
          error: 'Feature is not available',
          featureCode,
          locked: true
        });
      }

      // Check usage limits (if not unlimited)
      if (control.free_limit !== -1 && control.used_count >= control.free_limit) {
        if (control.lock_mode === 'soft') {
          return res.status(403).json({ 
            error: 'Usage limit reached',
            featureCode,
            limit: control.free_limit,
            used: control.used_count,
            unlockPrice: control.unlock_price,
            canUnlock: true
          });
        }
      }

      // Store feature access info for the route handler
      req.featureAccess = control;
      next();
    } catch (error) {
      console.error('[SubscriptionEnforcement] Check access error:', error);
      // Fail open in case of errors (don't block users due to system issues)
      next();
    }
  };
};

/**
 * Track feature usage for a tenant
 * @param {string} tenantId - The tenant UUID
 * @param {string} featureCode - The feature code used
 */
const trackFeatureUsage = async (tenantId, featureCode) => {
  try {
    const prisma = getPrisma();
    
    // Upsert usage counter
    await prisma.$executeRaw`
      INSERT INTO feature_usage_counters (
        tenant_id, feature_code, period_type, period_start, period_end, used_count, lifetime_count, last_used_at
      ) VALUES (
        ${tenantId}::uuid,
        ${featureCode},
        'monthly',
        DATE_TRUNC('month', NOW()),
        DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
        1,
        1,
        NOW()
      )
      ON CONFLICT (tenant_id, feature_code, period_start) DO UPDATE SET
        used_count = feature_usage_counters.used_count + 1,
        lifetime_count = feature_usage_counters.lifetime_count + 1,
        last_used_at = NOW(),
        updated_at = NOW()
    `;
  } catch (error) {
    console.error('[SubscriptionEnforcement] Track usage error:', error);
    // Don't throw - usage tracking failures shouldn't block the feature
  }
};

module.exports = {
  checkFeatureAccess,
  trackFeatureUsage
};
```

### Step 4: Create Frontend FeatureGate Component

```typescript
// my-frontend/src/components/subscription/FeatureGate.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { Lock, Zap, AlertTriangle } from 'lucide-react';

interface FeatureAccess {
  allowed: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  lockMode?: 'none' | 'soft' | 'hard';
  unlockPrice?: number;
  message?: string;
}

interface FeatureGateProps {
  featureCode: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLockMessage?: boolean;
  onUpgradeClick?: () => void;
}

/**
 * FeatureGate - Wrap any feature component to control access based on subscription
 * 
 * Usage:
 * <FeatureGate featureCode="bulk_invoice_export">
 *   <BulkExportButton />
 * </FeatureGate>
 */
export function FeatureGate({
  featureCode,
  children,
  fallback,
  showLockMessage = true,
  onUpgradeClick
}: FeatureGateProps) {
  const [access, setAccess] = useState<FeatureAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch(`/api/subscription/check-feature/${featureCode}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setAccess(data);
        } else {
          setAccess({ allowed: false, lockMode: 'hard' });
        }
      } catch (error) {
        console.error('[FeatureGate] Check access error:', error);
        // Fail open - allow access if check fails
        setAccess({ allowed: true });
      } finally {
        setLoading(false);
      }
    };
    
    checkAccess();
  }, [featureCode]);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded h-8 w-24"></div>;
  }

  if (!access?.allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showLockMessage) {
      return null;
    }

    // Show lock/upgrade message
    if (access?.lockMode === 'hard') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 text-sm">
          <Lock className="w-4 h-4" />
          <span>Feature not available in your plan</span>
        </div>
      );
    }

    if (access?.lockMode === 'soft' || access?.unlockPrice) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>
            {access.used !== undefined && access.limit !== undefined
              ? `Limit reached (${access.used}/${access.limit})`
              : 'Upgrade required'}
          </span>
          {access.unlockPrice && (
            <button
              onClick={onUpgradeClick}
              className="ml-2 px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
            >
              <Zap className="w-3 h-3 inline mr-1" />
              Unlock ₹{access.unlockPrice}
            </button>
          )}
        </div>
      );
    }
  }

  // Feature is accessible
  return <>{children}</>;
}

/**
 * Hook to check feature access programmatically
 */
export function useFeatureAccess(featureCode: string) {
  const [access, setAccess] = useState<FeatureAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch(`/api/subscription/check-feature/${featureCode}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setAccess(data);
        } else {
          setAccess({ allowed: false });
        }
      } catch {
        setAccess({ allowed: true }); // Fail open
      } finally {
        setLoading(false);
      }
    };
    
    checkAccess();
  }, [featureCode]);

  return { access, loading, isAllowed: access?.allowed ?? true };
}
```

### Step 5: Create Feature Check API Route

```typescript
// my-frontend/src/pages/api/subscription/check-feature/[featureCode].ts

import type { NextApiRequest, NextApiResponse } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { featureCode } = req.query;
  
  try {
    const backendRes = await fetch(`${API_BASE}/api/subscription/check-feature/${featureCode}`, {
      headers: {
        Cookie: req.headers.cookie || ''
      }
    });
    
    const data = await backendRes.json();
    res.status(backendRes.status).json(data);
  } catch (error) {
    // Fail open
    res.status(200).json({ allowed: true });
  }
}
```

---

## 📂 Feature Categories

Use these predefined categories for consistency:

| Category Code | Display Name | Description |
|--------------|--------------|-------------|
| `user_access` | User & Access | User management, login, roles |
| `task_workflow` | Task & Workflow | Task creation, assignment, tracking |
| `finance` | Finance & Payments | Invoices, payments, billing |
| `reporting` | Reporting | Reports, dashboards, analytics |
| `banking` | Banking & Reconciliation | Bank accounts, reconciliation |
| `documents` | Documents & Storage | File uploads, document management |
| `system` | System & API | API access, integrations |
| `security` | Security & Authentication | 2FA, audit logs, security features |
| `rbac` | RBAC & Permissions | Role management, permissions |
| `advanced_workflow` | Advanced Workflow | Complex workflows, automation |
| `advanced_finance` | Advanced Finance | Multi-currency, advanced billing |
| `advanced_reporting` | Advanced Reporting | Custom reports, exports |
| `notifications` | Notifications & Communication | Email, SMS, push notifications |
| `integrations` | Integrations & API | Third-party integrations |
| `enterprise` | Enterprise Features | White-label, multi-tenant |
| `support` | Support & SLA | Priority support, SLA guarantees |
| `compliance` | Compliance & Audit | GDPR, compliance reports |
| `backup` | Backup & Recovery | Data backup, disaster recovery |

---

## 🔐 Lock Modes Explained

| Lock Mode | Behavior | Use Case |
|-----------|----------|----------|
| `none` | Feature fully accessible | Premium features for paid plans |
| `soft` | Shows limit reached, offers unlock option | Metered features with upgrade path |
| `hard` | Feature completely hidden/blocked | Enterprise-only features |

---

## 📊 Example: Adding a New Feature

Let's add a "Bulk Invoice Export" feature:

### 1. Database Migration

```sql
-- migrations/028_add_bulk_invoice_export_feature.sql

INSERT INTO master_feature_definitions (
  feature_code, feature_name, description, category, icon, sort_order, is_active
) VALUES (
  'bulk_invoice_export',
  'Bulk Invoice Export',
  'Export multiple invoices to PDF/Excel in one action',
  'advanced_reporting',
  'FileDown',
  10,
  TRUE
) ON CONFLICT (feature_code) DO NOTHING;

INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, lock_mode, is_visible, show_in_pricing)
SELECT id, 'bulk_invoice_export',
  CASE code WHEN 'FREE' THEN 0 WHEN 'BASIC' THEN 5 WHEN 'STANDARD' THEN 50 ELSE -1 END,
  'monthly',
  CASE code WHEN 'FREE' THEN 199 WHEN 'BASIC' THEN 99 ELSE 0 END,
  CASE code WHEN 'FREE' THEN 'soft' ELSE 'none' END::lock_mode_type,
  TRUE, TRUE
FROM master_subscription_plans
ON CONFLICT (plan_id, feature_code) DO NOTHING;
```

### 2. Backend Route

```javascript
// routes/invoiceRoutes.js

router.post('/bulk-export',
  authenticate,
  checkFeatureAccess('bulk_invoice_export'),
  async (req, res) => {
    const { invoiceIds, format } = req.body;
    
    // Your export logic...
    const exportResult = await bulkExportInvoices(invoiceIds, format);
    
    // Track usage
    await trackFeatureUsage(req.user.tenantId, 'bulk_invoice_export');
    
    res.json({ success: true, downloadUrl: exportResult.url });
  }
);
```

### 3. Frontend Component

```tsx
// components/invoices/BulkExportButton.tsx

import { FeatureGate } from '@/components/subscription/FeatureGate';

export function BulkExportButton({ selectedInvoices }) {
  return (
    <FeatureGate 
      featureCode="bulk_invoice_export"
      onUpgradeClick={() => router.push('/settings/subscription')}
    >
      <button 
        onClick={handleBulkExport}
        className="btn btn-primary"
      >
        Export {selectedInvoices.length} Invoices
      </button>
    </FeatureGate>
  );
}
```

---

## ✅ Code Review Checklist

When reviewing PRs that add new features, ensure:

1. **Database Migration Present**
   - [ ] Feature added to `master_feature_definitions`
   - [ ] Controls added to `plan_feature_controls` for ALL plans
   - [ ] Appropriate limits set per plan tier

2. **Backend Protection**
   - [ ] `checkFeatureAccess` middleware used on relevant routes
   - [ ] `trackFeatureUsage` called after successful actions
   - [ ] Proper error responses for locked features

3. **Frontend Integration**
   - [ ] `FeatureGate` component wraps feature UI
   - [ ] Graceful fallback for locked features
   - [ ] Upgrade prompts where appropriate

4. **Testing**
   - [ ] Feature visible in Super Admin Subscription Control
   - [ ] Limits enforced correctly per plan
   - [ ] Usage counter increments properly
   - [ ] Lock modes work as expected

---

## 🚨 Common Mistakes to Avoid

1. **Hardcoding feature access** - Always use the subscription system
2. **Forgetting to track usage** - Breaks limit enforcement
3. **Wrong category assignment** - Makes features hard to find in admin
4. **Missing plan configurations** - Feature won't appear in control panel
5. **Not testing all plans** - Different tiers may behave differently

---

## 📞 Questions?

Contact the Platform Team or refer to:
- Super Admin Dashboard: `/super-admin/subscriptions`
- Database Schema: `database/migrations/024_comprehensive_subscription_system.sql`
- Backend Middleware: `my-backend/middleware/subscriptionEnforcement.js`

---

*Last Updated: January 2026*
*Version: 1.0*
