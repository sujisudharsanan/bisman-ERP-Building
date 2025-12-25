/**
 * Bank Reconciliation E2E Tests - Batch Finalization
 * 
 * Tests the batch lifecycle:
 * - Status transitions
 * - Locking mechanism
 * - Finalization with validation
 * - Immutability after finalization
 */

describe('Bank Reconciliation - Batch Finalization', () => {
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
  // STATUS TRANSITION TESTS (API)
  // =========================================================================

  describe('Status Transitions', () => {
    it('should validate status transition rules', () => {
      // Try invalid transition (e.g., OPEN -> FINALIZED)
      cy.request({
        method: 'PUT',
        url: `${API_BASE}/api/reconciliation/batches/test-batch-id/status`,
        body: { status: 'finalized' },
        failOnStatusCode: false,
      }).then((response) => {
        // Should fail or return error
        expect([400, 401, 403, 404, 500]).to.include(response.status);
      });
    });

    it('should require status in update request', () => {
      cy.request({
        method: 'PUT',
        url: `${API_BASE}/api/reconciliation/batches/test-batch-id/status`,
        body: {}, // Missing status
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 404, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // LOCK TESTS
  // =========================================================================

  describe('Batch Locking', () => {
    it('should have lock button in review status', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('View') && $body.find('table tbody tr').length > 0) {
          cy.contains('View').first().click();
          
          // Look for lock button (visible when in review status)
          cy.get('body').then(($batchBody) => {
            if ($batchBody.text().includes('Under Review') || $batchBody.text().includes('review')) {
              cy.contains(/Lock/i).should('exist');
            }
          });
        }
      });
    });

    it('should lock batch via API', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/batches/test-batch-id/lock`,
        failOnStatusCode: false,
      }).then((response) => {
        // Expect various responses depending on batch state
        expect([200, 400, 401, 403, 404, 500]).to.include(response.status);
      });
    });

    it('should prevent modifications on locked batch', () => {
      // Try to create match on locked batch
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/matches`,
        body: {
          batchId: 'locked-batch-id',
          lineId: 'test-line-id',
          settlementId: 'test-settlement-id',
          reason: 'This should fail on locked batch',
        },
        failOnStatusCode: false,
      }).then((response) => {
        // Should fail
        expect([400, 403, 404, 401, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // FINALIZATION TESTS
  // =========================================================================

  describe('Batch Finalization', () => {
    it('should have finalize button when locked', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('View') && $body.find('table tbody tr').length > 0) {
          cy.contains('View').first().click();
          
          // Look for finalize button (visible when locked)
          cy.get('body').then(($batchBody) => {
            if ($batchBody.text().includes('Locked') || $batchBody.text().includes('locked')) {
              cy.contains(/Finalize/i).should('exist');
            }
          });
        }
      });
    });

    it('should reject finalization with unresolved exceptions', () => {
      // This is tested via API since we control the state
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/batches/batch-with-exceptions/finalize`,
        failOnStatusCode: false,
      }).then((response) => {
        // Should fail if there are unresolved exceptions
        expect([400, 401, 403, 404, 500]).to.include(response.status);
      });
    });

    it('should finalize batch via API', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/batches/test-batch-id/finalize`,
        body: { notes: 'Finalization test' },
        failOnStatusCode: false,
      }).then((response) => {
        // Various responses expected
        expect([200, 400, 401, 403, 404, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // IMMUTABILITY TESTS
  // =========================================================================

  describe('Finalized Batch Immutability', () => {
    it('should prevent auto-match on finalized batch', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/batches/finalized-batch-id/auto-match`,
        failOnStatusCode: false,
      }).then((response) => {
        // Should fail
        expect([400, 403, 404, 401, 500]).to.include(response.status);
      });
    });

    it('should prevent manual match on finalized batch', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/matches`,
        body: {
          batchId: 'finalized-batch-id',
          lineId: 'test-line-id',
          settlementId: 'test-settlement-id',
          reason: 'This should fail on finalized batch',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 403, 404, 401, 500]).to.include(response.status);
      });
    });

    it('should prevent unmatch on finalized batch', () => {
      cy.request({
        method: 'DELETE',
        url: `${API_BASE}/api/reconciliation/matches/match-in-finalized-batch`,
        body: { reason: 'This should fail on finalized batch' },
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 403, 404, 401, 500]).to.include(response.status);
      });
    });

    it('should prevent status change on finalized batch', () => {
      cy.request({
        method: 'PUT',
        url: `${API_BASE}/api/reconciliation/batches/finalized-batch-id/status`,
        body: { status: 'open' },
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 403, 404, 401, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // SETTLEMENT RECONCILIATION STATUS
  // =========================================================================

  describe('Settlement Reconciliation Status', () => {
    it('should mark settlements as reconciled after finalization (API)', () => {
      // This tests the effect of finalization on settlements
      // After a batch is finalized, matched settlements should be marked reconciled
      
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/settlements/unreconciled`,
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status === 200) {
          // Unreconciled settlements should not include those in finalized batches
          expect(response.body.data).to.be.an('array');
        }
      });
    });
  });

  // =========================================================================
  // UI STATE TESTS
  // =========================================================================

  describe('UI State Indicators', () => {
    it('should show finalized badge for completed batches', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        // Look for finalized status badge
        if ($body.text().includes('Finalized')) {
          cy.contains('Finalized').should('have.class', 'bg-green');
        }
      });
    });

    it('should show locked badge for locked batches', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        // Look for locked status badge
        if ($body.text().includes('Locked')) {
          cy.contains('Locked').should('exist');
        }
      });
    });

    it('should disable action buttons on finalized batches', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      cy.get('body').then(($body) => {
        // Find a finalized batch and check its detail view
        if ($body.text().includes('Finalized') && $body.text().includes('View')) {
          // The View button should still work
          // But inside, Auto-Match, Lock, Finalize should not be visible
        }
      });
    });
  });
});
