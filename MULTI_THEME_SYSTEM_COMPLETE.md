# Multi-Theme Color System Implementation

## Overview
User-selectable multi-theme color system for BISMAN ERP with 7 professional dark themes optimized for long daily usage.

## Files Created

### Core Theme System
- `my-frontend/src/config/themes.ts` - TypeScript theme definitions and utilities
- `my-frontend/src/components/ThemeSelector.tsx` - React theme selector component (dropdown & grid variants)
- `my-frontend/src/components/ThemeProvider.tsx` - React provider for theme initialization
- `my-frontend/public/themes.json` - JSON theme data
- `my-frontend/public/theme-switcher.js` - Vanilla JavaScript theme switcher

### UI Components
- `my-frontend/src/app/settings/page.tsx` - User settings page with theme selector
- `my-frontend/src/app/globals.css` - Updated with CSS custom properties and theme classes

### Backend
- `my-backend/routes/user-preferences.js` - API routes for saving/loading theme preferences
- `my-backend/prisma/schema.prisma` - Added `theme_preference` field to User model
- `my-backend/prisma/migrations/20251127000000_add_theme_preference/` - Database migration
- `my-backend/app.js` - Registered user preferences routes

## Themes

### 1. BISMAN Default (Default)
```
bgMain: #0F172A
bgSecondary: #111827
bgPanel: #1E293B
userBubble: #312E81
accent: #4338CA
```

### 2. Midnight Blue
```
bgMain: #0A0E27
bgSecondary: #0F1535
bgPanel: #161B3D
userBubble: #1E40AF
accent: #3B82F6
```

### 3. Slate Professional
```
bgMain: #0F1419
bgSecondary: #1A1F29
bgPanel: #252A35
userBubble: #374151
accent: #60A5FA
```

### 4. Deep Ocean
```
bgMain: #041E3A
bgSecondary: #0A2540
bgPanel: #0F2E4D
userBubble: #075985
accent: #0EA5E9
```

### 5. Carbon Dark
```
bgMain: #161616
bgSecondary: #1C1C1C
bgPanel: #262626
userBubble: #393939
accent: #78A9FF
```

### 6. Purple Haze
```
bgMain: #1A0F2E
bgSecondary: #231640
bgPanel: #2D1B4E
userBubble: #5B21B6
accent: #A78BFA
```

### 7. Forest Night
```
bgMain: #0C1713
bgSecondary: #111D1A
bgPanel: #1A2C23
userBubble: #065F46
accent: #10B981
```

## Usage

### In React Components
```tsx
import ThemeSelector from '@/components/ThemeSelector';

// Dropdown variant
<ThemeSelector variant="dropdown" />

// Grid variant (for settings page)
<ThemeSelector variant="grid" />
```

### CSS Custom Properties
```css
.my-element {
  background-color: var(--bg-main);
  color: var(--text-primary);
  border-color: var(--border);
}
```

### Tailwind Classes
```tsx
<div className="theme-bg-main theme-text-primary">
  <button className="theme-accent">Click me</button>
</div>
```

### JavaScript API
```javascript
import { applyTheme, getThemeById, saveThemePreference } from '@/config/themes';

// Apply theme
const theme = getThemeById('midnight-blue');
applyTheme(theme);
saveThemePreference('midnight-blue');
```

## Features

✅ 7 professional dark themes
✅ Default BISMAN theme using exact base colors
✅ Theme selector component (dropdown & grid variants)
✅ Settings page integration
✅ Database persistence
✅ LocalStorage fallback
✅ Auto-load on page reload
✅ CSS custom properties
✅ Tailwind utility classes
✅ TypeScript support
✅ React + Vanilla JS support

## API Endpoints

### Save Theme
```
POST /api/user/preferences
Body: { "theme": "midnight-blue" }
```

### Load Theme
```
GET /api/user/preferences
Response: { "success": true, "theme": "bisman-default" }
```

## Database Schema
```prisma
model User {
  // ... existing fields
  theme_preference String? @default("bisman-default") @db.VarChar(50)
}
```

## Integration Points

1. Root layout - ThemeProvider wrapper
2. Settings page - Grid theme selector
3. Navigation - Optional dropdown selector
4. Chat interface - Auto-themed
5. All ERP pages - CSS variables applied

## Next Steps

1. Run migration: `npx prisma migrate deploy`
2. Generate client: `npx prisma generate`
3. Visit `/settings` to select theme
4. Theme persists across sessions
