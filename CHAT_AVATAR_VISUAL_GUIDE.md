# Chat Avatar Quick Reference - Visual Guide

## 🎨 What You Should See

### In Bottom-Right Corner:

```
┌──────────────────┐
│                  │
│   ╭────────╮    │
│   │ ● ●  │    │  ← White speech bubble
│   │  ⌣   │    │  ← With smiley face
│   ╰────┬───╯    │
│        └─→      │  ← Small tail
│                  │
│  (Yellow circle) │
└──────────────────┘
```

### Avatar Details:
- **Outer circle**: Bright yellow (#FFC20A)
- **Inner bubble**: White rounded rectangle
- **Eyes**: Two dark blue dots (blink automatically!)
- **Mouth**: Curved smile
- **Tail**: Small triangle pointing bottom-right

### Hover Effects:
1. **Before hover**: Static, blinking eyes
2. **On hover**: 
   - Wobbles side to side
   - Grows slightly larger
   - Eyes move in opposite directions
   - Mouth wiggles

### Notification States:
- **Has notifications**: Yellow ring pulses around avatar
- **New message**: Expanding burst effect from center

## 🎬 Animations You'll See

### 1. Auto-Blink (Every 4-6 seconds)
```
● ●  →  ▬ ▬  →  ● ●
Eyes     Blink    Eyes open
```

### 2. Hover Wiggle
```
Normal  →  ↷ Rotate  →  ↶ Back  →  Normal
```

### 3. Eye Tickle (On Hover)
```
● ●  →  ●   ●  →  ● ●
       Left↔Right
```

### 4. Notification Pulse
```
○○○ → ●●● → ○○○ (repeating)
Faint   Bright   Faint
```

## 🖱️ Interactive Actions

| Action | Effect |
|--------|--------|
| **Hover** | Avatar wiggles, grows, eyes move |
| **Click** | Opens chat window |
| **Click outside chat** | Closes chat window |
| **Wait 5 seconds** | Eyes blink automatically |

## 🎯 Location

The avatar appears:
- **Position**: Fixed bottom-right corner
- **Distance from edges**: 1rem (16px)
- **Size**: 56px diameter
- **Z-index**: 9999 (always on top)

## ✅ Checklist - What to Test

- [ ] Yellow circle visible in bottom-right
- [ ] White speech bubble inside
- [ ] Two eyes visible
- [ ] Smile mouth visible
- [ ] Eyes blink on their own
- [ ] Hover makes it wiggle
- [ ] Eyes move when hovering
- [ ] Click opens chat
- [ ] No console errors

## 🔍 If You Don't See It

### Check Browser Console (F12)
Look for:
- ❌ Red error messages
- ⚠️ Warning messages about Framer Motion
- 🔵 Component rendering logs

### Common Issues:

1. **Nothing in corner**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Check if logged in to dashboard
   - Verify not on login page

2. **Static yellow circle (no features)**
   - SVG may not be rendering
   - Check browser SVG support
   - Try different browser

3. **No animations**
   - Check if reduced motion is enabled
   - Verify Framer Motion loaded
   - Check CPU usage

## 📱 Mobile View

On mobile devices:
- Avatar is same size (56px)
- Touch to open (instead of click)
- Hover effects don't apply
- Auto-blink still works

## 🎨 Color Reference

```css
Background:    #FFC20A (Bisman Yellow)
Speech Bubble: #FFFFFF (White)
Eyes & Mouth:  #0A3A63 (Bisman Blue)
Notification:  #FFC20A (Yellow glow)
```

## 🚀 Performance

Expected performance:
- **FPS**: 60fps smooth animations
- **CPU**: <5% usage
- **Memory**: <10MB
- **Load time**: Instant (no images)

## 📸 Before & After

### BEFORE (Old static icon):
```
┌─────┐
│ 💬  │ ← Static emoji/image
└─────┘
```

### AFTER (New animated avatar):
```
┌────────╮
│ ● ●  │ ← Blinking eyes
│  ⌣   │ ← Smiling face
╰────┬───┘
     └─→  ← Speech tail
(Wiggles on hover!)
```

---

**Quick Test**: 
1. Load http://localhost:3001
2. Log in to dashboard
3. Look bottom-right corner
4. Hover over yellow circle
5. Watch it wiggle! 🎉

**Refresh if needed**: Cmd+Shift+R (Mac) or Ctrl+F5 (Windows)
