#!/usr/bin/env node

/**
 * 📱 Responsive Visual Audit & Layout Analysis
 * Tests all pages across multiple viewports and generates visual reports
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const glob = require('glob');

// Color styling for console output
const style = {
  header: (text) => `\x1b[95m${text}\x1b[0m`,
  success: (text) => `\x1b[92m✅ ${text}\x1b[0m`,
  warning: (text) => `\x1b[93m⚠️  ${text}\x1b[0m`,
  error: (text) => `\x1b[91m❌ ${text}\x1b[0m`,
  info: (text) => `\x1b[96mℹ️  ${text}\x1b[0m`,
  screenshot: (text) => `\x1b[94m📸 ${text}\x1b[0m`
};

// Viewport configurations for testing
const VIEWPORTS = {
  mobile: { width: 320, height: 640, name: 'Mobile (320x640)' },
  mobileLarge: { width: 480, height: 800, name: 'Mobile Large (480x800)' },
  tablet: { width: 768, height: 1024, name: 'Tablet (768x1024)' },
  laptop: { width: 1024, height: 768, name: 'Laptop (1024x768)' },
  desktop: { width: 1440, height: 900, name: 'Desktop (1440x900)' }
};

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  outputDir: './audit-report',
  screenshotDir: './audit-report/screenshots',
  timeout: 30000,
  
  // Pages to test (add your application routes here)
  pages: [
    { path: '/', name: 'Homepage' },
    { path: '/login', name: 'Login' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/users', name: 'Users' },
    // Add more pages as needed
  ],
  
  // Elements to check for overflow
  overflowSelectors: [
    'body', 'main', '.container', '.content', 
    '.navbar', '.sidebar', '.card', '.modal',
    'table', '.table-container', '.form-container'
  ]
};

class ResponsiveAuditor {
  constructor() {
    this.browser = null;
    this.report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPages: 0,
        totalViewports: Object.keys(VIEWPORTS).length,
        totalScreenshots: 0,
        overflowIssues: 0,
        layoutWarnings: 0
      },
      results: [],
      overallScore: 0
    };
  }

  async run() {
    console.log(style.header('📱 Responsive Visual Audit Starting...'));
    console.log(style.info(`Testing ${CONFIG.pages.length} pages across ${Object.keys(VIEWPORTS).length} viewports\n`));

    try {
      // Setup directories
      this.setupDirectories();
      
      // Launch browser
      await this.launchBrowser();
      
      // Test all pages and viewports
      await this.testAllPages();
      
      // Generate reports
      await this.generateReports();
      
      // Cleanup
      await this.cleanup();
      
      console.log(style.success('\n📊 Responsive audit completed!'));
      console.log(style.info(`Report available at: ${CONFIG.outputDir}/responsive-report.html`));
      
    } catch (error) {
      console.log(style.error(`Audit failed: ${error.message}`));
      await this.cleanup();
      process.exit(1);
    }
  }

  setupDirectories() {
    // Create output directories
    [CONFIG.outputDir, CONFIG.screenshotDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Create viewport subdirectories
    Object.keys(VIEWPORTS).forEach(viewport => {
      const viewportDir = path.join(CONFIG.screenshotDir, viewport);
      if (!fs.existsSync(viewportDir)) {
        fs.mkdirSync(viewportDir, { recursive: true });
      }
    });

    console.log(style.info('Output directories created'));
  }

  async launchBrowser() {
    console.log(style.info('Launching browser...'));
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });
  }

  async testAllPages() {
    this.report.summary.totalPages = CONFIG.pages.length;

    for (const pageConfig of CONFIG.pages) {
      console.log(style.header(`\n🔍 Testing: ${pageConfig.name}`));
      
      const pageResult = {
        name: pageConfig.name,
        path: pageConfig.path,
        url: `${CONFIG.baseUrl}${pageConfig.path}`,
        viewports: {},
        overallScore: 0,
        issues: []
      };

      for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
        console.log(style.info(`  📱 ${viewport.name}`));
        
        const viewportResult = await this.testPageViewport(
          pageResult.url, 
          viewport, 
          viewportName, 
          pageConfig.name
        );
        
        pageResult.viewports[viewportName] = viewportResult;
      }

      // Calculate page score
      const viewportScores = Object.values(pageResult.viewports).map(v => v.score);
      pageResult.overallScore = viewportScores.reduce((sum, score) => sum + score, 0) / viewportScores.length;
      
      this.report.results.push(pageResult);
    }

    // Calculate overall score
    const pageScores = this.report.results.map(p => p.overallScore);
    this.report.overallScore = pageScores.reduce((sum, score) => sum + score, 0) / pageScores.length;
  }

  async testPageViewport(url, viewport, viewportName, pageName) {
    const page = await this.browser.newPage();
    
    try {
      // Set viewport
      await page.setViewport(viewport);
      
      // Navigate to page
      await page.goto(url, { 
        waitUntil: 'networkidle0', 
        timeout: CONFIG.timeout 
      });

      // Wait for page to be fully rendered
      await page.waitForTimeout(2000);

      // Take screenshot
      const screenshotPath = path.join(
        CONFIG.screenshotDir, 
        viewportName, 
        `${pageName.toLowerCase().replace(/\s+/g, '-')}.png`
      );
      
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      
      console.log(style.screenshot(`Screenshot: ${screenshotPath}`));
      this.report.summary.totalScreenshots++;

      // Analyze layout issues
      const layoutAnalysis = await this.analyzeLayout(page, viewport);
      
      // Calculate viewport score
      const score = this.calculateViewportScore(layoutAnalysis);

      return {
        viewport: viewport.name,
        screenshot: screenshotPath,
        score: score,
        analysis: layoutAnalysis,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.log(style.error(`Error testing ${url} at ${viewport.name}: ${error.message}`));
      return {
        viewport: viewport.name,
        screenshot: null,
        score: 0,
        analysis: {
          overflowElements: [],
          layoutWarnings: [`Failed to load: ${error.message}`],
          accessibilityIssues: [],
          performanceMetrics: {}
        },
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      await page.close();
    }
  }

  async analyzeLayout(page, viewport) {
    // Check for overflow elements
    const overflowElements = await page.evaluate((selectors, viewportWidth, viewportHeight) => {
      const overflows = [];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          
          // Check for horizontal overflow
          if (rect.right > viewportWidth) {
            overflows.push({
              selector: selector,
              index: index,
              type: 'horizontal',
              actualWidth: rect.width,
              overflow: rect.right - viewportWidth,
              position: { x: rect.left, y: rect.top }
            });
          }
          
          // Check for vertical overflow (only for fixed elements)
          if (computedStyle.position === 'fixed' && rect.bottom > viewportHeight) {
            overflows.push({
              selector: selector,
              index: index,
              type: 'vertical',
              actualHeight: rect.height,
              overflow: rect.bottom - viewportHeight,
              position: { x: rect.left, y: rect.top }
            });
          }
        });
      });
      
      return overflows;
    }, CONFIG.overflowSelectors, viewport.width, viewport.height);

    // Check for layout warnings
    const layoutWarnings = await page.evaluate(() => {
      const warnings = [];
      
      // Check for images without max-width
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        const style = window.getComputedStyle(img);
        if (style.maxWidth === 'none' && style.width !== 'auto') {
          warnings.push(`Image ${index + 1} may not be responsive (no max-width)`);
        }
      });
      
      // Check for fixed width containers
      const containers = document.querySelectorAll('.container, .content, main, article');
      containers.forEach((container, index) => {
        const style = window.getComputedStyle(container);
        if (style.width && style.width.includes('px') && !style.maxWidth) {
          warnings.push(`Container ${index + 1} has fixed width, consider using max-width`);
        }
      });
      
      // Check for horizontal scrollbar
      if (document.body.scrollWidth > window.innerWidth) {
        warnings.push('Page has horizontal scrollbar');
      }
      
      return warnings;
    });

    // Check for accessibility issues
    const accessibilityIssues = await page.evaluate(() => {
      const issues = [];
      
      // Check for missing alt attributes
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        issues.push(`${images.length} images missing alt attributes`);
      }
      
      // Check for missing labels
      const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
      const inputsWithoutLabels = Array.from(inputs).filter(input => {
        const id = input.getAttribute('id');
        return !id || !document.querySelector(`label[for="${id}"]`);
      });
      
      if (inputsWithoutLabels.length > 0) {
        issues.push(`${inputsWithoutLabels.length} form inputs missing labels`);
      }
      
      return issues;
    });

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    // Update report summary
    this.report.summary.overflowIssues += overflowElements.length;
    this.report.summary.layoutWarnings += layoutWarnings.length;

    return {
      overflowElements,
      layoutWarnings,
      accessibilityIssues,
      performanceMetrics
    };
  }

  calculateViewportScore(analysis) {
    let score = 100;
    
    // Deduct points for overflow elements
    score -= analysis.overflowElements.length * 10;
    
    // Deduct points for layout warnings
    score -= analysis.layoutWarnings.length * 5;
    
    // Deduct points for accessibility issues
    score -= analysis.accessibilityIssues.length * 3;
    
    // Ensure score doesn't go below 0
    return Math.max(0, score);
  }

  async generateReports() {
    console.log(style.header('\n📊 Generating Reports...'));

    // Generate JSON report
    const jsonReportPath = path.join(CONFIG.outputDir, 'responsive-report.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.report, null, 2));
    console.log(style.success(`JSON report: ${jsonReportPath}`));

    // Generate HTML report
    const htmlReportPath = path.join(CONFIG.outputDir, 'responsive-report.html');
    const htmlContent = this.generateHTMLReport();
    fs.writeFileSync(htmlReportPath, htmlContent);
    console.log(style.success(`HTML report: ${htmlReportPath}`));

    // Generate summary markdown
    const mdReportPath = path.join(CONFIG.outputDir, 'responsive-summary.md');
    const mdContent = this.generateMarkdownSummary();
    fs.writeFileSync(mdReportPath, mdContent);
    console.log(style.success(`Markdown summary: ${mdReportPath}`));
  }

  generateHTMLReport() {
    const viewportTabs = Object.keys(VIEWPORTS).map(viewport => 
      `<button class="tab-button" onclick="showViewport('${viewport}')">${VIEWPORTS[viewport].name}</button>`
    ).join('');

    const pageResults = this.report.results.map(page => {
      const viewportResults = Object.entries(page.viewports).map(([viewportName, result]) => {
        const screenshotUrl = result.screenshot ? result.screenshot.replace('./audit-report/', '') : '';
        const overflowList = result.analysis.overflowElements.map(overflow => 
          `<li class="overflow-item">${overflow.selector} (${overflow.type} overflow: ${overflow.overflow}px)</li>`
        ).join('');
        const warningsList = result.analysis.layoutWarnings.map(warning => 
          `<li class="warning-item">${warning}</li>`
        ).join('');

        return `
        <div class="viewport-result ${viewportName}" style="display: none;">
          <div class="viewport-header">
            <h4>${VIEWPORTS[viewportName].name}</h4>
            <div class="score-badge score-${this.getScoreClass(result.score)}">${result.score}/100</div>
          </div>
          
          ${result.screenshot ? `
            <div class="screenshot-container">
              <img src="${screenshotUrl}" alt="Screenshot of ${page.name} at ${VIEWPORTS[viewportName].name}" class="screenshot">
            </div>
          ` : '<div class="error-message">Screenshot not available</div>'}
          
          ${result.analysis.overflowElements.length > 0 ? `
            <div class="issue-section">
              <h5>🚨 Overflow Elements</h5>
              <ul class="overflow-list">${overflowList}</ul>
            </div>
          ` : ''}
          
          ${result.analysis.layoutWarnings.length > 0 ? `
            <div class="issue-section">
              <h5>⚠️ Layout Warnings</h5>
              <ul class="warning-list">${warningsList}</ul>
            </div>
          ` : ''}
          
          <div class="metrics-section">
            <h5>📊 Performance Metrics</h5>
            <div class="metrics-grid">
              <div class="metric">
                <span class="metric-label">Load Time</span>
                <span class="metric-value">${(result.analysis.performanceMetrics.loadTime || 0).toFixed(2)}ms</span>
              </div>
              <div class="metric">
                <span class="metric-label">First Paint</span>
                <span class="metric-value">${(result.analysis.performanceMetrics.firstPaint || 0).toFixed(2)}ms</span>
              </div>
            </div>
          </div>
        </div>`;
      }).join('');

      return `
      <div class="page-result">
        <div class="page-header">
          <h3>${page.name}</h3>
          <div class="page-score">
            <span class="score-label">Overall Score:</span>
            <div class="score-badge score-${this.getScoreClass(page.overallScore)}">${page.overallScore.toFixed(1)}/100</div>
          </div>
        </div>
        
        <div class="viewport-tabs">
          ${viewportTabs}
        </div>
        
        <div class="viewport-content">
          ${viewportResults}
        </div>
      </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Responsive Visual Audit Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .summary-number { font-size: 2.5em; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }
        .summary-label { color: #7f8c8d; font-size: 0.9em; }
        
        .page-result { background: white; margin-bottom: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .page-header { background: #34495e; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
        .page-header h3 { font-size: 1.5em; }
        
        .page-score { display: flex; align-items: center; gap: 10px; }
        .score-label { opacity: 0.9; }
        .score-badge { background: #2ecc71; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
        .score-excellent { background: #2ecc71; }
        .score-good { background: #f39c12; }
        .score-warning { background: #e74c3c; }
        
        .viewport-tabs { background: #ecf0f1; padding: 0; display: flex; }
        .tab-button { background: none; border: none; padding: 15px 25px; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s; }
        .tab-button:hover, .tab-button.active { background: white; border-bottom-color: #3498db; }
        
        .viewport-content { padding: 30px; }
        .viewport-result { animation: fadeIn 0.3s; }
        
        .viewport-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .viewport-header h4 { color: #2c3e50; font-size: 1.3em; }
        
        .screenshot-container { margin: 20px 0; text-align: center; }
        .screenshot { max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        
        .issue-section { margin: 20px 0; padding: 20px; background: #fff5f5; border-left: 4px solid #e74c3c; border-radius: 0 8px 8px 0; }
        .issue-section h5 { color: #c0392b; margin-bottom: 10px; }
        .overflow-list, .warning-list { list-style: none; }
        .overflow-item, .warning-item { background: white; margin: 5px 0; padding: 10px; border-radius: 4px; border-left: 3px solid #e74c3c; }
        
        .metrics-section { margin-top: 20px; padding: 20px; background: #f8fffe; border-radius: 8px; }
        .metrics-section h5 { color: #27ae60; margin-bottom: 15px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .metric { text-align: center; }
        .metric-label { display: block; color: #7f8c8d; font-size: 0.9em; margin-bottom: 5px; }
        .metric-value { font-size: 1.3em; font-weight: bold; color: #2c3e50; }
        
        .error-message { background: #fff5f5; color: #e74c3c; padding: 20px; text-align: center; border-radius: 8px; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .header { padding: 20px; }
            .header h1 { font-size: 2em; }
            .viewport-tabs { flex-direction: column; }
            .page-header { flex-direction: column; gap: 10px; text-align: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 Responsive Visual Audit Report</h1>
            <p>Generated on ${new Date(this.report.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="summary-number">${this.report.summary.totalPages}</div>
                <div class="summary-label">Pages Tested</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${this.report.summary.totalViewports}</div>
                <div class="summary-label">Viewports</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${this.report.summary.totalScreenshots}</div>
                <div class="summary-label">Screenshots</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${this.report.overallScore.toFixed(1)}</div>
                <div class="summary-label">Overall Score</div>
            </div>
        </div>
        
        ${pageResults}
    </div>
    
    <script>
        function showViewport(viewportName) {
            // Hide all viewport results
            document.querySelectorAll('.viewport-result').forEach(el => el.style.display = 'none');
            
            // Show selected viewport results
            document.querySelectorAll('.' + viewportName).forEach(el => el.style.display = 'block');
            
            // Update tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
        }
        
        // Show first viewport by default
        document.addEventListener('DOMContentLoaded', function() {
            const firstViewport = Object.keys(${JSON.stringify(VIEWPORTS)})[0];
            const firstButton = document.querySelector('.tab-button');
            if (firstButton) {
                firstButton.click();
            }
        });
    </script>
</body>
</html>`;
  }

  generateMarkdownSummary() {
    const summary = `# 📱 Responsive Visual Audit Summary

**Generated:** ${new Date(this.report.timestamp).toLocaleString()}

## 📊 Overall Results

- **Pages Tested:** ${this.report.summary.totalPages}
- **Viewports:** ${this.report.summary.totalViewports}
- **Screenshots:** ${this.report.summary.totalScreenshots}
- **Overall Score:** ${this.report.overallScore.toFixed(1)}/100
- **Overflow Issues:** ${this.report.summary.overflowIssues}
- **Layout Warnings:** ${this.report.summary.layoutWarnings}

## 📋 Page Scores

${this.report.results.map(page => 
  `- **${page.name}:** ${page.overallScore.toFixed(1)}/100`
).join('\n')}

## 🔍 Issues Summary

${this.report.results.map(page => {
  const issues = Object.values(page.viewports).flatMap(viewport => [
    ...viewport.analysis.overflowElements.map(o => `Overflow: ${o.selector}`),
    ...viewport.analysis.layoutWarnings
  ]);
  
  return issues.length > 0 ? 
    `### ${page.name}\n${issues.map(issue => `- ${issue}`).join('\n')}` : 
    `### ${page.name}\n- No major issues detected`;
}).join('\n\n')}

## 📱 Viewport Testing

Tested across the following viewports:
${Object.values(VIEWPORTS).map(viewport => `- ${viewport.name}`).join('\n')}

## 🎯 Recommendations

1. Fix any overflow elements identified in the report
2. Ensure all images have max-width: 100%
3. Use flexible units (rem, %, vw/vh) instead of fixed pixels
4. Test on real devices to validate responsive behavior
5. Consider using CSS Grid and Flexbox for layouts
6. Implement proper ARIA labels for accessibility

---
*For detailed results with screenshots, see the HTML report: responsive-report.html*
`;
    return summary;
  }

  getScoreClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    return 'warning';
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Check if frontend server is running
async function checkServer() {
  try {
    const response = await fetch(CONFIG.baseUrl);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Run the auditor
if (require.main === module) {
  async function main() {
    // Check if server is running
    console.log(style.info('Checking if frontend server is running...'));
    
    const serverRunning = await checkServer();
    if (!serverRunning) {
      console.log(style.error(`Frontend server not running at ${CONFIG.baseUrl}`));
      console.log(style.info('Please start your frontend server first:'));
      console.log(style.info('  cd my-frontend && npm run dev'));
      process.exit(1);
    }
    
    console.log(style.success('Frontend server is running!'));
    
    const auditor = new ResponsiveAuditor();
    await auditor.run();
  }
  
  main().catch(console.error);
}

module.exports = ResponsiveAuditor;
