# Role Management Bottom Section - Bug Fix Report

**Date:** January 24, 2026  
**Issue:** Bottom section showing all pages instead of role-scoped pages

---

## Problem Identified

### Bug Description
When a role is selected in the Role Management page, the bottom section was showing **ALL pages from the registry** instead of only pages relevant to the selected role. The "Assigned" and "Unassigned" filters were checking against the selected role's assigned pages, but the base list contained all pages - causing confusion.

### Root Causes

1. **Data Source Mismatch:**
   - `allPagesGroupedByRole` contained ALL 253 pages from PAGE_REGISTRY grouped by ALL roles
   - `rolePagesSelectedIds` only contained IDs for the CURRENTLY selected role
   - Filtering ALL pages against ONE role's assignments = incorrect results

2. **ID vs Path Mismatch:**
   - API returns `id: route.path` (e.g., `/super-admin`)
   - Registry pages have `id: 'super-admin-dashboard'` and `path: '/super-admin'`
   - Matching was inconsistent

3. **No Role-Scope Enforcement:**
   - Bottom section had no awareness of which role was selected
   - "Assigned/Unassigned" buttons were enabled even without a role selected

---

## Fix Applied

### 1. New Computed Property: `pagesForSelectedRoleInBottom`

Added a new `useMemo` that:
- Returns empty list if no role selected
- Filters PAGE_REGISTRY to only pages that belong to the selected role
- Splits into `assigned` / `unassigned` / `all` arrays
- Uses consistent matching: `rolePagesSelectedIds.has(page.path) || rolePagesSelectedIds.has(page.id)`

```typescript
const pagesForSelectedRoleInBottom = useMemo(() => {
  if (!selectedRoleId) {
    return { all: [], assigned: [], unassigned: [], roleSelected: false };
  }
  
  const selectedRole = allRoles.find(r => r.id === selectedRoleId);
  const selectedRoleName = selectedRole?.name?.toUpperCase() || '';
  
  // Get pages from registry that belong to this role
  const rolePages = PAGE_REGISTRY.filter(page => {
    if (page.status !== 'active') return false;
    const pageRoles = ((page as any).roles || []).map((r: string) => r.toUpperCase());
    return pageRoles.includes(selectedRoleName) || pageRoles.includes('ALL');
  });
  
  // Split by assignment status
  const assigned = rolePages.filter(page => 
    rolePagesSelectedIds.has(page.path) || rolePagesSelectedIds.has(page.id)
  );
  const unassigned = rolePages.filter(page => 
    !rolePagesSelectedIds.has(page.path) && !rolePagesSelectedIds.has(page.id)
  );
  
  return { all: rolePages, assigned, unassigned, roleSelected: true, roleName: selectedRoleName };
}, [selectedRoleId, allRoles, rolePagesSelectedIds]);
```

### 2. Updated Bottom Section Counts

Changed the filter buttons to show accurate counts:
- `All (X)` - pages for selected role
- `Assigned (X)` - pages assigned to selected role
- `Unassigned (X)` - pages not yet assigned to selected role
- Buttons disabled when no role selected

### 3. Rewrote Pages Content Rendering

Two distinct modes:

**A) Role Selected Mode:**
- Shows info banner: "Showing pages for role: ROLE_NAME"
- Only displays pages relevant to that role
- Correctly filters by assigned/unassigned
- Groups by module

**B) No Role Selected Mode:**
- Shows info banner: "Select a role above to see its assigned/unassigned pages"
- Shows overview of all pages (read-only, no assigned/unassigned coloring)
- Can group by Role or Module for browsing

---

## Behavior Matrix (After Fix)

| State | Bottom Section Shows |
|-------|---------------------|
| No role selected | Overview of all pages, info banner prompts role selection |
| Role selected + All | All pages for that role, colored by assignment status |
| Role selected + Assigned | Only pages assigned to that role (green) |
| Role selected + Unassigned | Only pages NOT assigned to that role (red tint) |
| Switch roles | Bottom refreshes immediately with new role's pages |

---

## Files Modified

1. **`/my-frontend/src/app/enterprise-admin/roles/page.tsx`**
   - Added `pagesForSelectedRoleInBottom` useMemo (lines ~960-1005)
   - Updated bottom section filter buttons with proper counts
   - Rewrote PAGES CONTENT section with role-scoped logic

---

## Testing Checklist

- [ ] Select a role → Bottom shows only that role's pages
- [ ] "Assigned" filter → Shows only assigned pages for role
- [ ] "Unassigned" filter → Shows only unassigned pages for role
- [ ] Assigned count matches API response
- [ ] Switch roles → Bottom updates immediately
- [ ] No role selected → Shows overview with info banner
- [ ] Common pages included in role's page list
- [ ] No duplicates in bottom section

---

## Related Files

- `PAGE_REGISTRY` at `/my-frontend/src/common/config/page-registry.ts`
- API endpoint: `GET /api/rbac/roles/:roleId/pages`
- Audit script: `/scripts/page-audit-report.js`
