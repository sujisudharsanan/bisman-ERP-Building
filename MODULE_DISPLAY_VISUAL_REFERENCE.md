# Module Display Visual Reference

## Module Color Coding

### ✅ Assigned Modules (Green)
```
┌─────────────────────────────────────────┐
│ ✓ Finance Module          finance       │  <- Green background
│   Border: green-500                     │     Green checkmark
│   Bg: green-50 (light) / green-900/20   │     Font weight: medium
└─────────────────────────────────────────┘
```

### ❌ Unassigned Modules (Red)
```
┌─────────────────────────────────────────┐
│ ✗ HR Module              hr             │  <- Red background
│   Border: red-400                       │     Red cross mark
│   Bg: red-50 (light) / red-900/20       │     Normal font weight
└─────────────────────────────────────────┘
```

### 🔵 Selected Module (Blue)
```
┌─────────────────────────────────────────┐
│ ✓ Inventory Module    inventory         │  <- Blue highlight
│   Border: blue-500                      │     Ring: blue-300
│   Bg: blue-50 (light) / blue-900/30     │     Active state
└─────────────────────────────────────────┘
```

## Module Hierarchy Display

When Super Admin is selected:

```
┌─── Modules Column ──────────────────────┐
│                                          │
│  [Badge: 5 assigned]                    │  <- Count badge
│                                          │
│  ✓ Finance Module (GREEN)              │
│  ✓ Inventory Module (GREEN)            │
│  ✓ Sales Module (GREEN)                │  <- Assigned modules
│  ✓ Procurement Module (GREEN)          │     shown first
│  ✓ Reports Module (GREEN)              │
│  ─────────────────────────                │
│  ✗ HR Module (RED)                     │
│  ✗ Payroll Module (RED)                │  <- Unassigned modules
│  ✗ Compliance Module (RED)             │     shown at bottom
│                                          │
└──────────────────────────────────────────┘
```

## Top Menu Bar Display (Super Admin Dashboard)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Super Admin Control Panel                               │
│                                                                  │
│                    [DB Indicator] [📦 5 Modules] [Refresh] [Logout] [🌙]
│                                      ↑                           │
│                           New module counter badge              │
└─────────────────────────────────────────────────────────────────┘
```

### Module Counter Badge Details:
- Icon: Package (📦)
- Text: "{count} Module" or "{count} Modules"
- Background: Green (green-100 / green-900/30)
- Border: Green (green-300 / green-700)
- Visibility: Hidden on mobile, shown on sm+ screens

## Color Palette

### Light Mode:
- **Assigned (Green)**:
  - Background: `bg-green-50`
  - Border: `border-green-500`
  - Text: `text-green-700`
  - Icon: `text-green-600`

- **Unassigned (Red)**:
  - Background: `bg-red-50`
  - Border: `border-red-400`
  - Text: `text-red-700`
  - Icon: `text-red-600`

- **Selected (Blue)**:
  - Background: `bg-blue-50`
  - Border: `border-blue-500`
  - Ring: `ring-2 ring-blue-300`

### Dark Mode:
- **Assigned (Green)**:
  - Background: `dark:bg-green-900/20`
  - Border: `dark:border-green-600`
  - Text: `dark:text-green-300`
  - Icon: `dark:text-green-400`

- **Unassigned (Red)**:
  - Background: `dark:bg-red-900/20`
  - Border: `dark:border-red-600`
  - Text: `dark:text-red-300`
  - Icon: `dark:text-red-400`

- **Selected (Blue)**:
  - Background: `dark:bg-blue-900/30`
  - Border: `dark:border-blue-500`
  - Ring: `dark:ring-blue-700`

## Interactive States

### Hover Effects:
```
Assigned Module:
  Default: bg-green-50
  Hover:   bg-green-100 (darker green)

Unassigned Module:
  Default: bg-red-50
  Hover:   bg-red-100 (darker red)
```

### Click/Focus States:
```
Any Module when Selected:
  - Blue border (border-blue-500)
  - Blue background (bg-blue-50)
  - Blue ring (ring-2 ring-blue-300)
  - Overrides green/red styling
```

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Enterprise Admin - Modules Management                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Stats Row: Total Users | Total Modules | Business | Pump]     │
│                                                                  │
│  ┌────────┬────────────┬──────────────┬───────────────┐        │
│  │Category│Super Admins│   Modules    │    Pages      │        │
│  │        │            │              │               │        │
│  │Business│John Doe    │✓ Finance     │□ Dashboard    │        │
│  │Pump    │Jane Smith  │✓ Inventory   │□ Reports      │        │
│  │        │Bob Wilson  │✗ HR          │□ Settings     │        │
│  │        │            │✗ Payroll     │               │        │
│  │        │            │[5 assigned]  │[Assign Button]│        │
│  └────────┴────────────┴──────────────┴───────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Responsive Behavior

### Desktop (lg+):
- All 4 columns visible
- Module counter badge visible
- Full module names displayed

### Tablet (md):
- All 4 columns visible
- Module counter badge visible
- Truncated module names with ellipsis

### Mobile (sm):
- Columns stack vertically
- Module counter badge HIDDEN
- Hamburger menu for navigation

## Accessibility Features

1. **Tooltips**: Hover over modules shows full details
2. **ARIA Labels**: Proper labels for screen readers
3. **Keyboard Navigation**: Tab through modules
4. **Color + Icon**: Not relying on color alone (✓/✗ icons)
5. **Contrast**: All color combinations meet WCAG AA standards

## Status Indicators

| State      | Icon | Color | Position |
|------------|------|-------|----------|
| Assigned   | ✓    | Green | Left     |
| Unassigned | ✗    | Red   | Left     |
| Selected   | -    | Blue  | Border   |

## Badge Component

Module Counter Badge:
```jsx
<div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 
                rounded-md bg-green-100 dark:bg-green-900/30 
                text-green-700 dark:text-green-300 text-xs font-medium 
                border border-green-300 dark:border-green-700">
  <Package className="w-3.5 h-3.5" />
  <span>{assignedModulesCount} Module{assignedModulesCount !== 1 ? 's' : ''}</span>
</div>
```

Assignment Counter Badge (in module column):
```jsx
<span className="text-xs font-normal px-2 py-1 rounded-full 
               bg-green-100 dark:bg-green-900/30 
               text-green-700 dark:text-green-300">
  {selectedAdmin.assignedModules?.length || 0} assigned
</span>
```
