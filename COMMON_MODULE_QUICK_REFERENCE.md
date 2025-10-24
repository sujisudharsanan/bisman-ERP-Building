# Common Module Quick Reference

## 📍 File Locations

### Frontend Files
```
/my-frontend/src/
├── modules/common/
│   ├── config/common-module-registry.ts
│   └── pages/
│       ├── about-me.tsx
│       ├── change-password.tsx
│       ├── security-settings.tsx
│       ├── notifications.tsx
│       ├── messages.tsx
│       ├── help-center.tsx
│       ├── documentation.tsx
│       └── user-settings.tsx
├── app/common/
│   ├── about-me/page.tsx
│   ├── change-password/page.tsx
│   ├── security-settings/page.tsx
│   ├── notifications/page.tsx
│   ├── messages/page.tsx
│   ├── help-center/page.tsx
│   ├── documentation/page.tsx
│   └── user-settings/page.tsx
└── common/
    ├── config/page-registry.ts          # Updated with common module
    └── components/DynamicSidebar.tsx    # Updated for 'authenticated' permission
```

### Backend Files
```
/my-backend/
└── scripts/sync-common-pages.js         # Optional database sync
```

---

## 🚀 Quick Start

### Access Common Pages
1. Login with any user account
2. Look for "Common" section in sidebar (bottom)
3. Click any common page to access

### Test All Roles
```bash
# Login with these accounts to verify access:
- demo_super_admin      → Should see Common + all role pages
- demo_finance_manager  → Should see Common + finance pages
- demo_hub_incharge     → Should see Common + hub pages
```

---

## 🔑 Key Concepts

### Permission System
```typescript
// Automatic permission for all logged-in users
permissions: ['authenticated']  // ← Special permission

// Available to all roles
roles: ['ALL']
```

### Module Configuration
```typescript
// Common module appears last in sidebar
MODULES = {
  common: {
    id: 'common',
    name: 'Common',
    icon: Users,
    order: 999,  // ← Appears at bottom
    color: 'gray',
  }
}
```

---

## 📄 Common Pages URLs

| Page | URL | Description |
|------|-----|-------------|
| About Me | `/common/about-me` | User profile |
| Change Password | `/common/change-password` | Password management |
| Security Settings | `/common/security-settings` | Security options |
| Notifications | `/common/notifications` | Notification center |
| Messages | `/common/messages` | Internal messaging |
| Help Center | `/common/help-center` | Help & support |
| Documentation | `/common/documentation` | System docs |
| User Settings | `/common/user-settings` | User preferences |

---

## 🎨 Component Patterns

### Page Structure
```tsx
'use client';
import React from 'react';

export default function MyCommonPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Page Title
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Page description
        </p>
      </div>

      {/* Page Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        {/* Content here */}
      </div>
    </div>
  );
}
```

### Common Styles
```tsx
// Card
className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"

// Heading
className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4"

// Input
className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
           rounded-lg bg-white dark:bg-gray-700"

// Button (Primary)
className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"

// Button (Secondary)
className="px-4 py-2 border border-gray-300 dark:border-gray-600 
           hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
```

---

## 🔧 Adding New Common Page

### 1-Minute Setup
```bash
# 1. Create page component
touch my-frontend/src/modules/common/pages/my-page.tsx

# 2. Create App Router page
mkdir -p my-frontend/src/app/common/my-page
touch my-frontend/src/app/common/my-page/page.tsx
```

### Required Code

**Page Component** (`/modules/common/pages/my-page.tsx`):
```tsx
'use client';
import React from 'react';

export default function MyPage() {
  return <div className="p-6">My Page Content</div>;
}
```

**App Router** (`/app/common/my-page/page.tsx`):
```tsx
export { default } from '@/modules/common/pages/my-page';
```

**Registry Entry** (`/common/config/page-registry.ts`):
```typescript
{
  id: 'common-my-page',
  name: 'My Page',
  path: '/common/my-page',
  icon: Star, // Import from lucide-react
  module: 'common',
  permissions: ['authenticated'],
  roles: ['ALL'],
  status: 'active',
  description: 'My page description',
  order: 9,
}
```

---

## 🐛 Troubleshooting

### Page not in sidebar?
1. ✅ Check PAGE_REGISTRY has entry with `module: 'common'`
2. ✅ Verify `permissions: ['authenticated']`
3. ✅ Ensure user is logged in
4. ✅ Refresh browser

### 404 Not Found?
1. ✅ Check `/app/common/[page]/page.tsx` exists
2. ✅ Verify path in PAGE_REGISTRY matches URL
3. ✅ Restart dev server: `npm run dev`

### Styling broken?
1. ✅ Use `dark:` prefixes for dark mode
2. ✅ Copy patterns from existing common pages
3. ✅ Test in both light and dark modes

---

## 📊 Verification

### Check Sidebar
```bash
# Should see this structure:
Dashboard
└─ System (only Super Admin)
└─ Finance (only Finance users)
└─ Operations (only Operations users)
└─ Common ← All users see this
   ├─ About Me
   ├─ Change Password
   ├─ Security Settings
   ├─ Notifications
   ├─ Messages
   ├─ Help Center
   ├─ Documentation
   └─ User Settings
```

### Browser Console
```javascript
// Should see these logs:
[Sidebar] Super Admin detected - granting all access
[Sidebar] Allowed pages: 6
[Sidebar] Final permissions: ['authenticated', 'view_dashboard', ...]
```

---

## 🎯 Testing Commands

```bash
# Start development server
cd my-frontend
npm run dev

# Build for production
npm run build

# Check TypeScript errors
npm run type-check

# Optional: Sync to database
cd my-backend
node scripts/sync-common-pages.js --dry-run
```

---

## 📚 Documentation Files

- **Full Guide**: `COMMON_MODULE_IMPLEMENTATION.md`
- **Quick Reference**: `COMMON_MODULE_QUICK_REFERENCE.md` (this file)
- **Permission System**: `PERMISSION_BASED_SIDEBAR.md`
- **Project Overview**: `COMPLETE_PROJECT_SUMMARY.md`

---

## ✅ Success Checklist

- [x] 8 common pages created
- [x] Pages registered in page-registry.ts
- [x] App Router pages created
- [x] DynamicSidebar updated
- [x] 'authenticated' permission implemented
- [ ] Tested with all roles ← **DO THIS NEXT**
- [ ] Verified dark mode
- [ ] Production deployment

---

## 🚨 Important Notes

1. **No Database Setup Required**: Common pages work automatically for all authenticated users
2. **Module Order**: Common module (order: 999) always appears at bottom of sidebar
3. **Permission**: Uses special `'authenticated'` permission, not stored in database
4. **Universal Access**: All roles (Super Admin, Finance, Hub Incharge, etc.) can access

---

**Quick Start Time**: ~2 minutes  
**Last Updated**: January 2025  
**Status**: ✅ Ready for Testing
