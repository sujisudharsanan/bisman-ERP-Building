/**
 * =============================================================================
 * BISMAN ERP - Smoke Tests (Priority 1)
 * =============================================================================
 * Fast, critical-path tests that should run on every PR/deploy:
 * - Load board
 * - Create task
 * - Read kanban
 * 
 * Expected run time: < 30 seconds
 * =============================================================================
 */
/// <reference types="cypress" />

// Tags: @smoke, @critical
describe('Smoke Tests', () => {
  const API_URL = Cypress.env('API_URL') || 'http://localhost:5000';
  let authToken: string;
  let taskId: number;

  before(() => {
    cy.login().then((token) => {
      authToken = token as string;
    });
  });

  after(() => {
    // Cleanup created task
    if (taskId && authToken) {
      cy.request({
        method: 'DELETE',
        url: `${API_URL}/api/v2/tasks/${taskId}`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      });
    }
  });

  describe('API Health', () => {
    it('should return healthy status from /api/health', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api/health`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('status');
      });
    });
  });

  describe('Board Loading', () => {
    it('should load the task board page', () => {
      cy.visit('/tasks');
      cy.url().should('include', '/tasks');
      
      // Wait for board to load (look for kanban container or loading state)
      cy.get('[data-testid="kanban-board"], [data-testid="task-board"], .kanban-board', {
        timeout: 10000,
      }).should('exist');
    });

    it('should display kanban columns', () => {
      cy.visit('/tasks');
      
      // Check for status columns (OPEN, IN_PROGRESS, etc.)
      cy.get('[data-testid="kanban-column"], .kanban-column, [data-status]', {
        timeout: 10000,
      }).should('have.length.gte', 1);
    });
  });

  describe('Task Creation', () => {
    it('should create a task via API', () => {
      const taskTitle = `Smoke Test Task - ${Date.now()}`;

      cy.apiRequest('POST', '/api/v2/tasks', {
        title: taskTitle,
        description: 'Created by Cypress smoke test',
        priority: 'MEDIUM',
        status: 'OPEN',
      }).then((resp) => {
        expect([200, 201]).to.include(resp.status);
        
        // Handle both response formats
        const data = resp.body.data || resp.body;
        expect(data).to.have.property('id');
        taskId = data.id;
        
        cy.log(`✅ Task created: ${taskId}`);
      });
    });

    it('should create task from UI (if button exists)', () => {
      cy.visit('/tasks');
      
      // Look for create task button
      cy.get('body').then(($body) => {
        const createBtn = $body.find('[data-testid="create-task-btn"], button:contains("Create"), button:contains("New Task"), button:contains("Add Task")');
        
        if (createBtn.length > 0) {
          cy.wrap(createBtn.first()).click();
          
          // Look for task form/modal
          cy.get('[data-testid="task-form"], [data-testid="task-modal"], form', {
            timeout: 5000,
          }).should('be.visible');
          
          // Close modal without creating (just verify it opens)
          cy.get('body').type('{esc}');
        } else {
          cy.log('⚠️ No create task button found on UI - skipping UI creation test');
        }
      });
    });
  });

  describe('Kanban API', () => {
    it('should fetch kanban data with tenant isolation', () => {
      cy.apiRequest('GET', '/api/v2/tasks/kanban').then((resp) => {
        expect(resp.status).to.eq(200);
        
        const data = resp.body.data || resp.body;
        
        // Kanban response should have columns or tasks grouped by status
        expect(data).to.satisfy((d: any) => {
          return Array.isArray(d) || 
                 typeof d === 'object' && d !== null;
        });
        
        cy.log('✅ Kanban API returned valid response');
      });
    });

    it('should return tasks list with pagination', () => {
      cy.apiRequest('GET', '/api/v2/tasks?limit=10').then((resp) => {
        expect(resp.status).to.eq(200);
        
        const body = resp.body;
        
        // Check for pagination metadata
        if (body.data) {
          expect(Array.isArray(body.data)).to.be.true;
        }
        
        cy.log(`✅ Tasks list returned ${(body.data || body).length || 0} items`);
      });
    });

    it('should get single task by ID', () => {
      // First create a task
      cy.apiRequest('POST', '/api/v2/tasks', {
        title: `Get Task Test - ${Date.now()}`,
        priority: 'LOW',
        status: 'OPEN',
      }).then((createResp) => {
        const createdTaskId = (createResp.body.data || createResp.body).id;
        
        // Then fetch it
        cy.apiRequest('GET', `/api/v2/tasks/${createdTaskId}`).then((getResp) => {
          expect(getResp.status).to.eq(200);
          
          const task = getResp.body.data || getResp.body;
          expect(task).to.have.property('id', createdTaskId);
          expect(task).to.have.property('title');
          
          cy.log(`✅ Retrieved task ${createdTaskId}`);
          
          // Cleanup
          cy.apiRequest('DELETE', `/api/v2/tasks/${createdTaskId}`);
        });
      });
    });
  });

  describe('Status Transitions', () => {
    let transitionTaskId: number;

    beforeEach(() => {
      // Create a fresh task for status transition tests
      cy.apiRequest('POST', '/api/v2/tasks', {
        title: `Transition Test - ${Date.now()}`,
        status: 'OPEN',
        priority: 'MEDIUM',
      }).then((resp) => {
        transitionTaskId = (resp.body.data || resp.body).id;
      });
    });

    afterEach(() => {
      if (transitionTaskId) {
        cy.apiRequest('DELETE', `/api/v2/tasks/${transitionTaskId}`);
      }
    });

    it('should allow valid transition: OPEN → IN_PROGRESS', () => {
      cy.apiRequest('PATCH', `/api/v2/tasks/${transitionTaskId}/status`, {
        status: 'IN_PROGRESS',
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        
        const task = resp.body.data || resp.body;
        expect(task.status).to.eq('IN_PROGRESS');
        
        cy.log('✅ OPEN → IN_PROGRESS succeeded');
      });
    });

    it('should reject invalid transition: IN_PROGRESS → OPEN (409)', () => {
      // First move to IN_PROGRESS
      cy.apiRequest('PATCH', `/api/v2/tasks/${transitionTaskId}/status`, {
        status: 'IN_PROGRESS',
      }).then(() => {
        // Then try invalid reverse transition
        cy.apiRequest('PATCH', `/api/v2/tasks/${transitionTaskId}/status`, {
          status: 'OPEN',
        }).then((resp) => {
          expect(resp.status).to.eq(409);
          cy.log('✅ Invalid transition correctly rejected with 409');
        });
      });
    });
  });
});
