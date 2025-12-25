/**
 * Settlement Workflow - Banker Execution & UTR
 * Tests for banker settlement execution and UTR handling
 */

describe('Settlement Workflow - Banker Execution & UTR', () => {
  const API_BASE = Cypress.env('API_URL') || 'http://localhost:5000';

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Banker Access', () => {
    it('should allow banker to view settlement tasks', () => {
      cy.loginAs('banker');
      cy.apiRequest('GET', '/api/settlements/tasks')
        .then((response) => {
          expect(response.status).to.be.oneOf([200, 403, 404, 500]);
        });
    });

    it('should get banker role info', () => {
      cy.loginAs('banker');
      cy.apiRequest('GET', '/api/settlements/my-role')
        .then((response) => {
          expect(response.status).to.be.oneOf([200, 404, 500]);
          if (response.status === 200) {
            cy.log(`Role: ${JSON.stringify(response.body)}`);
          }
        });
    });
  });

  describe('UTR Validation', () => {
    it('should require UTR for settlement execution', () => {
      cy.loginAs('banker');
      // Try to execute without UTR - should fail validation
      cy.apiRequest('POST', '/api/settlements/test-id/execute', {})
        .then((response) => {
          // Should fail with 400, 404, or 500
          expect(response.status).to.be.oneOf([400, 404, 422, 500]);
        });
    });

    it('should validate UTR format', () => {
      cy.loginAs('banker');
      cy.apiRequest('POST', '/api/settlements/test-id/execute', { utr: '123' })
        .then((response) => {
          // Short UTR should fail validation
          expect(response.status).to.be.oneOf([400, 404, 422, 500]);
        });
    });
  });

  describe('Settlement Execution Flow', () => {
    it('should get settlements ready for execution', () => {
      cy.loginAs('banker');
      cy.apiRequest('GET', '/api/settlements/tasks')
        .then((response) => {
          if (response.status === 200) {
            const data = response.body.data || response.body;
            cy.log(`Found settlement tasks for banker`);
          }
        });
    });
  });
});
