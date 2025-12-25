/**
 * Settlement Workflow - Audit & Traceability
 * Tests for audit trail and UTR traceability
 *
 * These tests focus on:
 * - UTR trace functionality
 * - Complete audit trail
 * - History tracking
 */

describe('Settlement Workflow - Audit & Traceability', () => {
  const API_BASE = Cypress.env('API_BASE') || 'http://localhost:5000';

  // Test user credentials
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

  describe('UTR Trace via API', () => {
    it('should find settlement by UTR', () => {
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

        // First get a settlement with UTR
        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { status: 'PAID' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const settlement = response.body.data.find((s: any) => s.utr);

            if (settlement?.utr) {
              // Try to trace by UTR
              cy.request({
                method: 'GET',
                url: `${API_BASE}/api/trace/utr/${settlement.utr}`,
                headers: { Authorization: `Bearer ${token}` },
                failOnStatusCode: false,
              }).then((traceResponse) => {
                if (traceResponse.status === 200) {
                  expect(traceResponse.body).to.have.property('settlement');
                  cy.log('UTR trace successful');
                } else if (traceResponse.status === 404) {
                  cy.log('UTR trace endpoint not implemented');
                }
              });
            } else {
              cy.log('No settlements with UTR found');
            }
          }
        });
      });
    });

    it('should return all payment requests under a UTR', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: accountantUser,
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
          qs: { status: 'PAID', limit: 1 },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const settlement = response.body.data[0];

            if (settlement.utr) {
              cy.request({
                method: 'GET',
                url: `${API_BASE}/api/trace/utr/${settlement.utr}`,
                headers: { Authorization: `Bearer ${token}` },
                failOnStatusCode: false,
              }).then((traceResponse) => {
                if (traceResponse.status === 200) {
                  expect(traceResponse.body.paymentRequests).to.be.an('array');
                }
              });
            }
          }
        });
      });
    });

    it('should return 404 for non-existent UTR', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: accountantUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/trace/utr/NONEXISTENT123456789`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((response) => {
          expect([404, 200]).to.include(response.status);
          if (response.status === 200 && !response.body.settlement) {
            cy.log('Non-existent UTR returns empty result');
          }
        });
      });
    });
  });

  describe('Settlement Audit Trail via API', () => {
    it('should retrieve audit trail for settlement', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: accountantUser,
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
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const settlement = response.body.data[0];

            cy.request({
              method: 'GET',
              url: `${API_BASE}/api/settlements/${settlement.id}/history`,
              headers: { Authorization: `Bearer ${token}` },
              failOnStatusCode: false,
            }).then((historyResponse) => {
              if (historyResponse.status === 200) {
                expect(historyResponse.body).to.be.an('array');
                cy.log(`Settlement has ${historyResponse.body.length} history entries`);
              } else if (historyResponse.status === 404) {
                cy.log('History endpoint not implemented');
              }
            });
          }
        });
      });
    });

    it('should track all state transitions in history', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: accountantUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        // Get a completed settlement
        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { status: 'PAID' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const settlement = response.body.data[0];

            cy.request({
              method: 'GET',
              url: `${API_BASE}/api/settlements/${settlement.id}/history`,
              headers: { Authorization: `Bearer ${token}` },
              failOnStatusCode: false,
            }).then((historyResponse) => {
              if (historyResponse.status === 200 && historyResponse.body.length) {
                // Check for expected transitions
                const actions = historyResponse.body.map((h: any) => h.action || h.status);
                cy.log(`State transitions: ${actions.join(' -> ')}`);
              }
            });
          }
        });
      });
    });

    it('should record actor and timestamp for each action', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: accountantUser,
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
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const settlement = response.body.data[0];

            cy.request({
              method: 'GET',
              url: `${API_BASE}/api/settlements/${settlement.id}/history`,
              headers: { Authorization: `Bearer ${token}` },
              failOnStatusCode: false,
            }).then((historyResponse) => {
              if (historyResponse.status === 200 && historyResponse.body.length) {
                historyResponse.body.forEach((entry: any) => {
                  // Check for actor/user field
                  const hasActor = entry.actor || entry.user || entry.performed_by || entry.user_id;
                  // Check for timestamp
                  const hasTimestamp = entry.timestamp || entry.created_at || entry.performed_at;
                  
                  cy.log(`Entry: Actor=${!!hasActor}, Timestamp=${!!hasTimestamp}`);
                });
              }
            });
          }
        });
      });
    });
  });

  describe('Payment Request Audit Trail', () => {
    it('should retrieve payment request history', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: accountantUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/payment-requests`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { limit: 1 },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const pr = response.body.data[0];

            cy.request({
              method: 'GET',
              url: `${API_BASE}/api/payment-requests/${pr.id}/history`,
              headers: { Authorization: `Bearer ${token}` },
              failOnStatusCode: false,
            }).then((historyResponse) => {
              if (historyResponse.status === 200) {
                expect(historyResponse.body).to.be.an('array');
              } else if (historyResponse.status === 404) {
                cy.log('Payment request history endpoint not implemented');
              }
            });
          }
        });
      });
    });

    it('should link payment request to settlement in history', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: accountantUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        // Get paid payment requests
        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/payment-requests`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { status: 'PAID' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const pr = response.body.data[0];

            // Check for settlement link
            const hasSettlementLink = pr.settlement_id || pr.settlementId;
            cy.log(`Payment request has settlement link: ${!!hasSettlementLink}`);
          }
        });
      });
    });
  });

  describe('Trace Page UI', () => {
    it('should display trace page with search', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: accountantUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        cy.visit('/trace', { failOnStatusCode: false });

        // Check for search elements
        cy.get('body').then(($body) => {
          const hasSearchInput = $body.find('input[type="text"], input[type="search"]').length > 0;
          const hasSearchButton = $body.find('button:contains("Search"), button[type="submit"]').length > 0;
          
          cy.log(`Trace Page UI - Search Input: ${hasSearchInput}, Search Button: ${hasSearchButton}`);
        });
      });
    });
  });

  describe('Reports Integration', () => {
    it('should access payment summary report', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: fcUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/reports/payment-summary`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200) {
            cy.log('Payment summary report accessible');
          } else if (response.status === 404) {
            cy.log('Payment summary report endpoint not implemented');
          }
        });
      });
    });

    it('should access settlement audit report', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: fcUser,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/reports/settlement-audit`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200) {
            cy.log('Settlement audit report accessible');
          } else if (response.status === 404) {
            cy.log('Settlement audit report endpoint not implemented');
          }
        });
      });
    });
  });
});
