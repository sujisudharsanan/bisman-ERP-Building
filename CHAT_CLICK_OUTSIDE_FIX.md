# Chat Box Click-Outside Fix

## Date: November 15, 2025

## Problem
The chat box (Spark Assistant) remained open even when users clicked outside of it, which is not a standard UX pattern. Users expected the chat to close when clicking anywhere outside the chat window.

## Solution Implemented

### Changes Made to `ERPChatWidget.tsx`

1. **Added React useRef hook**: Imported `useRef` to create references for the chat window and chat button elements.

2. **Created refs for tracking elements**:
   - `chatWindowRef`: Tracks the chat window container
   - `chatButtonRef`: Tracks the floating chat button

3. **Implemented click-outside detection**:
   - Added a `useEffect` hook that listens for mousedown events on the document
   - Checks if the click target is outside both the chat window and chat button
   - Only triggers when chat is open and not in fullscreen mode
   - Properly cleans up event listeners when component unmounts or dependencies change

4. **Behavior**:
   - When chat is open and user clicks anywhere outside the chat window or button, the chat closes automatically
   - Sets icon state back to 'idle' when closing
   - Does not interfere with fullscreen mode
   - Does not close when clicking the chat button itself

### Code Changes

```typescript
// Added useRef to imports
import { useEffect, useState, useRef } from 'react';

// Created refs
const chatWindowRef = useRef<HTMLDivElement>(null);
const chatButtonRef = useRef<HTMLButtonElement>(null);

// Added click-outside handler
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (isFullScreen) return;
    
    const target = event.target as Node;
    if (
      open &&
      chatWindowRef.current &&
      chatButtonRef.current &&
      !chatWindowRef.current.contains(target) &&
      !chatButtonRef.current.contains(target)
    ) {
      setOpen(false);
      setIconState('idle');
    }
  };

  if (open && !isFullScreen) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }
}, [open, isFullScreen]);

// Added refs to elements
<button ref={chatButtonRef} ... >
<div ref={chatWindowRef} ... >
```

## Benefits

✅ **Better UX**: Standard behavior that users expect from chat widgets  
✅ **Non-intrusive**: Chat automatically closes when users click away  
✅ **Clean implementation**: Proper event listener cleanup prevents memory leaks  
✅ **Fullscreen safe**: Doesn't interfere with fullscreen mode  
✅ **TypeScript safe**: No type errors, fully typed implementation  

## Testing Checklist

- [ ] Click outside chat window to verify it closes
- [ ] Click on chat button to verify it still opens
- [ ] Enter fullscreen mode and verify click-outside doesn't trigger
- [ ] Verify no console errors
- [ ] Test on different screen sizes
- [ ] Verify chat state is properly reset when closing

## Files Modified

- `/my-frontend/src/components/ERPChatWidget.tsx`

## Notes

The implementation uses the `mousedown` event instead of `click` for better responsiveness. The event listener is only active when the chat is open and not in fullscreen mode, optimizing performance.
