# About Me Page - Implementation Guide

## 📋 Overview

The **About Me** page is now available across all role-based modules in the BISMAN ERP system. This reusable component allows users to view and manage their profile information, upload profile pictures, and view team member details.

---

## 🎯 Features

✅ **Profile Management**: View and edit personal information  
✅ **Photo Upload**: Upload and change profile pictures (max 2MB)  
✅ **Team Sidebar**: Optional team member directory with search  
✅ **Dark Mode Support**: Full dark/light theme compatibility  
✅ **Responsive Design**: Mobile, tablet, and desktop optimized  
✅ **Role-Based Access**: Integrated with RBAC permission system  
✅ **Dynamic Content**: Auto-populated from user authentication data  

---

## 📁 File Structure

```
my-frontend/src/
├── common/
│   ├── components/
│   │   └── AboutMePage.tsx              # Reusable About Me component
│   └── layouts/
│       └── superadmin-layout.tsx        # Layout wrapper (existing)
└── modules/
    ├── system/pages/
    │   └── about-me.tsx                 # System module About Me page
    ├── finance/pages/
    │   └── about-me.tsx                 # Finance module About Me page
    ├── procurement/pages/
    │   └── about-me.tsx                 # Procurement module About Me page
    ├── operations/pages/
    │   └── about-me.tsx                 # Operations module About Me page
    └── compliance/pages/
        └── about-me.tsx                 # Compliance module About Me page
```

---

## 🔧 Implementation Details

### 1. Core Component: `AboutMePage.tsx`

**Location**: `/common/components/AboutMePage.tsx`

**Key Features**:
- Reusable across all modules
- Auto-populates from `useAuth()` hook
- Supports custom employee data
- Profile picture upload to `/api/upload/profile-pic`
- Team member search functionality
- Fully responsive with dark mode

**Props**:
```typescript
interface AboutMePageProps {
  customEmployees?: Employee[];    // Optional custom team data
  apiBaseUrl?: string;             // API base URL (default: env var)
  showTeamSidebar?: boolean;       // Show/hide team sidebar (default: true)
}
```

### 2. Module-Specific Pages

Each module has its own About Me page with:
- **SuperAdminLayout** wrapper for consistent UI
- **Permission guards** using `hasAccess()`
- **Custom team data** relevant to the module
- **Access denied screen** for unauthorized users

---

## 📊 Created Pages

| Module | File Path | Permission Keys | Status |
|--------|-----------|----------------|--------|
| **System** | `modules/system/pages/about-me.tsx` | `system-settings`, `user-management` | ✅ Created |
| **Finance** | `modules/finance/pages/about-me.tsx` | `executive-dashboard`, `general-ledger`, `financial-statements` | ✅ Created |
| **Procurement** | `modules/procurement/pages/about-me.tsx` | `purchase-order`, `purchase-request` | ✅ Created |
| **Operations** | `modules/operations/pages/about-me.tsx` | `kpi-dashboard`, `sales-order`, `stock-entry` | ✅ Created |
| **Compliance** | `modules/compliance/pages/about-me.tsx` | `compliance-dashboard`, `audit-trail` | ✅ Created |

---

## 🚀 Usage Examples

### Example 1: Basic Usage (Auto-populated from Auth)

```tsx
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import AboutMePage from '@/common/components/AboutMePage';

export default function MyAboutPage() {
  return (
    <SuperAdminLayout title="About Me">
      <AboutMePage />
    </SuperAdminLayout>
  );
}
```

### Example 2: With Custom Team Data

```tsx
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import AboutMePage from '@/common/components/AboutMePage';
import { useAuth } from '@/common/hooks/useAuth';

export default function TeamAboutPage() {
  const { user } = useAuth();

  const customTeam = [
    {
      id: 1,
      name: user?.name || 'User',
      role: user?.roleName || 'Team Member',
      photo: 'https://example.com/photo.jpg',
      about: 'Professional description...',
      details: [
        { label: 'Employee ID', value: 'EMP-001' },
        { label: 'Department', value: 'Finance' },
      ],
    },
  ];

  return (
    <SuperAdminLayout title="About Me">
      <AboutMePage customEmployees={customTeam} />
    </SuperAdminLayout>
  );
}
```

### Example 3: Without Team Sidebar

```tsx
<AboutMePage showTeamSidebar={false} />
```

---

## 🔐 Permission Integration

Each About Me page checks user permissions before rendering:

```tsx
import { useAuth } from '@/common/hooks/useAuth';

export default function AboutMePage() {
  const { hasAccess } = useAuth();

  // Check permission
  if (!hasAccess('required-permission-key')) {
    return <AccessDeniedScreen />;
  }

  return <AboutMePage />;
}
```

**Permission Keys Used**:
- System: `system-settings`, `user-management`
- Finance: `executive-dashboard`, `general-ledger`, `financial-statements`
- Procurement: `purchase-order`, `purchase-request`
- Operations: `kpi-dashboard`, `sales-order`, `stock-entry`
- Compliance: `compliance-dashboard`, `audit-trail`

---

## 📸 Profile Picture Upload

### API Endpoint
- **POST** `/api/upload/profile-pic`
- **GET** `/api/upload/profile-pic`

### Upload Requirements
- **Max Size**: 2MB
- **Formats**: JPEG, PNG, GIF, WebP
- **Authentication**: Required (credentials: 'include')

### Backend Response
```json
{
  "success": true,
  "url": "/uploads/profile-pics/user-123.jpg",
  "message": "Profile picture uploaded successfully"
}
```

---

## 🎨 Styling & Dark Mode

All components support dark mode with Tailwind CSS classes:

```css
/* Light Mode */
bg-white text-gray-900

/* Dark Mode */
dark:bg-gray-800 dark:text-gray-100
```

**Custom Styled Components**:
- Profile cards with shadows
- Team sidebar with scroll
- Info sections with borders
- Responsive grid layouts

---

## 📱 Responsive Design

| Breakpoint | Behavior |
|------------|----------|
| **Mobile** (< 768px) | Single column, full-width cards |
| **Tablet** (768px - 1024px) | Two-column layout, stacked sidebar |
| **Desktop** (> 1024px) | Sidebar + main content side-by-side |

---

## 🔄 Next Steps

### 1. Create App Router Routes

Create Next.js routes to access these pages:

```bash
# System Module
my-frontend/src/app/system/about-me/page.tsx

# Finance Module
my-frontend/src/app/finance/about-me/page.tsx

# Procurement Module
my-frontend/src/app/procurement/about-me/page.tsx

# Operations Module
my-frontend/src/app/operations/about-me/page.tsx

# Compliance Module
my-frontend/src/app/compliance/about-me/page.tsx
```

**Route Template**:
```tsx
// app/[module]/about-me/page.tsx
export { default } from '@/modules/[module]/pages/about-me';
```

### 2. Add Navigation Links

Add "About Me" links to each module's navigation menu:

```tsx
const navigationItems = [
  { name: 'Dashboard', href: '/module/dashboard', icon: HomeIcon },
  { name: 'About Me', href: '/module/about-me', icon: UserIcon },
  // ... other items
];
```

### 3. Backend Integration

Ensure the backend supports:
- Profile picture upload endpoint
- User profile data API
- Team member listing (optional)

---

## 🐛 Troubleshooting

### Issue: Profile picture not uploading
**Solution**: Check backend endpoint `/api/upload/profile-pic` is available and accepts FormData

### Issue: Access denied even with correct role
**Solution**: Verify permission keys in `rolePermissions.ts` match the role

### Issue: Dark mode not working
**Solution**: Ensure Tailwind dark mode is configured in `tailwind.config.js`:
```js
module.exports = {
  darkMode: 'class',
  // ...
}
```

### Issue: Team sidebar not showing
**Solution**: Pass multiple employees in `customEmployees` prop or set `showTeamSidebar={true}`

---

## ✅ Verification Checklist

- [x] Core `AboutMePage` component created
- [x] System module About Me page created
- [x] Finance module About Me page created
- [x] Procurement module About Me page created
- [x] Operations module About Me page created
- [x] Compliance module About Me page created
- [ ] App Router routes created (Next step)
- [ ] Navigation links added (Next step)
- [ ] Backend endpoints verified (Next step)
- [ ] Profile picture upload tested (Next step)

---

## 📚 Related Files

- **Layout Wrapper**: `/common/layouts/superadmin-layout.tsx`
- **Auth Hook**: `/common/hooks/useAuth.ts`
- **RBAC Config**: `/common/rbac/rolePermissions.ts`
- **Hub Incharge Reference**: `/components/hub-incharge/HubInchargeApp.tsx` (original implementation)

---

## 🎓 Key Learnings

1. **Reusability**: Single component used across all modules
2. **Consistency**: Same layout wrapper (`SuperAdminLayout`) everywhere
3. **Flexibility**: Customizable per module while maintaining structure
4. **Security**: Permission-based access control integrated
5. **User Experience**: Dark mode, responsive, profile upload all supported

---

## 🚀 Summary

✅ **5 About Me pages created** across all modules  
✅ **1 reusable component** (`AboutMePage.tsx`)  
✅ **RBAC integration** with permission guards  
✅ **Dark mode support** throughout  
✅ **Profile picture upload** functionality  
✅ **Responsive design** for all devices  

**Next Phase**: Create App Router routes and add navigation links to make pages accessible from the dashboard.

---

**Last Updated**: January 2025  
**Status**: ✅ Component Infrastructure Complete - Ready for Route Integration
