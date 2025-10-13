# Header Component - Visual Reference

## Current Implementation (After Refactor)

### Desktop View (1920x1080)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header Component                                             bg-white   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [☰ Menu]                                      ┌──────────────────────┐│
│                                                │ ●  John Doe          ││
│                                                │    Admin - Dashboard ││
│                                                └──────────────────────┘│
│                                                 ^                      │
│                                                 └─ Circular Avatar     │
│                                                    (Links to /profile) │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            HEADER (role="banner")                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Left Section              Center Section         Right Section         │
│  ┌──────────┐              (empty)                ┌──────────────────┐ │
│  │ [☰ Menu] │                                     │ Link to /profile │ │
│  │          │                                     │ ┌──────────────┐ │ │
│  │ Button   │                                     │ │  Avatar      │ │ │
│  │ Toggle   │                                     │ │  (w-10 h-10) │ │ │
│  │ Sidebar  │                                     │ │              │ │ │
│  └──────────┘                                     │ │  ●  or 👤    │ │ │
│                                                   │ └──────────────┘ │ │
│                                                   │                  │ │
│                                                   │ User Name        │ │
│                                                   │ text-sm          │ │
│                                                   │ font-semibold    │ │
│                                                   │                  │ │
│                                                   │ Role - Dashboard │ │
│                                                   │ text-xs          │ │
│                                                   │ text-gray-500    │ │
│                                                   └──────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Role Examples

### 1. Super Admin User
```
┌────────────────────────────────────────────────────────────┐
│  [☰]                                    ●  Alice Johnson   │
│                                     Super Admin - Dashboard│
└────────────────────────────────────────────────────────────┘
```

### 2. Admin User
```
┌────────────────────────────────────────────────────────────┐
│  [☰]                                      ●  Bob Wilson    │
│                                          Admin - Dashboard │
└────────────────────────────────────────────────────────────┘
```

### 3. Manager User
```
┌────────────────────────────────────────────────────────────┐
│  [☰]                                    ●  Carol Davis     │
│                                       Manager - Dashboard  │
└────────────────────────────────────────────────────────────┘
```

### 4. Staff User
```
┌────────────────────────────────────────────────────────────┐
│  [☰]                                      ●  David Lee     │
│                                         Staff - Dashboard  │
└────────────────────────────────────────────────────────────┘
```

### 5. Hub Incharge User
```
┌────────────────────────────────────────────────────────────┐
│  [☰]                                   ●  Eve Martinez     │
│                                  Hub Incharge - Dashboard  │
└────────────────────────────────────────────────────────────┘
```

---

## States

### Loading State
```
┌────────────────────────────────────────────────────────────┐
│  [☰]                                          Loading...   │
│                                               ↑            │
│                                               └─ aria-live │
└────────────────────────────────────────────────────────────┘
```

### No User (Logged Out)
```
┌────────────────────────────────────────────────────────────┐
│  [☰]                                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### With Profile Photo
```
┌────────────────────────────────────────────────────────────┐
│  [☰]                                   [Photo]  John Doe   │
│                                          Admin - Dashboard │
└────────────────────────────────────────────────────────────┘
```

### Without Profile Photo (Fallback)
```
┌────────────────────────────────────────────────────────────┐
│  [☰]                                     👤   John Doe     │
│                                          Admin - Dashboard │
└────────────────────────────────────────────────────────────┘
```

---

## Hover States

### Profile Link Hover
```
┌──────────────────────────────────────────────────────────────┐
│  [☰]                     ┌───────────────────────────────┐   │
│                          │  ●  John Doe                  │   │
│                          │     Admin - Dashboard         │   │
│                          └───────────────────────────────┘   │
│                           ↑                                  │
│                           └─ bg-gray-50 on hover             │
└──────────────────────────────────────────────────────────────┘
```

### Menu Button Hover
```
┌──────────────────────────────────────────────────────────────┐
│  ┌────┐                                     ●  John Doe      │
│  │ ☰  │                                Admin - Dashboard     │
│  └────┘                                                      │
│   ↑                                                          │
│   └─ bg-gray-100 on hover                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Focus States (Keyboard Navigation)

### Profile Link Focused
```
┌──────────────────────────────────────────────────────────────┐
│  [☰]                     ┌───────────────────────────────┐   │
│                          │┌─────────────────────────────┐│   │
│                          ││  ●  John Doe                ││   │
│                          ││     Admin - Dashboard       ││   │
│                          │└─────────────────────────────┘│   │
│                          └───────────────────────────────┘   │
│                           ↑                                  │
│                           └─ Blue ring (ring-blue-500)       │
└──────────────────────────────────────────────────────────────┘
```

### Menu Button Focused
```
┌──────────────────────────────────────────────────────────────┐
│  ┌────────┐                                  ●  John Doe     │
│  │┌──────┐│                             Admin - Dashboard    │
│  ││  ☰   ││                                                  │
│  │└──────┘│                                                  │
│  └────────┘                                                  │
│   ↑                                                          │
│   └─ Blue ring (ring-blue-500)                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Mobile View (375x667)

### Mobile Header
```
┌─────────────────────────────────┐
│  [☰]               ●  John Doe  │
│                   Admin - Dash  │
└─────────────────────────────────┘
```

### Mobile Header (Collapsed)
```
┌─────────────────────────────────┐
│  [☰]                    ●  JD   │
└─────────────────────────────────┘
```

---

## Dark Mode (Future Enhancement)

### Dark Mode Header
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header Component                                             bg-gray-900│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [☰ Menu]                                      ┌──────────────────────┐│
│  (white)                                       │ ●  John Doe (white)  ││
│                                                │    Admin - Dashboard ││
│                                                │    (gray-400)        ││
│                                                └──────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Accessibility Tree

```
header (role="banner", aria-label="Main header")
├── div (container)
│   ├── div (left section)
│   │   └── button (aria-label="Open main menu", aria-expanded="false")
│   │       ├── span.sr-only: "Open main menu"
│   │       └── svg (hamburger icon, aria-hidden="true")
│   │
│   └── div (right section)
│       └── a (href="/profile", aria-label="Go to profile")
│           ├── Avatar (aria-hidden="true")
│           │   ├── img (alt="User profile photo") [if photo exists]
│           │   └── span (User icon fallback) [if no photo]
│           │
│           └── div (text container)
│               ├── span: "John Doe"
│               └── span (aria-label="Role: Admin"): "Admin - Dashboard"
```

---

## Color Palette

### Light Mode (Default)
- Background: `#FFFFFF` (white)
- Border: `#E5E7EB` (gray-200)
- Shadow: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- User Name: `#111827` (gray-900)
- Role Text: `#6B7280` (gray-500)
- Avatar Fallback BG: `#2563EB` (blue-600)
- Avatar Fallback Text: `#FFFFFF` (white)
- Hover BG: `#F9FAFB` (gray-50)
- Focus Ring: `#3B82F6` (blue-500)

### Contrast Ratios (WCAG AA)
- User Name (gray-900 on white): **16.12:1** ✅
- Role Text (gray-500 on white): **4.61:1** ✅
- Avatar Text (white on blue-600): **5.25:1** ✅

---

## Responsive Breakpoints

### Desktop (≥1024px)
- Full width header
- All text visible
- Avatar: 40px × 40px
- Spacing: px-6 lg:px-8

### Tablet (768px - 1023px)
- Compact spacing
- All text visible
- Avatar: 40px × 40px
- Spacing: px-4 sm:px-6

### Mobile (≤767px)
- Minimal spacing
- Role text truncated: "Admin - Dash"
- Avatar: 32px × 32px
- Spacing: px-4

---

## i18n Examples

### English
```
Admin - Dashboard
```

### Spanish (es)
```
Admin - Panel
```

### French (fr)
```
Admin - Tableau de bord
```

### German (de)
```
Admin - Dashboard
```

---

## Animation & Transitions

### Hover Transition
```css
transition-colors
/* Translates to: transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1) */
```

### Focus Ring Animation
```css
focus:ring-2 focus:ring-blue-500
/* Appears instantly on focus, no transition */
```

---

## Browser Support

✅ Chrome 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Edge 90+  
✅ Mobile Safari (iOS 14+)  
✅ Chrome Mobile (Android 10+)

---

## Performance Metrics

- **First Contentful Paint (FCP):** <1.5s
- **Largest Contentful Paint (LCP):** <2.5s
- **Cumulative Layout Shift (CLS):** <0.1
- **Time to Interactive (TTI):** <3.5s

---

**Last Updated:** October 13, 2025
