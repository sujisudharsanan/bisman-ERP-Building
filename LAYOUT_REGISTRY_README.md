# 🧩 Layout Registry System

> Intelligent element positioning system with automatic overlap prevention and visual debugging

## 🚀 Quick Start

### 1. Wrap your app with LayoutProvider

```tsx
// app/layout.tsx
import { LayoutProvider } from '@/contexts/LayoutProvider';

export default function RootLayout({ children }) {
  return (
    <LayoutProvider>
      {children}
    </LayoutProvider>
  );
}
```

### 2. Use in your components

```tsx
import { usePageLayout } from '@/contexts/LayoutProvider';

function MyDashboard() {
  const { elements, registerElement } = usePageLayout('dashboard');

  const addWidget = () => {
    const widget = {
      id: 'widget-' + Date.now(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    };

    // Auto-position to avoid overlaps
    registerElement(widget, true);
  };

  return (
    <div>
      {elements.map(el => (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            width: el.width,
            height: el.height,
          }}
        >
          Widget {el.id}
        </div>
      ))}
      <button onClick={addWidget}>Add Widget</button>
    </div>
  );
}
```

### 3. Add visual debugger

```tsx
import LayoutDebugger from '@/components/LayoutDebugger';

function MyPage() {
  return (
    <div>
      {/* Your content */}
      <LayoutDebugger pageId="dashboard" />
    </div>
  );
}
```

## 📁 Files Created

```
✅ /lib/layoutRegistry.ts           - Core logic (320 lines)
✅ /contexts/LayoutProvider.tsx     - React Context (200 lines)
✅ /components/LayoutDebugger.tsx   - Visual debugger (290 lines)
✅ /components/LayoutRegistryDemo.tsx - Interactive demo (400 lines)
✅ /app/demo/layout-registry/page.tsx - Demo page
✅ /LAYOUT_REGISTRY_DOCS.md         - Full documentation
```

## 🎯 Key Features

### ✨ Automatic Overlap Prevention
```tsx
// Element will automatically shift to nearest free position
const positioned = registerElement(element, true);
console.log(`Placed at: ${positioned.x}, ${positioned.y}`);
```

### 🔍 Visual Debugging
Press **Ctrl+Shift+L** (Cmd+Shift+L on Mac) to toggle:
- 🟢 Green borders = No overlaps
- 🔴 Red borders = Overlapping elements
- 🔵 Blue borders = Selected element
- 📐 Grid overlay (optional)
- 📊 Real-time statistics

### 📐 Grid Snapping
```tsx
updateSettings({
  snapToGrid: true,
  gridSize: 20, // 20px grid
});
```

### 🎯 Smart Positioning
```tsx
// Get suggested positions around an element
const suggestions = getSuggestions(
  referenceElement,
  { width: 200, height: 150 }
);

// Returns: [
//   { x: 100, y: 270, direction: 'below', isFree: true },
//   { x: 320, y: 100, direction: 'right', isFree: false },
//   ...
// ]
```

### ✅ Position Validation
```tsx
const validation = validatePosition(element, { excludeId: element.id });

if (!validation.valid) {
  console.log(validation.message);
  console.log('Overlaps:', validation.overlaps);
}
```

## 🎨 Demo

View the interactive demo at: **`/demo/layout-registry`**

Features:
- 🎨 Add different widget types
- 🖱️ Drag & drop elements
- ⚙️ Toggle auto-positioning
- 📐 Grid snapping controls
- 🔄 Add multiple random widgets
- 🗑️ Clear all elements
- 👁️ Visual debugger

## 📖 API Reference

### Hooks

#### `useLayout()`
Global registry access

#### `usePageLayout(pageId)`
Page-scoped operations (recommended)

Returns:
- `elements` - Array of elements
- `registerElement(element, autoPosition)` - Add/update element
- `updateElement(id, updates)` - Update element
- `removeElement(id)` - Remove element
- `clearPage()` - Clear all elements
- `validatePosition(element, options)` - Check overlaps
- `findFreePosition(element, options)` - Find free spot
- `getSuggestions(ref, size)` - Get smart placement suggestions
- `updateSettings(settings)` - Update page settings
- `getBoundingBox()` - Get page bounds

### Core Functions

```typescript
// From @/lib/layoutRegistry

isOverlapping(a, b): boolean
findFreeSpot(pageId, element, registry, options?): ElementBounds
validateElementPosition(pageId, element, registry, options?): ValidationResult
getSuggestedPositions(pageId, ref, size, registry, spacing?): Suggestion[]
```

## 🔧 Configuration

### Search Algorithm Options

```typescript
const positioned = findFreePosition(element, {
  preferredDirection: 'down', // 'down' | 'right' | 'diagonal'
  shiftIncrement: 20,          // Pixels per attempt
  maxAttempts: 100,            // Max search attempts
  snapToGrid: true,            // Enable grid snapping
  gridSize: 20,                // Grid size in pixels
});
```

### Page Settings

```typescript
updateSettings({
  gridSize: 20,
  snapToGrid: true,
});
```

## 💾 Data Persistence

- ✅ Automatically saves to localStorage
- ✅ Debounced saves (1 second)
- ✅ Loads on mount
- ✅ Page-specific storage

## 🎯 Use Cases

### 1. Dashboard Builder
Auto-arrange widgets without manual positioning

### 2. Drag & Drop Editor
Prevent overlaps during drag operations

### 3. Form Builder
Snap form fields to grid with collision detection

### 4. Kanban Boards
Manage card positions per column

### 5. Layout Editor
Visual page builder with element management

## 🔍 Debugging

### Enable Debug Mode
```tsx
const { setDebugMode } = useLayout();
setDebugMode(true);
```

### Keyboard Shortcut
Press `Ctrl+Shift+L` (or `Cmd+Shift+L` on Mac)

### Console Logging
```tsx
// Enable verbose logging
console.log('Registry state:', registry);
console.log('Page elements:', elements);
console.log('Overlaps:', validatePosition(element));
```

## ⚡ Performance

- **Overlap detection**: O(n) per element
- **Free spot search**: O(n × attempts) worst case
- **Recommended max**: 200-300 elements per page
- **LocalStorage**: Debounced saves (1s delay)

## 🐛 Troubleshooting

### Elements still overlap
✅ Enable auto-positioning: `registerElement(element, true)`
✅ Increase max attempts: `findFreeSpot(..., { maxAttempts: 200 })`
✅ Check available space on page

### Grid not working
✅ Enable in settings: `updateSettings({ snapToGrid: true })`
✅ Verify grid size: `updateSettings({ gridSize: 20 })`

### Debugger not visible
✅ Press `Ctrl+Shift+L` to toggle
✅ Check component is rendered: `<LayoutDebugger pageId="..." />`
✅ Check browser console for errors

## 📚 Full Documentation

See **`LAYOUT_REGISTRY_DOCS.md`** for:
- 📖 Complete API reference
- 💡 Advanced examples
- 🎨 Code samples
- 🔧 Configuration details
- 🎯 Best practices
- 📊 Performance tips

## 🎓 Examples

### Basic Usage
```tsx
const { registerElement } = usePageLayout('page1');

registerElement({
  id: 'widget-1',
  x: 0,
  y: 0,
  width: 200,
  height: 150,
}, true); // Auto-position enabled
```

### With Validation
```tsx
const { validatePosition, registerElement } = usePageLayout('page1');

const element = { id: '1', x: 100, y: 100, width: 200, height: 150 };
const validation = validatePosition(element);

if (validation.valid) {
  registerElement(element, false);
} else {
  console.warn('Overlap detected:', validation.overlaps);
  registerElement(element, true); // Auto-position
}
```

### Drag & Drop
```tsx
const handleDragEnd = (e: DragEvent, elementId: string) => {
  const newX = e.clientX;
  const newY = e.clientY;
  
  const validation = validatePosition(
    { ...element, x: newX, y: newY },
    { excludeId: elementId }
  );
  
  if (validation.valid) {
    updateElement(elementId, { x: newX, y: newY });
  } else {
    alert('Cannot place here: overlaps detected');
  }
};
```

## 🎉 Success!

Your layout registry system is now ready to use!

Try the demo: **`http://localhost:3000/demo/layout-registry`**

---

**Created for BISMAN ERP** | Built with React, TypeScript, and Tailwind CSS
