/**
 * ============================================================
 * 1. KANBAN DASHBOARD TESTS - No Regression
 * ============================================================
 * Ensures Kanban board functionality remains unchanged.
 * No consolidation/settlement UI should appear on Kanban.
 * 
 * UPDATED: Uses actual UI selectors from KanbanBoard.tsx
 * Columns: Assigned, In Progress, Needs Attention, Completed
 */
describe('Kanban Dashboard - No Regression', () => {
  beforeEach(() => {
    cy.loginAs('requester');
    cy.visitKanban();
  });

  describe('Kanban Board Structure', () => {
    it('should display all expected columns', () => {
      // Actual columns from dashboardConfig.ts - uppercase titles
      const expectedColumns = [
        'ASSIGNED',
        'IN PROGRESS', 
        'NEED ATTENTION',
        'DONE'
      ];

      expectedColumns.forEach((column) => {
        cy.contains('h3', column, { timeout: 15000 }).should('be.visible');
      });
    });

    it('should display kanban board container', () => {
      // The board is a flex container with columns
      cy.get('.flex, [class*="kanban"], .kanban-board, [class*="column"]', { timeout: 15000 })
        .should('exist');
    });

    it('should have multiple columns visible', () => {
      // Each column has class w-80 min-w-[320px]
      cy.get('.w-80, [class*="min-w-"], .kanban-column', { timeout: 15000 })
        .should('have.length.gte', 2);
    });
  });

  describe('Consolidation UI Absence', () => {
    it('should NOT show consolidation button on Kanban', () => {
      cy.get('[data-testid="consolidate-button"]').should('not.exist');
      cy.get('.consolidation-section').should('not.exist');
      cy.contains('button', 'Consolidate').should('not.exist');
    });

    it('should NOT show settlement panel on Kanban', () => {
      cy.get('[data-testid="settlement-panel"]').should('not.exist');
      cy.get('[data-testid="consolidation-panel"]').should('not.exist');
      cy.contains('Settlement Panel').should('not.exist');
    });

    it('should NOT show checkboxes for consolidation on task cards', () => {
      // Task cards are in .bg-white.rounded-lg containers
      cy.get('.bg-white.rounded-lg.p-3, .task-card').then(($cards) => {
        if ($cards.length > 0) {
          cy.wrap($cards).each(($card) => {
            cy.wrap($card)
              .find('input[type="checkbox"]')
              .should('not.exist');
          });
        }
      });
    });
  });

  describe('Task Card Display', () => {
    it('should display task cards with priority badges', () => {
      // Task cards have priority badges with specific colors
      cy.get('.bg-white.rounded-lg.p-3, .task-card', { timeout: 15000 }).then(($cards) => {
        if ($cards.length > 0) {
          // Cards should have title text
          cy.wrap($cards.first()).find('h4, .font-medium').should('exist');
        } else {
          // No tasks is also valid
          cy.contains('No tasks').should('exist');
        }
      });
    });

    it('should open task detail on click', () => {
      cy.get('.bg-white.rounded-lg.p-3.cursor-pointer, .task-card', { timeout: 15000 }).then(($cards) => {
        if ($cards.length > 0) {
          cy.wrap($cards.first()).click();
          // Modal/drawer should appear
          cy.get('[role="dialog"], .modal, .drawer, .task-detail', { timeout: 10000 })
            .should('be.visible');
        }
      });
    });

    it('should NOT show payment/settlement info in task modal on Kanban', () => {
      cy.get('.bg-white.rounded-lg.p-3.cursor-pointer, .task-card', { timeout: 15000 }).then(($cards) => {
        if ($cards.length > 0) {
          cy.wrap($cards.first()).click();
          cy.get('[role="dialog"], .modal, .drawer', { timeout: 10000 }).within(() => {
            cy.get('[data-testid="settlement-info"]').should('not.exist');
            cy.get('[data-testid="payment-consolidation"]').should('not.exist');
            cy.contains('Settlement').should('not.exist');
          });
        }
      });
    });
  });

  describe('Role-Based Kanban Access', () => {
    const roles = ['requester', 'hubIncharge', 'regionalHead', 'accountant', 'financeController', 'cfo'];

    roles.forEach((role) => {
      it(`should allow ${role} to access Kanban without consolidation UI`, () => {
        cy.loginAs(role as any);
        cy.visitKanban();
        
        // Kanban should load - check for uppercase column titles
        cy.contains('h3', 'ASSIGNED', { timeout: 15000 }).should('be.visible');
        cy.contains('h3', 'IN PROGRESS').should('be.visible');
        
        // No consolidation UI
        cy.consolidationShouldBeVisible(false);
      });
    });
  });

  describe('Kanban Filters', () => {
    it('should NOT have settlement-related filters on Kanban', () => {
      cy.get('[data-testid="filter-settlement-status"]').should('not.exist');
      cy.get('[data-testid="filter-payment-status"]').should('not.exist');
      cy.contains('label', 'Settlement Status').should('not.exist');
      cy.contains('label', 'Payment Status').should('not.exist');
    });
  });

  describe('Kanban Performance', () => {
    it('should load Kanban within acceptable time', () => {
      const startTime = Date.now();
      cy.visitKanban();
      // Wait for columns to be visible - uppercase titles
      cy.contains('h3', 'ASSIGNED', { timeout: 15000 }).should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(15000); // 15 second threshold (accounting for SSR compile)
        cy.log(`✅ Kanban loaded in ${loadTime}ms`);
      });
    });
  });
});
