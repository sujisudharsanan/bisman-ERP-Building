# 🔧 Layout Registry Integration Guide

## Quick Integration into Existing Components

### Step 1: Add LayoutProvider to Root

```tsx
// my-frontend/src/app/layout.tsx
import { LayoutProvider } from '@/contexts/LayoutProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LayoutProvider>
          {children}
        </LayoutProvider>
      </body>
    </html>
  );
}
```

### Step 2: Update SuperAdminControlPanel

Add layout management to the dashboard:

```tsx
// In SuperAdminControlPanel.tsx
import { usePageLayout } from '@/contexts/LayoutProvider';
import LayoutDebugger from '@/components/LayoutDebugger';

const SuperAdminControlPanel: React.FC = () => {
  const pageId = 'super-admin-dashboard';
  const { registerElement, elements, validatePosition } = usePageLayout(pageId);

  // Example: Add a new dashboard widget
  const addDashboardWidget = (type: string) => {
    const widget = {
      id: `widget-${type}-${Date.now()}`,
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      type,
    };

    // Auto-position to avoid overlaps
    const positioned = registerElement(widget, true);
    console.log(`Added ${type} widget at (${positioned.x}, ${positioned.y})`);
  };

  return (
    <div>
      {/* Existing content */}
      
      {/* Add debugger for development */}
      <LayoutDebugger pageId={pageId} />
    </div>
  );
};
```

### Step 3: Integration Patterns

#### Pattern 1: Dashboard Cards
```tsx
import { usePageLayout } from '@/contexts/LayoutProvider';

function DashboardCards() {
  const { elements, registerElement, updateElement } = usePageLayout('dashboard');

  const addCard = (cardType: string) => {
    const card = {
      id: `card-${Date.now()}`,
      x: 20,
      y: 20,
      width: 300,
      height: 200,
      type: cardType,
    };

    registerElement(card, true); // Auto-position
  };

  return (
    <div className="relative min-h-screen">
      {elements.map(el => (
        <DashboardCard
          key={el.id}
          element={el}
          onUpdate={(updates) => updateElement(el.id, updates)}
        />
      ))}
      <button onClick={() => addCard('stats')}>Add Stats Card</button>
    </div>
  );
}
```

#### Pattern 2: Draggable Widgets
```tsx
import { usePageLayout } from '@/contexts/LayoutProvider';
import { useState } from 'react';

function DraggableWidget({ id, initialPosition }) {
  const { updateElement, validatePosition } = usePageLayout('dashboard');
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (e: React.DragEvent) => {
    const newPos = {
      id,
      x: e.clientX,
      y: e.clientY,
      width: 200,
      height: 150,
    };

    const validation = validatePosition(newPos, { excludeId: id });

    if (validation.valid) {
      setPosition({ x: newPos.x, y: newPos.y });
      updateElement(id, newPos);
    } else {
      alert('Cannot place here - overlaps detected');
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
        cursor: 'move',
      }}
    >
      Widget Content
    </div>
  );
}
```

#### Pattern 3: Form Builder
```tsx
import { usePageLayout } from '@/contexts/LayoutProvider';

function FormBuilder() {
  const { elements, registerElement, updateSettings } = usePageLayout('form-builder');

  // Enable grid snapping for form fields
  useEffect(() => {
    updateSettings({ snapToGrid: true, gridSize: 20 });
  }, [updateSettings]);

  const addFormField = (fieldType: string) => {
    const field = {
      id: `field-${fieldType}-${Date.now()}`,
      x: 0,
      y: 0,
      width: 400,
      height: 60,
      type: fieldType,
    };

    registerElement(field, true);
  };

  return (
    <div>
      <button onClick={() => addFormField('input')}>Add Input</button>
      <button onClick={() => addFormField('textarea')}>Add Textarea</button>
      <button onClick={() => addFormField('select')}>Add Select</button>

      <div className="canvas">
        {elements.map(field => (
          <FormField key={field.id} element={field} />
        ))}
      </div>
    </div>
  );
}
```

#### Pattern 4: Smart Widget Placement
```tsx
import { usePageLayout } from '@/contexts/LayoutProvider';

function SmartDashboard() {
  const { elements, registerElement, getSuggestions } = usePageLayout('dashboard');

  const addRelatedWidget = (referenceId: string) => {
    const reference = elements.find(e => e.id === referenceId);
    if (!reference) return;

    // Get smart placement suggestions
    const suggestions = getSuggestions(
      reference,
      { width: 200, height: 150 }
    );

    // Find first free spot
    const freeSuggestion = suggestions.find(s => s.isFree);

    if (freeSuggestion) {
      registerElement({
        id: `related-${Date.now()}`,
        x: freeSuggestion.x,
        y: freeSuggestion.y,
        width: 200,
        height: 150,
        type: 'related',
      }, false); // Position already calculated
    } else {
      // Fallback to auto-positioning
      registerElement({
        id: `related-${Date.now()}`,
        x: reference.x,
        y: reference.y,
        width: 200,
        height: 150,
        type: 'related',
      }, true);
    }
  };

  return (
    <div>
      {elements.map(el => (
        <Widget
          key={el.id}
          element={el}
          onAddRelated={() => addRelatedWidget(el.id)}
        />
      ))}
    </div>
  );
}
```

### Step 4: Add to Existing Pages

#### For Dashboard Pages
```tsx
// In any dashboard component
import { usePageLayout } from '@/contexts/LayoutProvider';
import LayoutDebugger from '@/components/LayoutDebugger';

export default function MyDashboard() {
  const pageId = 'my-dashboard';
  const layout = usePageLayout(pageId);

  return (
    <div>
      {/* Your existing dashboard code */}
      
      {/* Add debugger (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <LayoutDebugger pageId={pageId} />
      )}
    </div>
  );
}
```

#### For Super Admin Panel
```tsx
// In SuperAdminControlPanel.tsx
const DashboardTab = () => {
  const { elements, registerElement } = usePageLayout('super-admin-dashboard');

  return (
    <div className="space-y-6">
      {/* Existing stats cards */}
      
      {/* Dynamic positioned elements */}
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
          Dynamic Element
        </div>
      ))}
    </div>
  );
};
```

### Step 5: Environment Variables (Optional)

Add to `.env.local`:
```env
# Enable layout debugger
NEXT_PUBLIC_LAYOUT_DEBUG=true

# Default grid size
NEXT_PUBLIC_LAYOUT_GRID_SIZE=20
```

Use in components:
```tsx
const debugEnabled = process.env.NEXT_PUBLIC_LAYOUT_DEBUG === 'true';
const gridSize = Number(process.env.NEXT_PUBLIC_LAYOUT_GRID_SIZE || 20);
```

## 🎯 Migration Checklist

- [ ] Add `<LayoutProvider>` to root layout
- [ ] Import `usePageLayout` in dashboard components
- [ ] Replace manual positioning with `registerElement`
- [ ] Add `<LayoutDebugger>` to development pages
- [ ] Test drag-and-drop with overlap prevention
- [ ] Enable grid snapping for form builders
- [ ] Add keyboard shortcuts documentation
- [ ] Test across different page sizes
- [ ] Verify localStorage persistence
- [ ] Remove any duplicate positioning logic

## 🔍 Testing

### Manual Testing
1. Open demo page: `/demo/layout-registry`
2. Add multiple widgets
3. Enable debug mode with `Ctrl+Shift+L`
4. Verify no overlaps with auto-positioning
5. Test drag-and-drop
6. Check grid snapping
7. Verify localStorage persistence (refresh page)

### Console Testing
```tsx
import { useLayout } from '@/contexts/LayoutProvider';

function TestComponent() {
  const layout = useLayout();

  useEffect(() => {
    console.log('Registry state:', layout.registry);
    console.log('Debug mode:', layout.debugMode);
  }, [layout]);

  return <div>Testing...</div>;
}
```

## 🚀 Next Steps

1. **Add to Main Dashboard**: Integrate with Super Admin Control Panel
2. **Widget Library**: Create reusable dashboard widgets
3. **Templates**: Build pre-configured layouts
4. **Export/Import**: Save and restore layouts
5. **Collaboration**: Share layouts between users
6. **Animations**: Add smooth transitions
7. **Undo/Redo**: Implement history management

## 📚 Resources

- **Full Documentation**: `LAYOUT_REGISTRY_DOCS.md`
- **Quick Reference**: `LAYOUT_REGISTRY_README.md`
- **Demo Component**: `/components/LayoutRegistryDemo.tsx`
- **Core Logic**: `/lib/layoutRegistry.ts`
- **Context Provider**: `/contexts/LayoutProvider.tsx`

## 💡 Tips

1. **Use page-specific hooks**: `usePageLayout(pageId)` instead of global `useLayout()`
2. **Enable auto-positioning by default**: `registerElement(element, true)`
3. **Always validate positions on drag-and-drop**: Use `validatePosition()`
4. **Use debug mode during development**: Press `Ctrl+Shift+L`
5. **Clean up on unmount**: Remove elements when components unmount
6. **Provide meaningful IDs**: Use descriptive IDs for debugging
7. **Set element types**: Helps with debugging and filtering

## ⚠️ Common Pitfalls

1. **Forgetting LayoutProvider**: Must wrap app at root level
2. **Not using auto-positioning**: Results in overlaps
3. **Hardcoding positions**: Use registry instead
4. **Not validating drag positions**: Can create overlaps
5. **Missing cleanup**: Elements persist after unmount
6. **Using wrong page ID**: Each page needs unique ID

---

**Integration Status**: ✅ Ready for Production

**Demo Available**: `/demo/layout-registry`

**Support**: See full documentation for API reference and examples
