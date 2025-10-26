# 🏢 Multi-Business ERP Architecture Guide

## Overview
This document describes the modular permission system for managing multiple businesses (Petrol Pump, Logistics, etc.) within a single ERP platform.

---

## 🎯 Business Requirements

### Current Businesses:
1. **Petrol Pump Management**
   - Fuel inventory & sales
   - Pump operations
   - Daily reports
   - Payment management

2. **Logistics Business**
   - Shipment tracking
   - Fleet management
   - Route optimization
   - Driver management

### Future Businesses:
- Restaurant chain
- Retail stores
- Manufacturing
- Healthcare
- Any industry-specific ERP

---

## 🗄️ Database Schema

### 1. Core Tables

#### `business_types`
Defines different business verticals.

```sql
CREATE TABLE business_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample data
INSERT INTO business_types (name, slug, description, icon) VALUES
  ('Petrol Pump', 'petrol-pump', 'Fuel station management', 'fuel'),
  ('Logistics', 'logistics', 'Transportation & fleet management', 'truck'),
  ('Restaurant', 'restaurant', 'Food service management', 'utensils');
```

#### `modules`
All available modules/features in the system.

```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50), -- 'core', 'sales', 'inventory', 'finance', etc.
  route_path VARCHAR(200), -- '/fuel-sales', '/shipments', etc.
  component_path VARCHAR(200), -- React component path
  parent_module_id UUID REFERENCES modules(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample modules
INSERT INTO modules (name, slug, category, route_path, icon, sort_order) VALUES
  -- Core modules (all businesses)
  ('Dashboard', 'dashboard', 'core', '/dashboard', 'home', 1),
  ('Users', 'users', 'core', '/users', 'users', 2),
  ('Settings', 'settings', 'core', '/settings', 'settings', 3),
  
  -- Petrol Pump modules
  ('Fuel Sales', 'fuel-sales', 'sales', '/fuel-sales', 'fuel', 10),
  ('Pump Operations', 'pump-operations', 'operations', '/pump-operations', 'activity', 11),
  ('Tank Inventory', 'tank-inventory', 'inventory', '/tank-inventory', 'database', 12),
  ('Daily Reports', 'daily-reports', 'reports', '/daily-reports', 'file-text', 13),
  
  -- Logistics modules
  ('Shipments', 'shipments', 'operations', '/shipments', 'package', 20),
  ('Fleet Management', 'fleet', 'operations', '/fleet', 'truck', 21),
  ('Routes', 'routes', 'operations', '/routes', 'map', 22),
  ('Drivers', 'drivers', 'hr', '/drivers', 'user', 23),
  
  -- Payment module (shared)
  ('Payments', 'payments', 'finance', '/payments', 'credit-card', 30),
  ('Non-Privileged Users', 'non-privileged-users', 'finance', '/payments/non-privileged-users', 'user-plus', 31);
```

#### `business_type_modules`
Defines which modules are applicable to which business types (many-to-many).

```sql
CREATE TABLE business_type_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_id UUID NOT NULL REFERENCES business_types(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false, -- Auto-assign to new Super Admins
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_type_id, module_id)
);

-- Map modules to business types
-- Petrol Pump gets: Dashboard, Users, Settings, Fuel modules, Payments
INSERT INTO business_type_modules (business_type_id, module_id, is_default)
SELECT 
  (SELECT id FROM business_types WHERE slug = 'petrol-pump'),
  id,
  true
FROM modules 
WHERE slug IN ('dashboard', 'users', 'settings', 'fuel-sales', 'pump-operations', 'tank-inventory', 'daily-reports', 'payments', 'non-privileged-users');

-- Logistics gets: Dashboard, Users, Settings, Logistics modules, Payments
INSERT INTO business_type_modules (business_type_id, module_id, is_default)
SELECT 
  (SELECT id FROM business_types WHERE slug = 'logistics'),
  id,
  true
FROM modules 
WHERE slug IN ('dashboard', 'users', 'settings', 'shipments', 'fleet', 'routes', 'drivers', 'payments', 'non-privileged-users');
```

#### `super_admins`
Super Admin users for each business instance.

```sql
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_type_id UUID NOT NULL REFERENCES business_types(id),
  business_name VARCHAR(200) NOT NULL, -- e.g., "Rajesh Petrol Pump", "ABC Logistics"
  business_slug VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_status VARCHAR(50) DEFAULT 'trial', -- 'trial', 'active', 'suspended', 'cancelled'
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id), -- Enterprise Admin who created this
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample Super Admins
INSERT INTO super_admins (user_id, business_type_id, business_name, business_slug, email, phone, created_by) VALUES
  (
    (SELECT id FROM users WHERE email = 'rajesh@petrolpump.com'),
    (SELECT id FROM business_types WHERE slug = 'petrol-pump'),
    'Rajesh Petrol Pump - Highway 44',
    'rajesh-petrol-pump',
    'rajesh@petrolpump.com',
    '9876543210',
    (SELECT id FROM users WHERE role = 'ENTERPRISE_ADMIN' LIMIT 1)
  ),
  (
    (SELECT id FROM users WHERE email = 'amit@logistics.com'),
    (SELECT id FROM business_types WHERE slug = 'logistics'),
    'ABC Logistics Pvt Ltd',
    'abc-logistics',
    'amit@logistics.com',
    '9876543211',
    (SELECT id FROM users WHERE role = 'ENTERPRISE_ADMIN' LIMIT 1)
  );
```

#### `super_admin_modules`
Custom module assignments per Super Admin (overrides business_type_modules).

```sql
CREATE TABLE super_admin_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT true,
  can_read BOOLEAN DEFAULT true,
  can_update BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT false,
  custom_settings JSONB, -- Module-specific settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(super_admin_id, module_id)
);

-- Auto-assign default modules when Super Admin is created (trigger or app logic)
-- Or manually customize per Super Admin
```

---

## 🔐 User Roles Hierarchy

```
ENTERPRISE_ADMIN (You)
  └── Can manage all Super Admins
  └── Can assign/revoke modules
  └── Can view all businesses
  └── Can create new business types

SUPER_ADMIN (Per Business)
  └── Can only see assigned modules
  └── Can manage their business users (Admin, Manager, Staff)
  └── Cannot see other businesses
  └── Cannot change their own module access

ADMIN (Per Business)
  └── Business operations
  └── Approve payments
  └── Manage staff

MANAGER (Per Business)
  └── Day-to-day operations
  └── Approve requests

STAFF (Per Business)
  └── Data entry
  └── Basic operations
```

---

## 🎨 Frontend Implementation

### 1. Dynamic Navigation Menu

```typescript
// lib/navigation.ts
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

export function useUserModules() {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ['user-modules', session?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/user/modules');
      return res.json();
    },
    enabled: !!session?.user?.id,
  });
}

// API: /api/user/modules
export async function GET(req: Request) {
  const session = await getServerSession();
  const userId = session.user.id;
  
  // If Enterprise Admin, return all modules
  if (session.user.role === 'ENTERPRISE_ADMIN') {
    return db.module.findMany({ where: { is_active: true } });
  }
  
  // If Super Admin, return assigned modules
  if (session.user.role === 'SUPER_ADMIN') {
    const superAdmin = await db.superAdmin.findUnique({
      where: { user_id: userId },
      include: {
        super_admin_modules: {
          include: { module: true },
          where: { is_enabled: true }
        }
      }
    });
    
    return superAdmin.super_admin_modules.map(sam => sam.module);
  }
  
  // Other roles: return based on their Super Admin's modules + role permissions
  // ...
}
```

### 2. Dynamic Sidebar Component

```tsx
// components/DynamicSidebar.tsx
'use client';

import { useUserModules } from '@/lib/navigation';
import Link from 'next/link';
import { FiHome, FiPackage, FiTruck, /* ... */ } from 'react-icons/fi';

const iconMap = {
  home: FiHome,
  package: FiPackage,
  truck: FiTruck,
  // ... map all icons
};

export function DynamicSidebar() {
  const { data: modules, isLoading } = useUserModules();
  
  if (isLoading) return <SidebarSkeleton />;
  
  // Group modules by category
  const groupedModules = modules?.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = [];
    acc[module.category].push(module);
    return acc;
  }, {});
  
  return (
    <nav className="sidebar">
      {Object.entries(groupedModules).map(([category, items]) => (
        <div key={category}>
          <h3>{category}</h3>
          {items.map(module => {
            const Icon = iconMap[module.icon];
            return (
              <Link key={module.id} href={module.route_path}>
                <Icon /> {module.name}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
```

### 3. Route Protection Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Get requested route
  const path = request.nextUrl.pathname;
  
  // Enterprise Admin can access everything
  if (token.role === 'ENTERPRISE_ADMIN') {
    return NextResponse.next();
  }
  
  // Check if user has access to this module
  const hasAccess = await checkModuleAccess(token.id, path);
  
  if (!hasAccess) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  return NextResponse.next();
}

async function checkModuleAccess(userId: string, path: string): Promise<boolean> {
  // Query database to check if user's modules include this path
  // Cache this for performance
}
```

---

## 🖥️ Enterprise Admin UI

### Dashboard: `/enterprise-admin/dashboard`

```tsx
// Shows:
// - Total businesses
// - Active Super Admins
// - Revenue per business
// - Quick actions: Create Super Admin, Manage Modules
```

### Super Admin Manager: `/enterprise-admin/super-admins`

```tsx
// Table with:
// - Business Name
// - Super Admin Name
// - Business Type
// - Active Modules Count
// - Status
// - Actions: Edit, Assign Modules, Deactivate
```

### Module Assignment: `/enterprise-admin/super-admins/[id]/modules`

```tsx
// Checkbox list of all modules
// Grouped by category
// Toggle on/off per module
// Set permissions (CRUD) per module
// Save button
```

### Module Management: `/enterprise-admin/modules`

```tsx
// CRUD for modules
// Assign to business types
// Set default modules
```

---

## 🚀 Implementation Steps

### Phase 1: Database Setup
1. ✅ Create migration files for new tables
2. ✅ Seed business types and modules
3. ✅ Create initial Super Admins

### Phase 2: Backend APIs
1. ✅ `/api/user/modules` - Get user's accessible modules
2. ✅ `/api/enterprise-admin/super-admins` - CRUD Super Admins
3. ✅ `/api/enterprise-admin/super-admins/[id]/modules` - Assign modules
4. ✅ `/api/enterprise-admin/modules` - Manage modules
5. ✅ `/api/enterprise-admin/business-types` - Manage business types

### Phase 3: Frontend
1. ✅ Dynamic sidebar based on user modules
2. ✅ Enterprise Admin dashboard
3. ✅ Super Admin manager with module assignment
4. ✅ Module manager
5. ✅ Route protection middleware

### Phase 4: Testing
1. ✅ Test Enterprise Admin creating Petrol Pump Super Admin
2. ✅ Test Enterprise Admin creating Logistics Super Admin
3. ✅ Test module visibility per Super Admin
4. ✅ Test permissions (CRUD per module)

---

## 📋 Example Workflow

### Creating a New Petrol Pump Super Admin

1. **Enterprise Admin logs in**
2. **Navigates to** `/enterprise-admin/super-admins`
3. **Clicks** "Create Super Admin"
4. **Fills form:**
   - Business Type: Petrol Pump
   - Business Name: "Rajesh Petrol Pump - Highway 44"
   - Admin Email: rajesh@petrolpump.com
   - Phone: 9876543210
5. **System auto-assigns default modules** for Petrol Pump:
   - Dashboard ✓
   - Users ✓
   - Fuel Sales ✓
   - Pump Operations ✓
   - Tank Inventory ✓
   - Daily Reports ✓
   - Payments ✓
   - Non-Privileged Users ✓
6. **Enterprise Admin can customize:** Remove "Daily Reports" if not needed
7. **Click Save**
8. **Rajesh receives email** with login credentials
9. **Rajesh logs in** and sees only his assigned modules

---

## 🎯 Benefits

### ✅ **Scalability**
- Add new business types in minutes
- No code changes needed for new businesses

### ✅ **Flexibility**
- Each Super Admin gets custom module set
- Same business type can have different modules per instance

### ✅ **Security**
- Super Admins cannot see other businesses
- Enterprise Admin has full control

### ✅ **Maintainability**
- Single codebase for all businesses
- Modular architecture
- Easy to add new modules

### ✅ **Cost Effective**
- Shared infrastructure
- One deployment serves all businesses

---

## 🔧 Advanced Features (Future)

### 1. White Labeling
```typescript
// Each Super Admin can have custom branding
interface SuperAdmin {
  theme: {
    primary_color: string;
    logo_url: string;
    company_name: string;
  }
}
```

### 2. Module Marketplace
```typescript
// Enterprise Admin can create custom modules
// Assign pricing per module
// Super Admins can purchase additional modules
```

### 3. API Access
```typescript
// Each Super Admin gets API keys
// Can integrate with their own systems
// Webhook support
```

### 4. Multi-Language Support
```typescript
// Each business type can have different language
// Module names translated per locale
```

---

## 📚 Reference Links

- Prisma Multi-Schema: https://www.prisma.io/docs/concepts/components/prisma-schema
- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- RBAC Pattern: https://auth0.com/docs/manage-users/access-control/rbac

---

**Created:** October 25, 2025  
**Status:** ✅ Ready for Implementation  
**Next Step:** Run database migrations and seed data
