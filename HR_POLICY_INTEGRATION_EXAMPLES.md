# 🔗 HR Policy Page - Integration Examples

## 📍 Adding to Navigation Menus

### 1. Add to HR Sidebar Menu

If you have an HR role configuration file, add this menu item:

```typescript
// Example: src/config/hrMenuConfig.ts or similar
const hrMenuItems = [
  {
    id: 'hr-dashboard',
    label: 'Dashboard',
    href: '/hr',
    icon: 'LayoutDashboard'
  },
  {
    id: 'user-creation',
    label: 'Create User',
    href: '/hr/user-creation',
    icon: 'UserPlus'
  },
  {
    id: 'hr-policy',
    label: 'HR Policies',
    href: '/hr/policy',
    icon: 'FileText',
    badge: 'New'  // Optional
  },
  // ... other menu items
];
```

---

### 2. Add to Common/Global Navigation

**Note**: This page is currently only in the HR module. If you want to make it accessible to all users, you would need to:

1. Create a route in the common directory, OR
2. Add cross-role access permissions

Example for HR-only access:

```typescript
// Example: src/config/hrMenuConfig.ts
const hrMenuItems = [
  {
    id: 'hr-policy',
    label: 'HR Policies',
    href: '/hr/policy',
    icon: 'FileText',
    description: 'View company policies and guidelines'
  },
  // ... other items
];
```

---

### 3. Add to Help & Support Page

Link from the Help Center as a resource:

```tsx
// In: src/modules/common/pages/help-support.tsx

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Existing links */}
  
  <a
    href="/common/hr-policy"
    className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
  >
    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
    <div>
      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
        HR Policy Manual
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Review company policies, code of conduct, and employee guidelines
      </p>
    </div>
  </a>
  
  {/* Other links */}
</div>
```

---

### 4. Add to Dashboard Quick Links

Add as a quick action on any dashboard:

```tsx
// Example: In HR Dashboard or Employee Dashboard

<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* Other quick links */}
  
  <Link 
    href="/common/hr-policy"
    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
  >
    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
      <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    </div>
    <div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
        HR Policies
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        View all policies
      </p>
    </div>
  </Link>
  
  {/* Other cards */}
</div>
```

---

## 🔐 Backend Integration

### 1. Add to Page Registry

Update: `/my-backend/routes/pagesRoutes.js`

```javascript
const SYSTEM_PAGES = [
  // ... existing pages
  
  // HR Module Pages
  { 
    key: 'hr-policy', 
    name: 'HR Policy Manual', 
    module: 'hr',
    description: 'International standard HR policies'
  },
  { 
    key: 'hr-user-creation', 
    name: 'Create New User', 
    module: 'hr' 
  },
  
  // ... more pages
];
```

---

### 2. Add to Permissions System

If you have a permissions table:

```sql
-- Add to user_permissions or role_permissions
INSERT INTO role_permissions (role_id, page_key, can_view, can_edit)
VALUES 
  ('HR', 'hr-policy', true, false),
  ('EMPLOYEE', 'hr-policy', true, false),
  ('MANAGER', 'hr-policy', true, false);
```

Or in JavaScript deployment script:

```javascript
const hrPages = [
  'user-creation',
  'hr-policy',  // ← Add this
  'user-settings',
  'about-me'
];

await pool.query(`
  INSERT INTO user_permissions (user_id, allowed_pages)
  VALUES ($1, $2)
  ON CONFLICT (user_id) 
  DO UPDATE SET allowed_pages = EXCLUDED.allowed_pages
`, [userId, hrPages]);
```

---

### 3. Add to Role Configuration

Update: `/my-backend/config/master-modules.js`

```javascript
{
  id: 'hr',
  name: 'Human Resources',
  description: 'Employee, attendance, payroll, and HR operations',
  icon: 'FiUsers',
  category: 'Human Resources',
  businessCategory: 'Business ERP',
  pages: [
    { id: 'dashboard', name: 'HR Dashboard', path: '/hr' },
    { id: 'user-creation', name: 'Create New User', path: '/hr/user-creation' },
    { 
      id: 'hr-policy', 
      name: 'HR Policy Manual', 
      path: '/hr/policy',
      badge: 'New'
    },
    // ... other pages
  ],
}
```

---

## 🎨 Custom Styling Examples

### 1. Create a Floating Action Button

```tsx
// Add to any page for quick access
<a
  href="/common/hr-policy"
  className="fixed bottom-6 right-6 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-50"
  title="View HR Policies"
>
  <FileText className="w-6 h-6" />
</a>
```

---

### 2. Create a Banner Alert

```tsx
// Show on employee portal after login
<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
  <div className="flex items-start gap-3">
    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Updated HR Policies Available
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
        Review the latest company policies and guidelines.
      </p>
      <a 
        href="/common/hr-policy"
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
      >
        View HR Policy Manual →
      </a>
    </div>
  </div>
</div>
```

---

### 3. Create a Modal Popup

```tsx
'use client';

import { useState } from 'react';
import { FileText, X } from 'lucide-react';

export function HRPolicyModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
      >
        <FileText className="w-4 h-4" />
        HR Policies
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                HR Policy Manual
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              src="/common/hr-policy"
              className="flex-1 w-full"
              title="HR Policy Manual"
            />
          </div>
        </div>
      )}
    </>
  );
}
```

---

## 📧 Email/Notification Integration

### 1. New Employee Welcome Email

```html
<h2>Welcome to BISMAN ERP!</h2>
<p>Hi {{employee_name}},</p>
<p>As a new team member, please review our HR policies:</p>
<a href="https://yourapp.com/common/hr-policy" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">
  View HR Policy Manual
</a>
```

---

### 2. Policy Update Notification

```typescript
// Example notification payload
const notification = {
  title: 'HR Policies Updated',
  message: 'The HR Policy Manual has been updated. Please review the changes.',
  type: 'info',
  actionLabel: 'View Policies',
  actionUrl: '/common/hr-policy#policy-review',
  icon: 'FileText',
  timestamp: new Date()
};
```

---

## 🔍 Search Integration

### 1. Add to Global Search Results

```typescript
// Example: In search function
const searchResults = [
  // ... other results
  {
    type: 'page',
    title: 'HR Policy Manual',
    description: 'International standard HR policies covering all aspects of employment',
    url: '/common/hr-policy',
    icon: 'FileText',
    category: 'Resources',
    keywords: ['policy', 'hr', 'rules', 'guidelines', 'code of conduct']
  }
];
```

---

### 2. Add Section-Level Search Results

```typescript
const policySearchResults = [
  {
    title: 'Leave Policy',
    url: '/common/hr-policy#leave',
    excerpt: 'Annual leave, sick leave, maternity/paternity leave policies...'
  },
  {
    title: 'Code of Conduct',
    url: '/common/hr-policy#code-of-conduct',
    excerpt: 'Zero tolerance for harassment, discrimination, or bullying...'
  },
  // ... more sections
];
```

---

## 📱 Mobile App Integration

### 1. Deep Link Configuration

```json
{
  "deepLinks": {
    "hrPolicy": {
      "path": "/common/hr-policy",
      "title": "HR Policy Manual",
      "icon": "file-text"
    }
  }
}
```

---

### 2. Quick Access Widget

```tsx
// Mobile app home screen widget
<TouchableOpacity 
  onPress={() => navigation.navigate('HRPolicy')}
  style={styles.policyWidget}
>
  <Icon name="file-text" size={24} color="#2563eb" />
  <Text style={styles.widgetText}>HR Policies</Text>
</TouchableOpacity>
```

---

## 🎓 Onboarding Flow

### 1. Add to Onboarding Checklist

```tsx
const onboardingSteps = [
  {
    id: 'setup-account',
    title: 'Set up your account',
    completed: true
  },
  {
    id: 'review-policies',
    title: 'Review HR Policies',
    description: 'Read and acknowledge company policies',
    action: 'Review Now',
    url: '/common/hr-policy',
    icon: 'FileText',
    completed: false
  },
  {
    id: 'complete-profile',
    title: 'Complete your profile',
    completed: false
  },
  // ... more steps
];
```

---

### 2. Policy Acknowledgment Feature

```tsx
'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export function PolicyAcknowledgment() {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAcknowledge = async () => {
    // Save acknowledgment to backend
    await fetch('/api/hr/acknowledge-policy', {
      method: 'POST',
      body: JSON.stringify({
        policyVersion: '1.0',
        acknowledgedAt: new Date()
      })
    });
    setAcknowledged(true);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4">Policy Acknowledgment Required</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Please review the HR Policy Manual and confirm you understand the policies.
      </p>
      <a 
        href="/common/hr-policy"
        target="_blank"
        className="text-blue-600 hover:underline mb-4 block"
      >
        Open HR Policy Manual →
      </a>
      <button
        onClick={handleAcknowledge}
        disabled={acknowledged}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          acknowledged 
            ? 'bg-green-100 text-green-800 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {acknowledged ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Acknowledged
          </>
        ) : (
          'I acknowledge these policies'
        )}
      </button>
    </div>
  );
}
```

---

## 📊 Analytics Tracking

### 1. Track Page Views

```typescript
// Add to HR Policy page
useEffect(() => {
  // Track page view
  analytics.track('HR Policy Viewed', {
    userId: user.id,
    timestamp: new Date(),
    referrer: document.referrer
  });
}, []);
```

---

### 2. Track Section Views

```typescript
// Track which sections are most viewed
const handleSectionClick = (sectionId: string) => {
  analytics.track('HR Policy Section Viewed', {
    sectionId,
    sectionTitle: sections.find(s => s.id === sectionId)?.title,
    userId: user.id
  });
};
```

---

## 🎯 Next Steps

1. **Choose Integration Points**: Decide where to add links based on your app structure
2. **Update Navigation**: Add menu items where appropriate
3. **Configure Permissions**: Ensure all roles have proper access
4. **Test Access**: Verify users can reach the page from all entry points
5. **Track Usage**: Monitor which sections are most accessed
6. **Gather Feedback**: Ask users for improvement suggestions

---

**Ready to integrate! Choose the approaches that fit your app architecture.** 🚀
