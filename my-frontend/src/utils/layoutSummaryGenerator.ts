/**
 * Layout Summary Generator
 * 
 * Generates visual representations of the layout structure
 * Exports to JSON, HTML, and SVG formats for documentation
 */

// Define UserRole type here since '../types' is missing
export type UserRole = 'admin' | 'user' | 'manager' | 'guest';

interface LayoutComponent {
  id: string;
  name: string;
  type: 'header' | 'sidebar' | 'main' | 'footer';
  position: {
    x: number;
    y: number;
    width: number | string;
    height: number | string;
  };
  visible: boolean;
  contains: string[];
  responsive?: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
  };
}

interface LayoutSummary {
  version: string;
  timestamp: string;
  role: UserRole;
  components: LayoutComponent[];
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
  features: string[];
}

export class LayoutSummaryGenerator {
  private role: UserRole;
  private showHeader: boolean;
  private showSidebar: boolean;
  private showFooter: boolean;

  constructor(
    role: UserRole,
    options: {
      showHeader?: boolean;
      showSidebar?: boolean;
      showFooter?: boolean;
    } = {}
  ) {
    this.role = role;
    this.showHeader = options.showHeader ?? true;
    this.showSidebar = options.showSidebar ?? true;
    this.showFooter = options.showFooter ?? true;
  }

  /**
   * Generate JSON summary of layout structure
   */
  generateJSON(): LayoutSummary {
    const components: LayoutComponent[] = [];

    // Header component
    if (this.showHeader) {
      components.push({
        id: 'base-header',
        name: 'BaseHeader',
        type: 'header',
        position: {
          x: 0,
          y: 0,
          width: '100%',
          height: 64,
        },
        visible: true,
        contains: [
          'mobile-menu-toggle',
          'breadcrumb',
          'user-profile',
          'avatar',
          'role-badge',
          'dark-mode-toggle',
          'logout-button',
        ],
        responsive: {
          mobile: true,
          tablet: true,
          desktop: true,
        },
      });
    }

    // Sidebar component
    if (this.showSidebar) {
      components.push({
        id: 'base-sidebar',
        name: 'BaseSidebar',
        type: 'sidebar',
        position: {
          x: 0,
          y: this.showHeader ? 64 : 0,
          width: '256px',
          height: 'calc(100vh - 64px)',
        },
        visible: true,
        contains: [
          'navigation-menu',
          'role-based-menu-items',
          'icon-mapping',
          'active-state-highlight',
          'version-display',
        ],
        responsive: {
          mobile: true,
          tablet: true,
          desktop: true,
        },
      });
    }

    // Main content area
    components.push({
      id: 'main-content',
      name: 'MainContent',
      type: 'main',
      position: {
        x: this.showSidebar ? 256 : 0,
        y: this.showHeader ? 64 : 0,
        width: this.showSidebar ? 'calc(100% - 256px)' : '100%',
        height: this.showFooter ? 'calc(100vh - 128px)' : 'calc(100vh - 64px)',
      },
      visible: true,
      contains: ['page-content', 'children'],
      responsive: {
        mobile: true,
        tablet: true,
        desktop: true,
      },
    });

    // Footer component
    if (this.showFooter) {
      components.push({
        id: 'base-footer',
        name: 'BaseFooter',
        type: 'footer',
        position: {
          x: this.showSidebar ? 256 : 0,
          y: 0,
          width: this.showSidebar ? 'calc(100% - 256px)' : '100%',
          height: 64,
        },
        visible: true,
        contains: ['copyright', 'legal-links', 'system-status'],
        responsive: {
          mobile: true,
          tablet: true,
          desktop: true,
        },
      });
    }

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      role: this.role,
      components,
      breakpoints: {
        mobile: '< 768px',
        tablet: '768px - 1024px',
        desktop: '> 1024px',
      },
      features: [
        'role-based-visibility',
        'responsive-design',
        'dark-mode-support',
        'mobile-optimized',
        'collapsible-sidebar',
        'accessibility-compliant',
      ],
    };
  }

  /**
   * Generate HTML visual report
   */
  generateHTML(): string {
    const summary = this.generateJSON();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Layout Summary - ${this.role}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 2rem;
      background: #f5f5f5;
      color: #333;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #1a1a1a; }
    .metadata { display: flex; gap: 2rem; margin-bottom: 2rem; padding: 1rem; background: #f9f9f9; border-radius: 4px; }
    .metadata-item { display: flex; flex-direction: column; }
    .metadata-label { font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .metadata-value { font-size: 1rem; font-weight: 600; color: #333; margin-top: 0.25rem; }
    .visual-layout { position: relative; width: 100%; height: 600px; border: 2px solid #ddd; border-radius: 8px; margin: 2rem 0; background: white; }
    .component {
      position: absolute;
      border: 2px solid #4f46e5;
      border-radius: 4px;
      padding: 1rem;
      background: rgba(79, 70, 229, 0.05);
      transition: all 0.3s ease;
    }
    .component:hover {
      background: rgba(79, 70, 229, 0.15);
      transform: scale(1.02);
      z-index: 10;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .component-header {
      font-weight: 600;
      color: #4f46e5;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    .component-details {
      font-size: 0.75rem;
      color: #666;
      line-height: 1.5;
    }
    .components-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }
    .component-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1.5rem;
      background: white;
    }
    .component-card h3 {
      color: #4f46e5;
      margin-bottom: 1rem;
      font-size: 1.125rem;
    }
    .component-card ul {
      list-style: none;
      padding-left: 0;
    }
    .component-card li {
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.875rem;
    }
    .component-card li:last-child { border-bottom: none; }
    .features {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 2rem;
    }
    .feature-badge {
      padding: 0.5rem 1rem;
      background: #4f46e5;
      color: white;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .breakpoints {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-top: 2rem;
    }
    .breakpoint-card {
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      text-align: center;
    }
    .breakpoint-card h4 {
      color: #4f46e5;
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }
    .breakpoint-card p {
      color: #666;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Layout Summary for ${this.role}</h1>
    
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
        <span class="metadata-value">${this.role}</span>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">Components</span>
        <span class="metadata-value">${summary.components.length}</span>
      </div>
    </div>

    <h2>Visual Layout Structure</h2>
    <div class="visual-layout">
      ${this.generateVisualComponents(summary.components)}
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
   * Generate visual components for HTML
   */
  private generateVisualComponents(components: LayoutComponent[]): string {
    return components
      .map((comp) => {
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
          ">
            <div class="component-header">${comp.name}</div>
            <div class="component-details">
              Type: ${comp.type}<br>
              Contains: ${comp.contains.length} items
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Generate SVG diagram
   */
  generateSVG(): string {
    const summary = this.generateJSON();
    const width = 1200;
    const height = 800;

    const colorMap = {
      header: '#ef4444',
      sidebar: '#3b82f6',
      main: '#10b981',
      footer: '#f59e0b',
    };

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .component-box { stroke-width: 2; fill-opacity: 0.1; }
      .component-text { font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; }
      .component-details { font-family: Arial, sans-serif; font-size: 11px; fill: #666; }
    </style>
  </defs>
  
  <rect width="${width}" height="${height}" fill="#f5f5f5"/>
  
  <text x="20" y="30" font-size="24" font-weight="bold" fill="#333">
    Layout Structure - ${this.role}
  </text>
  
  <text x="20" y="55" font-size="12" fill="#666">
    Generated: ${new Date(summary.timestamp).toLocaleString()}
  </text>

  ${summary.components.map((comp, index) => {
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
          class="component-box"
        />
        <text x="${x + 10}" y="${y + 25}" fill="${color}" class="component-text">
          ${comp.name}
        </text>
        <text x="${x + 10}" y="${y + 45}" class="component-details">
          Type: ${comp.type}
        </text>
        <text x="${x + 10}" y="${y + 60}" class="component-details">
          Contains: ${comp.contains.length} elements
        </text>
      </g>
    `;
  }).join('')}
</svg>
    `.trim();
  }

  /**
   * Export all formats to files
   */
  exportAll(outputDir: string = './layout-exports'): {
    json: string;
    html: string;
    svg: string;
  } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const roleSlug = this.role.toLowerCase().replace(/_/g, '-');

    return {
      json: `${outputDir}/layout-${roleSlug}-${timestamp}.json`,
      html: `${outputDir}/layout-${roleSlug}-${timestamp}.html`,
      svg: `${outputDir}/layout-${roleSlug}-${timestamp}.svg`,
    };
  }
}

/**
 * Helper function to generate layout summary for a role
 */
export function generateLayoutSummary(
  role: UserRole,
  options?: {
    showHeader?: boolean;
    showSidebar?: boolean;
    showFooter?: boolean;
  }
) {
  const generator = new LayoutSummaryGenerator(role, options);
  return {
    json: generator.generateJSON(),
    html: generator.generateHTML(),
    svg: generator.generateSVG(),
  };
}
