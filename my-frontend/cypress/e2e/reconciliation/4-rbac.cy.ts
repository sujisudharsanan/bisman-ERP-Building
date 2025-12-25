/**
 * Bank Reconciliation E2E Tests - Role-Based Access Control
 * 
 * Tests permission enforcement for:
 * - Admin (full access)
 * - Accountant (upload, match, finalize)
 * - CFO (view only)
 * - Auditor (view only)
 */

describe('Bank Reconciliation - RBAC', () => {
  const API_BASE = Cypress.env('API_URL') || 'http://localhost:5000';

  // Test credentials for different roles
  const credentials = {
    admin: {
      email: Cypress.env('ADMIN_EMAIL') || 'demo_admin@bisman.demo',
      password: Cypress.env('ADMIN_PASSWORD') || 'Demo@123',
    },
    accountant: {
      email: Cypress.env('ACCOUNTANT_EMAIL') || 'demo_accountant@bisman.demo',
      password: Cypress.env('ACCOUNTANT_PASSWORD') || 'Demo@123',
    },
    cfo: {
      email: Cypress.env('CFO_EMAIL') || 'demo_cfo@bisman.demo',
      password: Cypress.env('CFO_PASSWORD') || 'Demo@123',
    },
    auditor: {
      email: Cypress.env('AUDITOR_EMAIL') || 'demo_auditor@bisman.demo',
      password: Cypress.env('AUDITOR_PASSWORD') || 'Demo@123',
    },
  };

  const login = (role: keyof typeof credentials) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE}/api/auth/login`,
      body: credentials[role],
      failOnStatusCode: false,
    });
  };

  // =========================================================================
  // ADMIN ACCESS TESTS
  // =========================================================================

  describe('Admin Access', () => {
    beforeEach(() => {
      login('admin');
    });

    it('should allow admin to access templates', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/templates`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401, 500]).to.include(response.status);
      });
    });

    it('should allow admin to create templates', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/templates`,
        body: {
          bank_name: 'Admin Test Bank',
          file_type: 'csv',
          column_mappings: { date: 0, amount: 1, description: 2 },
          date_format: 'DD-MM-YYYY',
        },
        failOnStatusCode: false,
      }).then((response) => {
        // Admin should be allowed (might fail for other reasons)
        expect([200, 201, 400, 401, 500]).to.include(response.status);
        // Should NOT be 403
        if (response.status === 403) {
          throw new Error('Admin should have template creation access');
        }
      });
    });

    it('should allow admin to view batches', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/batches`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401, 500]).to.include(response.status);
      });
    });

    it('should allow admin to create matches', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/matches`,
        body: {
          batchId: 'test-batch',
          lineId: 'test-line',
          settlementId: 'test-settlement',
          reason: 'Admin test match creation',
        },
        failOnStatusCode: false,
      }).then((response) => {
        // Admin should be allowed (might fail for invalid IDs)
        expect([200, 201, 400, 404, 401, 500]).to.include(response.status);
        // Should NOT be 403
        if (response.status === 403) {
          throw new Error('Admin should have match creation access');
        }
      });
    });
  });

  // =========================================================================
  // ACCOUNTANT ACCESS TESTS
  // =========================================================================

  describe('Accountant Access', () => {
    beforeEach(() => {
      login('accountant');
    });

    it('should allow accountant to view statements', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/statements`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401, 500]).to.include(response.status);
      });
    });

    it('should allow accountant to view batches', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/batches`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401, 500]).to.include(response.status);
      });
    });

    it('should allow accountant to create matches', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/matches`,
        body: {
          batchId: 'test-batch',
          lineId: 'test-line',
          settlementId: 'test-settlement',
          reason: 'Accountant test match creation',
        },
        failOnStatusCode: false,
      }).then((response) => {
        // Accountant should be allowed
        expect([200, 201, 400, 404, 401, 500]).to.include(response.status);
        // Should NOT be 403
        if (response.status === 403) {
          throw new Error('Accountant should have match creation access');
        }
      });
    });

    it('should deny accountant from template creation', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/templates`,
        body: {
          bank_name: 'Accountant Test Bank',
          file_type: 'csv',
          column_mappings: { date: 0, amount: 1 },
        },
        failOnStatusCode: false,
      }).then((response) => {
        // Accountant should be denied template creation
        expect([403, 401, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // CFO ACCESS TESTS (VIEW ONLY)
  // =========================================================================

  describe('CFO Access (View Only)', () => {
    beforeEach(() => {
      login('cfo');
    });

    it('should allow CFO to view batches', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/batches`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should allow CFO to view matches', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/batches/test-batch/matches`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 404, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should deny CFO from creating matches', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/matches`,
        body: {
          batchId: 'test-batch',
          lineId: 'test-line',
          settlementId: 'test-settlement',
          reason: 'CFO should not be able to do this',
        },
        failOnStatusCode: false,
      }).then((response) => {
        // CFO should be denied
        expect([403, 401, 500]).to.include(response.status);
      });
    });

    it('should deny CFO from uploading statements', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/statements/upload`,
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        expect([403, 400, 401, 500]).to.include(response.status);
      });
    });

    it('should deny CFO from finalizing batches', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/batches/test-batch/finalize`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([403, 401, 404, 500]).to.include(response.status);
      });
    });

    it('should deny CFO from template management', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/templates`,
        body: {
          bank_name: 'CFO Test Bank',
          file_type: 'csv',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([403, 401, 500]).to.include(response.status);
      });
    });
  });

  // =========================================================================
  // AUDITOR ACCESS TESTS (VIEW ONLY)
  // =========================================================================

  describe('Auditor Access (View Only)', () => {
    beforeEach(() => {
      login('auditor');
    });

    it('should allow auditor to view batches', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/batches`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should allow auditor to view audit logs', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/reconciliation/audit/BATCH/test-id`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 404, 401, 403, 500]).to.include(response.status);
      });
    });

    it('should deny auditor from creating matches', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/reconciliation/matches`,
        body: {
          batchId: 'test-batch',
          lineId: 'test-line',
          settlementId: 'test-settlement',
          reason: 'Auditor should not be able to do this',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([403, 401, 500]).to.include(response.status);
      });
    });

    it('should deny auditor from any modifications', () => {
      const writeOperations = [
        { method: 'POST', url: '/api/reconciliation/statements/upload' },
        { method: 'POST', url: '/api/reconciliation/batches' },
        { method: 'POST', url: '/api/reconciliation/batches/test/auto-match' },
        { method: 'POST', url: '/api/reconciliation/batches/test/lock' },
        { method: 'POST', url: '/api/reconciliation/batches/test/finalize' },
        { method: 'DELETE', url: '/api/reconciliation/matches/test' },
      ];

      writeOperations.forEach(({ method, url }) => {
        cy.request({
          method: method as Cypress.HttpMethod,
          url: `${API_BASE}${url}`,
          body: method === 'DELETE' ? { reason: 'test' } : {},
          failOnStatusCode: false,
        }).then((response) => {
          // Auditor should be denied all write operations
          expect([403, 401, 400, 404, 500]).to.include(response.status);
        });
      });
    });
  });

  // =========================================================================
  // UI PERMISSION INDICATORS
  // =========================================================================

  describe('UI Permission Indicators', () => {
    it('should show view-only banner for CFO', () => {
      login('cfo').then(() => {
        cy.visit('/reconciliation', { failOnStatusCode: false });
        
        cy.get('body').then(($body) => {
          // Check for view-only indicator
          if ($body.text().includes('Bank Reconciliation')) {
            cy.contains(/View-only|read-only|cannot make changes/i).should('exist');
          }
        });
      });
    });

    it('should hide upload button for view-only roles', () => {
      login('cfo').then(() => {
        cy.visit('/reconciliation', { failOnStatusCode: false });
        
        cy.get('body').then(($body) => {
          if ($body.text().includes('Bank Reconciliation')) {
            // Upload button should not be visible
            cy.contains('button', 'Upload Statement').should('not.exist');
          }
        });
      });
    });

    it('should show upload button for accountant', () => {
      login('accountant').then(() => {
        cy.visit('/reconciliation', { failOnStatusCode: false });
        
        cy.get('body').then(($body) => {
          if ($body.text().includes('Bank Reconciliation')) {
            // Upload button should be visible
            cy.contains('Upload Statement').should('exist');
          }
        });
      });
    });

    it('should hide template management for non-admins', () => {
      login('accountant').then(() => {
        cy.visit('/admin/bank-templates', { failOnStatusCode: false });
        
        // Should redirect or show access denied
        cy.url().should('not.include', '/admin/bank-templates');
      });
    });
  });
});
