#!/usr/bin/env node

/**
 * 📱 Static Responsive Layout Analysis
 * Analyzes CSS and HTML files for responsive design issues without browser automation
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

class StaticResponsiveAuditor {
  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: 0,
        cssFiles: 0,
        htmlFiles: 0,
        reactFiles: 0,
        responsiveScore: 0,
        issues: 0,
        recommendations: 0
      },
      results: {
        css: [],
        html: [],
        react: []
      },
      issues: [],
      recommendations: []
    };
  }

  async run() {
    console.log(style.header('📱 Static Responsive Layout Analysis'));
    console.log(style.info('Analyzing files for responsive design patterns...\n'));

    try {
      // Analyze CSS files
      await this.analyzeCSSFiles();
      
      // Analyze HTML files
      await this.analyzeHTMLFiles();
      
      // Analyze React components
      await this.analyzeReactFiles();
      
      // Calculate scores and generate recommendations
      this.generateRecommendations();
      
      // Generate reports
      this.generateReports();
      
      console.log(style.success(`\\nAnalysis complete! Analyzed ${this.report.summary.totalFiles} files.`));
      console.log(style.info(`Responsive Score: ${this.report.summary.responsiveScore}/100`));
      console.log(style.info(`Reports saved to: audit-report/static-responsive-report.html`));
      
    } catch (error) {
      console.log(style.error(`Analysis failed: ${error.message}`));
      process.exit(1);
    }
  }

  async analyzeCSSFiles() {
    console.log(style.header('🎨 Analyzing CSS Files'));
    
    const cssFiles = glob.sync('**/*.{css,scss}', { 
      ignore: ['node_modules/**', 'dist/**', 'build/**', '.next/**'] 
    });

    for (const file of cssFiles) {
      const analysis = await this.analyzeCSSFile(file);
      this.report.results.css.push(analysis);
      this.report.summary.cssFiles++;
    }
  }

  async analyzeCSSFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const analysis = {
        file: filePath,
        size: content.length,
        score: 0,
        issues: [],
        positives: []
      };

      // Check for responsive patterns
      const patterns = {
        mediaQueries: /@media\s*\([^)]*\)/g,
        flexbox: /(display\s*:\s*flex|flex-direction|flex-wrap|justify-content|align-items)/g,
        grid: /(display\s*:\s*grid|grid-template|grid-area|grid-gap)/g,
        responsiveUnits: /(rem|em|vh|vw|%|\d+fr)/g,
        maxWidth: /max-width\s*:/g,
        minWidth: /min-width\s*:/g,
        fluidImages: /(max-width\s*:\s*100%|width\s*:\s*100%)/g,
        fixedWidths: /width\s*:\s*\d+px/g,
        fixedHeights: /height\s*:\s*\d+px/g,
        overflowHidden: /overflow(-x)?\s*:\s*hidden/g
      };

      // Count positive patterns
      const mediaQueries = (content.match(patterns.mediaQueries) || []).length;
      const flexboxUsage = (content.match(patterns.flexbox) || []).length;
      const gridUsage = (content.match(patterns.grid) || []).length;
      const responsiveUnits = (content.match(patterns.responsiveUnits) || []).length;
      const maxWidthUsage = (content.match(patterns.maxWidth) || []).length;
      const fluidImages = (content.match(patterns.fluidImages) || []).length;

      // Count potential issues
      const fixedWidths = (content.match(patterns.fixedWidths) || []).length;
      const fixedHeights = (content.match(patterns.fixedHeights) || []).length;
      const overflowHidden = (content.match(patterns.overflowHidden) || []).length;

      // Score calculation
      let score = 0;
      
      if (mediaQueries > 0) {
        score += 20;
        analysis.positives.push(`${mediaQueries} media queries found`);
      } else {
        analysis.issues.push('No media queries found');
      }

      if (flexboxUsage > 0) {
        score += 15;
        analysis.positives.push(`Flexbox used (${flexboxUsage} instances)`);
      }

      if (gridUsage > 0) {
        score += 15;
        analysis.positives.push(`CSS Grid used (${gridUsage} instances)`);
      }

      if (responsiveUnits > 5) {
        score += 20;
        analysis.positives.push(`Good use of responsive units (${responsiveUnits} instances)`);
      } else if (responsiveUnits > 0) {
        score += 10;
        analysis.positives.push(`Some responsive units used (${responsiveUnits} instances)`);
      } else {
        analysis.issues.push('No responsive units (rem, em, %, vw, vh) found');
      }

      if (maxWidthUsage > 0) {
        score += 10;
        analysis.positives.push(`Max-width constraints used (${maxWidthUsage} instances)`);
      }

      if (fluidImages > 0) {
        score += 10;
        analysis.positives.push(`Fluid image styles found (${fluidImages} instances)`);
      }

      // Deduct points for issues
      if (fixedWidths > 5) {
        score -= 10;
        analysis.issues.push(`Many fixed widths found (${fixedWidths} instances)`);
      }

      if (fixedHeights > 3) {
        score -= 5;
        analysis.issues.push(`Fixed heights found (${fixedHeights} instances)`);
      }

      if (overflowHidden > 2) {
        score -= 5;
        analysis.issues.push(`Multiple overflow:hidden declarations (${overflowHidden} instances)`);
      }

      // Check for common responsive breakpoints
      const commonBreakpoints = [
        '768px', '992px', '1024px', '1200px', '1440px',
        '48em', '62em', '75em', '90em'
      ];
      
      const foundBreakpoints = commonBreakpoints.filter(bp => content.includes(bp));
      if (foundBreakpoints.length > 0) {
        score += 10;
        analysis.positives.push(`Standard breakpoints used: ${foundBreakpoints.join(', ')}`);
      }

      analysis.score = Math.min(100, Math.max(0, score));
      
      console.log(style.info(`${filePath}: ${analysis.score}/100 (${analysis.issues.length} issues)`));
      
      return analysis;

    } catch (error) {
      console.log(style.error(`Error analyzing ${filePath}: ${error.message}`));
      return {
        file: filePath,
        score: 0,
        issues: [`Error reading file: ${error.message}`],
        positives: []
      };
    }
  }

  async analyzeHTMLFiles() {
    console.log(style.header('🌐 Analyzing HTML Files'));
    
    const htmlFiles = glob.sync('**/*.html', { 
      ignore: ['node_modules/**', 'dist/**', 'build/**', '.next/**'] 
    });

    for (const file of htmlFiles) {
      const analysis = await this.analyzeHTMLFile(file);
      this.report.results.html.push(analysis);
      this.report.summary.htmlFiles++;
    }
  }

  async analyzeHTMLFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const analysis = {
        file: filePath,
        score: 0,
        issues: [],
        positives: []
      };

      let score = 0;

      // Check for proper viewport meta tag
      const viewportRegex = /<meta\s+name=["']viewport["']\s+content=["'][^"']*["']\s*\/?>/i;
      if (viewportRegex.test(content)) {
        score += 30;
        analysis.positives.push('Proper viewport meta tag found');
        
        // Check for problematic viewport settings
        if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) {
          score -= 10;
          analysis.issues.push('Viewport prevents user scaling (accessibility issue)');
        }
      } else {
        analysis.issues.push('Missing or improper viewport meta tag');
      }

      // Check for responsive images
      const imgTags = content.match(/<img[^>]*>/gi) || [];
      let responsiveImages = 0;
      
      imgTags.forEach(img => {
        if (img.includes('srcset') || img.includes('sizes')) {
          responsiveImages++;
        }
      });

      if (imgTags.length > 0) {
        const responsiveRatio = responsiveImages / imgTags.length;
        if (responsiveRatio > 0.8) {
          score += 20;
          analysis.positives.push(`Most images are responsive (${responsiveImages}/${imgTags.length})`);
        } else if (responsiveRatio > 0.5) {
          score += 10;
          analysis.positives.push(`Some images are responsive (${responsiveImages}/${imgTags.length})`);
        } else {
          analysis.issues.push(`Few responsive images (${responsiveImages}/${imgTags.length})`);
        }
      }

      // Check for semantic HTML
      const semanticTags = ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer'];
      const foundSemantic = semanticTags.filter(tag => content.includes(`<${tag}`));
      
      if (foundSemantic.length >= 3) {
        score += 15;
        analysis.positives.push(`Good semantic HTML structure: ${foundSemantic.join(', ')}`);
      } else if (foundSemantic.length > 0) {
        score += 5;
        analysis.positives.push(`Some semantic HTML: ${foundSemantic.join(', ')}`);
      } else {
        analysis.issues.push('No semantic HTML5 elements found');
      }

      // Check for accessibility attributes
      const accessibilityPatterns = [
        /alt=["'][^"']*["']/g,
        /aria-label=["'][^"']*["']/g,
        /aria-labelledby=["'][^"']*["']/g,
        /role=["'][^"']*["']/g
      ];

      let accessibilityScore = 0;
      accessibilityPatterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        accessibilityScore += matches.length;
      });

      if (accessibilityScore > 5) {
        score += 10;
        analysis.positives.push(`Good accessibility attributes (${accessibilityScore} found)`);
      } else if (accessibilityScore > 0) {
        score += 5;
        analysis.positives.push(`Some accessibility attributes (${accessibilityScore} found)`);
      } else {
        analysis.issues.push('No accessibility attributes found');
      }

      // Check for responsive CSS framework usage
      const frameworks = [
        { name: 'Bootstrap', pattern: /bootstrap/i },
        { name: 'Tailwind', pattern: /tailwind/i },
        { name: 'Foundation', pattern: /foundation/i },
        { name: 'Bulma', pattern: /bulma/i }
      ];

      const foundFrameworks = frameworks.filter(fw => fw.pattern.test(content));
      if (foundFrameworks.length > 0) {
        score += 15;
        analysis.positives.push(`Responsive framework detected: ${foundFrameworks.map(f => f.name).join(', ')}`);
      }

      analysis.score = Math.min(100, Math.max(0, score));
      
      console.log(style.info(`${filePath}: ${analysis.score}/100 (${analysis.issues.length} issues)`));
      
      return analysis;

    } catch (error) {
      console.log(style.error(`Error analyzing ${filePath}: ${error.message}`));
      return {
        file: filePath,
        score: 0,
        issues: [`Error reading file: ${error.message}`],
        positives: []
      };
    }
  }

  async analyzeReactFiles() {
    console.log(style.header('⚛️  Analyzing React Components'));
    
    const reactFiles = glob.sync('**/*.{tsx,jsx}', { 
      ignore: ['node_modules/**', 'dist/**', 'build/**', '.next/**'] 
    });

    for (const file of reactFiles) {
      const analysis = await this.analyzeReactFile(file);
      this.report.results.react.push(analysis);
      this.report.summary.reactFiles++;
    }
  }

  async analyzeReactFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const analysis = {
        file: filePath,
        score: 0,
        issues: [],
        positives: []
      };

      let score = 0;

      // Check for responsive className patterns
      const responsiveClasses = [
        'w-full', 'max-w-', 'min-w-', 'h-auto', 'max-h-',
        'flex', 'grid', 'responsive', 'mobile', 'tablet', 'desktop',
        'sm:', 'md:', 'lg:', 'xl:', '2xl:', // Tailwind breakpoints
        'col-', 'row-', 'container', 'fluid'
      ];

      let responsiveClassCount = 0;
      responsiveClasses.forEach(className => {
        const matches = content.match(new RegExp(className, 'g')) || [];
        responsiveClassCount += matches.length;
      });

      if (responsiveClassCount > 10) {
        score += 25;
        analysis.positives.push(`Many responsive classes used (${responsiveClassCount} instances)`);
      } else if (responsiveClassCount > 5) {
        score += 15;
        analysis.positives.push(`Some responsive classes used (${responsiveClassCount} instances)`);
      } else {
        analysis.issues.push('Few responsive CSS classes found');
      }

      // Check for conditional rendering based on screen size
      const conditionalPatterns = [
        /useMediaQuery/g,
        /window\.innerWidth/g,
        /window\.matchMedia/g,
        /breakpoint/gi,
        /isMobile|isTablet|isDesktop/gi
      ];

      let conditionalCount = 0;
      conditionalPatterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        conditionalCount += matches.length;
      });

      if (conditionalCount > 0) {
        score += 20;
        analysis.positives.push(`Responsive JavaScript logic found (${conditionalCount} instances)`);
      }

      // Check for proper image handling
      const imagePatterns = [
        /<img[^>]*>/gi,
        /<Image[^>]*>/gi, // Next.js Image component
        /srcSet/gi,
        /sizes=/gi
      ];

      let imageScore = 0;
      imagePatterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        imageScore += matches.length;
      });

      if (imageScore > 0) {
        score += 15;
        analysis.positives.push(`Image components found (${imageScore} instances)`);
      }

      // Check for CSS-in-JS responsive patterns
      const cssInJsPatterns = [
        /styled\\..*`[^`]*@media[^`]*`/g,
        /css`[^`]*@media[^`]*`/g,
        /theme\\.breakpoints/g,
        /\$\{.*media/g
      ];

      let cssInJsCount = 0;
      cssInJsPatterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        cssInJsCount += matches.length;
      });

      if (cssInJsCount > 0) {
        score += 15;
        analysis.positives.push(`CSS-in-JS responsive patterns found (${cssInJsCount} instances)`);
      }

      // Check for accessibility in React
      const a11yPatterns = [
        /aria-[a-z]+/g,
        /role=/g,
        /tabIndex/g,
        /alt=/g
      ];

      let a11yCount = 0;
      a11yPatterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        a11yCount += matches.length;
      });

      if (a11yCount > 3) {
        score += 10;
        analysis.positives.push(`Good accessibility attributes (${a11yCount} found)`);
      } else if (a11yCount > 0) {
        score += 5;
        analysis.positives.push(`Some accessibility attributes (${a11yCount} found)`);
      }

      // Check for potential issues
      const issuePatterns = [
        { pattern: /style=\{\{[^}]*width\s*:\s*['"]?\d+px['"]?[^}]*\}\}/g, message: 'Fixed width in inline styles' },
        { pattern: /style=\{\{[^}]*height\s*:\s*['"]?\d+px['"]?[^}]*\}\}/g, message: 'Fixed height in inline styles' }
      ];

      issuePatterns.forEach(({ pattern, message }) => {
        const matches = content.match(pattern) || [];
        if (matches.length > 0) {
          score -= 5;
          analysis.issues.push(`${message} (${matches.length} instances)`);
        }
      });

      analysis.score = Math.min(100, Math.max(0, score));
      
      console.log(style.info(`${filePath}: ${analysis.score}/100 (${analysis.issues.length} issues)`));
      
      return analysis;

    } catch (error) {
      console.log(style.error(`Error analyzing ${filePath}: ${error.message}`));
      return {
        file: filePath,
        score: 0,
        issues: [`Error reading file: ${error.message}`],
        positives: []
      };
    }
  }

  generateRecommendations() {
    console.log(style.header('\\n📋 Generating Recommendations'));

    // Calculate overall scores
    const allResults = [
      ...this.report.results.css,
      ...this.report.results.html,
      ...this.report.results.react
    ];

    this.report.summary.totalFiles = allResults.length;
    
    if (allResults.length > 0) {
      this.report.summary.responsiveScore = Math.round(
        allResults.reduce((sum, result) => sum + result.score, 0) / allResults.length
      );
    }

    // Collect all issues
    const allIssues = allResults.flatMap(result => result.issues);
    this.report.summary.issues = allIssues.length;

    // Generate recommendations based on common issues
    const recommendations = [
      'Use CSS Grid and Flexbox for modern responsive layouts',
      'Implement proper viewport meta tags in all HTML files',
      'Use responsive units (rem, em, %, vw, vh) instead of fixed pixels',
      'Add media queries for different screen sizes',
      'Implement responsive images with srcset and sizes attributes',
      'Use max-width: 100% for images to prevent overflow',
      'Consider using a CSS framework like Tailwind or Bootstrap',
      'Test your layouts on multiple device sizes',
      'Implement proper semantic HTML structure',
      'Add accessibility attributes (alt, aria-label, role)',
      'Use CSS custom properties for consistent theming',
      'Implement progressive enhancement principles'
    ];

    // Add specific recommendations based on analysis
    if (this.report.results.css.some(result => result.issues.includes('No media queries found'))) {
      recommendations.unshift('🚨 Critical: Add media queries for responsive design');
    }

    if (this.report.results.html.some(result => result.issues.includes('Missing or improper viewport meta tag'))) {
      recommendations.unshift('🚨 Critical: Add proper viewport meta tags');
    }

    this.report.recommendations = recommendations.slice(0, 10); // Top 10 recommendations
    this.report.summary.recommendations = this.report.recommendations.length;

    console.log(style.success(`Generated ${this.report.recommendations.length} recommendations`));
  }

  generateReports() {
    console.log(style.header('\\n📊 Generating Reports'));

    // Ensure output directory exists
    if (!fs.existsSync('./audit-report')) {
      fs.mkdirSync('./audit-report', { recursive: true });
    }

    // Generate JSON report
    const jsonPath = './audit-report/static-responsive-report.json';
    fs.writeFileSync(jsonPath, JSON.stringify(this.report, null, 2));

    // Generate HTML report
    const htmlPath = './audit-report/static-responsive-report.html';
    const htmlContent = this.generateHTMLReport();
    fs.writeFileSync(htmlPath, htmlContent);

    console.log(style.success(`JSON report: ${jsonPath}`));
    console.log(style.success(`HTML report: ${htmlPath}`));
  }

  generateHTMLReport() {
    const { summary, results, recommendations } = this.report;
    
    const scoreColor = (score) => {
      if (score >= 80) return '#2ecc71';
      if (score >= 60) return '#f39c12';
      return '#e74c3c';
    };

    const fileResults = (fileType, fileResults) => {
      if (fileResults.length === 0) return '<p>No files found.</p>';
      
      return fileResults.map(result => `
        <div class="file-result">
          <div class="file-header">
            <h4>${result.file}</h4>
            <div class="score-badge" style="background: ${scoreColor(result.score)}">${result.score}/100</div>
          </div>
          
          ${result.positives.length > 0 ? `
            <div class="positives">
              <h5>✅ Strengths</h5>
              <ul>${result.positives.map(positive => `<li>${positive}</li>`).join('')}</ul>
            </div>
          ` : ''}
          
          ${result.issues.length > 0 ? `
            <div class="issues">
              <h5>⚠️ Issues</h5>
              <ul>${result.issues.map(issue => `<li>${issue}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>
      `).join('');
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Static Responsive Layout Analysis Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .summary-number { font-size: 2.5em; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }
        .summary-label { color: #7f8c8d; font-size: 0.9em; }
        
        .section { background: white; margin-bottom: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .section-header { background: #34495e; color: white; padding: 20px; }
        .section-content { padding: 30px; }
        
        .file-result { border: 1px solid #ecf0f1; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
        .file-header { background: #f8f9fa; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .file-header h4 { color: #2c3e50; font-size: 1.1em; }
        .score-badge { color: white; padding: 5px 12px; border-radius: 15px; font-weight: bold; font-size: 0.9em; }
        
        .positives, .issues { padding: 15px; }
        .positives { background: #d4edda; border-left: 4px solid #28a745; }
        .issues { background: #fff3cd; border-left: 4px solid #ffc107; }
        .positives h5 { color: #155724; margin-bottom: 10px; }
        .issues h5 { color: #856404; margin-bottom: 10px; }
        .positives ul, .issues ul { list-style-position: inside; }
        .positives li, .issues li { margin: 5px 0; }
        
        .recommendations { background: #e7f3ff; border: 1px solid #b8daff; padding: 20px; border-radius: 8px; }
        .recommendations h3 { color: #004085; margin-bottom: 15px; }
        .recommendations ul { list-style-position: inside; }
        .recommendations li { margin: 8px 0; color: #004085; }
        
        .tabs { display: flex; background: #ecf0f1; }
        .tab-button { background: none; border: none; padding: 15px 25px; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s; }
        .tab-button:hover, .tab-button.active { background: white; border-bottom-color: #3498db; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .header { padding: 20px; }
            .header h1 { font-size: 2em; }
            .summary { grid-template-columns: 1fr; }
            .file-header { flex-direction: column; gap: 10px; text-align: center; }
            .tabs { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 Static Responsive Layout Analysis</h1>
            <p>Generated on ${new Date(this.report.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="summary-number">${summary.totalFiles}</div>
                <div class="summary-label">Total Files</div>
            </div>
            <div class="summary-card">
                <div class="summary-number" style="color: ${scoreColor(summary.responsiveScore)}">${summary.responsiveScore}</div>
                <div class="summary-label">Responsive Score</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${summary.issues}</div>
                <div class="summary-label">Issues Found</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${summary.recommendations}</div>
                <div class="summary-label">Recommendations</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2>📊 File Analysis Results</h2>
            </div>
            <div class="section-content">
                <div class="tabs">
                    <button class="tab-button active" onclick="showTab('css')">CSS Files (${summary.cssFiles})</button>
                    <button class="tab-button" onclick="showTab('html')">HTML Files (${summary.htmlFiles})</button>
                    <button class="tab-button" onclick="showTab('react')">React Files (${summary.reactFiles})</button>
                </div>
                
                <div id="css" class="tab-content active">
                    ${fileResults('CSS', results.css)}
                </div>
                
                <div id="html" class="tab-content">
                    ${fileResults('HTML', results.html)}
                </div>
                
                <div id="react" class="tab-content">
                    ${fileResults('React', results.react)}
                </div>
            </div>
        </div>
        
        <div class="recommendations">
            <h3>🎯 Recommendations</h3>
            <ul>
                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
    
    <script>
        function showTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all buttons
            document.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('active');
            });
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked button
            event.target.classList.add('active');
        }
    </script>
</body>
</html>`;
  }
}

// Run the analyzer
if (require.main === module) {
  const analyzer = new StaticResponsiveAuditor();
  analyzer.run().catch(console.error);
}

module.exports = StaticResponsiveAuditor;
