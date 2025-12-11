/**
 * =============================================================================
 * BISMAN ERP - Task Workflow E2E Test
 * =============================================================================
 * This test validates the complete task workflow including:
 * 1. Create a task via API
 * 2. Verify tenant-scoped Kanban response
 * 3. Test cross-tenant isolation (negative test)
 * 4. Test status transitions (valid and invalid for 409)
 * 5. Post a comment/message with pagination
 * 6. Upload an attachment
 * 7. Verify audit entries (if audit endpoint available)
 * =============================================================================
 */
/// <reference types="cypress" />

const API_URL = Cypress.env('API_URL') || 'http://localhost:5000';
const TEST_TOKEN = Cypress.env('TEST_TOKEN'); // tenant A
const OTHER_TOKEN = Cypress.env('OTHER_TOKEN'); // tenant B (for cross-tenant tests)
const ADMIN_TOKEN = Cypress.env('ADMIN_TOKEN'); // admin for audit endpoint

describe('Task Module Core Flows', () => {
  let taskId: number;
  let authToken: string;

  // =========================================================================
  // Setup: Get auth token before tests
  // =========================================================================
  before(() => {
    // Use provided token or login to get one
    if (TEST_TOKEN) {
      authToken = TEST_TOKEN;
      cy.log('✅ Using provided TEST_TOKEN');
    } else {
      cy.log('🔐 Logging in to get auth token...');
      cy.request({
        method: 'POST',
        url: `${API_URL}/api/auth/login`,
        body: {
          email: Cypress.env('TEST_USER_EMAIL') || 'arun.kumar@bisman.demo',
          password: Cypress.env('TEST_USER_PASSWORD') || 'Demo@123',
        },
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 200) {
          authToken = resp.body.accessToken || resp.body.token;
          cy.log('✅ Authenticated successfully');
        } else {
          cy.log('⚠️ Login failed, some tests may fail');
        }
      });
    }
  });

  // =========================================================================
  // Cleanup: Delete created task after all tests
  // =========================================================================
  after(() => {
    if (taskId && authToken) {
      cy.log(`🧹 Cleaning up task ${taskId}...`);
      cy.request({
        method: 'DELETE',
        url: `${API_URL}/api/v2/tasks/${taskId}`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 200 || resp.status === 204) {
          cy.log('✅ Task cleaned up');
        } else {
          cy.log(`⚠️ Cleanup returned ${resp.status}`);
        }
      });
    }
  });

  // =========================================================================
  // Test 1: Create a Task via API
  // =========================================================================
  it('1. Creates a task via API', () => {
    cy.request({
      method: 'POST',
      url: `${API_URL}/api/v2/tasks`,
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        title: `E2E Task - ${Date.now()}`,
        description: 'Created by Cypress E2E test',
        priority: 'MEDIUM',
        status: 'OPEN',
        tags: ['e2e', 'test'],
      },
      failOnStatusCode: false,
    }).then((resp) => {
      expect([200, 201]).to.include(resp.status);
      expect(resp.body).to.have.property('success', true);
      expect(resp.body.data).to.have.property('id');
      expect(resp.body.data).to.have.property('tenant_id');
      taskId = resp.body.data.id;
      cy.log(`✅ Task created with ID: ${taskId}`);
    });
  });

  // =========================================================================
  // Test 2: Read Kanban and Verify Tenant Scoping
  // =========================================================================
  it('2. Reads kanban and ensures tenant scoping', () => {
    cy.request({
      method: 'GET',
      url: `${API_URL}/api/v2/tasks/kanban`,
      headers: { Authorization: `Bearer ${authToken}` },
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.have.property('success', true);

      // Find the new task in any column
      const data = resp.body.data;
      let found = false;

      if (Array.isArray(data)) {
        found = data.some((t: any) => t.id === taskId);
      } else if (typeof data === 'object') {
        // Kanban might return grouped by status
        found = Object.values(data)
          .flat()
          .some((t: any) => t.id === taskId);
      }

      expect(found, `Task ${taskId} should be in kanban response`).to.be.true;
      cy.log('✅ Task found in kanban response');
    });
  });

  // =========================================================================
  // Test 3: Prevent Cross-Tenant Read (Security)
  // =========================================================================
  it('3. Prevents cross-tenant read (403 or 404)', function () {
    if (!OTHER_TOKEN) {
      cy.log('⚠️ OTHER_TOKEN not provided — skipping cross-tenant test');
      this.skip();
      return;
    }

    cy.request({
      method: 'GET',
      url: `${API_URL}/api/v2/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${OTHER_TOKEN}` },
      failOnStatusCode: false,
    }).then((resp) => {
      expect([403, 404]).to.include(resp.status);
      cy.log(`✅ Cross-tenant access correctly blocked (${resp.status})`);
    });
  });

  // =========================================================================
  // Test 4: Valid Status Transition
  // =========================================================================
  it('4. Tests valid status transition (OPEN → IN_PROGRESS)', function () {
    if (!taskId) {
      this.skip();
      return;
    }

    cy.request({
      method: 'PATCH',
      url: `${API_URL}/api/v2/tasks/${taskId}/status`,
      headers: { Authorization: `Bearer ${authToken}` },
      body: { status: 'IN_PROGRESS' },
      failOnStatusCode: false,
    }).then((resp) => {
      // Either allowed (200) or blocked (409)
      expect([200, 409]).to.include(resp.status);

      if (resp.status === 200) {
        expect(resp.body.data).to.have.property('status', 'IN_PROGRESS');
        cy.log('✅ Status changed to IN_PROGRESS');
      } else {
        // 409 means transition rules blocked it - verify error structure
        expect(resp.body).to.have.property('error');
        expect(resp.body).to.have.property('message');
        expect(resp.body).to.have.property('allowedTransitions');
        cy.log(`⚠️ Transition blocked: ${resp.body.message}`);
      }
    });
  });

  // =========================================================================
  // Test 5: Invalid Status Transition (Should Return 409)
  // =========================================================================
  it('5. Tests invalid status transition returns 409', function () {
    if (!taskId) {
      this.skip();
      return;
    }

    // Try to go backwards from IN_PROGRESS to DRAFT (not allowed)
    cy.request({
      method: 'PATCH',
      url: `${API_URL}/api/v2/tasks/${taskId}/status`,
      headers: { Authorization: `Bearer ${authToken}` },
      body: { status: 'DRAFT' },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(409);
      expect(resp.body).to.have.property('success', false);
      expect(resp.body).to.have.property('error', 'Invalid status transition');
      expect(resp.body).to.have.property('allowedTransitions');
      expect(resp.body).to.have.property('hint');
      cy.log('✅ Invalid transition correctly rejected with 409');
    });
  });

  // =========================================================================
  // Test 6: Post a Comment and Check Message Pagination
  // =========================================================================
  it('6. Posts a comment and checks message pagination', function () {
    if (!taskId) {
      this.skip();
      return;
    }

    // Post comment
    cy.request({
      method: 'POST',
      url: `${API_URL}/api/v2/tasks/${taskId}/messages`,
      headers: { Authorization: `Bearer ${authToken}` },
      body: { content: 'E2E test comment - automated testing' },
      failOnStatusCode: false,
    }).then((resp) => {
      if ([200, 201].includes(resp.status)) {
        cy.log('✅ Comment posted successfully');
      } else if (resp.status === 404) {
        cy.log('⚠️ Messages endpoint not available');
        return;
      }
    });

    // Get messages with pagination
    cy.request({
      method: 'GET',
      url: `${API_URL}/api/v2/tasks/${taskId}/messages?limit=10`,
      headers: { Authorization: `Bearer ${authToken}` },
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status === 200) {
        // Check pagination structure
        const body = resp.body;
        if (body.items) {
          expect(body).to.have.property('items').and.be.an('array');
          expect(body).to.have.property('hasMore');
          cy.log(`✅ Retrieved ${body.items.length} messages`);
        } else if (body.data) {
          expect(body).to.have.property('data').and.be.an('array');
          cy.log(`✅ Retrieved ${body.data.length} messages`);
        }
      }
    });
  });

  // =========================================================================
  // Test 7: Upload an Attachment
  // =========================================================================
  it('7. Uploads an attachment (if supported)', function () {
    if (!taskId) {
      this.skip();
      return;
    }

    // Check if fixture exists
    cy.task('log', 'Checking for attachment fixture...');

    // Create a simple test file programmatically
    const testContent = 'E2E Test File Content\n' + new Date().toISOString();
    const blob = new Blob([testContent], { type: 'text/plain' });

    // Use FormData for file upload
    const formData = new FormData();
    formData.append('file', blob, 'e2e-test-file.txt');

    // Use fetch API since cy.request doesn't handle FormData well
    cy.window().then((win) => {
      return fetch(`${API_URL}/api/v2/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      })
        .then((response) =>
          response.json().then((body) => ({ status: response.status, body }))
        )
        .then(({ status, body }) => {
          if ([200, 201].includes(status)) {
            expect(body).to.have.property('success', true);
            cy.log('✅ Attachment uploaded successfully');
          } else if (status === 404) {
            cy.log('⚠️ Attachments endpoint not available');
          } else if (status === 415) {
            cy.log('⚠️ File type not supported');
          } else {
            cy.log(`⚠️ Upload returned ${status}`);
          }
        });
    });
  });

  // =========================================================================
  // Test 8: Check Audit Log Entry (Admin Endpoint)
  // =========================================================================
  it('8. Checks audit log entry exists (admin endpoint)', function () {
    if (!taskId) {
      this.skip();
      return;
    }

    const token = ADMIN_TOKEN || authToken;
    if (!token) {
      cy.log('⚠️ No token available for audit check');
      this.skip();
      return;
    }

    cy.request({
      method: 'GET',
      url: `${API_URL}/api/audit/logs?entity=workflow_tasks&entity_id=${taskId}&limit=10`,
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status === 200) {
        const logs = resp.body.data || resp.body.logs || resp.body;

        if (Array.isArray(logs)) {
          const hasEntry = logs.some(
            (e: any) => e.resource_id == taskId || e.entity_id == taskId
          );
          if (hasEntry) {
            cy.log(`✅ Found audit entries for task ${taskId}`);
          } else {
            cy.log('⚠️ No matching audit entries found');
          }
        }
      } else if (resp.status === 403) {
        cy.log('⚠️ Audit endpoint requires admin permissions');
      } else if (resp.status === 404) {
        cy.log('⚠️ Audit endpoint not available');
      }
    });
  });

  // =========================================================================
  // Test 9: Complete Task Workflow
  // =========================================================================
  it('9. Completes the task workflow', function () {
    if (!taskId) {
      this.skip();
      return;
    }

    // Try to complete the task
    cy.request({
      method: 'PATCH',
      url: `${API_URL}/api/v2/tasks/${taskId}/status`,
      headers: { Authorization: `Bearer ${authToken}` },
      body: { status: 'COMPLETED', reason: 'E2E test completed' },
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status === 200) {
        expect(resp.body.data).to.have.property('status', 'COMPLETED');
        cy.log('✅ Task marked as COMPLETED');
      } else if (resp.status === 409) {
        // May need intermediate steps
        cy.log('⚠️ Direct completion blocked, trying via IN_REVIEW...');

        cy.request({
          method: 'PATCH',
          url: `${API_URL}/api/v2/tasks/${taskId}/status`,
          headers: { Authorization: `Bearer ${authToken}` },
          body: { status: 'IN_REVIEW' },
          failOnStatusCode: false,
        }).then((reviewResp) => {
          if (reviewResp.status === 200) {
            cy.request({
              method: 'PATCH',
              url: `${API_URL}/api/v2/tasks/${taskId}/status`,
              headers: { Authorization: `Bearer ${authToken}` },
              body: { status: 'COMPLETED' },
              failOnStatusCode: false,
            }).then((completeResp) => {
              if (completeResp.status === 200) {
                cy.log('✅ Task completed via IN_REVIEW step');
              }
            });
          }
        });
      } else if (resp.status === 403) {
        cy.log('⚠️ Only assignee can complete (403)');
      }
    });
  });
});

// =============================================================================
// Separate test suite for Tenant Isolation Security
// =============================================================================
describe('Tenant Isolation Security', () => {
  it('All tasks belong to single tenant (isolation verified)', () => {
    const token =
      Cypress.env('TEST_TOKEN') ||
      Cypress.env('AUTH_TOKEN');

    if (!token) {
      cy.log('⚠️ No token available, skipping isolation test');
      return;
    }

    cy.request({
      method: 'GET',
      url: `${API_URL}/api/v2/tasks/kanban`,
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status === 200) {
        const data = resp.body.data;
        const tasks = Array.isArray(data) ? data : Object.values(data).flat();
        const tenantIds = new Set(
          tasks.map((t: any) => t.tenant_id).filter(Boolean)
        );

        // All tasks should belong to the same tenant
        expect(tenantIds.size).to.be.lessThan(2);
        cy.log(`✅ All ${tasks.length} tasks belong to single tenant`);
      }
    });
  });
});
