/**
 * Layout Version Update Script
 * 
 * Automatically updates layoutVersion.json when layout components change.
 * Generates hash based on component contents and increments version.
 * 
 * Usage:
 *   node scripts/updateLayoutVersion.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class LayoutVersionManager {
  constructor() {
    this.versionFilePath = path.join(process.cwd(), 'layoutVersion.json');
    this.componentsDir = path.join(process.cwd(), 'src', 'components', 'layout');
  }

  /**
   * Calculate hash of all layout components
   */
  calculateLayoutHash() {
    const componentFiles = [
      'BaseLayout.tsx',
      'BaseHeader.tsx',
      'BaseSidebar.tsx',
      'BaseFooter.tsx',
    ];

    const contents = componentFiles.map((file) => {
      const filePath = path.join(this.componentsDir, file);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      return '';
    }).join('');

    return crypto.createHash('md5').update(contents).digest('hex').substring(0, 12);
  }

  /**
   * Increment version number
   */
  incrementVersion(currentVersion) {
    const parts = currentVersion.split('.');
    const patch = parseInt(parts[2], 10) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  /**
   * Update version file
   */
  updateVersion() {
    console.log('🔄 Updating layout version...\n');

    // Read current version
    let versionData = {};
    if (fs.existsSync(this.versionFilePath)) {
      versionData = JSON.parse(fs.readFileSync(this.versionFilePath, 'utf-8'));
    }

    // Calculate new hash
    const newHash = this.calculateLayoutHash();
    const currentHash = versionData.hash || '';

    if (newHash === currentHash) {
      console.log('✅ No changes detected. Version remains: ' + versionData.version);
      return;
    }

    // Increment version
    const currentVersion = versionData.version || '1.0.0';
    const newVersion = this.incrementVersion(currentVersion);

    // Update component timestamps
    const components = versionData.components || {};
    const componentFiles = ['BaseLayout', 'BaseHeader', 'BaseSidebar', 'BaseFooter'];

    componentFiles.forEach((name) => {
      const filePath = path.join(this.componentsDir, `${name}.tsx`);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        components[name] = {
          version: newVersion,
          path: `src/components/layout/${name}.tsx`,
          lastModified: stats.mtime.toISOString(),
        };
      }
    });

    // Update version data
    const updatedData = {
      ...versionData,
      version: newVersion,
      lastUpdated: new Date().toISOString(),
      hash: newHash,
      components,
    };

    // Add changelog entry
    const changelogEntry = {
      version: newVersion,
      date: new Date().toISOString().split('T')[0],
      changes: ['Layout components updated', `Hash: ${newHash}`],
    };

    updatedData.changelog = updatedData.changelog || [];
    updatedData.changelog.unshift(changelogEntry);

    // Keep only last 10 changelog entries
    if (updatedData.changelog.length > 10) {
      updatedData.changelog = updatedData.changelog.slice(0, 10);
    }

    // Write updated version
    fs.writeFileSync(this.versionFilePath, JSON.stringify(updatedData, null, 2));

    console.log(`✅ Version updated: ${currentVersion} → ${newVersion}`);
    console.log(`📝 Hash: ${newHash}`);
    console.log(`📅 Last updated: ${updatedData.lastUpdated}\n`);

    // Notify dependent modules
    this.notifyDependents(newVersion);
  }

  /**
   * Notify dependent modules of layout update
   */
  notifyDependents(newVersion) {
    console.log('📢 Notifying dependent modules...');

    // Create notification file
    const notificationPath = path.join(process.cwd(), '.layout-update-notification');
    fs.writeFileSync(
      notificationPath,
      JSON.stringify({
        version: newVersion,
        timestamp: new Date().toISOString(),
        message: 'Layout structure has been updated. Please review your pages.',
      })
    );

    console.log(`✅ Notification created: ${notificationPath}\n`);
  }

  /**
   * Generate visual summary
   */
  generateVisualSummary() {
    console.log('🎨 Generating visual layout summary...\n');

    const versionData = JSON.parse(fs.readFileSync(this.versionFilePath, 'utf-8'));

    const summary = {
      metadata: {
        version: versionData.version,
        lastUpdated: versionData.lastUpdated,
        hash: versionData.hash,
      },
      structure: {
        header: {
          component: 'BaseHeader',
          position: 'top',
          height: 'auto',
          contains: ['logo', 'user-profile', 'dark-mode-toggle', 'logout-button'],
          responsive: true,
        },
        sidebar: {
          component: 'BaseSidebar',
          position: 'left',
          width: { collapsed: '80px', expanded: '256px' },
          contains: ['navigation-menu', 'role-badge'],
          responsive: true,
          collapsible: true,
        },
        mainContent: {
          component: 'main',
          position: 'center',
          flexGrow: 1,
          contains: ['page-content'],
          responsive: true,
        },
        footer: {
          component: 'BaseFooter',
          position: 'bottom',
          height: 'auto',
          contains: ['copyright', 'links', 'system-status'],
          responsive: true,
        },
      },
      roleConfigurations: Object.keys(require('../src/config/roleLayoutConfig').roleLayoutConfig),
      features: versionData.features || [],
    };

    const summaryPath = path.join(process.cwd(), 'layout-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`✅ Visual summary exported: ${summaryPath}\n`);

    return summary;
  }
}

// CLI execution
if (require.main === module) {
  const manager = new LayoutVersionManager();
  manager.updateVersion();
  manager.generateVisualSummary();
}

module.exports = LayoutVersionManager;
