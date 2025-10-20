# Layout Registry System - Documentation

## 📋 Overview

The Layout Registry System is a comprehensive solution for managing element positions on pages, preventing overlaps, and automatically finding free positions for new elements.

## 🎯 Key Features

- **Automatic Overlap Detection**: Validates element positions before placement
- **Smart Positioning**: Automatically finds free spots using spiral search algorithm
- **Visual Debugging**: Real-time overlay showing element boundaries and overlaps
- **Grid Snapping**: Optional grid-based positioning
- **Persistent State**: Saves layout to localStorage
- **Keyboard Shortcuts**: Quick access to debug mode (Ctrl+Shift+L)

## 📁 File Structure

```
/lib/layoutRegistry.ts          - Core logic and utility functions
/contexts/LayoutProvider.tsx    - React Context for global state
/components/LayoutDebugger.tsx  - Visual debugging component
```

## 🚀 Quick Start

### 1. Wrap your app with LayoutProvider

```tsx
// app/layout.tsx or pages/_app.tsx
import { LayoutProvider } from '@/contexts/LayoutProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <LayoutProvider>
          {children}
        </LayoutProvider>
      </body>
    </html>
  );
}
```

### 2. Use the layout hooks in your components

```tsx
import { usePageLayout } from '@/contexts/LayoutProvider';
import { ElementBounds } from '@/lib/layoutRegistry';

function MyComponent() {
  const pageId = 'dashboard';
  const {
    elements,
    registerElement,
    updateElement,
    removeElement,
    validatePosition,
  } = usePageLayout(pageId);

  const handleAddElement = () => {
    const newElement: ElementBounds = {
      id: 'widget-' + Date.now(),
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      type: 'widget',
    };

    // Automatically finds free position if overlapping
    const positioned = registerElement(newElement, true);
    console.log('Element placed at:', positioned.x, positioned.y);
  };

  return (
    <div>
      {elements.map((el) => (
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
          Element {el.id}
        </div>
      ))}
      <button onClick={handleAddElement}>Add Element</button>
    </div>
  );
}
```

### 3. Add the debugger component

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

## 🔧 API Reference

### Core Functions (from `layoutRegistry.ts`)

#### `isOverlapping(a, b)`
Checks if two bounding boxes overlap.

```typescript
const overlaps = isOverlapping(
  { x: 0, y: 0, width: 100, height: 100 },
  { x: 50, y: 50, width: 100, height: 100 }
);
// Returns: true
```

#### `findFreeSpot(pageId, element, registry, options?)`
Finds the nearest free position for an element using spiral search.

```typescript
const freePosition = findFreeSpot(
  'page1',
  { id: 'el1', x: 100, y: 100, width: 200, height: 150 },
  registry,
  {
    preferredDirection: 'down',
    shiftIncrement: 20,
    maxAttempts: 100,
    snapToGrid: true,
    gridSize: 10,
  }
);
```

**Options:**
- `preferredDirection`: 'down' | 'right' | 'diagonal' - Initial search direction
- `shiftIncrement`: number - Pixels to shift per attempt (default: 20)
- `maxAttempts`: number - Maximum search attempts (default: 100)
- `snapToGrid`: boolean - Enable grid snapping
- `gridSize`: number - Grid cell size (default: 10)

#### `validateElementPosition(pageId, element, registry, options?)`
Validates if an element position is free or overlapping.

```typescript
const validation = validateElementPosition(
  'page1',
  { id: 'el1', x: 100, y: 100, width: 200, height: 150 },
  registry,
  { excludeId: 'el1', allowOverlap: false }
);

if (!validation.valid) {
  console.log(validation.message);
  console.log('Overlapping elements:', validation.overlaps);
}
```

#### `getSuggestedPositions(pageId, referenceElement, newSize, registry, spacing?)`
Gets smart placement suggestions around a reference element.

```typescript
const suggestions = getSuggestedPositions(
  'page1',
  { id: 'ref', x: 100, y: 100, width: 200, height: 150 },
  { width: 150, height: 100 },
  registry,
  20 // spacing
);

// Returns array of positions with direction and availability:
// [
//   { x: 100, y: 270, direction: 'below', isFree: true },
//   { x: 320, y: 100, direction: 'right', isFree: false },
//   ...
// ]
```

### React Hooks

#### `useLayout()`
Access the global layout registry.

```typescript
const {
  registry,
  registerElement,
  updateElement,
  removeElement,
  getElements,
  clearPage,
  updatePageSettings,
  validatePosition,
  findFreePosition,
  getSuggestions,
  debugMode,
  setDebugMode,
  getPageBoundingBox,
} = useLayout();
```

#### `usePageLayout(pageId)`
Scoped hook for a specific page (recommended).

```typescript
const {
  elements,
  registerElement,
  updateElement,
  removeElement,
  clearPage,
  validatePosition,
  findFreePosition,
  getSuggestions,
  updateSettings,
  getBoundingBox,
  debugMode,
  setDebugMode,
} = usePageLayout('dashboard');
```

## 🎨 Examples

### Example 1: Drag and Drop with Overlap Prevention

```tsx
import { usePageLayout } from '@/contexts/LayoutProvider';
import { useState } from 'react';

function DraggableWidget({ id, initialX, initialY }) {
  const { updateElement, validatePosition } = usePageLayout('dashboard');
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (e: React.DragEvent) => {
    const newX = e.clientX;
    const newY = e.clientY;

    const validation = validatePosition(
      { id, x: newX, y: newY, width: 200, height: 150 },
      { excludeId: id }
    );

    if (validation.valid) {
      // Position is free, update it
      setPosition({ x: newX, y: newY });
      updateElement(id, { x: newX, y: newY });
    } else {
      // Position overlaps, show warning or snap to nearest free spot
      alert(`Cannot place here: ${validation.message}`);
    }
  };

  return (
    <div
      draggable
      onDragEnd={handleDragEnd}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: 200,
        height: 150,
      }}
    >
      Widget {id}
    </div>
  );
}
```

### Example 2: Auto-Layout Dashboard

```tsx
import { usePageLayout } from '@/contexts/LayoutProvider';
import { ElementBounds } from '@/lib/layoutRegistry';

function AutoLayoutDashboard() {
  const { elements, registerElement } = usePageLayout('dashboard');

  const addWidget = (type: string) => {
    const widget: ElementBounds = {
      id: `${type}-${Date.now()}`,
      x: 0, // Starting position
      y: 0,
      width: 250,
      height: 200,
      type,
    };

    // Auto-positioning enabled (second parameter = true)
    const positioned = registerElement(widget, true);
    
    console.log(`Added ${type} widget at (${positioned.x}, ${positioned.y})`);
  };

  return (
    <div>
      <div className="controls">
        <button onClick={() => addWidget('chart')}>Add Chart</button>
        <button onClick={() => addWidget('table')}>Add Table</button>
        <button onClick={() => addWidget('stats')}>Add Stats</button>
      </div>

      <div className="canvas" style={{ position: 'relative', minHeight: '800px' }}>
        {elements.map((el) => (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              border: '2px solid #ccc',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <h3>{el.type}</h3>
            <p>ID: {el.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Example 3: Smart Widget Placement

```tsx
import { usePageLayout } from '@/contexts/LayoutProvider';
import { ElementBounds } from '@/lib/layoutRegistry';

function SmartWidgetPlacement({ referenceWidgetId }) {
  const { elements, registerElement, getSuggestions } = usePageLayout('dashboard');

  const addRelatedWidget = () => {
    const referenceWidget = elements.find((e) => e.id === referenceWidgetId);
    if (!referenceWidget) return;

    const newSize = { width: 200, height: 150 };
    const suggestions = getSuggestions(referenceWidget, newSize);

    // Find the first free suggestion
    const freeSuggestion = suggestions.find((s) => s.isFree);

    if (freeSuggestion) {
      const newWidget: ElementBounds = {
        id: `related-${Date.now()}`,
        x: freeSuggestion.x,
        y: freeSuggestion.y,
        width: newSize.width,
        height: newSize.height,
        type: 'related',
      };

      registerElement(newWidget, false); // Position already calculated
      console.log(`Placed related widget ${freeSuggestion.direction} of reference`);
    } else {
      console.log('No free spots near reference widget, using auto-placement');
      registerElement(
        {
          id: `related-${Date.now()}`,
          x: referenceWidget.x,
          y: referenceWidget.y,
          width: newSize.width,
          height: newSize.height,
          type: 'related',
        },
        true // Enable auto-positioning
      );
    }
  };

  return <button onClick={addRelatedWidget}>Add Related Widget</button>;
}
```

### Example 4: Grid-Based Layout

```tsx
import { usePageLayout } from '@/contexts/LayoutProvider';
import { useEffect } from 'react';

function GridLayout() {
  const { updateSettings, registerElement } = usePageLayout('dashboard');

  useEffect(() => {
    // Enable grid snapping
    updateSettings({
      snapToGrid: true,
      gridSize: 20,
    });
  }, [updateSettings]);

  const addGridWidget = () => {
    const widget = {
      id: `grid-widget-${Date.now()}`,
      x: 40, // Will snap to nearest grid point (40)
      y: 65, // Will snap to 60 or 80 depending on grid
      width: 200,
      height: 150,
      type: 'grid-widget',
    };

    registerElement(widget, true);
  };

  return <button onClick={addGridWidget}>Add Grid Widget</button>;
}
```

## 🐛 Debug Mode

Press `Ctrl+Shift+L` (or `Cmd+Shift+L` on Mac) to toggle the visual debugger.

The debugger shows:
- **Green borders**: Elements with no overlaps
- **Red borders**: Elements that overlap with others
- **Blue borders**: Currently selected element
- **Grid overlay**: 20px grid when enabled
- **Purple dashed border**: Page bounding box
- **Element labels**: ID, type, and overlap warnings

## ⚙️ Configuration

### Page Settings

```typescript
const { updateSettings } = usePageLayout('dashboard');

updateSettings({
  gridSize: 20,        // Grid cell size in pixels
  snapToGrid: true,    // Enable grid snapping
});
```

### Global Debug Mode

```typescript
const { setDebugMode } = useLayout();

setDebugMode(true); // Enable debug mode programmatically
```

## 💡 Best Practices

1. **Always use auto-positioning for user-created elements**
   ```typescript
   registerElement(element, true); // Second param = auto-position
   ```

2. **Validate positions before drag-and-drop updates**
   ```typescript
   const validation = validatePosition(newPosition, { excludeId: elementId });
   if (validation.valid) {
     updateElement(elementId, newPosition);
   }
   ```

3. **Use page-scoped hooks instead of global registry**
   ```typescript
   // ✅ Good
   const { elements } = usePageLayout('dashboard');
   
   // ❌ Avoid
   const { getElements } = useLayout();
   const elements = getElements('dashboard');
   ```

4. **Provide meaningful element types for better debugging**
   ```typescript
   const element = {
     id: 'chart-1',
     type: 'chart', // Shows in debugger overlay
     x: 0,
     y: 0,
     width: 300,
     height: 200,
   };
   ```

5. **Clean up elements when components unmount**
   ```typescript
   useEffect(() => {
     return () => {
       removeElement(elementId);
     };
   }, [elementId, removeElement]);
   ```

## 🔍 Troubleshooting

### Elements still overlap after registration
- Ensure `autoPosition` parameter is `true`
- Check if `maxAttempts` is sufficient (increase from default 100)
- Verify page has enough free space

### Grid snapping not working
- Confirm `snapToGrid` is enabled in page settings
- Check `gridSize` value matches your expectations

### Debugger not showing
- Verify `LayoutDebugger` component is rendered
- Press `Ctrl+Shift+L` to toggle visibility
- Check browser console for errors

### Performance issues with many elements
- Reduce `maxAttempts` in `findFreeSpot`
- Increase `shiftIncrement` for faster (but less precise) search
- Consider pagination or virtual scrolling for large element counts

## 📊 Performance Considerations

- **Overlap detection**: O(n) where n = number of elements
- **Free spot search**: O(n × attempts) worst case
- **LocalStorage saves**: Debounced by 1 second
- **Recommended max elements per page**: 200-300

## 🎯 Future Enhancements

- [ ] Collision groups (layers that don't interact)
- [ ] Custom search patterns beyond spiral
- [ ] Magnetic snapping between elements
- [ ] Undo/redo support
- [ ] Export/import layouts
- [ ] Multi-page copy/paste
- [ ] Alignment guides
- [ ] Element grouping

## 📝 License

Part of BISMAN ERP system.
