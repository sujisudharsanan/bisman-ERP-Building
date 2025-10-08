# Quick Start - Creating New Pages with Tab Persistence

## Option 1: Page with Tabs (Most Common)

### Step 1: Create the page file
```bash
# Create new page directory
mkdir -p my-frontend/src/app/your-route

# Copy page template
cp my-frontend/templates/page-template.tsx my-frontend/src/app/your-route/page.tsx
```

### Step 2: Create the component with tabs
```bash
# Copy component template
cp my-frontend/templates/component-with-tabs-template.tsx my-frontend/src/components/YourComponent.tsx
```

### Step 3: Update the page file
Edit `my-frontend/src/app/your-route/page.tsx`:
- Replace "YourPage" with your page name
- Import your component: `import YourComponent from '@/components/YourComponent'`
- Update allowed roles: `['SUPER_ADMIN', 'ADMIN']`

### Step 4: Update the component file
Edit `my-frontend/src/components/YourComponent.tsx`:
- Update `TabName` type with your tab names
- Update `allowedRoles` array
- Implement tab content for each tab
- Update tab navigation UI

---

## Option 2: Simple Page (No Tabs)

### Step 1: Create the page file
```bash
mkdir -p my-frontend/src/app/your-route
cp my-frontend/templates/page-template.tsx my-frontend/src/app/your-route/page.tsx
```

### Step 2: Create simple component
```bash
cp my-frontend/templates/simple-component-template.tsx my-frontend/src/components/YourComponent.tsx
```

### Step 3: Update files
- Update page.tsx with your page name and allowed roles
- Update component.tsx with your component content

---

## Checklist Before Testing

- [ ] Updated component/page names
- [ ] Updated allowed roles
- [ ] Imported component in page file
- [ ] Updated tab names (if using tabs)
- [ ] Implemented tab content (if using tabs)
- [ ] Tested loading state shows spinner
- [ ] Tested unauthorized access redirects
- [ ] Tested page refresh stays on same page/tab

---

## Testing Your New Page

1. **Start the development server** (if not running):
   ```bash
   cd my-frontend
   npm run dev
   ```

2. **Test authentication**:
   - Login with appropriate role
   - Navigate to your new page
   - Verify you see the content

3. **Test tab persistence** (if using tabs):
   - Click different tabs
   - Press F5 or Cmd+R
   - Verify you stay on the same tab

4. **Test unauthorized access**:
   - Login with wrong role
   - Try to access the page
   - Verify you're redirected

5. **Test browser navigation**:
   - Navigate between tabs
   - Use browser back button
   - Verify tabs change correctly

---

## Common Customizations

### Change default tab:
```tsx
const [activeTab, setActiveTab] = useState<TabName>(
  (searchParams.get('tab') as TabName) || 'your-default-tab'  // Change this
);
```

### Add more roles:
```tsx
const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'YOUR_NEW_ROLE'];
```

### Custom redirect for unauthorized:
```tsx
if (!user?.roleName || !allowedRoles.includes(user.roleName)) {
  router.push('/custom-error-page');  // Change this
  return <div>Custom error message</div>;
}
```

### Add nested routes:
```tsx
router.replace(`/your-route/sub-route?tab=${tab}`, { scroll: false });
```

---

## Examples in Codebase

Working examples you can reference:
- **Super Admin**: `/app/super-admin/page.tsx` + `/components/SuperAdminControlPanel.tsx`
- **Hub Incharge**: `/app/hub-incharge/page.tsx` + `/components/hub-incharge/HubInchargeApp.tsx`
- **Admin**: `/app/admin/page.tsx` + `/components/admin/AdminDashboard.tsx`

---

## Need Help?

See the full guide: `my-frontend/PAGE_TEMPLATE_GUIDE.md`
