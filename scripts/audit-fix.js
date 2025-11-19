#!/usr/bin/env node

/**
 * 🧩 Cross-Browser Compatibility & CSS Fix Automation
 * Automatically audits and fixes CSS vendor prefixes, HTML meta tags, and responsive issues
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color styling for console output
const style = {
  header: (text) => `\x1b[95m${text}\x1b[0m`,
  success: (text) => `\x1b[92m✅ ${text}\x1b[0m`,
  warning: (text) => `\x1b[93m⚠️  ${text}\x1b[0m`,
  error: (text) => `\x1b[91m❌ ${text}\x1b[0m`,
  info: (text) => `\x1b[96mℹ️  ${text}\x1b[0m`,
  fixed: (text) => `\x1b[92m🔧 ${text}\x1b[0m`
};

// Configuration
const CONFIG = {
  // File patterns to scan
  patterns: {
    css: ['**/*.css', '**/*.scss', '!node_modules/**', '!dist/**', '!build/**'],
    html: ['**/*.html', '!node_modules/**', '!dist/**', '!build/**'],
    react: ['**/*.tsx', '**/*.jsx', '!node_modules/**', '!dist/**', '!build/**'],
    vue: ['**/*.vue', '!node_modules/**', '!dist/**', '!build/**']
  },
  
  // CSS properties that need vendor prefixes
  vendorPrefixes: {
    'filter': ['-webkit-filter'],
    'backdrop-filter': ['-webkit-backdrop-filter'],
    'text-size-adjust': ['-webkit-text-size-adjust', '-moz-text-size-adjust'],
    'user-select': ['-webkit-user-select', '-moz-user-select', '-ms-user-select'],
    'transform': ['-webkit-transform', '-moz-transform', '-ms-transform'],
    'transition': ['-webkit-transition', '-moz-transition', '-ms-transition'],
    'animation': ['-webkit-animation', '-moz-animation', '-ms-animation'],
    'box-shadow': ['-webkit-box-shadow', '-moz-box-shadow'],
    'border-radius': ['-webkit-border-radius', '-moz-border-radius'],
    'appearance': ['-webkit-appearance', '-moz-appearance'],
    'clip-path': ['-webkit-clip-path'],
    'mask': ['-webkit-mask'],
    'column-count': ['-webkit-column-count', '-moz-column-count'],
    'hyphens': ['-webkit-hyphens', '-moz-hyphens', '-ms-hyphens'],
    'tab-size': ['-webkit-tab-size', '-moz-tab-size']
  },
  
  // Responsive design best practices
  responsiveRules: {
    images: 'max-width: 100%; height: auto;',
    containers: 'max-width: 100%; overflow-x: hidden;',
    text: 'word-wrap: break-word; overflow-wrap: break-word;'
  }
};

class CrossBrowserAuditor {
  constructor() {
    this.report = {
      totalFiles: 0,
      fixedFiles: 0,
      issues: [],
      fixes: [],
      timestamp: new Date().toISOString()
    };
  }

  async run() {
    console.log(style.header('🧩 Cross-Browser Compatibility Audit & Fix'));
    console.log(style.info('Scanning project for compatibility issues...\n'));

    try {
      // Create backup directory
      this.createBackupDir();
      
      // Fix CSS vendor prefixes
      await this.fixCSSVendorPrefixes();
      
      // Fix HTML meta tags
      await this.fixHTMLMetaTags();
      
      // Fix React/JSX components
      await this.fixReactComponents();
      
      // Setup PostCSS autoprefixer
      await this.setupPostCSS();
      
      // Generate report
      this.generateReport();
      
      console.log(style.success(`Audit complete! Fixed ${this.report.fixedFiles} files.`));
      console.log(style.info(`Report saved to: audit-report/css-fix-report.json`));
      
    } catch (error) {
      console.log(style.error(`Audit failed: ${error.message}`));
      process.exit(1);
    }
  }

  createBackupDir() {
    const backupDir = `./backup/css-fix-${Date.now()}`;
    if (!fs.existsSync('./backup')) {
      fs.mkdirSync('./backup', { recursive: true });
    }
    fs.mkdirSync(backupDir, { recursive: true });
    this.backupDir = backupDir;
    console.log(style.info(`Backup directory created: ${backupDir}`));
  }

  async fixCSSVendorPrefixes() {
    console.log(style.header('\n🎨 Fixing CSS Vendor Prefixes'));
    
    const cssFiles = [
      ...glob.sync(CONFIG.patterns.css[0]),
      ...glob.sync(CONFIG.patterns.css[1])
    ].filter(file => !file.includes('node_modules'));

    for (const file of cssFiles) {
      await this.processCSSFile(file);
    }
  }

  async processCSSFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      let newContent = content;

      // Create backup
      const backupPath = path.join(this.backupDir, filePath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.writeFileSync(backupPath, content);

      // Check for missing vendor prefixes
      for (const [property, prefixes] of Object.entries(CONFIG.vendorPrefixes)) {
        const regex = new RegExp(`\\s*${property}\\s*:`, 'gi');
        const matches = content.match(regex);

        if (matches) {
          // Check if vendor prefixes are missing
          const hasPrefixes = prefixes.some(prefix => 
            content.includes(`${prefix}:`)
          );

          if (!hasPrefixes) {
            // Add vendor prefixes before the standard property
            const propertyRegex = new RegExp(`(\\s*)(${property}\\s*:.+?;)`, 'gi');
            newContent = newContent.replace(propertyRegex, (match, indent, propertyDecl) => {
              const prefixedProperties = prefixes.map(prefix => 
                `${indent}${propertyDecl.replace(property, prefix)}`
              ).join('\n');
              
              return `${prefixedProperties}\n${indent}${propertyDecl}`;
            });
            
            modified = true;
            this.report.fixes.push(`Added vendor prefixes for ${property} in ${filePath}`);
          }
        }
      }

      // Add responsive image fixes
      if (content.includes('img') && !content.includes('max-width: 100%')) {
        newContent += '\n\n/* Responsive Images */\nimg {\n  max-width: 100%;\n  height: auto;\n}\n';
        modified = true;
        this.report.fixes.push(`Added responsive image styles to ${filePath}`);
      }

      if (modified) {
        fs.writeFileSync(filePath, newContent);
        console.log(style.fixed(`Fixed vendor prefixes in ${filePath}`));
        this.report.fixedFiles++;
      }

      this.report.totalFiles++;

    } catch (error) {
      console.log(style.error(`Error processing ${filePath}: ${error.message}`));
      this.report.issues.push(`Error processing ${filePath}: ${error.message}`);
    }
  }

  async fixHTMLMetaTags() {
    console.log(style.header('\n📱 Fixing HTML Meta Tags'));
    
    const htmlFiles = glob.sync(CONFIG.patterns.html[0]);

    for (const file of htmlFiles) {
      await this.processHTMLFile(file);
    }
  }

  async processHTMLFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      let newContent = content;

      // Create backup
      const backupPath = path.join(this.backupDir, filePath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.writeFileSync(backupPath, content);

      // Fix viewport meta tag
      const viewportRegex = /<meta\s+name=["']viewport["']\s+content=["'][^"']*["']\s*\/?>/gi;
      const hasViewport = viewportRegex.test(content);

      if (hasViewport) {
        // Replace existing viewport with proper one
        newContent = newContent.replace(viewportRegex, 
          '<meta name="viewport" content="width=device-width, initial-scale=1.0">');
        modified = true;
        this.report.fixes.push(`Fixed viewport meta tag in ${filePath}`);
      } else if (content.includes('<head>')) {
        // Add viewport meta tag
        newContent = newContent.replace(/<head>/i, 
          '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
        modified = true;
        this.report.fixes.push(`Added viewport meta tag to ${filePath}`);
      }

      // Add theme-color meta tag if missing
      if (!content.includes('theme-color') && content.includes('<head>')) {
        const themeColorMeta = '\n  <meta name="theme-color" content="#000000">';
        newContent = newContent.replace(/<\/head>/i, `${themeColorMeta}\n</head>`);
        modified = true;
        this.report.fixes.push(`Added theme-color meta tag to ${filePath}`);
      }

      // Ensure charset is UTF-8
      if (!content.includes('charset') && content.includes('<head>')) {
        newContent = newContent.replace(/<head>/i, 
          '<head>\n  <meta charset="UTF-8">');
        modified = true;
        this.report.fixes.push(`Added UTF-8 charset to ${filePath}`);
      }

      if (modified) {
        fs.writeFileSync(filePath, newContent);
        console.log(style.fixed(`Fixed meta tags in ${filePath}`));
        this.report.fixedFiles++;
      }

      this.report.totalFiles++;

    } catch (error) {
      console.log(style.error(`Error processing ${filePath}: ${error.message}`));
      this.report.issues.push(`Error processing ${filePath}: ${error.message}`);
    }
  }

  async fixReactComponents() {
    console.log(style.header('\n⚛️  Fixing React/JSX Components'));
    
    const reactFiles = [
      ...glob.sync(CONFIG.patterns.react[0]),
      ...glob.sync(CONFIG.patterns.react[1])
    ].filter(file => !file.includes('node_modules'));

    for (const file of reactFiles) {
      await this.processReactFile(file);
    }
  }

  async processReactFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      let newContent = content;

      // Create backup
      const backupPath = path.join(this.backupDir, filePath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.writeFileSync(backupPath, content);

      // Fix className issues for cross-browser compatibility
      if (content.includes('className=')) {
        // Add responsive classes suggestions
        const needsResponsive = [
          { pattern: /className=["'][^"']*w-full[^"']*["']/g, suggestion: 'max-w-full' },
          { pattern: /className=["'][^"']*overflow-x[^"']*["']/g, suggestion: 'overflow-x-auto' }
        ];

        for (const { pattern, suggestion } of needsResponsive) {
          if (pattern.test(content) && !content.includes(suggestion)) {
            this.report.issues.push(`Consider adding '${suggestion}' class in ${filePath} for better responsiveness`);
          }
        }
      }

      // Check for inline styles that need vendor prefixes
      const inlineStyleRegex = /style=\{[^}]*\}/g;
      const inlineStyles = content.match(inlineStyleRegex);

      if (inlineStyles) {
        for (const style of inlineStyles) {
          for (const property of Object.keys(CONFIG.vendorPrefixes)) {
            if (style.includes(property) && !style.includes(`Webkit${property.charAt(0).toUpperCase() + property.slice(1)}`)) {
              this.report.issues.push(`Inline style in ${filePath} may need vendor prefix for '${property}'`);
            }
          }
        }
      }

      this.report.totalFiles++;

    } catch (error) {
      console.log(style.error(`Error processing ${filePath}: ${error.message}`));
      this.report.issues.push(`Error processing ${filePath}: ${error.message}`);
    }
  }

  async setupPostCSS() {
    console.log(style.header('\n🔧 Setting up PostCSS Autoprefixer'));

    // Check if package.json exists
    if (!fs.existsSync('./package.json')) {
      console.log(style.warning('No package.json found, skipping PostCSS setup'));
      return;
    }

    // Create postcss.config.js
    const postcssConfig = `module.exports = {
  plugins: [
    require('postcss-preset-env')({
      stage: 3,
      autoprefixer: { 
        grid: true,
        flexbox: true 
      }
    }),
    require('autoprefixer')({
      overrideBrowserslist: [
        'last 2 versions',
        '> 1%',
        'ie >= 11',
        'iOS >= 10',
        'Safari >= 10'
      ]
    })
  ]
};`;

    fs.writeFileSync('./postcss.config.js', postcssConfig);
    console.log(style.fixed('Created postcss.config.js'));

    // Update package.json with PostCSS scripts
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      
      if (!packageJson.scripts) packageJson.scripts = {};
      
      packageJson.scripts['css:prefix'] = 'postcss src/**/*.css --replace';
      packageJson.scripts['css:watch'] = 'postcss src/**/*.css --replace --watch';
      
      fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
      console.log(style.fixed('Added PostCSS scripts to package.json'));

      // Add installation instructions
      this.report.fixes.push('PostCSS configuration created');
      this.report.fixes.push('Run: npm install postcss postcss-cli postcss-preset-env autoprefixer --save-dev');
      this.report.fixes.push('Run: npm run css:prefix to apply vendor prefixes');

    } catch (error) {
      console.log(style.error(`Error updating package.json: ${error.message}`));
    }
  }

  generateReport() {
    console.log(style.header('\n📊 Generating Audit Report'));

    // Create audit-report directory
    if (!fs.existsSync('./audit-report')) {
      fs.mkdirSync('./audit-report', { recursive: true });
    }

    // Generate JSON report
    const jsonReport = {
      ...this.report,
      summary: {
        totalFiles: this.report.totalFiles,
        fixedFiles: this.report.fixedFiles,
        totalFixes: this.report.fixes.length,
        totalIssues: this.report.issues.length,
        successRate: ((this.report.fixedFiles / this.report.totalFiles) * 100).toFixed(2) + '%'
      },
      recommendations: [
        'Run: npm install postcss postcss-cli postcss-preset-env autoprefixer --save-dev',
        'Run: npm run css:prefix to apply automatic vendor prefixes',
        'Test your application in multiple browsers (Chrome, Firefox, Safari, Edge)',
        'Use browser developer tools to check for console warnings',
        'Consider using CSS Grid and Flexbox for modern layouts',
        'Implement progressive enhancement for older browsers'
      ]
    };

    fs.writeFileSync('./audit-report/css-fix-report.json', JSON.stringify(jsonReport, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(jsonReport);
    fs.writeFileSync('./audit-report/css-fix-report.html', htmlReport);

    console.log(style.success('Reports generated:'));
    console.log(style.info('  📄 JSON: audit-report/css-fix-report.json'));
    console.log(style.info('  🌐 HTML: audit-report/css-fix-report.html'));
  }

  generateHTMLReport(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cross-Browser Compatibility Audit Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { opacity: 0.9; margin-top: 5px; }
        .fixes-list, .issues-list { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 10px 0; }
        .fix-item { background: #d4edda; border-left: 4px solid #28a745; padding: 10px; margin: 5px 0; border-radius: 0 4px 4px 0; }
        .issue-item { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 5px 0; border-radius: 0 4px 4px 0; }
        .recommendations { background: #e7f3ff; border: 1px solid #b8daff; padding: 20px; border-radius: 8px; }
        .rec-item { margin: 10px 0; padding: 8px; background: white; border-radius: 4px; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧩 Cross-Browser Compatibility Audit Report</h1>
        <p><strong>Generated:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${data.summary.totalFiles}</div>
                <div class="stat-label">Total Files Scanned</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.summary.fixedFiles}</div>
                <div class="stat-label">Files Fixed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.summary.totalFixes}</div>
                <div class="stat-label">Total Fixes Applied</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.summary.successRate}</div>
                <div class="stat-label">Success Rate</div>
            </div>
        </div>

        <h2>🔧 Fixes Applied</h2>
        <div class="fixes-list">
            ${data.fixes.map(fix => `<div class="fix-item">✅ ${fix}</div>`).join('')}
        </div>

        <h2>⚠️ Issues & Recommendations</h2>
        <div class="issues-list">
            ${data.issues.map(issue => `<div class="issue-item">⚠️ ${issue}</div>`).join('')}
        </div>

        <h2>📋 Next Steps</h2>
        <div class="recommendations">
            ${data.recommendations.map(rec => `<div class="rec-item">📌 ${rec}</div>`).join('')}
        </div>

        <h2>🔧 PostCSS Configuration</h2>
        <p>The following PostCSS configuration has been created for automatic vendor prefixing:</p>
        <pre>module.exports = {
  plugins: [
    require('postcss-preset-env')({
      stage: 3,
      autoprefixer: { 
        grid: true,
        flexbox: true 
      }
    }),
    require('autoprefixer')({
      overrideBrowserslist: [
        'last 2 versions',
        '> 1%',
        'ie >= 11',
        'iOS >= 10',
        'Safari >= 10'
      ]
    })
  ]
};</pre>

        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666;">
            <p>Cross-Browser Compatibility Audit completed successfully</p>
        </footer>
    </div>
</body>
</html>`;
  }
}

// Run the auditor
if (require.main === module) {
  const auditor = new CrossBrowserAuditor();
  auditor.run().catch(console.error);
}

module.exports = CrossBrowserAuditor;
