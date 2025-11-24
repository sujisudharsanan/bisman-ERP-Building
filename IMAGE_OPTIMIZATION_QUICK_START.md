# 🚀 Image Optimization - Quick Start Guide

**BISMAN ERP | Frontend Performance**

---

## ⚡ 5-Minute Setup

```bash
# 1. Navigate to frontend
cd my-frontend

# 2. Run setup script
./scripts/setup-image-optimization.sh

# 3. Add package.json scripts manually
# Add these to your "scripts" section:
"optimize:images": "node scripts/optimize-images.js",
"optimize:watch": "nodemon --watch public --ext png,jpg,jpeg --exec npm run optimize:images"

# 4. Optimize existing images
npm run optimize:images
```

---

## 📦 What Got Installed

### Files Created
```
my-frontend/
├── scripts/
│   ├── optimize-images.js          ← Main optimization script
│   └── setup-image-optimization.sh ← Setup automation
├── src/components/
│   ├── OptimizedImage.tsx          ← Smart image component
│   └── LazyImage.tsx               ← Lazy loading component
└── public/
    └── optimized/                  ← Output directory
```

### NPM Packages
- **sharp** - High-performance image processing
- **glob** - File pattern matching

---

## 🎯 Usage Examples

### 1. Basic Optimized Image
```tsx
import { OptimizedImage } from '@/components/OptimizedImage';

<OptimizedImage 
  src="/brand/logo.png" 
  alt="Company Logo" 
  width={200} 
  height={100}
/>
```

### 2. Avatar with Fallback
```tsx
import { AvatarImage } from '@/components/OptimizedImage';

<AvatarImage 
  src="/users/john.jpg" 
  alt="John Doe"
  size={40}
  userName="John Doe"  // Shows initials if image fails
/>
```

### 3. Lazy Loading (for below-fold images)
```tsx
import { LazyImage } from '@/components/LazyImage';

<LazyImage 
  src="/reports/dashboard.png" 
  alt="Dashboard"
  rootMargin="200px"  // Load 200px before entering viewport
/>
```

### 4. Background Image
```tsx
import { BackgroundImage } from '@/components/OptimizedImage';

<BackgroundImage 
  src="/backgrounds/hero.jpg" 
  overlayOpacity={0.3}
  overlayColor="black"
>
  <h1>Welcome to BISMAN ERP</h1>
</BackgroundImage>
```

---

## 📏 Recommended Image Sizes for ERP

| **Asset Type**        | **Size (px)**     | **Max File Size** | **Format**   |
|-----------------------|-------------------|-------------------|--------------|
| **Avatars**           | 128x128           | 20 KB             | WebP/AVIF    |
| **Icons**             | 24x24, 48x48      | SVG preferred     | SVG/WebP     |
| **Thumbnails**        | 200x200           | 30 KB             | WebP/AVIF    |
| **Cards**             | 400x300           | 60 KB             | WebP/AVIF    |
| **Dashboard Charts**  | 800x400           | 100 KB            | WebP/AVIF    |
| **Banners**           | 1920x400          | 120 KB            | WebP/AVIF    |
| **Reports/Graphs**    | 1200x800          | 150 KB            | WebP/AVIF    |

---

## 🔄 Workflow

### Development Mode
```bash
# Start Next.js dev server
npm run dev

# In another terminal, watch for image changes
npm run optimize:watch
```

### Before Production Deploy
```bash
# Optimize all images
npm run optimize:images

# Build optimized bundle
npm run build

# Check bundle size
npm run analyze
```

---

## 🎨 Free Optimization Tools

### Online Tools (No Installation)
1. **Squoosh** - https://squoosh.app/
   - Visual WebP/AVIF converter
   - Side-by-side comparison
   
2. **TinyPNG** - https://tinypng.com/
   - Smart PNG/JPEG compression
   - Batch processing

3. **SVGOMG** - https://jakearchibald.github.io/svgomg/
   - SVG optimization
   - Visual preview

### CLI Tools (For Automation)
```bash
# Install ImageMagick (optional)
brew install imagemagick

# Batch convert to WebP
for file in public/brand/*.png; do
  cwebp -q 80 "$file" -o "${file%.png}.webp"
done
```

---

## 📊 Performance Testing

### Lighthouse Test
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view
```

### Check Image Loading
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Filter by **Img**
4. Reload page
5. Look for:
   - ✅ WebP/AVIF formats
   - ✅ Lazy loading (images load as you scroll)
   - ✅ Proper image sizes

### Expected Results
- **Before**: 2-5 MB initial page load
- **After**: 500 KB - 1 MB initial page load
- **Savings**: 60-80% reduction

---

## 🐛 Troubleshooting

### Sharp Installation Fails
```bash
# macOS
brew install vips
npm install sharp

# If still fails, use prebuilt binaries
npm install --platform=darwin --arch=arm64 sharp
```

### Images Not Optimizing
```bash
# Check if script is executable
ls -la scripts/optimize-images.js

# Run manually with debug
node scripts/optimize-images.js
```

### Next.js Not Serving WebP
```typescript
// next.config.js - Ensure this is set
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
};
```

### CORS Issues with Images
```typescript
// next.config.js - Add image domains
module.exports = {
  images: {
    domains: ['yourdomain.com', 'cdn.yourdomain.com'],
  },
};
```

---

## 📈 Monitoring Image Performance

### Create Performance Script
```javascript
// scripts/check-image-performance.js
const fs = require('fs');
const path = require('path');

async function checkImageSizes() {
  const publicDir = 'public';
  const stats = {
    total: 0,
    count: 0,
    large: []
  };

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(png|jpg|jpeg|webp|avif)$/i.test(file)) {
        stats.count++;
        stats.total += stat.size;
        
        // Flag files over 200KB
        if (stat.size > 200 * 1024) {
          stats.large.push({
            file: fullPath,
            size: (stat.size / 1024).toFixed(1) + ' KB'
          });
        }
      }
    });
  }

  scanDir(publicDir);

  console.log('Image Performance Report:');
  console.log('-------------------------');
  console.log(`Total images: ${stats.count}`);
  console.log(`Total size: ${(stats.total / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Average size: ${(stats.total / stats.count / 1024).toFixed(1)} KB`);
  
  if (stats.large.length > 0) {
    console.log('\n⚠️  Large images (>200KB):');
    stats.large.forEach(img => {
      console.log(`  - ${img.file} (${img.size})`);
    });
  } else {
    console.log('\n✅ All images are optimized!');
  }
}

checkImageSizes();
```

Run it:
```bash
node scripts/check-image-performance.js
```

---

## ✅ Quick Wins Checklist

- [ ] **Setup complete** - Ran `./scripts/setup-image-optimization.sh`
- [ ] **Scripts added** - Added `optimize:images` to package.json
- [ ] **Images optimized** - Ran `npm run optimize:images`
- [ ] **Components imported** - Using `OptimizedImage` in components
- [ ] **Lazy loading** - Added `LazyImage` to below-fold content
- [ ] **Next.js config** - Updated image formats in next.config.js
- [ ] **Performance tested** - Ran Lighthouse audit
- [ ] **Build tested** - Checked production bundle size

---

## 🎓 Best Practices

### ✅ DO
- Use WebP/AVIF for all photos and screenshots
- Keep SVG for icons, logos, and illustrations
- Lazy load images below the fold
- Use responsive image sizes
- Compress before upload (use Squoosh)

### ❌ DON'T
- Use PNG for photos (use WebP instead)
- Load all images on page load
- Use images larger than display size
- Forget alt text for accessibility
- Skip optimization in production

---

## 📚 Full Documentation

For detailed implementation guide, see:
- **IMAGE_OPTIMIZATION_COMPLETE_GUIDE.md** - Complete reference
- **Next.js Image Docs** - https://nextjs.org/docs/api-reference/next/image

---

## 🆘 Support

### Common Issues
1. **Build fails** → Check Sharp installation
2. **Images blurry** → Increase quality in config
3. **Slow optimization** → Process fewer sizes
4. **CORS errors** → Add domains to next.config.js

### Need Help?
- Check `IMAGE_OPTIMIZATION_COMPLETE_GUIDE.md`
- Review Next.js image documentation
- Test with browser DevTools Network tab

---

## 🎉 Success Metrics

After implementing image optimization, you should see:

- **70-90%** file size reduction
- **2-3x** faster page load times
- **90+** Lighthouse performance score
- **Improved** Core Web Vitals (LCP, CLS)
- **Better** mobile experience

---

**Ready to optimize?** Run `./scripts/setup-image-optimization.sh` now! 🚀
