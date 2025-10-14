#!/usr/bin/env node

/**
 * Generate Visual Layout Summaries
 * 
 * This script generates visual representations of the layout structure
 * for all roles in JSON, HTML, and SVG formats.
 * 
 * Usage:
 *   node scripts/generateVisualSummary.js
 *   node scripts/generateVisualSummary.js --role=ADMIN
 *   node scripts/generateVisualSummary.js --format=html
 */

const fs = require('fs');
const path = require('path');

// Mock UserRole type for Node.js environment
const ROLES = [
  'SUPER_ADMIN',
  'ADMIN', 
  'MANAGER',
  'STAFF',
  'CFO',
  'FINANCE_CONTROLLER',
  'TREASURY',
  'ACCOUNTS',
  'IT_ADMIN',
  'PROCUREMENT_OFFICER',
  'STORE_INCHARGE',
  'COMPLIANCE',
  'LEGAL',
  'BANKER'
];

/**
 * Generate layout summary data for a given role
 */
function generateSummaryData(role, options = {}) {
  const showHeader = options.showHeader !== false;
  const showSidebar = options.showSidebar !== false;
  const showFooter = options.showFooter !== false;

  const components = [];

  // Header component
  if (showHeader) {
    components.push({
      id: 'base-header',
      name: 'BaseHeader',
      type: 'header',
      position: { x: 0, y: 0, width: '100%', height: 64 },
      visible: true,
      contains: [
        'mobile-menu-toggle',
        'breadcrumb',
        'user-profile',
        'avatar',
        'role-badge',
        'dark-mode-toggle',
        'logout-button'
      ],
      responsive: { mobile: true, tablet: true, desktop: true }
    });
  }

  // Sidebar component
  if (showSidebar) {
    components.push({
      id: 'base-sidebar',
      name: 'BaseSidebar',
      type: 'sidebar',
      position: {
        x: 0,
        y: showHeader ? 64 : 0,
        width: '256px',
        height: 'calc(100vh - 64px)'
      },
      visible: true,
      contains: [
        'navigation-menu',
        'role-based-menu-items',
        'icon-mapping',
        'active-state-highlight',
        'version-display'
      ],
      responsive: { mobile: true, tablet: true, desktop: true }
    });
  }

  // Main content
  components.push({
    id: 'main-content',
    name: 'MainContent',
    type: 'main',
    position: {
      x: showSidebar ? 256 : 0,
      y: showHeader ? 64 : 0,
      width: showSidebar ? 'calc(100% - 256px)' : '100%',
      height: showFooter ? 'calc(100vh - 128px)' : 'calc(100vh - 64px)'
    },
    visible: true,
    contains: ['page-content', 'children'],
    responsive: { mobile: true, tablet: true, desktop: true }
  });

  // Footer component
  if (showFooter) {
    components.push({
      id: 'base-footer',
      name: 'BaseFooter',
      type: 'footer',
      position: {
        x: showSidebar ? 256 : 0,
        y: 0,
        width: showSidebar ? 'calc(100% - 256px)' : '100%',
        height: 64
      },
      visible: true,
      contains: ['copyright', 'legal-links', 'system-status'],
      responsive: { mobile: true, tablet: true, desktop: true }
    });
  }

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    role,
    components,
    breakpoints: {
      mobile: '< 768px',
      tablet: '768px - 1024px',
      desktop: '> 1024px'
    },
    features: [
      'role-based-visibility',
      'responsive-design',
      'dark-mode-support',
      'mobile-optimized',
      'collapsible-sidebar',
      'accessibility-compliant'
    ]
  };
}

/**
 * Generate HTML report
 */
function generateHTML(summary) {
  const colorMap = {
    header: '#ef4444',
    sidebar: '#3b82f6',
    main: '#10b981',
    footer: '#f59e0b'
  };

  const visualComponents = summary.components.map(comp => {
    const widthPercent = typeof comp.position.width === 'string' && comp.position.width.includes('%')
      ? parseFloat(comp.position.width)
      : typeof comp.position.width === 'number'
      ? (comp.position.width / 1200) * 100
      : 100;

    const heightPercent = typeof comp.position.height === 'string' && comp.position.height.includes('%')
      ? parseFloat(comp.position.height)
      : typeof comp.position.height === 'number'
      ? (comp.position.height / 600) * 100
      : 10;

    const xPercent = (comp.position.x / 1200) * 100;
    const yPercent = (comp.position.y / 600) * 100;

    return `
      <div class="component" style="
        left: ${xPercent}%;
        top: ${yPercent}%;
        width: ${widthPercent}%;
        height: ${heightPercent}%;
        border-color: ${colorMap[comp.type] || '#9333ea'};
      ">
        <div class="component-header" style="color: ${colorMap[comp.type] || '#9333ea'};">
          ${comp.name}
        </div>
        <div class="component-details">
          Type: ${comp.type}<br>
          Contains: ${comp.contains.length} items
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Layout Summary - ${summary.role}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; background: #f5f5f5; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #1a1a1a; }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; color: #1a1a1a; }
    .metadata { display: flex; gap: 2rem; margin-bottom: 2rem; padding: 1rem; background: #f9f9f9; border-radius: 4px; flex-wrap: wrap; }
    .metadata-item { display: flex; flex-direction: column; }
    .metadata-label { font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .metadata-value { font-size: 1rem; font-weight: 600; color: #333; margin-top: 0.25rem; }
    .visual-layout { position: relative; width: 100%; height: 600px; border: 2px solid #ddd; border-radius: 8px; margin: 2rem 0; background: white; overflow: hidden; }
    .component { position: absolute; border: 2px solid; border-radius: 4px; padding: 1rem; background: rgba(79, 70, 229, 0.05); transition: all 0.3s ease; cursor: pointer; }
    .component:hover { background: rgba(79, 70, 229, 0.15); transform: scale(1.02); z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .component-header { font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; }
    .component-details { font-size: 0.75rem; color: #666; line-height: 1.5; }
    .components-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-top: 2rem; }
    .component-card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; background: white; }
    .component-card h3 { color: #4f46e5; margin-bottom: 1rem; font-size: 1.125rem; }
    .component-card ul { list-style: none; padding-left: 0; }
    .component-card li { padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; font-size: 0.875rem; }
    .component-card li:last-child { border-bottom: none; }
    .features { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 2rem; }
    .feature-badge { padding: 0.5rem 1rem; background: #4f46e5; color: white; border-radius: 20px; font-size: 0.875rem; font-weight: 500; }
    .breakpoints { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 2rem; }
    .breakpoint-card { padding: 1rem; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
    .breakpoint-card h4 { color: #4f46e5; margin-bottom: 0.5rem; font-size: 1rem; }
    .breakpoint-card p { color: #666; font-size: 0.875rem; }
    .legend { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; }
    .legend-color { width: 20px; height: 20px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Layout Summary for ${summary.role}</h1>
    
    <div class="metadata">
      <div class="metadata-item">
        <span class="metadata-label">Version</span>
        <span class="metadata-value">${summary.version}</span>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">Generated</span>
        <span class="metadata-value">${new Date(summary.timestamp).toLocaleString()}</span>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">Role</span>
        <span class="metadata-value">${summary.role}</span>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">Components</span>
        <span class="metadata-value">${summary.components.length}</span>
      </div>
    </div>

    <h2>Visual Layout Structure</h2>
    <div class="legend">
      <div class="legend-item">
        <div class="legend-color" style="background: #ef4444;"></div>
        <span>Header</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #3b82f6;"></div>
        <span>Sidebar</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #10b981;"></div>
        <span>Main Content</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #f59e0b;"></div>
        <span>Footer</span>
      </div>
    </div>
    <div class="visual-layout">
      ${visualComponents}
    </div>

    <h2>Component Details</h2>
    <div class="components-list">
      ${summary.components.map(comp => `
        <div class="component-card">
          <h3>${comp.name}</h3>
          <ul>
            <li><strong>Type:</strong> ${comp.type}</li>
            <li><strong>Position:</strong> x:${comp.position.x}, y:${comp.position.y}</li>
            <li><strong>Size:</strong> ${comp.position.width} × ${comp.position.height}</li>
            <li><strong>Visible:</strong> ${comp.visible ? '✅' : '❌'}</li>
            <li><strong>Contains:</strong> ${comp.contains.length} elements</li>
            <li><strong>Mobile:</strong> ${comp.responsive?.mobile ? '✅' : '❌'}</li>
            <li><strong>Tablet:</strong> ${comp.responsive?.tablet ? '✅' : '❌'}</li>
            <li><strong>Desktop:</strong> ${comp.responsive?.desktop ? '✅' : '❌'}</li>
          </ul>
        </div>
      `).join('')}
    </div>

    <h2>Responsive Breakpoints</h2>
    <div class="breakpoints">
      <div class="breakpoint-card">
        <h4>📱 Mobile</h4>
        <p>${summary.breakpoints.mobile}</p>
      </div>
      <div class="breakpoint-card">
        <h4>💻 Tablet</h4>
        <p>${summary.breakpoints.tablet}</p>
      </div>
      <div class="breakpoint-card">
        <h4>🖥️ Desktop</h4>
        <p>${summary.breakpoints.desktop}</p>
      </div>
    </div>

    <h2>Features</h2>
    <div class="features">
      ${summary.features.map(feature => `
        <span class="feature-badge">${feature}</span>
      `).join('')}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate SVG diagram
 */
function generateSVG(summary) {
  const width = 1200;
  const height = 800;
  
  const colorMap = {
    header: '#ef4444',
    sidebar: '#3b82f6',
    main: '#10b981',
    footer: '#f59e0b'
  };

  const components = summary.components.map((comp, index) => {
    const color = colorMap[comp.type] || '#9333ea';
    const x = typeof comp.position.x === 'number' ? comp.position.x / 5 + 50 : 50;
    const y = typeof comp.position.y === 'number' ? comp.position.y / 3 + 100 : 100 + index * 150;
    const w = typeof comp.position.width === 'number' ? comp.position.width / 5 : 200;
    const h = typeof comp.position.height === 'number' ? comp.position.height / 3 : 80;

    return `
      <g>
        <rect 
          x="${x}" 
          y="${y}" 
          width="${w}" 
          height="${h}" 
          fill="${color}" 
          stroke="${color}" 
          stroke-width="2"
          fill-opacity="0.1"
        />
        <text x="${x + 10}" y="${y + 25}" fill="${color}" font-size="14" font-weight="bold">
          ${comp.name}
        </text>
        <text x="${x + 10}" y="${y + 45}" fill="#666" font-size="11">
          Type: ${comp.type}
        </text>
        <text x="${x + 10}" y="${y + 60}" fill="#666" font-size="11">
          Contains: ${comp.contains.length} elements
        </text>
      </g>
    `;
  }).join('');

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#f5f5f5"/>
  
  <text x="20" y="30" font-size="24" font-weight="bold" fill="#333">
    Layout Structure - ${summary.role}
  </text>
  
  <text x="20" y="55" font-size="12" fill="#666">
    Generated: ${new Date(summary.timestamp).toLocaleString()}
  </text>

  ${components}

  <!-- Legend -->
  <g transform="translate(20, ${height - 80})">
    <text x="0" y="0" font-size="14" font-weight="bold" fill="#333">Legend:</text>
    <rect x="0" y="10" width="20" height="20" fill="#ef4444" fill-opacity="0.5"/>
    <text x="25" y="25" font-size="12" fill="#333">Header</text>
    
    <rect x="100" y="10" width="20" height="20" fill="#3b82f6" fill-opacity="0.5"/>
    <text x="125" y="25" font-size="12" fill="#333">Sidebar</text>
    
    <rect x="200" y="10" width="20" height="20" fill="#10b981" fill-opacity="0.5"/>
    <text x="225" y="25" font-size="12" fill="#333">Main</text>
    
    <rect x="300" y="10" width="20" height="20" fill="#f59e0b" fill-opacity="0.5"/>
    <text x="325" y="25" font-size="12" fill="#333">Footer</text>
  </g>
</svg>
  `.trim();
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const roleArg = args.find(arg => arg.startsWith('--role='));
  const formatArg = args.find(arg => arg.startsWith('--format='));
  
  const specificRole = roleArg ? roleArg.split('=')[1] : null;
  const specificFormat = formatArg ? formatArg.split('=')[1] : null;
  
  const roles = specificRole ? [specificRole] : ROLES;
  const formats = specificFormat ? [specificFormat] : ['json', 'html', 'svg'];

  console.log('🎨 Generating Visual Layout Summaries\n');

  const outputDir = path.join(process.cwd(), 'layout-exports');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let totalGenerated = 0;

  roles.forEach(role => {
    console.log(`\n📋 Processing role: ${role}`);
    
    const summary = generateSummaryData(role);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const roleSlug = role.toLowerCase().replace(/_/g, '-');

    formats.forEach(format => {
      let content, filename;
      
      switch (format) {
        case 'json':
          content = JSON.stringify(summary, null, 2);
          filename = `layout-${roleSlug}-${timestamp}.json`;
          break;
        case 'html':
          content = generateHTML(summary);
          filename = `layout-${roleSlug}-${timestamp}.html`;
          break;
        case 'svg':
          content = generateSVG(summary);
          filename = `layout-${roleSlug}-${timestamp}.svg`;
          break;
        default:
          console.log(`  ⚠️  Unknown format: ${format}`);
          return;
      }

      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, content);
      console.log(`  ✓ ${format.toUpperCase()} exported: ${filename}`);
      totalGenerated++;
    });
  });

  console.log(`\n✅ Successfully generated ${totalGenerated} files`);
  console.log(`📁 Output directory: ${outputDir}\n`);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  generateSummaryData,
  generateHTML,
  generateSVG
};
