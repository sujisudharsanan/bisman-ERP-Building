# Logo Mask Loader

A beautiful animated loader that fills your logo with a gradient from bottom to top.

## Features

- 🎨 Uses CSS mask to reveal your logo
- ⚡ Smooth gradient fill animation
- 🎭 Fade out transition
- ♿ Accessible with ARIA labels
- 🎯 TypeScript support
- 🎬 Customizable timing

## Usage

### As App Loading State

Already integrated in `src/app/loading.tsx` for Next.js app loading states.

### As Route Transition Loader

Already integrated in `GlobalRouteLoader.tsx` for route transitions.

### Manual Usage

```tsx
import { LogoMaskLoader } from '@/components/loading';

function MyComponent() {
  return (
    <LogoMaskLoader 
      fillDuration={3000}    // Time to fill logo (ms)
      fadeDuration={800}     // Time to fade out (ms)
      onLoadComplete={() => console.log('Done!')}
    />
  );
}
```

## Customization

### Change Colors

Edit the gradient in `LogoMaskLoader.tsx`:

```tsx
background: 'linear-gradient(180deg, #ffd84a, #f0b400)'
```

### Change Logo

Replace `/bisman_logo.png` in the public folder or update the path in the component.

### Change Size

Modify the `width` and `height` in the `.logo-mask` style:

```tsx
width: '200px',
height: '200px',
```

### Change Background

Modify the background color:

```tsx
background: '#0d0d0d', // Dark dimming background
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fillDuration` | `number` | `3000` | Duration of fill animation in ms |
| `fadeDuration` | `number` | `800` | Duration of fade out in ms |
| `onLoadComplete` | `() => void` | `undefined` | Callback when loader completes |

## Browser Support

- Modern browsers with CSS mask support
- Safari (using -webkit-mask)
- Chrome, Firefox, Edge

## Accessibility

- Uses `role="status"` for screen readers
- `aria-live="polite"` for announcements
- `aria-label="Loading"` for context
- Respects `prefers-reduced-motion` (can be enhanced further)

## Performance

- Pure CSS animations (GPU accelerated)
- No external dependencies
- Optimized for 60fps
