/**
 * ============================================================
 * 3. TASK APPROVAL - NON-ACCOUNTANT SIMPLIFIED VIEW TESTS
 * ============================================================
 * Tests for non-accountant roles (FC, CFO, Regional Head, etc.):
 * - Standard task approval view
 * - No consolidation capability
 * - Appropriate access based on role
 * 
 * UPDATED: Uses actual UI selectors from admin/task-approvals/page.tsx
 */
describe('Task Approval - Non-Accountant View', () => {
  const nonAccountantRoles = ['financeController', 'cfo', 'regionalHead', 'hubIncharge'] as const;

  nonAccountantRoles.forEach((role) => {
    describe(`${role} View`, () => {
      beforeEach(() => {
        cy.loginAs(role);
        cy.visitTaskApproval();
      });

      describe('Page Access', () => {
        it('should load task approval page', () => {
          cy.url().should('include', 'task-approvals');
          cy.contains('Access Denied').should('not.exist');
        });

        it('should display page header', () => {
          cy.contains('Task Approval', { timeout: 15000 }).should('be.visible');
        });
      });

      describe('No Consolidation Capability', () => {
        it('should NOT show consolidation checkboxes', () => {
          cy.get('[data-testid="consolidation-checkbox"]').should('not.exist');
        });

        it('should NOT show consolidate button', () => {
          cy.get('[data-testid="consolidate-button"]').should('not.exist');
          cy.contains('button', 'Consolidate').should('not.exist');
        });

        it('should NOT show consolidation panel', () => {
          cy.consolidationShouldBeVisible(false);
        });
      });

      describe('Table Display', () => {
        it('should show task table or empty state', () => {
          cy.get('body', { timeout: 15000 }).then(($body) => {
            // Either table with rows or "All Caught Up" message
            if ($body.find('table tbody tr').length > 0) {
              cy.get('table tbody tr').should('have.length.gte', 1);
            } else {
              cy.contains('All Caught Up').should('exist');
            }
          });
        });

        it('should display standard columns', () => {
          cy.get('table thead', { timeout: 15000 }).then(($thead) => {
            if ($thead.length > 0) {
              cy.contains('th', 'Task').should('exist');
              cy.contains('th', 'Status').should('exist');
            }
          });
        });
      });

      describe('View-Only Access', () => {
        it('should allow viewing task details', () => {
          cy.get('table tbody tr', { timeout: 15000 }).then(($rows) => {
            if ($rows.length > 0 && !$rows.text().includes('All Caught Up')) {
              cy.wrap($rows.first()).click();
              // Should navigate to detail page
              cy.url().should('match', /task-approvals|tasks/);
            }
          });
        });
      });

      describe('Filter Controls', () => {
        it('should have filter controls available', () => {
          cy.contains('button', 'Filters').should('exist');
        });

        it('should have refresh button', () => {
          cy.contains('button', 'Refresh').should('exist');
        });
      });
    });
  });

  describe('Role Comparison', () => {
    it('should provide consistent experience across non-accountant roles', () => {
      // Login as FC
      cy.loginAs('financeController');
      cy.visitTaskApproval();
      
      // Should load without errors
      cy.contains('h1', 'Task Approval', { timeout: 15000 }).should('be.visible');
      
      // No consolidation UI
      cy.get('[data-testid="consolidation-checkbox"]').should('not.exist');
    });
  });

  describe('Settlement Navigation', () => {
    beforeEach(() => {
      cy.loginAs('financeController');
    });

    it('should allow navigation to settlements page', () => {
      cy.visitSettlements();
      cy.url().should('include', '/settlements');
      // Page should load
      cy.contains('Settlement', { timeout: 15000 }).should('exist');
    });
  });

  describe('Access Control', () => {
    it('should show appropriate content for FC role', () => {
      cy.loginAs('financeController');
      cy.visitTaskApproval();
      cy.contains('Access Denied').should('not.exist');
    });

    it('should show appropriate content for CFO role', () => {
      cy.loginAs('cfo');
      cy.visitTaskApproval();
      cy.contains('Access Denied').should('not.exist');
    });

    it('should show appropriate content for Regional Head role', () => {
      cy.loginAs('regionalHead');
      cy.visitTaskApproval();
      cy.contains('Access Denied').should('not.exist');
    });
  });
});
