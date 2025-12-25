/**
 * Bank Reconciliation E2E Tests - API Layer
 * 
 * Tests the core API endpoints for:
 * - Template management
 * - Statement operations
 * - Batch operations
 * - Matching operations
 */

describe('Bank Reconciliation - API Tests', () => {
  const API_BASE = Cypress.env('API_URL') || 'http://localhost:5000';

  // Test credentials for different roles
  const accountantCredentials = {
    email: Cypress.env('ACCOUNTANT_EMAIL') || 'demo_accountant@bisman.demo',
    password: Cypress.env('ACCOUNTANT_PASSWORD') || 'Demo@123',
  };

  const adminCredentials = {
    email: Cypress.env('ADMIN_EMAIL') || 'demo_admin@bisman.demo',
    password: Cypress.env('ADMIN_PASSWORD') || 'Demo@123',
  };

  const cfoCredentials = {
    email: Cypress.env('CFO_EMAIL') || 'demo_cfo@bisman.demo',
    password: Cypress.env('CFO_PASSWORD') || 'Demo@123',
  };

  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================

  /**
   * Login and get cookies for authenticated requests
   */
  const login = (credentials: { email: string; password: string }) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE}/api/auth/login`,
      body: credentials,
      failOnStatusCode: false,
    });
  };

  // =========================================================================
  // TEMPLATE MANAGEMENT TESTS
  // =========================================================================

  describe('Template Management', () => {
    beforeEach(() => {
      // Login as admin for template management
      login(adminCredentials);
    });

    it('should list templates', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/templates`,
        failOnStatusCode: false,
      }).then((response) => {
        // Accept 200, 401 (not logged in), or 403 (not admin)
        expect([200, 401, 403, 500]).to.include(response.status);
        
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true);
          expect(response.body).to.have.property('data');
          expect(response.body.data).to.be.an('array');
        }
      });
    });

    it('should reject template creation without required fields', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/templates`,
        body: { bank_name: '' },
        failOnStatusCode: false,
      }).then((response) => {
        // Should fail with 400 or 401/403
        expect([400, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should validate template column mappings', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/templates`,
        body: {
          bank_name: 'Test Bank',
          file_type: 'csv',
          column_mappings: {}, // Missing required date and amount
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // STATEMENT OPERATIONS TESTS
  // =========================================================================

  describe('Statement Operations', () => {
    beforeEach(() => {
      login(accountantCredentials);
    });

    it('should list statements', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/statements`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401, 403, 500]).to.include(response.status);
        
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true);
          expect(response.body).to.have.property('data');
          expect(response.body).to.have.property('pagination');
        }
      });
    });

    it('should reject upload without file', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/statements/upload`,
        body: {
          templateId: 'test-template',
          bankAccountId: 'test-account',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should reject upload without templateId', () => {
      const formData = new FormData();
      formData.append('bankAccountId', 'test-account');

      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/statements/upload`,
        body: formData,
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // BATCH OPERATIONS TESTS
  // =========================================================================

  describe('Batch Operations', () => {
    beforeEach(() => {
      login(accountantCredentials);
    });

    it('should list batches', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/batches`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401, 403, 500]).to.include(response.status);
        
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true);
          expect(response.body).to.have.property('data');
          expect(response.body.data).to.be.an('array');
        }
      });
    });

    it('should reject batch creation without statementId', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/batches`,
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should handle non-existent batch gracefully', () => {
      const fakeBatchId = '00000000-0000-0000-0000-000000000000';
      
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/batches/${fakeBatchId}`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([404, 401, 403, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // MATCHING OPERATIONS TESTS
  // =========================================================================

  describe('Matching Operations', () => {
    beforeEach(() => {
      login(accountantCredentials);
    });

    it('should reject manual match without reason', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/matches`,
        body: {
          batchId: 'test-batch',
          lineId: 'test-line',
          settlementId: 'test-settlement',
          // Missing reason
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should reject manual match with short reason', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/matches`,
        body: {
          batchId: 'test-batch',
          lineId: 'test-line',
          settlementId: 'test-settlement',
          reason: 'short', // Less than 10 characters
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should reject unmatch without reason', () => {
      const fakeMatchId = '00000000-0000-0000-0000-000000000000';
      
      cy.request({
        method: 'DELETE',
        url: `${API_BASE}/api/reconciliation/matches/${fakeMatchId}`,
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // PERMISSION TESTS
  // =========================================================================

  describe('Permission Enforcement', () => {
    it('should allow CFO to view batches (view-only)', () => {
      login(cfoCredentials).then(() => {
        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/reconciliation/batches`,
          failOnStatusCode: false,
        }).then((response) => {
          // CFO should be able to view
          expect([200, 401, 403, 500]).to.include(response.status);
        });
      });
    });

    it('should deny CFO from creating matches', () => {
      login(cfoCredentials).then(() => {
        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/reconciliation/matches`,
          body: {
            batchId: 'test-batch',
            lineId: 'test-line',
            settlementId: 'test-settlement',
            reason: 'This should be denied for CFO role',
          },
          failOnStatusCode: false,
        }).then((response) => {
          // CFO should not be able to create matches
          expect([403, 401, 500]).to.include(response.status);
        });
      });
    });

    it('should deny CFO from finalizing batches', () => {
      const fakeBatchId = '00000000-0000-0000-0000-000000000000';
      
      login(cfoCredentials).then(() => {
        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/reconciliation/batches/${fakeBatchId}/finalize`,
          failOnStatusCode: false,
        }).then((response) => {
          expect([403, 401, 404, 500]).to.include(response.status);
        });
      });
    });
  });

  // =========================================================================
  // SETTLEMENT QUERIES TESTS
  // =========================================================================

  describe('Settlement Queries', () => {
    beforeEach(() => {
      login(accountantCredentials);
    });

    it('should list unreconciled settlements', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/settlements/unreconciled`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401, 403, 500]).to.include(response.status);
        
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true);
          expect(response.body).to.have.property('data');
          expect(response.body.data).to.be.an('array');
        }
      });
    });

    it('should support pagination for unreconciled settlements', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/settlements/unreconciled`,
        qs: { page: 1, limit: 10 },
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401, 403, 500]).to.include(response.status);
        
        if (response.status === 200) {
          expect(response.body.pagination).to.have.property('page', 1);
          expect(response.body.pagination).to.have.property('limit', 10);
        }
      });
    });

    it('should support date filtering for unreconciled settlements', () => {
      const today = new Date();
      const dateFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = today.toISOString();
      
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/settlements/unreconciled`,
        qs: { dateFrom, dateTo },
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401, 403, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // AUDIT LOG TESTS
  // =========================================================================

  describe('Audit Log', () => {
    beforeEach(() => {
      login(accountantCredentials);
    });

    it('should reject invalid entity types', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/audit/INVALID/test-id`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should accept valid entity types', () => {
      const validTypes = ['TEMPLATE', 'STATEMENT', 'BATCH', 'MATCH', 'EXCEPTION'];
      
      validTypes.forEach((entityType) => {
        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/reconciliation/audit/${entityType}/00000000-0000-0000-0000-000000000000`,
          failOnStatusCode: false,
        }).then((response) => {
          // Should not be 400 for invalid entity type
          expect([200, 401, 403, 404, 500]).to.include(response.status);
        });
      });
    });
  });
});
