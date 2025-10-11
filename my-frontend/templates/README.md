# Page Templates - Tab Persistence System

This folder contains ready-to-use templates for creating new pages with proper authentication and tab persistence.

## 📁 Files

### 1. `page-template.tsx`
**Use for:** Creating new page routes in `/app/your-route/page.tsx`

**Features:**
- ✅ Proper authentication checks
- ✅ Loading state handling
- ✅ Role-based access control
- ✅ Prevents race conditions on refresh

### 2. `component-with-tabs-template.tsx`
**Use for:** Components with multiple tabs that need URL persistence

**Features:**
- ✅ Tab state preserved on refresh
- ✅ URL-based tab navigation (`?tab=dashboard`)
- ✅ Browser back/forward button support
- ✅ Security checks with loading guards
- ✅ Shareable URLs (specific tabs can be bookmarked)

### 3. `simple-component-template.tsx`
**Use for:** Components without tabs

**Features:**
- ✅ Basic authentication checks
- ✅ Loading state handling
- ✅ Role-based access control

### 4. `QUICK_START.md`
Step-by-step instructions for using the templates

### 5. `PAGE_TEMPLATE_GUIDE.md` (in parent folder)
Comprehensive guide with examples and best practices

---

## 🚀 Quick Usage

### Creating a Page with Tabs:

```bash
# 1. Copy templates
cp templates/page-template.tsx src/app/reports/page.tsx
cp templates/component-with-tabs-template.tsx src/components/ReportsComponent.tsx

# 2. Edit page.tsx
# - Update component name and imports
# - Set allowed roles

# 3. Edit component
# - Define tab names
# - Implement tab content
# - Update navigation

# 4. Test
npm run dev
```

---

## 📋 What Gets Preserved on Refresh?

### With URL-Based Tabs (Recommended):
- ✅ Current tab selection
- ✅ Scroll position (if using `scroll: false`)
- ✅ Authentication state
- ✅ User session

### With localStorage (For Complex State):
- ✅ Custom form inputs
- ✅ Filter selections
- ✅ Expanded/collapsed sections
- ✅ Any JSON-serializable state

---

## 🔒 Security Pattern

All templates implement this critical pattern:

```tsx
// 1. Get auth state with loading
const { user, loading } = useAuth();

// 2. Wait for loading FIRST
if (loading) {
  return <LoadingSpinner />;
}

// 3. Then check authentication/authorization
if (!user || !allowedRoles.includes(user.roleName)) {
  router.push('/unauthorized');
}

// 4. Only render content after checks pass
return <YourContent />;
```

**Why this order matters:**
- Prevents redirects during initial auth check
- Avoids race conditions on page refresh
- Ensures user data is available before rendering

---

## 🎯 When to Use Which Template?

| Scenario | Template | Example |
|----------|----------|---------|
| Dashboard with tabs | `component-with-tabs-template.tsx` | Super Admin Panel |
| Simple settings page | `simple-component-template.tsx` | Profile Page |
| Report with filters | `component-with-tabs-template.tsx` | Sales Reports |
| Single form page | `simple-component-template.tsx` | Create User |
| Multi-section page | `component-with-tabs-template.tsx` | Hub Incharge |

---

## 🔧 Common Customizations

### Add More Tabs:
```tsx
type TabName = 'tab1' | 'tab2' | 'tab3' | 'newTab';

<button onClick={() => handleTabChange('newTab')}>
  New Tab
</button>

{activeTab === 'newTab' && <NewTabContent />}
```

### Change Default Tab:
```tsx
const [activeTab, setActiveTab] = useState<TabName>(
  (searchParams.get('tab') as TabName) || 'dashboard'  // Change this
);
```

### Restrict Roles:
```tsx
const allowedRoles = ['SUPER_ADMIN'];  // Only super admin
const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];  // Admin and super admin
const allowedRoles = ['STAFF', 'MANAGER', 'ADMIN'];  // Multiple roles
```

### Custom Loading Message:
```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading your custom message...</p>
      </div>
    </div>
  );
}
```

---

## 📖 Documentation

- **Quick Start**: `QUICK_START.md` - Step-by-step guide
- **Complete Guide**: `../PAGE_TEMPLATE_GUIDE.md` - Comprehensive documentation
- **Working Examples**: Check `/app/super-admin`, `/app/hub-incharge`, `/app/admin`

---

## ✅ Pre-Implementation Checklist

Before using templates:
- [ ] Backend authentication is working
- [ ] useAuth hook is configured
- [ ] Role names match backend (SUPER_ADMIN, ADMIN, etc.)
- [ ] Next.js middleware is protecting routes

After implementing from template:
- [ ] Updated component/page names
- [ ] Updated allowed roles
- [ ] Tested login redirects correctly
- [ ] Tested page refresh preserves state
- [ ] Tested unauthorized access blocked
- [ ] Tested browser back/forward buttons

---

## 🐛 Troubleshooting

### Page redirects on refresh:
- ✅ Check `if (loading) return;` comes FIRST
- ✅ Verify `loading` is destructured from useAuth
- ✅ Make sure security checks are AFTER loading check

### Tabs don't persist:
- ✅ Check `router.replace(?tab=...)` is called
- ✅ Verify `searchParams.get('tab')` initializes state
- ✅ Make sure useEffect syncs URL changes

### Unauthorized users see content briefly:
- ✅ Add loading spinner while `authLoading === true`
- ✅ Return `null` or redirect for unauthorized users
- ✅ Check security checks run before rendering content

---

## 📞 Support

If you need help:
1. Read `PAGE_TEMPLATE_GUIDE.md` for detailed explanations
2. Check working examples in the codebase
3. Verify authentication is working first
4. Test with different roles and scenarios

---

**Created:** October 9, 2025
**Last Updated:** October 9, 2025
**Version:** 1.0
