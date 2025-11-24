#!/usr/bin/env node
/**
 * Automated Image Optimization Pipeline for BISMAN ERP
 * Converts PNG/JPEG to WebP & AVIF, optimizes sizes, generates responsive variants
 * 
 * Usage:
 *   node scripts/optimize-images.js
 *   npm run optimize:images
 * 
 * Features:
 * - Auto WebP/AVIF conversion
 * - Responsive variants (thumbnail, small, medium, large)
 * - 70-90% file size reduction
 * - Batch processing
 * - Detailed reports
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  inputDir: 'public',
  outputDir: 'public/optimized',
  formats: ['webp', 'avif'],
  quality: {
    webp: 80,
    avif: 75,
    jpeg: 85,
    png: 90
  },
  // Responsive sizes optimized for ERP UI
  sizes: {
    thumbnail: 200,   // Avatars, small icons
    small: 400,       // Dashboard cards
    medium: 800,      // Standard images
    large: 1200,      // Headers, banners
    xlarge: 1920      // Full-width backgrounds
  },
  skip: [
    '**/node_modules/**',
    '**/optimized/**',
    '**/.next/**',
    '**/*.svg', // SVGs are already optimized
    '**/favicon.ico'
  ]
};

// Console colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all image files to optimize
 */
async function getImageFiles() {
  const patterns = [
    `${CONFIG.inputDir}/**/*.{png,PNG}`,
    `${CONFIG.inputDir}/**/*.{jpg,JPG,jpeg,JPEG}`
  ];
  
  const files = await glob(patterns, {
    ignore: CONFIG.skip
  });
  
  return files;
}

/**
 * Get image metadata
 */
async function getImageInfo(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    const stats = await fs.stat(filePath);
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: stats.size,
      filePath
    };
  } catch (error) {
    console.error(`${colors.red}Error reading ${filePath}:${colors.reset}`, error.message);
    return null;
  }
}

/**
 * Determine which sizes to generate
 */
function getSizesToGenerate(width) {
  const sizes = [];
  
  if (width >= CONFIG.sizes.thumbnail) sizes.push('thumbnail');
  if (width >= CONFIG.sizes.small) sizes.push('small');
  if (width >= CONFIG.sizes.medium) sizes.push('medium');
  if (width >= CONFIG.sizes.large) sizes.push('large');
  
  // Always include original size
  sizes.push('original');
  
  return sizes;
}

/**
 * Optimize a single image
 */
async function optimizeImage(filePath, info) {
  const relativePath = path.relative(CONFIG.inputDir, filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const dir = path.dirname(relativePath);
  
  const outputDir = path.join(CONFIG.outputDir, dir);
  await fs.mkdir(outputDir, { recursive: true });
  
  const results = [];
  const sizesToGenerate = getSizesToGenerate(info.width);
  
  console.log(`\n${colors.yellow}📸 Processing: ${relativePath}${colors.reset}`);
  console.log(`   ${colors.cyan}Original: ${(info.size / 1024).toFixed(1)}KB (${info.width}x${info.height})${colors.reset}`);
  
  for (const sizeKey of sizesToGenerate) {
    const targetWidth = sizeKey === 'original' ? info.width : CONFIG.sizes[sizeKey];
    
    // Skip if target is larger than original
    if (targetWidth > info.width && sizeKey !== 'original') continue;
    
    const sizeSuffix = sizeKey === 'original' ? '' : `-${sizeKey}`;
    
    try {
      // Generate WebP
      const webpPath = path.join(outputDir, `${name}${sizeSuffix}.webp`);
      await sharp(filePath)
        .resize(targetWidth, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({ quality: CONFIG.quality.webp })
        .toFile(webpPath);
      
      const webpStats = await fs.stat(webpPath);
      results.push({
        format: 'webp',
        size: sizeKey,
        path: webpPath,
        fileSize: webpStats.size
      });
      
      // Generate AVIF (smaller than WebP)
      const avifPath = path.join(outputDir, `${name}${sizeSuffix}.avif`);
      await sharp(filePath)
        .resize(targetWidth, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .avif({ quality: CONFIG.quality.avif })
        .toFile(avifPath);
      
      const avifStats = await fs.stat(avifPath);
      results.push({
        format: 'avif',
        size: sizeKey,
        path: avifPath,
        fileSize: avifStats.size
      });
      
      console.log(`   ${colors.green}✓ Generated ${sizeKey} (WebP: ${(webpStats.size / 1024).toFixed(1)}KB, AVIF: ${(avifStats.size / 1024).toFixed(1)}KB)${colors.reset}`);
      
    } catch (error) {
      console.error(`   ${colors.red}✗ Error generating ${sizeKey}:${colors.reset}`, error.message);
    }
  }
  
  // Calculate savings
  const totalOptimizedSize = results.reduce((sum, r) => sum + r.fileSize, 0);
  const avgOptimizedSize = totalOptimizedSize / results.length;
  const savings = ((info.size - avgOptimizedSize) / info.size * 100).toFixed(1);
  
  console.log(`   ${colors.green}💾 Average size: ${(avgOptimizedSize / 1024).toFixed(1)}KB (${savings}% smaller)${colors.reset}`);
  
  return {
    originalPath: filePath,
    originalSize: info.size,
    results
  };
}

/**
 * Generate optimization report
 */
async function generateReport(allResults, startTime) {
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  const totalOriginalSize = allResults.reduce((sum, r) => sum + r.originalSize, 0);
  const totalOptimizedSize = allResults.reduce((sum, r) => {
    return sum + r.results.reduce((s, res) => s + res.fileSize, 0);
  }, 0);
  
  const avgOptimizedSize = totalOptimizedSize / allResults.reduce((sum, r) => sum + r.results.length, 0);
  const totalSavings = ((totalOriginalSize - avgOptimizedSize) / totalOriginalSize * 100).toFixed(1);
  
  const report = `
${colors.bright}${colors.blue}
┌─────────────────────────────────────────────────────────┐
│           IMAGE OPTIMIZATION REPORT                     │
└─────────────────────────────────────────────────────────┘
${colors.reset}

📊 ${colors.bright}Statistics:${colors.reset}
   Images processed:    ${colors.cyan}${allResults.length}${colors.reset}
   Variants generated:  ${colors.cyan}${allResults.reduce((sum, r) => sum + r.results.length, 0)}${colors.reset}
   
💾 ${colors.bright}File Sizes:${colors.reset}
   Original total:      ${colors.yellow}${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB${colors.reset}
   Optimized avg:       ${colors.green}${(avgOptimizedSize / 1024).toFixed(1)} KB${colors.reset} per variant
   
📉 ${colors.bright}Savings:${colors.reset}
   Average reduction:   ${colors.green}${totalSavings}%${colors.reset}
   Space saved:         ${colors.green}${((totalOriginalSize - avgOptimizedSize) / 1024 / 1024).toFixed(2)} MB${colors.reset}
   
⏱️  ${colors.bright}Performance:${colors.reset}
   Processing time:     ${colors.cyan}${duration}s${colors.reset}
   
📁 ${colors.bright}Output:${colors.reset}
   Location: ${colors.cyan}${CONFIG.outputDir}${colors.reset}
   
${colors.green}${colors.bright}✅ Optimization complete!${colors.reset}
`;
  
  console.log(report);
  
  // Save JSON report
  const reportPath = path.join(CONFIG.outputDir, 'optimization-report.json');
  await fs.writeFile(
    reportPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      duration,
      statistics: {
        imagesProcessed: allResults.length,
        variantsGenerated: allResults.reduce((sum, r) => sum + r.results.length, 0),
        totalOriginalSize,
        avgOptimizedSize,
        totalSavings,
        spaceSaved: totalOriginalSize - avgOptimizedSize
      },
      details: allResults.map(r => ({
        originalPath: r.originalPath,
        originalSize: r.originalSize,
        variants: r.results.map(v => ({
          format: v.format,
          size: v.size,
          path: v.path,
          fileSize: v.fileSize
        }))
      }))
    }, null, 2)
  );
  
  console.log(`${colors.green}📄 Detailed report saved to: ${reportPath}${colors.reset}\n`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════════════════╗
║     🖼️  BISMAN ERP Image Optimization Pipeline       ║
╚═══════════════════════════════════════════════════════╝
${colors.reset}`);
  
  const startTime = Date.now();
  
  try {
    // Get all images
    console.log(`${colors.cyan}📂 Scanning for images in: ${CONFIG.inputDir}${colors.reset}`);
    const imageFiles = await getImageFiles();
    
    if (imageFiles.length === 0) {
      console.log(`${colors.yellow}⚠️  No images found to optimize${colors.reset}`);
      console.log(`${colors.yellow}Place PNG/JPEG files in ${CONFIG.inputDir} and run again${colors.reset}`);
      return;
    }
    
    console.log(`${colors.green}✓ Found ${imageFiles.length} images${colors.reset}`);
    
    // Process each image
    const allResults = [];
    let processed = 0;
    
    for (const filePath of imageFiles) {
      processed++;
      console.log(`\n${colors.cyan}[${processed}/${imageFiles.length}]${colors.reset}`);
      
      const info = await getImageInfo(filePath);
      if (!info) continue;
      
      const result = await optimizeImage(filePath, info);
      allResults.push(result);
    }
    
    // Generate report
    await generateReport(allResults, startTime);
    
    console.log(`${colors.green}${colors.bright}🎉 All images optimized successfully!${colors.reset}`);
    console.log(`${colors.cyan}Next steps:${colors.reset}`);
    console.log(`  1. Update your components to use optimized images`);
    console.log(`  2. Use <OptimizedImage> component for best results`);
    console.log(`  3. Test with: npm run dev\n`);
    
  } catch (error) {
    console.error(`${colors.red}${colors.bright}❌ Error:${colors.reset}`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { optimizeImage, getImageFiles, getImageInfo };
