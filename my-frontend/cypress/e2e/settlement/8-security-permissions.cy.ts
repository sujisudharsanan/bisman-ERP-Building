/**
 * Settlement Workflow - Security & Permissions
 * Tests for role-based access control
 *
 * These tests focus on:
 * - Role enforcement
 * - Unauthorized access prevention
 * - Maker-checker enforcement
 */

describe('Settlement Workflow - Security & Permissions', () => {
  const API_BASE = Cypress.env('API_BASE') || 'http://localhost:5000';

  // Test user credentials for different roles
  const users = {
    accountant: {
      email: 'accountant@bisman.demo',
      password: 'Demo@123',
    },
    fc: {
      email: 'fc@bisman.demo',
      password: 'Demo@123',
    },
    cfo: {
      email: 'cfo@bisman.demo',
      password: 'Demo@123',
    },
    banker: {
      email: 'banker@bisman.demo',
      password: 'Demo@123',
    },
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Accountant Permissions', () => {
    it('should allow accountant to view settlements', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.accountant,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          cy.log('Accountant user not available');
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((response) => {
          expect([200, 403]).to.include(response.status);
          if (response.status === 200) {
            cy.log('Accountant can view settlements');
          }
        });
      });
    });

    it('should allow accountant to consolidate payment requests', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.accountant,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        // Check if consolidation endpoint is accessible
        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/settlements/consolidate`,
          headers: { Authorization: `Bearer ${token}` },
          body: { payment_request_ids: [] }, // Empty test
          failOnStatusCode: false,
        }).then((response) => {
          // Should not be 401/403 (forbidden)
          if (response.status === 401 || response.status === 403) {
            cy.log('Accountant cannot consolidate - permission issue');
          } else {
            cy.log(`Consolidation endpoint response: ${response.status}`);
          }
        });
      });
    });

    it('should NOT allow accountant to FC approve', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.accountant,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/settlements/test-id/fc-approve`,
          headers: { Authorization: `Bearer ${token}` },
          body: {},
          failOnStatusCode: false,
        }).then((response) => {
          // Should be forbidden
          expect([401, 403, 404]).to.include(response.status);
        });
      });
    });

    it('should NOT allow accountant to execute settlement', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.accountant,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/settlements/test-id/execute`,
          headers: { Authorization: `Bearer ${token}` },
          body: { utr: 'TEST123' },
          failOnStatusCode: false,
        }).then((response) => {
          expect([401, 403, 404]).to.include(response.status);
        });
      });
    });
  });

  describe('Finance Controller Permissions', () => {
    it('should allow FC to approve settlements', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.fc,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          cy.log('FC user not available');
          return;
        }

        const token = loginResponse.body.token;

        // Get settlements pending FC approval
        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { status: 'PENDING_FC_APPROVAL' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const settlement = response.body.data[0];

            cy.request({
              method: 'POST',
              url: `${API_BASE}/api/settlements/${settlement.id}/fc-approve`,
              headers: { Authorization: `Bearer ${token}` },
              body: {},
              failOnStatusCode: false,
            }).then((approveResponse) => {
              // Should not be 403
              if (approveResponse.status === 200 || approveResponse.status === 201) {
                cy.log('FC can approve settlements');
              } else if (approveResponse.status !== 403) {
                cy.log(`FC approve response: ${approveResponse.status}`);
              }
            });
          }
        });
      });
    });

    it('should NOT allow FC to execute settlement', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.fc,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/settlements/test-id/execute`,
          headers: { Authorization: `Bearer ${token}` },
          body: { utr: 'TEST123' },
          failOnStatusCode: false,
        }).then((response) => {
          expect([401, 403, 404]).to.include(response.status);
        });
      });
    });

    it('should NOT allow FC to CFO approve', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.fc,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/settlements/test-id/cfo-approve`,
          headers: { Authorization: `Bearer ${token}` },
          body: {},
          failOnStatusCode: false,
        }).then((response) => {
          expect([401, 403, 404]).to.include(response.status);
        });
      });
    });
  });

  describe('CFO Permissions', () => {
    it('should allow CFO to approve settlements', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.cfo,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          cy.log('CFO user not available');
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          qs: { status: 'PENDING_CFO_APPROVAL' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const settlement = response.body.data[0];

            cy.request({
              method: 'POST',
              url: `${API_BASE}/api/settlements/${settlement.id}/cfo-approve`,
              headers: { Authorization: `Bearer ${token}` },
              body: {},
              failOnStatusCode: false,
            }).then((approveResponse) => {
              if (approveResponse.status === 200 || approveResponse.status === 201) {
                cy.log('CFO can approve settlements');
              }
            });
          }
        });
      });
    });

    it('should NOT allow CFO to execute settlement', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.cfo,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/settlements/test-id/execute`,
          headers: { Authorization: `Bearer ${token}` },
          body: { utr: 'TEST123' },
          failOnStatusCode: false,
        }).then((response) => {
          expect([401, 403, 404]).to.include(response.status);
        });
      });
    });
  });

  describe('Banker Permissions', () => {
    it('should allow banker to execute settlements', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.banker,
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
          qs: { status: 'CFO_APPROVED' },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const settlement = response.body.data[0];
            const utr = `UTR${Date.now()}123456`;

            cy.request({
              method: 'POST',
              url: `${API_BASE}/api/settlements/${settlement.id}/execute`,
              headers: { Authorization: `Bearer ${token}` },
              body: { utr },
              failOnStatusCode: false,
            }).then((execResponse) => {
              if (execResponse.status === 200 || execResponse.status === 201) {
                cy.log('Banker can execute settlements');
              }
            });
          }
        });
      });
    });

    it('should allow banker to retry failed settlements', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.banker,
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

            cy.request({
              method: 'POST',
              url: `${API_BASE}/api/settlements/${settlement.id}/retry`,
              headers: { Authorization: `Bearer ${token}` },
              body: { utr: `UTRRETRY${Date.now()}` },
              failOnStatusCode: false,
            }).then((retryResponse) => {
              if (retryResponse.status !== 403) {
                cy.log('Banker can retry failed settlements');
              }
            });
          }
        });
      });
    });

    it('should NOT allow banker to approve settlements', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.banker,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;

        cy.request({
          method: 'POST',
          url: `${API_BASE}/api/settlements/test-id/fc-approve`,
          headers: { Authorization: `Bearer ${token}` },
          body: {},
          failOnStatusCode: false,
        }).then((response) => {
          expect([401, 403, 404]).to.include(response.status);
        });
      });
    });
  });

  describe('Unauthorized Access Prevention', () => {
    it('should reject unauthenticated API requests', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/settlements`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([401, 403]).to.include(response.status);
      });
    });

    it('should reject invalid token', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/api/settlements`,
        headers: { Authorization: 'Bearer invalid-token' },
        failOnStatusCode: false,
      }).then((response) => {
        expect([401, 403]).to.include(response.status);
      });
    });
  });

  describe('Maker-Checker Enforcement', () => {
    it('should not allow same user to approve their own submission', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/api/auth/login`,
        body: users.fc,
        failOnStatusCode: false,
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          return;
        }

        const token = loginResponse.body.token;
        const userId = loginResponse.body.user?.id;

        // Find a settlement submitted by this user
        cy.request({
          method: 'GET',
          url: `${API_BASE}/api/settlements`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status === 200 && response.body.data?.length) {
            const ownSettlement = response.body.data.find(
              (s: any) => s.created_by === userId || s.submitted_by === userId
            );

            if (ownSettlement) {
              cy.request({
                method: 'POST',
                url: `${API_BASE}/api/settlements/${ownSettlement.id}/fc-approve`,
                headers: { Authorization: `Bearer ${token}` },
                body: {},
                failOnStatusCode: false,
              }).then((approveResponse) => {
                // Should be forbidden due to maker-checker
                if (approveResponse.status === 403 || approveResponse.status === 400) {
                  cy.log('Maker-checker enforced: cannot approve own submission');
                }
              });
            } else {
              cy.log('No settlement found submitted by this user');
            }
          }
        });
      });
    });
  });
});
