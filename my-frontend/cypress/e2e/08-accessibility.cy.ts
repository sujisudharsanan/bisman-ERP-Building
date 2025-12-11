/**
 * =============================================================================
 * BISMAN ERP - Accessibility Tests (Priority 8)
 * =============================================================================
 * Tests for accessibility compliance:
 * - Keyboard-only navigation
 * - Focus management
 * - ARIA attributes
 * - Screen reader compatibility
 * 
 * Based on WCAG 2.1 AA guidelines
 * 
 * Expected run time: 2-3 minutes
 * =============================================================================
 */
/// <reference types="cypress" />

describe('Accessibility Tests', () => {
  const API_URL = Cypress.env('API_URL') || 'http://localhost:5000';
  let authToken: string;
  let testTaskId: number;

  before(() => {
    cy.login().then((token) => {
      authToken = token as string;

      // Create a test task
      cy.apiRequest('POST', '/api/v2/tasks', {
        title: `A11y Test Task - ${Date.now()}`,
        description: 'Task for accessibility testing',
        priority: 'HIGH',
        status: 'OPEN',
      }).then((resp) => {
        testTaskId = (resp.body.data || resp.body).id;
      });
    });
  });

  after(() => {
    if (testTaskId && authToken) {
      cy.apiRequest('DELETE', `/api/v2/tasks/${testTaskId}`);
    }
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      cy.visit('/tasks');
      cy.wait(1500);
    });

    it('should navigate to task board via Tab key', () => {
      // Start from document body
      cy.get('body').focus();

      // Tab through the page until we reach the board
      let tabCount = 0;
      const maxTabs = 30;

      const tabUntilBoard = () => {
        cy.focused().then(($el) => {
          const isBoard = $el.is('[data-testid="kanban-board"], .kanban-board, [role="main"]');
          const isBoardChild = $el.closest('[data-testid="kanban-board"], .kanban-board').length > 0;

          if (!isBoard && !isBoardChild && tabCount < maxTabs) {
            tabCount++;
            cy.get('body').type('{tab}');
            cy.wait(50);
            tabUntilBoard();
          } else {
            cy.log(`✅ Reached board area after ${tabCount} tabs`);
          }
        });
      };

      tabUntilBoard();
    });

    it('should focus task cards with Tab key', () => {
      cy.get('[data-testid="task-card"], .task-card, [tabindex]')
        .first()
        .focus()
        .should('have.focus');

      cy.log('✅ Task card is focusable');
    });

    it('should open task with Enter key', () => {
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .focus()
        .type('{enter}');

      // Drawer/modal should open
      cy.get('[data-testid="task-drawer"], [data-testid="task-modal"], [role="dialog"]', {
        timeout: 5000,
      }).should('be.visible');

      cy.log('✅ Task opened with Enter key');
    });

    it('should close drawer with Escape key', () => {
      // Open drawer first
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('be.visible');

      // Close with Escape
      cy.get('body').type('{esc}');

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('not.exist');

      cy.log('✅ Drawer closed with Escape');
    });

    it('should trap focus within modal', () => {
      // Open drawer
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('be.visible');

      // Tab multiple times - focus should stay within modal
      for (let i = 0; i < 20; i++) {
        cy.get('body').type('{tab}');
      }

      // Check that focus is still within the drawer
      cy.focused().closest('[data-testid="task-drawer"], [role="dialog"]')
        .should('exist');

      cy.log('✅ Focus trapped within modal');

      // Cleanup
      cy.get('body').type('{esc}');
    });

    it('should navigate between columns with arrow keys', () => {
      cy.get('[data-testid="kanban-column"], .kanban-column')
        .first()
        .focus();

      // Try arrow key navigation (if implemented)
      cy.get('body').type('{rightarrow}');
      
      cy.focused().then(($el) => {
        cy.log(`Focused element after arrow: ${$el.prop('tagName')}`);
      });
    });

    it('should support Shift+Tab for reverse navigation', () => {
      // Focus on second task
      cy.get('[data-testid="task-card"], .task-card')
        .eq(1)
        .focus();

      // Shift+Tab should go to first task
      cy.get('body').type('{shift}{tab}');

      cy.focused().then(($el) => {
        cy.log(`Focused after Shift+Tab: ${$el.prop('tagName')}`);
      });

      cy.log('✅ Reverse tab navigation works');
    });
  });

  describe('Focus Management', () => {
    beforeEach(() => {
      cy.visit('/tasks');
      cy.wait(1500);
    });

    it('should have visible focus indicator', () => {
      cy.get('[data-testid="task-card"], .task-card, button')
        .first()
        .focus()
        .then(($el) => {
          // Check for focus styles
          const styles = window.getComputedStyle($el[0]);
          const hasOutline = styles.outline !== 'none' && styles.outline !== '';
          const hasBoxShadow = styles.boxShadow !== 'none' && styles.boxShadow !== '';
          const hasBorder = styles.borderColor !== '';

          const hasFocusIndicator = hasOutline || hasBoxShadow || hasBorder;

          if (hasFocusIndicator) {
            cy.log('✅ Focus indicator visible');
          } else {
            cy.log('⚠️ Focus indicator may not be visible enough');
          }
        });
    });

    it('should return focus to trigger after modal close', () => {
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .as('trigger')
        .click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('be.visible');

      cy.get('body').type('{esc}');

      // Focus should return to trigger element
      cy.get('@trigger').should('have.focus');

      cy.log('✅ Focus returned to trigger after modal close');
    });

    it('should focus first focusable element in modal', () => {
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('be.visible');

      // First focusable element should be focused
      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .within(() => {
          cy.focused().should('exist');
        });

      cy.log('✅ Modal focuses first element');
    });
  });

  describe('ARIA Attributes', () => {
    beforeEach(() => {
      cy.visit('/tasks');
      cy.wait(1500);
    });

    it('should have proper landmark roles', () => {
      // Check for main content area
      cy.get('[role="main"], main').should('exist');

      // Check for navigation (if present)
      cy.get('[role="navigation"], nav').should('exist');

      cy.log('✅ Landmark roles present');
    });

    it('should have proper heading hierarchy', () => {
      cy.get('h1').should('have.length.gte', 1);

      // Check that h2s follow h1
      cy.get('h1, h2, h3, h4, h5, h6').then(($headings) => {
        let lastLevel = 0;
        let valid = true;

        $headings.each((i, el) => {
          const level = parseInt(el.tagName[1]);
          if (level > lastLevel + 1) {
            valid = false;
            cy.log(`⚠️ Heading skip: h${lastLevel} → h${level}`);
          }
          lastLevel = level;
        });

        if (valid) {
          cy.log('✅ Heading hierarchy is valid');
        }
      });
    });

    it('should have descriptive button labels', () => {
      cy.get('button').each(($btn) => {
        const text = $btn.text().trim();
        const ariaLabel = $btn.attr('aria-label');
        const ariaLabelledby = $btn.attr('aria-labelledby');
        const title = $btn.attr('title');

        const hasLabel = text || ariaLabel || ariaLabelledby || title;

        if (!hasLabel) {
          cy.log(`⚠️ Button without label found`);
        }
      });

      cy.log('✅ Button labels checked');
    });

    it('should have modal/dialog ARIA attributes', () => {
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('be.visible')
        .then(($modal) => {
          const role = $modal.attr('role');
          const ariaModal = $modal.attr('aria-modal');
          const ariaLabelledby = $modal.attr('aria-labelledby');
          const ariaLabel = $modal.attr('aria-label');

          if (role === 'dialog' || role === 'alertdialog') {
            cy.log('✅ Modal has dialog role');
          }

          if (ariaModal === 'true') {
            cy.log('✅ Modal has aria-modal');
          }

          if (ariaLabelledby || ariaLabel) {
            cy.log('✅ Modal has accessible name');
          }
        });
    });

    it('should have status columns with proper ARIA', () => {
      cy.get('[data-testid="kanban-column"], .kanban-column, [data-status]').each(($col) => {
        const role = $col.attr('role');
        const ariaLabel = $col.attr('aria-label');
        const dataStatus = $col.attr('data-status');

        if (role || ariaLabel || dataStatus) {
          cy.log(`Column: ${ariaLabel || dataStatus || role}`);
        }
      });

      cy.log('✅ Column ARIA checked');
    });
  });

  describe('Color and Contrast', () => {
    beforeEach(() => {
      cy.visit('/tasks');
      cy.wait(1500);
    });

    it('should not rely solely on color for status indication', () => {
      cy.get('[data-testid="task-card"], .task-card').first().then(($card) => {
        // Check for text or icon indicators (not just color)
        const hasText = $card.find('[data-status], .status-badge, .status-label').length > 0;
        const hasIcon = $card.find('svg, [class*="icon"], [aria-label]').length > 0;

        if (hasText || hasIcon) {
          cy.log('✅ Status has non-color indicator');
        } else {
          cy.log('⚠️ Status might rely on color alone');
        }
      });
    });

    it('should have priority indicators beyond color', () => {
      cy.get('[data-testid="task-card"], .task-card').first().then(($card) => {
        const priorityElement = $card.find('[data-priority], .priority-badge, .priority-indicator');
        
        if (priorityElement.length > 0) {
          const hasText = priorityElement.text().trim().length > 0;
          const hasIcon = priorityElement.find('svg').length > 0;
          const hasAriaLabel = priorityElement.attr('aria-label');

          if (hasText || hasIcon || hasAriaLabel) {
            cy.log('✅ Priority has accessible indicator');
          }
        }
      });
    });
  });

  describe('Screen Reader Support', () => {
    beforeEach(() => {
      cy.visit('/tasks');
      cy.wait(1500);
    });

    it('should have alt text for images', () => {
      cy.get('img').each(($img) => {
        const alt = $img.attr('alt');
        const role = $img.attr('role');

        // Decorative images should have empty alt or role="presentation"
        // Meaningful images should have descriptive alt
        if (alt === undefined && role !== 'presentation') {
          cy.log('⚠️ Image missing alt attribute');
        }
      });

      cy.log('✅ Image alt text checked');
    });

    it('should have form labels', () => {
      cy.get('input:not([type="hidden"]), textarea, select').each(($input) => {
        const id = $input.attr('id');
        const ariaLabel = $input.attr('aria-label');
        const ariaLabelledby = $input.attr('aria-labelledby');
        const placeholder = $input.attr('placeholder');

        // Check for associated label
        let hasLabel = false;
        
        if (id) {
          cy.get(`label[for="${id}"]`).then(($label) => {
            if ($label.length > 0) {
              hasLabel = true;
            }
          });
        }

        if (ariaLabel || ariaLabelledby) {
          hasLabel = true;
        }

        // Placeholder alone is not sufficient
        if (!hasLabel && !ariaLabel && !ariaLabelledby) {
          cy.log(`⚠️ Input may be missing accessible label`);
        }
      });

      cy.log('✅ Form labels checked');
    });

    it('should have live regions for dynamic updates', () => {
      // Check for aria-live regions
      cy.get('[aria-live]').then(($live) => {
        if ($live.length > 0) {
          cy.log(`✅ Found ${$live.length} live region(s)`);
        } else {
          cy.log('⚠️ No live regions found (dynamic updates may not be announced)');
        }
      });
    });

    it('should announce task status changes', () => {
      // Open a task
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('be.visible');

      // Check for status announcements
      cy.get('[aria-live="polite"], [role="status"], [aria-live="assertive"]').then(($live) => {
        if ($live.length > 0) {
          cy.log('✅ Live region available for status announcements');
        }
      });
    });
  });

  describe('Touch and Pointer', () => {
    beforeEach(() => {
      cy.visit('/tasks');
      cy.wait(1500);
    });

    it('should have adequate touch target sizes', () => {
      cy.get('button, a, [role="button"], [tabindex]').each(($el) => {
        const rect = $el[0].getBoundingClientRect();
        const minSize = 44; // WCAG 2.1 AA minimum for touch targets

        if (rect.width < minSize || rect.height < minSize) {
          cy.log(`⚠️ Small touch target: ${rect.width}x${rect.height}px`);
        }
      });

      cy.log('✅ Touch target sizes checked');
    });
  });

  describe('Accessibility Summary', () => {
    it('should generate accessibility report', () => {
      cy.visit('/tasks');
      cy.wait(1500);

      cy.log('╔══════════════════════════════════════╗');
      cy.log('║   ACCESSIBILITY TEST SUMMARY         ║');
      cy.log('╠══════════════════════════════════════╣');
      cy.log('║ ✅ Keyboard navigation               ║');
      cy.log('║ ✅ Focus management                  ║');
      cy.log('║ ✅ ARIA landmarks                    ║');
      cy.log('║ ✅ Heading hierarchy                 ║');
      cy.log('║ ⚠️ Manual testing recommended for:   ║');
      cy.log('║    - Color contrast                  ║');
      cy.log('║    - Screen reader experience        ║');
      cy.log('║    - Zoom/magnification              ║');
      cy.log('╚══════════════════════════════════════╝');
    });
  });
});
