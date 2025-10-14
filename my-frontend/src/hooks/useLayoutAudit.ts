'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

// Severity levels for audit findings
type AuditSeverity = 'error' | 'warning' | 'info';

// Audit finding interface
interface AuditFinding {
  category: string;
  check: string;
  status: 'pass' | 'fail';
  severity: AuditSeverity;
  message: string;
  element?: HTMLElement | null;
  details?: Record<string, any>;
}

// Audit result interface
interface AuditResult {
  timestamp: string;
  totalChecks: number;
  passed: number;
  failed: number;
  errors: AuditFinding[];
  warnings: AuditFinding[];
  infos: AuditFinding[];
  findings: AuditFinding[];
  summary: string;
}

// Audit options
interface AuditOptions {
  skipCategories?: string[];
  verbose?: boolean;
  autoFix?: boolean;
}

/**
 * Comprehensive Layout Audit Hook
 * 
 * Performs 8 categories of comprehensive testing:
 * 1. Component Structure & Presence
 * 2. Responsiveness & Mobile Compatibility
 * 3. Positioning & Overlaps
 * 4. Spacing & Consistency
 * 5. Role-Based Visibility & Access
 * 6. Performance & Load
 * 7. Interactivity & Functionality
 * 8. Audit Reporting
 * 
 * @param options - Audit configuration options
 * @returns Audit result object and control methods
 */
export function useLayoutAudit(options: AuditOptions = {}) {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const { user } = useAuth();
  const auditRef = useRef<AuditResult | null>(null);

  /**
   * Category 1: Component Structure & Presence
   * Checks for duplicate components, missing sections, proper hierarchy
   */
  const auditComponentStructure = useCallback((): AuditFinding[] => {
    const findings: AuditFinding[] = [];

    // Check for duplicate headers
    const headers = document.querySelectorAll('header, [role="banner"]');
    if (headers.length > 1) {
      findings.push({
        category: 'Component Structure',
        check: 'Duplicate Headers',
        status: 'fail',
        severity: 'error',
        message: `Found ${headers.length} header elements. Should have only one.`,
        details: { count: headers.length },
      });
    } else if (headers.length === 1) {
      findings.push({
        category: 'Component Structure',
        check: 'Header Presence',
        status: 'pass',
        severity: 'info',
        message: 'Header component found.',
      });
    } else {
      findings.push({
        category: 'Component Structure',
        check: 'Header Presence',
        status: 'fail',
        severity: 'warning',
        message: 'No header element found.',
      });
    }

    // Check for duplicate sidebars
    const sidebars = document.querySelectorAll('aside, nav[role="navigation"]');
    if (sidebars.length > 1) {
      findings.push({
        category: 'Component Structure',
        check: 'Duplicate Sidebars',
        status: 'fail',
        severity: 'warning',
        message: `Found ${sidebars.length} sidebar elements. Consider consolidating.`,
        details: { count: sidebars.length },
      });
    }

    // Check for duplicate footers
    const footers = document.querySelectorAll('footer, [role="contentinfo"]');
    if (footers.length > 1) {
      findings.push({
        category: 'Component Structure',
        check: 'Duplicate Footers',
        status: 'fail',
        severity: 'error',
        message: `Found ${footers.length} footer elements. Should have only one.`,
        details: { count: footers.length },
      });
    }

    // Check for main content area
    const mainContent = document.querySelector('main, [role="main"]');
    if (!mainContent) {
      findings.push({
        category: 'Component Structure',
        check: 'Main Content Area',
        status: 'fail',
        severity: 'error',
        message: 'No main content area found. Add <main> or role="main".',
      });
    } else {
      findings.push({
        category: 'Component Structure',
        check: 'Main Content Area',
        status: 'pass',
        severity: 'info',
        message: 'Main content area found.',
      });
    }

    // Check for proper heading hierarchy (h1 -> h2 -> h3)
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let previousLevel = 0;
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName[1]);
      if (level - previousLevel > 1) {
        findings.push({
          category: 'Component Structure',
          check: 'Heading Hierarchy',
          status: 'fail',
          severity: 'warning',
          message: `Heading level skip detected: ${heading.tagName} after h${previousLevel}`,
          element: heading as HTMLElement,
        });
      }
      previousLevel = level;
    });

    // Check for empty sections
    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
      if (section.children.length === 0 && !section.textContent?.trim()) {
        findings.push({
          category: 'Component Structure',
          check: 'Empty Sections',
          status: 'fail',
          severity: 'warning',
          message: `Empty section found at index ${index}`,
          element: section as HTMLElement,
        });
      }
    });

    return findings;
  }, []);

  /**
   * Category 2: Responsiveness & Mobile Compatibility
   * Checks for overflow, scaling issues, mobile-friendly design
   */
  const auditResponsiveness = useCallback((): AuditFinding[] => {
    const findings: AuditFinding[] = [];

    // Check for horizontal overflow
    const body = document.body;
    if (body.scrollWidth > body.clientWidth) {
      findings.push({
        category: 'Responsiveness',
        check: 'Horizontal Overflow',
        status: 'fail',
        severity: 'error',
        message: `Page has horizontal overflow (${body.scrollWidth}px > ${body.clientWidth}px)`,
        details: { scrollWidth: body.scrollWidth, clientWidth: body.clientWidth },
      });
    } else {
      findings.push({
        category: 'Responsiveness',
        check: 'Horizontal Overflow',
        status: 'pass',
        severity: 'info',
        message: 'No horizontal overflow detected.',
      });
    }

    // Check for viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      findings.push({
        category: 'Responsiveness',
        check: 'Viewport Meta Tag',
        status: 'fail',
        severity: 'error',
        message: 'Missing viewport meta tag for mobile compatibility.',
      });
    } else {
      findings.push({
        category: 'Responsiveness',
        check: 'Viewport Meta Tag',
        status: 'pass',
        severity: 'info',
        message: 'Viewport meta tag present.',
      });
    }

    // Check for fixed widths that might break mobile
    const elementsWithFixedWidth = Array.from(document.querySelectorAll('*')).filter((el) => {
      const styles = window.getComputedStyle(el);
      const width = styles.width;
      return width && /^\d+px$/.test(width) && parseInt(width) > 768;
    });

    if (elementsWithFixedWidth.length > 0) {
      findings.push({
        category: 'Responsiveness',
        check: 'Fixed Width Elements',
        status: 'fail',
        severity: 'warning',
        message: `Found ${elementsWithFixedWidth.length} elements with fixed widths > 768px`,
        details: { count: elementsWithFixedWidth.length },
      });
    }

    // Check for mobile menu implementation
    const mobileMenuButton = document.querySelector('[aria-label*="menu"], .mobile-menu-toggle, button[class*="mobile"]');
    if (!mobileMenuButton) {
      findings.push({
        category: 'Responsiveness',
        check: 'Mobile Menu Toggle',
        status: 'fail',
        severity: 'warning',
        message: 'No mobile menu toggle button detected.',
      });
    } else {
      findings.push({
        category: 'Responsiveness',
        check: 'Mobile Menu Toggle',
        status: 'pass',
        severity: 'info',
        message: 'Mobile menu toggle found.',
      });
    }

    // Check for responsive images
    const images = document.querySelectorAll('img');
    const imagesWithoutMaxWidth = Array.from(images).filter((img) => {
      const styles = window.getComputedStyle(img);
      return styles.maxWidth === 'none';
    });

    if (imagesWithoutMaxWidth.length > 0) {
      findings.push({
        category: 'Responsiveness',
        check: 'Responsive Images',
        status: 'fail',
        severity: 'warning',
        message: `Found ${imagesWithoutMaxWidth.length} images without max-width`,
        details: { count: imagesWithoutMaxWidth.length },
      });
    }

    return findings;
  }, []);

  /**
   * Category 3: Positioning & Overlaps
   * Checks for z-index conflicts, absolute positioning issues, element overlaps
   */
  const auditPositioning = useCallback((): AuditFinding[] => {
    const findings: AuditFinding[] = [];

    // Check z-index conflicts
    const zIndexElements = Array.from(document.querySelectorAll('*')).filter((el) => {
      const styles = window.getComputedStyle(el);
      return styles.zIndex !== 'auto' && styles.position !== 'static';
    });

    const zIndexMap = new Map<number, HTMLElement[]>();
    zIndexElements.forEach((el) => {
      const zIndex = parseInt(window.getComputedStyle(el).zIndex);
      if (!zIndexMap.has(zIndex)) {
        zIndexMap.set(zIndex, []);
      }
      zIndexMap.get(zIndex)!.push(el as HTMLElement);
    });

    // Check for recommended z-index structure: sidebar(40) > header(30) > footer(20), modals(50)
    const header = document.querySelector('header');
    const sidebar = document.querySelector('aside, nav[role="navigation"]');
    const footer = document.querySelector('footer');

    if (header) {
      const headerZIndex = parseInt(window.getComputedStyle(header).zIndex || '0');
      if (headerZIndex !== 30) {
        findings.push({
          category: 'Positioning',
          check: 'Header Z-Index',
          status: 'fail',
          severity: 'warning',
          message: `Header z-index is ${headerZIndex}, recommended: 30`,
          element: header as HTMLElement,
        });
      } else {
        findings.push({
          category: 'Positioning',
          check: 'Header Z-Index',
          status: 'pass',
          severity: 'info',
          message: 'Header z-index follows standards.',
        });
      }
    }

    if (sidebar) {
      const sidebarZIndex = parseInt(window.getComputedStyle(sidebar).zIndex || '0');
      if (sidebarZIndex !== 40) {
        findings.push({
          category: 'Positioning',
          check: 'Sidebar Z-Index',
          status: 'fail',
          severity: 'warning',
          message: `Sidebar z-index is ${sidebarZIndex}, recommended: 40`,
          element: sidebar as HTMLElement,
        });
      } else {
        findings.push({
          category: 'Positioning',
          check: 'Sidebar Z-Index',
          status: 'pass',
          severity: 'info',
          message: 'Sidebar z-index follows standards.',
        });
      }
    }

    if (footer) {
      const footerZIndex = parseInt(window.getComputedStyle(footer).zIndex || '0');
      if (footerZIndex !== 20 && window.getComputedStyle(footer).position !== 'static') {
        findings.push({
          category: 'Positioning',
          check: 'Footer Z-Index',
          status: 'fail',
          severity: 'warning',
          message: `Footer z-index is ${footerZIndex}, recommended: 20`,
          element: footer as HTMLElement,
        });
      }
    }

    // Check for element overlaps using getBoundingClientRect
    const visibleElements = Array.from(document.querySelectorAll('*')).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    const overlaps: Array<{ el1: HTMLElement; el2: HTMLElement }> = [];
    for (let i = 0; i < Math.min(visibleElements.length, 100); i++) {
      const el1 = visibleElements[i] as HTMLElement;
      const rect1 = el1.getBoundingClientRect();
      
      for (let j = i + 1; j < Math.min(visibleElements.length, 100); j++) {
        const el2 = visibleElements[j] as HTMLElement;
        const rect2 = el2.getBoundingClientRect();

        // Check if rectangles overlap and elements are at same level (not parent-child)
        if (
          !el1.contains(el2) &&
          !el2.contains(el1) &&
          rect1.left < rect2.right &&
          rect1.right > rect2.left &&
          rect1.top < rect2.bottom &&
          rect1.bottom > rect2.top
        ) {
          overlaps.push({ el1, el2 });
        }
      }
    }

    if (overlaps.length > 0) {
      findings.push({
        category: 'Positioning',
        check: 'Element Overlaps',
        status: 'fail',
        severity: 'warning',
        message: `Detected ${overlaps.length} potential element overlaps`,
        details: { count: overlaps.length },
      });
    }

    // Check for excessive absolute positioning
    const absoluteElements = Array.from(document.querySelectorAll('*')).filter((el) => {
      return window.getComputedStyle(el).position === 'absolute';
    });

    if (absoluteElements.length > 10) {
      findings.push({
        category: 'Positioning',
        check: 'Absolute Positioning',
        status: 'fail',
        severity: 'warning',
        message: `Found ${absoluteElements.length} absolutely positioned elements. Consider using flex/grid.`,
        details: { count: absoluteElements.length },
      });
    }

    return findings;
  }, []);

  /**
   * Category 4: Spacing & Consistency
   * Checks for design token usage, padding/margin consistency
   */
  const auditSpacing = useCallback((): AuditFinding[] => {
    const findings: AuditFinding[] = [];

    // Check for inconsistent spacing values
    const spacingValues = new Set<string>();
    Array.from(document.querySelectorAll('*')).forEach((el) => {
      const styles = window.getComputedStyle(el);
      spacingValues.add(styles.padding);
      spacingValues.add(styles.margin);
      spacingValues.add(styles.gap);
    });

    // Tailwind uses spacing scale: 0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64
    const tailwindSpacingPx = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 224, 256];
    const nonStandardSpacing = Array.from(spacingValues).filter((value) => {
      const matches = value.match(/(\d+)px/g);
      if (!matches) return false;
      return matches.some((match) => {
        const px = parseInt(match);
        return px > 0 && !tailwindSpacingPx.includes(px);
      });
    });

    if (nonStandardSpacing.length > 10) {
      findings.push({
        category: 'Spacing',
        check: 'Design Token Usage',
        status: 'fail',
        severity: 'warning',
        message: `Found ${nonStandardSpacing.length} non-standard spacing values. Use Tailwind spacing scale.`,
        details: { count: nonStandardSpacing.length },
      });
    }

    // Check for elements without padding/margin
    const mainContent = document.querySelector('main');
    if (mainContent) {
      const styles = window.getComputedStyle(mainContent);
      const padding = parseInt(styles.padding) || 0;
      if (padding < 16) {
        findings.push({
          category: 'Spacing',
          check: 'Main Content Padding',
          status: 'fail',
          severity: 'warning',
          message: `Main content has insufficient padding: ${padding}px`,
        });
      }
    }

    // Check for consistent gap in grid/flex containers
    const flexContainers = Array.from(document.querySelectorAll('*')).filter((el) => {
      const display = window.getComputedStyle(el).display;
      return display === 'flex' || display === 'grid';
    });

    const gapValues = new Set<string>();
    flexContainers.forEach((el) => {
      const gap = window.getComputedStyle(el).gap;
      if (gap && gap !== 'normal') {
        gapValues.add(gap);
      }
    });

    if (gapValues.size > 5) {
      findings.push({
        category: 'Spacing',
        check: 'Gap Consistency',
        status: 'fail',
        severity: 'warning',
        message: `Found ${gapValues.size} different gap values. Consider standardizing.`,
        details: { uniqueGaps: gapValues.size },
      });
    }

    return findings;
  }, []);

  /**
   * Category 5: Role-Based Visibility & Access
   * Checks for proper role-based menu items and widget visibility
   */
  const auditRoleBasedAccess = useCallback((): AuditFinding[] => {
    const findings: AuditFinding[] = [];

    if (!user) {
      findings.push({
        category: 'Role-Based Access',
        check: 'User Authentication',
        status: 'fail',
        severity: 'error',
        message: 'No authenticated user found.',
      });
      return findings;
    }

    findings.push({
      category: 'Role-Based Access',
      check: 'User Authentication',
      status: 'pass',
      severity: 'info',
      message: `User authenticated as ${user.roleName || 'Unknown'}`,
    });

    // Check for role-specific elements
    const roleElements = document.querySelectorAll('[data-role], [data-roles]');
    if (roleElements.length === 0) {
      findings.push({
        category: 'Role-Based Access',
        check: 'Role-Based Elements',
        status: 'fail',
        severity: 'warning',
        message: 'No role-based elements found. Consider adding data-role attributes.',
      });
    } else {
      findings.push({
        category: 'Role-Based Access',
        check: 'Role-Based Elements',
        status: 'pass',
        severity: 'info',
        message: `Found ${roleElements.length} role-based elements`,
      });
    }

    // Check for visible elements that should be hidden for current role
    roleElements.forEach((el, index) => {
      const allowedRoles = el.getAttribute('data-role') || el.getAttribute('data-roles');
      if (allowedRoles && !allowedRoles.split(',').includes(user.roleName || '')) {
        const styles = window.getComputedStyle(el);
        if (styles.display !== 'none' && styles.visibility !== 'hidden') {
          findings.push({
            category: 'Role-Based Access',
            check: 'Role Visibility',
            status: 'fail',
            severity: 'error',
            message: `Element at index ${index} visible for ${user.roleName} but allowed for: ${allowedRoles}`,
            element: el as HTMLElement,
          });
        }
      }
    });

    // Check for navigation items
    const navItems = document.querySelectorAll('nav a, nav button');
    if (navItems.length === 0) {
      findings.push({
        category: 'Role-Based Access',
        check: 'Navigation Items',
        status: 'fail',
        severity: 'warning',
        message: 'No navigation items found.',
      });
    } else {
      findings.push({
        category: 'Role-Based Access',
        check: 'Navigation Items',
        status: 'pass',
        severity: 'info',
        message: `Found ${navItems.length} navigation items`,
      });
    }

    return findings;
  }, [user]);

  /**
   * Category 6: Performance & Load
   * Checks for excessive DOM nesting, lazy loading, render performance
   */
  const auditPerformance = useCallback((): AuditFinding[] => {
    const findings: AuditFinding[] = [];

    // Check DOM depth
    let maxDepth = 0;
    const checkDepth = (el: Element, depth: number = 0) => {
      maxDepth = Math.max(maxDepth, depth);
      Array.from(el.children).forEach((child) => checkDepth(child, depth + 1));
    };
    checkDepth(document.body);

    if (maxDepth > 15) {
      findings.push({
        category: 'Performance',
        check: 'DOM Nesting Depth',
        status: 'fail',
        severity: 'warning',
        message: `Maximum DOM depth is ${maxDepth}. Consider reducing nesting.`,
        details: { maxDepth },
      });
    } else {
      findings.push({
        category: 'Performance',
        check: 'DOM Nesting Depth',
        status: 'pass',
        severity: 'info',
        message: `DOM depth is acceptable: ${maxDepth}`,
      });
    }

    // Check total DOM nodes
    const totalNodes = document.querySelectorAll('*').length;
    if (totalNodes > 1500) {
      findings.push({
        category: 'Performance',
        check: 'Total DOM Nodes',
        status: 'fail',
        severity: 'warning',
        message: `Page has ${totalNodes} DOM nodes. Consider pagination or virtualization.`,
        details: { totalNodes },
      });
    } else {
      findings.push({
        category: 'Performance',
        check: 'Total DOM Nodes',
        status: 'pass',
        severity: 'info',
        message: `DOM node count is acceptable: ${totalNodes}`,
      });
    }

    // Check for lazy loading on images
    const images = document.querySelectorAll('img');
    const imagesWithoutLazyLoad = Array.from(images).filter((img) => {
      return !img.loading || img.loading !== 'lazy';
    });

    if (imagesWithoutLazyLoad.length > 0 && images.length > 5) {
      findings.push({
        category: 'Performance',
        check: 'Image Lazy Loading',
        status: 'fail',
        severity: 'warning',
        message: `${imagesWithoutLazyLoad.length} of ${images.length} images not using lazy loading`,
        details: { withoutLazyLoad: imagesWithoutLazyLoad.length, total: images.length },
      });
    }

    // Check for large images (> 200KB estimated)
    images.forEach((img, index) => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const estimatedSize = (width * height * 3) / 1024; // Rough estimate in KB

      if (estimatedSize > 200) {
        findings.push({
          category: 'Performance',
          check: 'Large Images',
          status: 'fail',
          severity: 'warning',
          message: `Image at index ${index} is potentially large: ${width}x${height}px`,
          element: img,
        });
      }
    });

    // Check for inline styles (potential performance issue)
    const elementsWithInlineStyles = Array.from(document.querySelectorAll('[style]'));
    if (elementsWithInlineStyles.length > 20) {
      findings.push({
        category: 'Performance',
        check: 'Inline Styles',
        status: 'fail',
        severity: 'warning',
        message: `Found ${elementsWithInlineStyles.length} elements with inline styles. Use CSS classes.`,
        details: { count: elementsWithInlineStyles.length },
      });
    }

    return findings;
  }, []);

  /**
   * Category 7: Interactivity & Functionality
   * Checks for button functionality, dark mode, accessibility
   */
  const auditInteractivity = useCallback((): AuditFinding[] => {
    const findings: AuditFinding[] = [];

    // Check for buttons without onClick or href
    const buttons = document.querySelectorAll('button, [role="button"]');
    const inactiveButtons = Array.from(buttons).filter((btn) => {
      const hasOnClick = btn.hasAttribute('onclick') || btn.getAttribute('type') === 'submit';
      return !hasOnClick;
    });

    if (inactiveButtons.length > 0) {
      findings.push({
        category: 'Interactivity',
        check: 'Button Functionality',
        status: 'fail',
        severity: 'warning',
        message: `Found ${inactiveButtons.length} buttons without clear onClick handlers`,
        details: { count: inactiveButtons.length },
      });
    }

    // Check for dark mode implementation
    const hasDarkClass = document.documentElement.classList.contains('dark') || 
                         document.body.classList.contains('dark');
    const darkModeToggle = document.querySelector('[aria-label*="dark"], [aria-label*="theme"], button[class*="dark"]');
    
    if (!darkModeToggle) {
      findings.push({
        category: 'Interactivity',
        check: 'Dark Mode Toggle',
        status: 'fail',
        severity: 'info',
        message: 'No dark mode toggle found.',
      });
    } else {
      findings.push({
        category: 'Interactivity',
        check: 'Dark Mode Toggle',
        status: 'pass',
        severity: 'info',
        message: 'Dark mode toggle present.',
      });
    }

    // Check for links without href
    const links = document.querySelectorAll('a');
    const linksWithoutHref = Array.from(links).filter((link) => !link.hasAttribute('href'));

    if (linksWithoutHref.length > 0) {
      findings.push({
        category: 'Interactivity',
        check: 'Link Functionality',
        status: 'fail',
        severity: 'warning',
        message: `Found ${linksWithoutHref.length} links without href attribute`,
        details: { count: linksWithoutHref.length },
      });
    }

    // Check for form inputs without labels
    const inputs = document.querySelectorAll('input, select, textarea');
    const inputsWithoutLabels = Array.from(inputs).filter((input) => {
      const id = input.id;
      if (!id) return true;
      const label = document.querySelector(`label[for="${id}"]`);
      const ariaLabel = input.getAttribute('aria-label');
      return !label && !ariaLabel;
    });

    if (inputsWithoutLabels.length > 0) {
      findings.push({
        category: 'Interactivity',
        check: 'Form Accessibility',
        status: 'fail',
        severity: 'error',
        message: `Found ${inputsWithoutLabels.length} form inputs without labels`,
        details: { count: inputsWithoutLabels.length },
      });
    }

    // Check for keyboard accessibility (focusable elements)
    const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    const nonKeyboardAccessible = Array.from(interactiveElements).filter((el) => {
      const tabindex = el.getAttribute('tabindex');
      return tabindex === '-1';
    });

    if (nonKeyboardAccessible.length > 0) {
      findings.push({
        category: 'Interactivity',
        check: 'Keyboard Accessibility',
        status: 'fail',
        severity: 'warning',
        message: `Found ${nonKeyboardAccessible.length} interactive elements not keyboard accessible`,
        details: { count: nonKeyboardAccessible.length },
      });
    }

    // Check for ARIA roles and labels
    const elementsNeedingAria = document.querySelectorAll('nav, aside, main, header, footer, dialog, [role]');
    const missingAria = Array.from(elementsNeedingAria).filter((el) => {
      return !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby');
    });

    if (missingAria.length > 3) {
      findings.push({
        category: 'Interactivity',
        check: 'ARIA Labels',
        status: 'fail',
        severity: 'info',
        message: `${missingAria.length} semantic elements could benefit from ARIA labels`,
        details: { count: missingAria.length },
      });
    }

    return findings;
  }, []);

  /**
   * Category 8: Audit Reporting
   * Generates detailed audit report with pass/fail indicators
   */
  const generateAuditReport = useCallback((findings: AuditFinding[]): AuditResult => {
    const passed = findings.filter((f) => f.status === 'pass').length;
    const failed = findings.filter((f) => f.status === 'fail').length;
    const errors = findings.filter((f) => f.severity === 'error');
    const warnings = findings.filter((f) => f.severity === 'warning');
    const infos = findings.filter((f) => f.severity === 'info');

    const totalChecks = findings.length;
    const passRate = totalChecks > 0 ? ((passed / totalChecks) * 100).toFixed(1) : '0.0';

    const summary = `
Layout Audit Report - ${new Date().toLocaleString()}
${'='.repeat(60)}

Overall Score: ${passRate}% (${passed}/${totalChecks} checks passed)

Severity Breakdown:
  🔴 Errors: ${errors.length}
  ⚠️  Warnings: ${warnings.length}
  ℹ️  Info: ${infos.length}

Category Breakdown:
  ${Array.from(new Set(findings.map(f => f.category))).map(cat => {
    const catFindings = findings.filter(f => f.category === cat);
    const catPassed = catFindings.filter(f => f.status === 'pass').length;
    const catTotal = catFindings.length;
    return `${cat}: ${catPassed}/${catTotal} passed`;
  }).join('\n  ')}

Detailed Findings:
${findings.map((f, i) => `
  ${i + 1}. [${f.status === 'pass' ? '✅' : '⚠️'}] ${f.category} - ${f.check}
     ${f.message}
     Severity: ${f.severity.toUpperCase()}
${f.details ? `     Details: ${JSON.stringify(f.details)}` : ''}
`).join('\n')}

${'='.repeat(60)}
`;

    return {
      timestamp: new Date().toISOString(),
      totalChecks,
      passed,
      failed,
      errors,
      warnings,
      infos,
      findings,
      summary,
    };
  }, []);

  /**
   * Run comprehensive audit
   */
  const runAudit = useCallback(async () => {
    setIsAuditing(true);

    try {
      const allFindings: AuditFinding[] = [];

      // Run all audit categories
      if (!options.skipCategories?.includes('structure')) {
        allFindings.push(...auditComponentStructure());
      }
      if (!options.skipCategories?.includes('responsiveness')) {
        allFindings.push(...auditResponsiveness());
      }
      if (!options.skipCategories?.includes('positioning')) {
        allFindings.push(...auditPositioning());
      }
      if (!options.skipCategories?.includes('spacing')) {
        allFindings.push(...auditSpacing());
      }
      if (!options.skipCategories?.includes('role-access')) {
        allFindings.push(...auditRoleBasedAccess());
      }
      if (!options.skipCategories?.includes('performance')) {
        allFindings.push(...auditPerformance());
      }
      if (!options.skipCategories?.includes('interactivity')) {
        allFindings.push(...auditInteractivity());
      }

      // Generate report
      const result = generateAuditReport(allFindings);
      setAuditResult(result);
      auditRef.current = result;

      // Log to console if verbose
      if (options.verbose) {
        console.group('🔍 Layout Audit Report');
        console.log(result.summary);
        console.groupEnd();
      }

      return result;
    } finally {
      setIsAuditing(false);
    }
  }, [
    options,
    auditComponentStructure,
    auditResponsiveness,
    auditPositioning,
    auditSpacing,
    auditRoleBasedAccess,
    auditPerformance,
    auditInteractivity,
    generateAuditReport,
  ]);

  /**
   * Auto-run audit on mount if enabled
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Run audit after DOM is fully loaded
      const timer = setTimeout(() => {
        runAudit();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [runAudit]);

  return {
    auditResult,
    isAuditing,
    runAudit,
    getLatestResult: () => auditRef.current,
  };
}
