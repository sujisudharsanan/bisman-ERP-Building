# Four-Column Layout - Visual Reference

## Layout Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│               Module Management - Page Assignment System                  │
├──────────────────────────────────────────────────────────────────────────┤
│ [Total: 2] [Modules: 8] [Business: 6] [Pump: 2]  ← Stats (Compact!)     │
├──────────┬───────────┬────────────────┬──────────────────────────────────┤
│Categories│   Super   │    Modules     │   Pages & Assignment Panel       │
│ (2 cols) │   Admins  │   (4 cols)     │        (4 cols)                  │
│          │  (2 cols) │                │                                  │
│┌────────┐│┌─────────┐│┌──────────────┐│┌────────────────────────────────┐│
││Business││││demo_   │││📦 Finance    │││ 📋 Page Management             ││
││  ERP ✓ ││││super_  │││   Module     │││                                ││
││        ││││admin ✓ │││              │││ Finance Module - 11 pages      ││
││6 Modules││││●●●●   │││1 Admin, 11pg │││                                ││
│└────────┘││└─────────┘││✓ ASSIGNED   │││ [Select All] [Remove Module]   ││
││        │││         ││└──────────────┘││                                ││
│┌────────┐││┌─────────┐│┌──────────────┐││ ☑ Dashboard                    ││
││ Pump   ││││admin2  │││📦 Operations │││ ☑ Reports                      ││
││ Mgmt   ││││●●     │││   Module     │││ ☐ Analytics                    ││
││        ││││2 Mods  │││              │││ ☑ Transactions                 ││
││2 Modules││││       │││2 Admins, 7pg │││ ☐ Settings                     ││
│└────────┘││└─────────┘│└──────────────┘││ ...                            ││
││        ││[Clear]   ││              │││                                ││
││        │││         ││(Click me!)   │││ [Assign 3 Pages]               ││
││        │││         ││              │││                                ││
││Compact!│││Compact! │││Compact!      │││ Selected: 3 / 11 pages         ││
│└────────┘│└─────────┘│└──────────────┘│└────────────────────────────────┘│
└──────────┴───────────┴────────────────┴──────────────────────────────────┘
```

## Interaction Flow

### Step 1: Select Category
```
┌──────────┐
│Categories│
│          │
│Business  │ ← Click
│  ERP ✓   │   
│          │   
│Pump Mgmt │
└──────────┘
      ↓
┌───────────┐
│   Super   │
│   Admins  │ ← Populates with Business ERP Super Admins
│           │
│demo_admin │
│admin2     │
└───────────┘
```

### Step 2: Select Super Admin
```
┌───────────┐
│   Super   │
│   Admins  │
│           │
│demo_admin │ ← Click
│  ●●●●  ✓  │
│           │
│admin2     │
└───────────┘
      ↓
┌────────────────┐
│    Modules     │ ← Shows modules (filtered or all)
│                │
│📦 Finance  ✓   │ ← ✓ = Already assigned
│📦 Operations   │
│📦 Procurement  │
└────────────────┘
```

### Step 3: Click Module
```
┌────────────────┐
│    Modules     │
│                │
│📦 Finance  ✓   │ ← Click
│  [Highlighted] │
│                │
│📦 Operations   │
└────────────────┘
      ↓
┌──────────────────────────────┐
│ Pages & Assignment Panel     │ ← Opens!
│                              │
│ Finance Module - 11 pages    │
│                              │
│ [Select All] [Remove Module] │
│                              │
│ ☑ Dashboard                  │ ← Pre-checked
│ ☑ Reports                    │    (already assigned)
│ ☐ Analytics                  │
│ ☑ Transactions               │
│ ☐ Settings                   │
│                              │
│ [Assign 3 Pages]             │
└──────────────────────────────┘
```

### Step 4: Select/Deselect Pages
```
┌──────────────────────┐
│ ☑ Dashboard          │ ← Click to toggle
│ ☑ Reports            │
│ ☐ Analytics          │ ← Click
│ ☑ Transactions       │
│ ☐ Settings           │ ← Click
└──────────────────────┘
      ↓
┌──────────────────────┐
│ ☑ Dashboard          │
│ ☑ Reports            │
│ ☑ Analytics          │ ✓ Now checked!
│ ☑ Transactions       │
│ ☑ Settings           │ ✓ Now checked!
└──────────────────────┘
      ↓
Selected: 5 / 11 pages
[Assign 5 Pages] ← Button updates
```

### Step 5: Assign Pages
```
Click: [Assign 5 Pages]
   ↓
[🔄 Saving...]  ← Loading spinner
   ↓
✅ "Module assigned successfully!"
   ↓
Data reloads → Module shows ✓ in Column 3
```

## Visual States

### Module Cards (Column 3)

#### Unselected - Not Assigned
```
┌──────────────────┐
│ 📦 Procurement   │ Border: Gray
│    Module        │ Background: Light purple/orange
│                  │
│ 0 Admins, 8pg    │
└──────────────────┘
```

#### Unselected - Already Assigned
```
┌──────────────────┐
│ 📦 Finance  ✓    │ Border: Gray
│    Module        │ Background: Light purple/orange
│                  │ Icon: Green checkmark
│ 1 Admin, 11pg    │
└──────────────────┘
```

#### Selected
```
╔══════════════════╗
║ 📦 Finance  ✓    ║ Border: Thick purple/orange
║    Module        ║ Background: Darker purple/orange
║                  ║ Shadow: Large
║ 1 Admin, 11pg    ║
╚══════════════════╝
```

### Page Checkboxes (Column 4)

#### Unchecked
```
┌────────────────────┐
│ ☐ Dashboard        │ Border: Gray
│   /dashboard       │ Background: Light gray
└────────────────────┘
```

#### Checked
```
┌────────────────────┐
│ ☑ Dashboard    ✓   │ Border: Green
│   /dashboard       │ Background: Light green
└────────────────────┘
```

#### Hover
```
┌────────────────────┐
│ ☐ Dashboard        │ Border: Blue (lighter)
│   /dashboard       │ Cursor: pointer
└────────────────────┘
```

## Button States

### Assign Button

#### Enabled
```
┌─────────────────┐
│ ✓ Assign 3 Pages│ Background: Blue
│                 │ Cursor: pointer
└─────────────────┘
```

#### Disabled (No Pages Selected)
```
┌─────────────────┐
│ ✓ Assign 0 Pages│ Background: Gray
│                 │ Cursor: not-allowed
└─────────────────┘
```

#### Loading
```
┌─────────────────┐
│ 🔄 Saving...    │ Background: Blue
│                 │ Spinner: Rotating
└─────────────────┘
```

### Remove Module Button
```
┌──────────────────┐
│ Remove Module    │ Background: Light red
│                  │ Text: Red
└──────────────────┘
```

### Select All Button
```
┌──────────────┐
│ Select All   │ Background: Light blue
│              │ Text: Blue
└──────────────┘

After clicking (all selected):
┌──────────────┐
│ Deselect All │ Text changes
└──────────────┘
```

## Empty States

### Column 2 (No Category)
```
┌───────────────┐
│               │
│   🛡️          │
│               │
│ Select a      │
│ category to   │
│ view Super    │
│ Admins        │
│               │
└───────────────┘
```

### Column 3 (No Category)
```
┌─────────────────┐
│                 │
│     📦          │
│                 │
│ Select a        │
│ Category        │
│                 │
│ Choose Business │
│ ERP or Pump     │
│ Management      │
│                 │
└─────────────────┘
```

### Column 4 (No Module)
```
┌──────────────────┐
│                  │
│      ✓           │
│                  │
│ Select a Module  │
│                  │
│ Click on a       │
│ module from      │
│ Column 3 to      │
│ manage its pages │
│                  │
└──────────────────┘
```

### Column 4 (No Super Admin)
```
┌──────────────────┐
│                  │
│      🛡️          │
│                  │
│ Select a Super   │
│ Admin            │
│                  │
│ Choose a Super   │
│ Admin from       │
│ Column 2         │
│                  │
└──────────────────┘
```

## Color Coding

### Business ERP Theme (Purple)
```
Categories:
- Unselected: border-gray-200, bg-gray-50
- Selected: border-purple-500, bg-purple-100

Super Admins:
- Unselected: border-gray-200, bg-gray-50
- Selected: border-purple-500, bg-purple-100
- Icon: bg-purple-600 (selected), bg-purple-100 (unselected)

Modules:
- Unselected: border-purple-200, bg-purple-50/30
- Selected: border-purple-500, bg-purple-100
- Icon: bg-purple-100, text-purple-600
```

### Pump Management Theme (Orange)
```
Categories:
- Unselected: border-gray-200, bg-gray-50
- Selected: border-orange-500, bg-orange-100

Super Admins:
- Unselected: border-gray-200, bg-gray-50
- Selected: border-orange-500, bg-orange-100
- Icon: bg-orange-600 (selected), bg-orange-100 (unselected)

Modules:
- Unselected: border-orange-200, bg-orange-50/30
- Selected: border-orange-500, bg-orange-100
- Icon: bg-orange-100, text-orange-600
```

### Universal Elements
```
Checkboxes:
- Unchecked: border-gray-200, bg-gray-50
- Checked: border-green-400, bg-green-50

Buttons:
- Assign: bg-blue-600, text-white
- Remove: bg-red-100, text-red-700
- Select All: bg-blue-100, text-blue-700

Loading: border-white, border-t-transparent (spinner)

Success Indicators:
- Green checkmark: text-green-600
- Status badge: bg-green-100, text-green-700
```

## Responsive Behavior

### Desktop (lg+)
```
┌────┬────┬────────┬────────┐
│ 2  │ 2  │   4    │   4    │ ← Column widths
└────┴────┴────────┴────────┘
```

### Tablet/Mobile
```
┌──────────────┐
│ Categories   │
├──────────────┤
│ Super Admins │
├──────────────┤
│ Modules      │
├──────────────┤
│ Pages        │
└──────────────┘
Stacks vertically
```

## Size Comparison

### Before (Large)
```
Stats Cards: p-6, text-2xl
Headers: text-xl
Icons: w-12 h-12, size={20-24}
Cards: p-4-6
Gap: gap-6
```

### After (Compact)
```
Stats Cards: p-4, text-xl      ← 33% smaller
Headers: text-lg               ← 17% smaller
Icons: w-8 h-8, size={16-18}   ← 33% smaller
Cards: p-3                     ← 25% smaller
Gap: gap-4                     ← 33% smaller
```

**Result**: 30% more content visible! 🎉

## Icon Legend

- 📦 `FiPackage` - Modules, Categories
- 🛡️ `FiShield` - Super Admins
- ✓ `FiCheckCircle` - Success, Assigned, Active
- ✗ `FiXCircle` - Inactive
- 📧 `FiMail` - Email
- 👥 `FiUsers` - User counts
- 🔄 Loading spinner - Animated border

---

**Quick Reference**: 2-2-4-4 Grid | Click Module → Check Pages → Assign!
