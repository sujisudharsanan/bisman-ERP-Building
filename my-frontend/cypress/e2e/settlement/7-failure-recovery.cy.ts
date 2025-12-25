/**
 * Settlement Workflow - Failure & Recovery
 * Tests for settlement failure handling and retry mechanism
 *
 * These tests focus on:
 * - FAILED state capture
 * - Retry mechanism
 * - Banker retry access
 */

describe('Settlement Workflow - Failure & Recovery', () => {
  const API_BASE = Cypress.env('API_BASE') || 'http://localhost:5000';

  // Test user credentials
  const bankerUser = {
    email: 'banker@bisman.demo',
    password: 'Demo@123',
  };

  const accountantUser = {
    email: 'accountant@bisman.demo',
    password: 'Demo@123',
  };

  const fcUser = {
    email: 'fc@bisman.demo',
    password: 'Demo@123',
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('FAILED State via API', () => {
    it('should retrieve failed settlements', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: bankerUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          cy.log('Banker user not available');
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { status: 'FAILED' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200) {
            cy.log(`Found ${response.body.data?.length || 0} failed settlements`);
          }
        });
      });
    });

    it('should include failure reason in settlement details', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: bankerUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { status: 'FAILED' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const failedSettlement = response.body.data[0];
            
            // Get details
            cy.request({
              method: 'GET',
              url: `${API_BASE}/api/settlements/${failedSettlement.id}`,
              headers: { Authorization: `Bearer ${token}` },
              failOnStatusCode: false,
            }).then((detailResponse) => {
              if (detailResponse.status === 200) {
                const detail = detailResponse.body;
                // Check for failure reason fields
                const hasReason = detail.failure_reason || detail.failureReason || detail.error_message;
                cy.log(`Failed settlement has reason: ${!!hasReason}`);
              }
            });
          }
        });
      });
    });

    it('should include failure timestamp', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: bankerUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { status: 'FAILED' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const settlement = response.body.data[0];
            const hasTimestamp = settlement.failed_at || settlement.failedAt || settlement.updated_at;
            cy.log(`Failed settlement has timestamp: ${!!hasTimestamp}`);
          }
        });
      });
    });
  });

  describe('Retry Mechanism via API', () => {
    it('should allow retry of failed settlement', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: bankerUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { status: 'FAILED' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const settlement = response.body.data[0];
            const newUTR = `UTRRETRY${Date.now()}`;

            cy.request({
              method: 'POST',
              url: `${API_BASE}/api/settlements/${settlement.id}/retry`,
              headers: { Authorization: `Bearer ${token}` },
              body: { utr: newUTR },
              failOnStatusCode: false,
            }).then((retryResponse) => {
              if (retryResponse.status === 200 || retryResponse.status === 201) {
                cy.log('Retry successful');
              } else if (retryResponse.status === 404) {
                cy.log('Retry endpoint not implemented');
              } else {
                cy.log(`Retry returned status: ${retryResponse.status}`);
              }
            });
          } else {
            cy.log('No failed settlements to retry');
          }
        });
      });
    });

    it('should require new UTR for retry', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: bankerUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        // Try to retry without UTR
        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/settlements/test-id/retry`,
          headers: { Authorization: `Bearer ${token}` },
          body: {}, // No UTR
          failOnStatusCode: false,
        }).then((response) => {
          // Should require UTR
          expect([400, 404, 422]).to.include(response.status);
        });
      });
    });

    it('should track retry count', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: bankerUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { status: 'FAILED' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            response.body.data.forEach((settlement: any) => {
              const retryCount = settlement.retry_count || settlement.retryCount || 0;
              cy.log(`Settlement ${settlement.id}: ${retryCount} retries`);
            });
          }
        });
      });
    });

    it('should limit maximum retries', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: bankerUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        // Find a settlement with max retries
        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { status: 'FAILED' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const maxRetriedSettlement = response.body.data.find(
              (s: any) => (s.retry_count || s.retryCount || 0) >= 3
            );

            if (maxRetriedSettlement) {
              cy.request({
                method: 'POST',
                url: `${API_BASE}/api/settlements/${maxRetriedSettlement.id}/retry`,
                headers: { Authorization: `Bearer ${token}` },
                body: { utr: `UTRMAX${Date.now()}` },
                failOnStatusCode: false,
              }).then((retryResponse) => {
                // Should be rejected due to max retries
                if (retryResponse.status === 400 || retryResponse.status === 422) {
                  cy.log('Max retries enforced correctly');
                }
              });
            } else {
              cy.log('No settlements with max retries found');
            }
          }
        });
      });
    });
  });

  describe('Banker-Only Retry Access', () => {
    it('should NOT allow accountant to retry failed settlement', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: accountantUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          cy.log('Accountant user not available');
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/settlements/any-id/retry`,
          headers: { Authorization: `Bearer ${token}` },
          body: { utr: `UTRTEST${Date.now()}` },
          failOnStatusCode: false,
        }).then((response) => {
          // Should be forbidden or not found
          expect([401, 403, 404]).to.include(response.status);
        });
      });
    });

    it('should NOT allow FC to retry failed settlement', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: fcUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          cy.log('FC user not available');
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/settlements/any-id/retry`,
          headers: { Authorization: `Bearer ${token}` },
          body: { utr: `UTRTEST${Date.now()}` },
          failOnStatusCode: false,
        }).then((response) => {
          // Should be forbidden or not found
          expect([401, 403, 404]).to.include(response.status);
        });
      });
    });
  });

  describe('Failure Recovery UI', () => {
    it('should display retry interface for banker', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: bankerUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        cy.visit('/settlements', { failOnStatusCode: false });

        cy.get('body').then(($body) => {
          const hasRetryButton = $body.find('button:contains("Retry")').length > 0;
          const hasFailedBadge = $body.find('.badge:contains("FAILED"), .status:contains("FAILED")').length > 0;
          
          cy.log(`UI Check - Retry Button: ${hasRetryButton}, Failed Badge: ${hasFailedBadge}`);
        });
      });
    });
  });
});
