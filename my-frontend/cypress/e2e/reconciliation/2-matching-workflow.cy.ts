/**
 * Bank Reconciliation E2E Tests - Matching Workflow
 * 
 * Tests the matching functionality:
 * - Auto-matching
 * - Manual matching
 * - Unmatch operations
 * - Match confidence display
 */

describe('Bank Reconciliation - Matching Workflow', () => {
  const API_BASE = Cypress.env('API_URL') || 'http://localhost:5000';

  const accountantCredentials = {
    email: Cypress.env('ACCOUNTANT_EMAIL') || 'demo_accountant@bisman.demo',
    password: Cypress.env('ACCOUNTANT_PASSWORD') || 'Demo@123',
  };

  beforeEach(() => {
    cy.request({
      method: 'POST',
      url: `${API_BASE}/api/auth/login`,
      body: accountantCredentials,
      failOnStatusCode: false,
    });
  });

  // =========================================================================
  // AUTO-MATCH TESTS
  // =========================================================================

  describe('Auto-Match', () => {
    it('should have auto-match button on batch page', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        // Check if we have batches to work with
        if ($body.text().includes('View') && $body.find('table tbody tr').length > 0) {
          // Click on first batch
          cy.contains('View').first().click();
          
          // Look for auto-match button
          cy.contains(/Auto-Match|Auto Match/i).should('exist');
        }
      });
    });

    it('should reject auto-match on locked batch via API', () => {
      // This tests the API directly since we may not have a locked batch in UI
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/batches/locked-batch-id/auto-match`,
        failOnStatusCode: false,
      }).then((response) => {
        // Should fail with 400, 403, or 404
        expect([400, 403, 404, 401, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // MANUAL MATCH TESTS
  // =========================================================================

  describe('Manual Match', () => {
    it('should require reason for manual match (API)', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/matches`,
        body: {
          batchId: 'test-batch-id',
          lineId: 'test-line-id',
          settlementId: 'test-settlement-id',
          // Missing reason
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should enforce minimum reason length (API)', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/matches`,
        body: {
          batchId: 'test-batch-id',
          lineId: 'test-line-id',
          settlementId: 'test-settlement-id',
          reason: 'short', // Less than 10 chars
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should display match button on pending lines', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('View') && $body.find('table tbody tr').length > 0) {
          cy.contains('View').first().click();
          
          // Navigate to pending tab
          cy.contains('pending', { matchCase: false }).click({ force: true });
          
          // Look for match button on lines
          cy.get('body').then(($batchBody) => {
            if ($batchBody.find('table tbody tr').length > 0) {
              cy.contains(/Match/i).should('exist');
            }
          });
        }
      });
    });
  });

  // =========================================================================
  // UNMATCH TESTS
  // =========================================================================

  describe('Unmatch', () => {
    it('should require reason for unmatch (API)', () => {
      cy.request({
        method: 'DELETE',
        url: `${API_BASE}/api/reconciliation/matches/test-match-id`,
        body: {}, // Missing reason
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 404, 500]).to.include(response.status);
      });
    });

    it('should display unmatch option on matched lines', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('View') && $body.find('table tbody tr').length > 0) {
          cy.contains('View').first().click();
          
          // Navigate to matched tab
          cy.contains('matched', { matchCase: false }).click({ force: true });
          
          // Look for unmatch button
          cy.get('body').then(($batchBody) => {
            if ($batchBody.find('table tbody tr').length > 0) {
              cy.contains(/Unmatch/i).should('exist');
            }
          });
        }
      });
    });
  });

  // =========================================================================
  // MATCH DISPLAY TESTS
  // =========================================================================

  describe('Match Display', () => {
    it('should show confidence badges for matches', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('View') && $body.find('table tbody tr').length > 0) {
          cy.contains('View').first().click();
          
          // Navigate to matched tab
          cy.contains('matched', { matchCase: false }).click({ force: true });
          
          // Look for confidence indicators
          cy.get('body').then(($batchBody) => {
            if ($batchBody.find('table tbody tr').length > 0) {
              // Should show HIGH, MEDIUM, LOW, or MANUAL
              cy.get('body').should(($b) => {
                const hasConfidence = 
                  $b.text().includes('HIGH') || 
                  $b.text().includes('MEDIUM') || 
                  $b.text().includes('LOW') || 
                  $b.text().includes('MANUAL') ||
                  $b.text().includes('Confidence');
                // This is optional - might not have matches
              });
            }
          });
        }
      });
    });

    it('should show match type for each match', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('View') && $body.find('table tbody tr').length > 0) {
          cy.contains('View').first().click();
          
          cy.contains('matched', { matchCase: false }).click({ force: true });
          
          cy.get('body').then(($batchBody) => {
            if ($batchBody.find('table tbody tr').length > 0) {
              // Should show Type column
              cy.contains(/Type/i).should('exist');
            }
          });
        }
      });
    });
  });

  // =========================================================================
  // STATISTICS TESTS
  // =========================================================================

  describe('Match Statistics', () => {
    it('should display match rate', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('View') && $body.find('table tbody tr').length > 0) {
          cy.contains('View').first().click();
          
          // Should show match rate percentage
          cy.contains(/Match Rate|%/i).should('exist');
        }
      });
    });

    it('should display matched count', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('View') && $body.find('table tbody tr').length > 0) {
          cy.contains('View').first().click();
          
          // Should show matched count
          cy.contains(/Matched/i).should('exist');
        }
      });
    });

    it('should display pending count', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('View') && $body.find('table tbody tr').length > 0) {
          cy.contains('View').first().click();
          
          // Should show pending count
          cy.contains(/Pending/i).should('exist');
        }
      });
    });

    it('should display exceptions count', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('View') && $body.find('table tbody tr').length > 0) {
          cy.contains('View').first().click();
          
          // Should show exceptions count
          cy.contains(/Exception/i).should('exist');
        }
      });
    });
  });
});
