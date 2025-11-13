# 🎯 Emoji Picker Quick Reference

## Installation
```bash
npm install emoji-picker-react
```

## Import
```tsx
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
```

## Basic Usage

### 1. State & Refs
```tsx
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const emojiPickerRef = useRef<HTMLDivElement>(null);
const inputRef = useRef<HTMLInputElement>(null);
const emojiButtonRef = useRef<HTMLButtonElement>(null);
```

### 2. Toggle Function
```tsx
const toggleEmojiPicker = () => {
  setShowEmojiPicker(!showEmojiPicker);
};
```

### 3. Emoji Click Handler (Cursor Position Support)
```tsx
const handleEmojiClick = (emojiData: EmojiClickData) => {
  const input = inputRef.current;
  if (input) {
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const textBefore = inputMessage.substring(0, start);
    const textAfter = inputMessage.substring(end);
    const newText = textBefore + emojiData.emoji + textAfter;
    
    setInputMessage(newText);
    
    setTimeout(() => {
      const newCursorPos = start + emojiData.emoji.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.focus();
    }, 0);
  }
};
```

### 4. Click-Outside Detection
```tsx
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      showEmojiPicker &&
      emojiPickerRef.current &&
      !emojiPickerRef.current.contains(event.target as Node) &&
      emojiButtonRef.current &&
      !emojiButtonRef.current.contains(event.target as Node)
    ) {
      setShowEmojiPicker(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [showEmojiPicker]);
```

### 5. JSX Structure
```tsx
<div className="relative">
  {/* Emoji Picker Popup */}
  {showEmojiPicker && (
    <div 
      ref={emojiPickerRef}
      className="absolute bottom-16 left-2 z-50 rounded-xl shadow-md"
    >
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        width={300}
        height={400}
        searchPlaceHolder="Search emoji..."
        previewConfig={{ showPreview: false }}
      />
    </div>
  )}
  
  {/* Emoji Button */}
  <button 
    ref={emojiButtonRef}
    onClick={toggleEmojiPicker}
    className="p-1.5 hover:bg-gray-100 rounded-full"
  >
    <Smile className="w-4 h-4 text-gray-500" />
  </button>
  
  {/* Input Field */}
  <input
    ref={inputRef}
    type="text"
    value={inputMessage}
    onChange={(e) => setInputMessage(e.target.value)}
    className="flex-1 px-3 py-1.5 bg-gray-100 rounded-full"
  />
</div>
```

## EmojiPicker Props

| Prop | Type | Description |
|------|------|-------------|
| `onEmojiClick` | `(emojiData: EmojiClickData) => void` | Callback when emoji selected |
| `width` | `number` | Picker width in pixels |
| `height` | `number` | Picker height in pixels |
| `searchPlaceHolder` | `string` | Search bar placeholder text |
| `previewConfig` | `object` | `{ showPreview: boolean }` |
| `theme` | `'light' \| 'dark'` | Theme mode |
| `skinTonesDisabled` | `boolean` | Disable skin tone selector |
| `categories` | `string[]` | Custom categories to show |
| `emojiStyle` | `'native' \| 'apple' \| 'google'` | Emoji rendering style |

## Common Patterns

### Dark Mode Support
```tsx
const isDarkMode = document.documentElement.classList.contains('dark');

<EmojiPicker
  theme={isDarkMode ? 'dark' : 'light'}
  onEmojiClick={handleEmojiClick}
/>
```

### Custom Position (Right Side)
```tsx
<div className="absolute bottom-16 right-2 z-50">
  <EmojiPicker />
</div>
```

### Mobile Responsive
```tsx
<div className="absolute bottom-16 left-2 sm:left-auto sm:right-2 z-50">
  <EmojiPicker width={280} height={350} />
</div>
```

### Keyboard Shortcut (Ctrl+E)
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      toggleEmojiPicker();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

## Troubleshooting

### Picker Not Closing
✅ Ensure click-outside useEffect has `showEmojiPicker` in dependencies

### Emoji Inserting at End
✅ Use `input.selectionStart` to get cursor position

### Picker Cut Off
✅ Use `absolute` positioning with proper `bottom` value
✅ Check parent has `relative` positioning

### Z-Index Issues
✅ Use high z-index (e.g., `z-50` or `z-[9999]`)
✅ Ensure no parent has lower z-index

### Emoji Not Rendering
✅ Use standard `<p>` or `<span>` tags (not custom components)
✅ Ensure UTF-8 encoding in HTML

## File Location
**Component:** `/my-frontend/src/components/chat/ChatWindow.tsx`

## Test Commands
```bash
# No build needed - hot reload should work
# Just refresh browser to see changes
```

## Documentation
- Full Guide: `EMOJI_PICKER_INTEGRATION_COMPLETE.md`
- Library Docs: https://github.com/ealush/emoji-picker-react

---

✅ **Ready to use!** Click the 😊 button to test.
