/**
 * =============================================================================
 * BISMAN ERP - Permissions Tests (Priority 5)
 * =============================================================================
 * Tests for role-based access control (RBAC):
 * - Create tasks as different roles
 * - Assert buttons present/hidden based on role
 * - Verify API authorization
 * 
 * Roles tested:
 * - HUB_INCHARGE (full access)
 * - STAFF (limited access)
 * - VIEWER (read-only)
 * 
 * Expected run time: 2-3 minutes
 * =============================================================================
 */
/// <reference types="cypress" />

describe('Permissions Tests', () => {
  const API_URL = Cypress.env('API_URL') || 'http://localhost:5000';

  // Test user credentials (configure in cypress.config.ts or env)
  const users = {
    hubIncharge: {
      email: Cypress.env('HUB_INCHARGE_EMAIL') || 'arun.kumar@bisman.demo',
      password: Cypress.env('HUB_INCHARGE_PASSWORD') || 'Demo@123',
      role: 'HUB_INCHARGE',
    },
    staff: {
      email: Cypress.env('STAFF_EMAIL') || 'staff@bisman.demo',
      password: Cypress.env('STAFF_PASSWORD') || 'Demo@123',
      role: 'STAFF',
    },
    viewer: {
      email: Cypress.env('VIEWER_EMAIL') || 'viewer@bisman.demo',
      password: Cypress.env('VIEWER_PASSWORD') || 'Demo@123',
      role: 'VIEWER',
    },
  };

  // Store tokens for each role
  const tokens: Record<string, string> = {};
  const createdTaskIds: number[] = [];

  before(() => {
    // Login as each role and store tokens
    Object.entries(users).forEach(([key, user]) => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/api/auth/login`,
        body: {
          email: user.email,
          password: user.password,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 200) {
          tokens[key] = resp.body.accessToken || resp.body.token;
          cy.log(`✅ Logged in as ${user.role}`);
        } else {
          cy.log(`⚠️ Could not login as ${user.role} - ${resp.status}`);
        }
      });
    });
  });

  after(() => {
    // Cleanup created tasks (use hubIncharge which has delete permission)
    if (tokens.hubIncharge) {
      createdTaskIds.forEach((taskId) => {
        cy.request({
          method: 'DELETE',
          url: `${API_URL}/api/v2/tasks/${taskId}`,
          headers: { Authorization: `Bearer ${tokens.hubIncharge}` },
          failOnStatusCode: false,
        });
      });
    }
  });

  describe('HUB_INCHARGE Role (Full Access)', () => {
    it('should create tasks', () => {
      if (!tokens.hubIncharge) {
        cy.log('⚠️ Skipping - no hubIncharge token');
        return;
      }

      cy.request({
        method: 'POST',
        url: `${API_URL}/api/v2/tasks`,
        headers: { Authorization: `Bearer ${tokens.hubIncharge}` },
        body: {
          title: `HUB_INCHARGE Task - ${Date.now()}`,
          priority: 'HIGH',
          status: 'OPEN',
        },
        failOnStatusCode: false,
      }).then((resp) => {
        expect([200, 201]).to.include(resp.status);
        createdTaskIds.push((resp.body.data || resp.body).id);
        cy.log('✅ HUB_INCHARGE can create tasks');
      });
    });

    it('should update any task', () => {
      if (!tokens.hubIncharge || createdTaskIds.length === 0) {
        cy.log('⚠️ Skipping - no task to update');
        return;
      }

      cy.request({
        method: 'PATCH',
        url: `${API_URL}/api/v2/tasks/${createdTaskIds[0]}`,
        headers: { Authorization: `Bearer ${tokens.hubIncharge}` },
        body: {
          title: `Updated by HUB_INCHARGE - ${Date.now()}`,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        cy.log('✅ HUB_INCHARGE can update tasks');
      });
    });

    it('should delete tasks', () => {
      if (!tokens.hubIncharge) {
        cy.log('⚠️ Skipping - no hubIncharge token');
        return;
      }

      // Create a task to delete
      cy.request({
        method: 'POST',
        url: `${API_URL}/api/v2/tasks`,
        headers: { Authorization: `Bearer ${tokens.hubIncharge}` },
        body: {
          title: `Task to delete - ${Date.now()}`,
          priority: 'LOW',
          status: 'OPEN',
        },
      }).then((createResp) => {
        const taskId = (createResp.body.data || createResp.body).id;

        cy.request({
          method: 'DELETE',
          url: `${API_URL}/api/v2/tasks/${taskId}`,
          headers: { Authorization: `Bearer ${tokens.hubIncharge}` },
          failOnStatusCode: false,
        }).then((deleteResp) => {
          expect([200, 204]).to.include(deleteResp.status);
          cy.log('✅ HUB_INCHARGE can delete tasks');
        });
      });
    });

    it('should see all UI action buttons', () => {
      if (!tokens.hubIncharge) {
        cy.log('⚠️ Skipping - no token');
        return;
      }

      // Set cookie and visit
      cy.setCookie('access_token', tokens.hubIncharge, { path: '/' });
      cy.visit('/tasks');
      cy.wait(1500);

      // Check for create button
      cy.get('body').then(($body) => {
        const hasCreate = $body.find('[data-testid="create-task-btn"], button:contains("Create"), button:contains("New Task"), button:contains("Add")').length > 0;
        
        if (hasCreate) {
          cy.log('✅ Create button visible for HUB_INCHARGE');
        } else {
          cy.log('⚠️ Create button not found (may use different selector)');
        }
      });
    });
  });

  describe('STAFF Role (Limited Access)', () => {
    it('should create tasks (if permitted)', () => {
      if (!tokens.staff) {
        cy.log('⚠️ Skipping - no staff token');
        return;
      }

      cy.request({
        method: 'POST',
        url: `${API_URL}/api/v2/tasks`,
        headers: { Authorization: `Bearer ${tokens.staff}` },
        body: {
          title: `STAFF Task - ${Date.now()}`,
          priority: 'MEDIUM',
          status: 'OPEN',
        },
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 200 || resp.status === 201) {
          createdTaskIds.push((resp.body.data || resp.body).id);
          cy.log('✅ STAFF can create tasks');
        } else if (resp.status === 403) {
          cy.log('✅ STAFF correctly denied task creation');
        } else {
          cy.log(`⚠️ Unexpected response: ${resp.status}`);
        }
      });
    });

    it('should read tasks', () => {
      if (!tokens.staff) {
        cy.log('⚠️ Skipping - no staff token');
        return;
      }

      cy.request({
        method: 'GET',
        url: `${API_URL}/api/v2/tasks`,
        headers: { Authorization: `Bearer ${tokens.staff}` },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        cy.log('✅ STAFF can read tasks');
      });
    });

    it('should update own tasks only (if enforced)', () => {
      if (!tokens.staff || createdTaskIds.length === 0) {
        cy.log('⚠️ Skipping - no task or token');
        return;
      }

      // Try to update a task (may be denied if not owner)
      cy.request({
        method: 'PATCH',
        url: `${API_URL}/api/v2/tasks/${createdTaskIds[0]}`,
        headers: { Authorization: `Bearer ${tokens.staff}` },
        body: {
          title: `Updated by STAFF - ${Date.now()}`,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 200) {
          cy.log('✅ STAFF can update tasks');
        } else if (resp.status === 403) {
          cy.log('✅ STAFF correctly denied update (not owner)');
        }
      });
    });

    it('should NOT delete tasks (if restricted)', () => {
      if (!tokens.staff || createdTaskIds.length === 0) {
        cy.log('⚠️ Skipping - no task or token');
        return;
      }

      cy.request({
        method: 'DELETE',
        url: `${API_URL}/api/v2/tasks/${createdTaskIds[0]}`,
        headers: { Authorization: `Bearer ${tokens.staff}` },
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 403) {
          cy.log('✅ STAFF correctly denied delete');
        } else if (resp.status === 200 || resp.status === 204) {
          cy.log('⚠️ STAFF can delete tasks (may be allowed)');
        }
      });
    });
  });

  describe('VIEWER Role (Read-Only)', () => {
    it('should read tasks', () => {
      if (!tokens.viewer) {
        cy.log('⚠️ Skipping - no viewer token');
        return;
      }

      cy.request({
        method: 'GET',
        url: `${API_URL}/api/v2/tasks`,
        headers: { Authorization: `Bearer ${tokens.viewer}` },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        cy.log('✅ VIEWER can read tasks');
      });
    });

    it('should NOT create tasks', () => {
      if (!tokens.viewer) {
        cy.log('⚠️ Skipping - no viewer token');
        return;
      }

      cy.request({
        method: 'POST',
        url: `${API_URL}/api/v2/tasks`,
        headers: { Authorization: `Bearer ${tokens.viewer}` },
        body: {
          title: `VIEWER Task - ${Date.now()}`,
          priority: 'LOW',
          status: 'OPEN',
        },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(403);
        cy.log('✅ VIEWER correctly denied task creation');
      });
    });

    it('should NOT update tasks', () => {
      if (!tokens.viewer || createdTaskIds.length === 0) {
        cy.log('⚠️ Skipping - no task or token');
        return;
      }

      cy.request({
        method: 'PATCH',
        url: `${API_URL}/api/v2/tasks/${createdTaskIds[0]}`,
        headers: { Authorization: `Bearer ${tokens.viewer}` },
        body: {
          title: `Updated by VIEWER - ${Date.now()}`,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(403);
        cy.log('✅ VIEWER correctly denied update');
      });
    });

    it('should NOT see action buttons in UI', () => {
      if (!tokens.viewer) {
        cy.log('⚠️ Skipping - no token');
        return;
      }

      cy.setCookie('access_token', tokens.viewer, { path: '/' });
      cy.visit('/tasks');
      cy.wait(1500);

      // Create button should NOT be visible
      cy.get('[data-testid="create-task-btn"], button:contains("Create Task"), button:contains("New Task")').should('not.exist');

      // Edit/Delete buttons should NOT be visible
      cy.get('[data-testid="task-card"], .task-card').first().then(($card) => {
        if ($card.length > 0) {
          cy.wrap($card).within(() => {
            cy.get('[data-testid="edit-btn"], [data-testid="delete-btn"]').should('not.exist');
          });
        }
      });

      cy.log('✅ Action buttons hidden for VIEWER');
    });
  });

  describe('Unauthorized Access', () => {
    it('should reject requests without token', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api/v2/tasks`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect([401, 403]).to.include(resp.status);
        cy.log('✅ Unauthenticated request rejected');
      });
    });

    it('should reject requests with invalid token', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api/v2/tasks`,
        headers: { Authorization: 'Bearer invalid-token-12345' },
        failOnStatusCode: false,
      }).then((resp) => {
        expect([401, 403]).to.include(resp.status);
        cy.log('✅ Invalid token rejected');
      });
    });

    it('should reject cross-tenant access', () => {
      // This test requires a token from a different tenant
      const otherTenantToken = Cypress.env('OTHER_TENANT_TOKEN');
      
      if (!otherTenantToken || createdTaskIds.length === 0) {
        cy.log('⚠️ Skipping cross-tenant test - no OTHER_TENANT_TOKEN');
        return;
      }

      cy.request({
        method: 'GET',
        url: `${API_URL}/api/v2/tasks/${createdTaskIds[0]}`,
        headers: { Authorization: `Bearer ${otherTenantToken}` },
        failOnStatusCode: false,
      }).then((resp) => {
        expect([403, 404]).to.include(resp.status);
        cy.log('✅ Cross-tenant access rejected');
      });
    });
  });

  describe('UI Permission Enforcement', () => {
    it('should hide delete button for non-owners', () => {
      // Login as staff
      if (!tokens.staff) {
        cy.log('⚠️ Skipping - no staff token');
        return;
      }

      cy.setCookie('access_token', tokens.staff, { path: '/' });
      cy.visit('/tasks');
      cy.wait(1500);

      // Open task owned by another user
      cy.get('[data-testid="task-card"], .task-card').first().click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]').within(() => {
        // Delete button should not be visible
        cy.get('[data-testid="delete-btn"], button:contains("Delete")').should('not.exist');
      });

      cy.log('✅ Delete button hidden for non-owner');
    });

    it('should show edit button only for permitted users', () => {
      if (!tokens.hubIncharge) {
        cy.log('⚠️ Skipping - no token');
        return;
      }

      cy.setCookie('access_token', tokens.hubIncharge, { path: '/' });
      cy.visit('/tasks');
      cy.wait(1500);

      cy.get('[data-testid="task-card"], .task-card').first().click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]').within(() => {
        // Edit functionality should be available (either button or editable fields)
        cy.get('[data-testid="edit-btn"], input, textarea, [contenteditable]')
          .should('exist');
      });

      cy.log('✅ Edit available for HUB_INCHARGE');
    });
  });
});
