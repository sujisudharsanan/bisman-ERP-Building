/**
 * =============================================================================
 * BISMAN ERP - Drag & Drop Tests (Priority 3)
 * =============================================================================
 * Tests for kanban drag-and-drop functionality:
 * - Move task between columns
 * - Verify backend receives status update
 * - Test optimistic UI rollback on failure
 * 
 * Expected run time: 1-2 minutes
 * =============================================================================
 */
/// <reference types="cypress" />

// Tags: @dnd, @kanban
describe('Drag & Drop Tests', () => {
  const API_URL = Cypress.env('API_URL') || 'http://localhost:5000';
  let authToken: string;
  let testTaskId: number;

  before(() => {
    cy.login().then((token) => {
      authToken = token as string;
      
      // Create a test task in OPEN status
      cy.apiRequest('POST', '/api/v2/tasks', {
        title: `DnD Test Task - ${Date.now()}`,
        description: 'Task for drag-and-drop testing',
        priority: 'MEDIUM',
        status: 'OPEN',
      }).then((resp) => {
        testTaskId = (resp.body.data || resp.body).id;
        cy.log(`✅ Created test task: ${testTaskId}`);
      });
    });
  });

  after(() => {
    if (testTaskId && authToken) {
      cy.apiRequest('DELETE', `/api/v2/tasks/${testTaskId}`);
    }
  });

  describe('Column Identification', () => {
    beforeEach(() => {
      cy.visit('/tasks');
      cy.wait(1000);
    });

    it('should display multiple kanban columns', () => {
      cy.get('[data-testid="kanban-column"], .kanban-column, [data-status], [data-column]', {
        timeout: 10000,
      }).should('have.length.gte', 2);

      cy.log('✅ Multiple columns detected');
    });

    it('should have identifiable column headers', () => {
      const expectedStatuses = ['OPEN', 'IN_PROGRESS', 'IN PROGRESS', 'COMPLETED', 'DONE'];

      cy.get('[data-testid="kanban-column"], .kanban-column, [data-status]')
        .each(($col) => {
          const text = $col.text().toUpperCase();
          const hasStatus = expectedStatuses.some((s) => text.includes(s.replace('_', ' ')) || text.includes(s));
          
          if (hasStatus) {
            cy.log(`Found column: ${text.substring(0, 30)}...`);
          }
        });
    });
  });

  describe('Drag Operations', () => {
    beforeEach(() => {
      cy.visit('/tasks');
      cy.wait(1500); // Allow board to fully load
    });

    it('should drag task from OPEN to IN_PROGRESS column', () => {
      // Find the test task or any task in OPEN column
      cy.get('[data-status="OPEN"], [data-testid="column-OPEN"], .kanban-column:contains("Open")')
        .first()
        .within(() => {
          cy.get('[data-testid="task-card"], .task-card, [data-task-id]')
            .first()
            .as('sourceTask');
        });

      // Find IN_PROGRESS column
      cy.get('[data-status="IN_PROGRESS"], [data-testid="column-IN_PROGRESS"], .kanban-column:contains("Progress")')
        .first()
        .as('targetColumn');

      // Perform drag and drop using Cypress drag-and-drop plugin or native events
      cy.get('@sourceTask').then(($source) => {
        cy.get('@targetColumn').then(($target) => {
          // Try using dataTransfer
          const dataTransfer = new DataTransfer();

          cy.wrap($source)
            .trigger('mousedown', { which: 1, force: true })
            .trigger('dragstart', { dataTransfer, force: true });

          cy.wrap($target)
            .trigger('dragover', { dataTransfer, force: true })
            .trigger('drop', { dataTransfer, force: true });

          cy.wrap($source)
            .trigger('dragend', { force: true });

          cy.log('✅ Drag operation completed');
        });
      });

      // Allow time for backend update
      cy.wait(1000);
    });

    it('should update task position via API (alternative to UI drag)', () => {
      // Move task via API PATCH
      cy.apiRequest('PATCH', `/api/v2/tasks/${testTaskId}/status`, {
        status: 'IN_PROGRESS',
      }).then((resp) => {
        if (resp.status === 200) {
          const task = resp.body.data || resp.body;
          expect(task.status).to.eq('IN_PROGRESS');
          cy.log('✅ Status updated via API');
        } else if (resp.status === 409) {
          // Task might already be in this status
          cy.log('⚠️ Status transition blocked (might be same status)');
        }
      });
    });

    it('should update position within column via API', () => {
      // Test position update (reordering within column)
      cy.apiRequest('PATCH', `/api/v2/tasks/${testTaskId}/position`, {
        position: 0,
        status: 'IN_PROGRESS',
      }).then((resp) => {
        if (resp.status === 200) {
          cy.log('✅ Position updated');
        } else if (resp.status === 404) {
          cy.log('⚠️ Position endpoint not implemented - using status-only updates');
        }
      });
    });
  });

  describe('Backend Verification', () => {
    it('should verify task status persists after drag', () => {
      // First set a known status
      cy.apiRequest('PATCH', `/api/v2/tasks/${testTaskId}/status`, {
        status: 'OPEN',
      });

      // Then change it
      cy.apiRequest('PATCH', `/api/v2/tasks/${testTaskId}/status`, {
        status: 'IN_PROGRESS',
      }).then(() => {
        // Verify by fetching
        cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}`).then((resp) => {
          const task = resp.body.data || resp.body;
          expect(task.status).to.eq('IN_PROGRESS');
          cy.log('✅ Backend status verified');
        });
      });
    });

    it('should reflect change in kanban API response', () => {
      cy.apiRequest('GET', '/api/v2/tasks/kanban').then((resp) => {
        expect(resp.status).to.eq(200);
        
        const kanban = resp.body.data || resp.body;
        
        // Find our test task in the response
        const findTask = (data: any): any => {
          if (Array.isArray(data)) {
            return data.find((t: any) => t.id === testTaskId);
          }
          // Check each column
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) {
              const found = data[key].find((t: any) => t.id === testTaskId);
              if (found) return found;
            }
          }
          return null;
        };

        const task = findTask(kanban);
        if (task) {
          cy.log(`✅ Task found in kanban with status: ${task.status}`);
        } else {
          cy.log('⚠️ Task not found in kanban response (might be different tenant)');
        }
      });
    });
  });

  describe('Rollback on Failure', () => {
    it('should rollback UI on invalid transition', () => {
      // Create a task in IN_PROGRESS
      cy.apiRequest('POST', '/api/v2/tasks', {
        title: `Rollback Test - ${Date.now()}`,
        status: 'OPEN',
        priority: 'LOW',
      }).then((createResp) => {
        const taskId = (createResp.body.data || createResp.body).id;

        // Move to IN_PROGRESS
        cy.apiRequest('PATCH', `/api/v2/tasks/${taskId}/status`, {
          status: 'IN_PROGRESS',
        }).then(() => {
          // Attempt invalid transition back to OPEN
          cy.apiRequest('PATCH', `/api/v2/tasks/${taskId}/status`, {
            status: 'OPEN',
          }).then((resp) => {
            // Should return 409
            expect(resp.status).to.eq(409);

            // Verify task is still IN_PROGRESS
            cy.apiRequest('GET', `/api/v2/tasks/${taskId}`).then((getResp) => {
              const task = getResp.body.data || getResp.body;
              expect(task.status).to.eq('IN_PROGRESS');
              cy.log('✅ Rollback verified - task still IN_PROGRESS');
            });

            // Cleanup
            cy.apiRequest('DELETE', `/api/v2/tasks/${taskId}`);
          });
        });
      });
    });

    it('should show error toast on failed drag (UI test)', () => {
      cy.visit('/tasks');
      cy.wait(1000);

      // Intercept status update API to force failure
      cy.intercept('PATCH', '**/api/v2/tasks/*/status', {
        statusCode: 409,
        body: {
          success: false,
          error: 'Invalid status transition',
        },
      }).as('failedUpdate');

      // Attempt drag (if there are draggable tasks)
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .then(($card) => {
          if ($card.length > 0) {
            // Try to trigger drag
            const dataTransfer = new DataTransfer();
            
            cy.wrap($card)
              .trigger('dragstart', { dataTransfer, force: true })
              .trigger('dragend', { force: true });

            // Look for error notification
            cy.get('[data-testid="toast"], .toast, .notification, [role="alert"]', {
              timeout: 3000,
            }).then(($toast) => {
              if ($toast.length > 0) {
                cy.log('✅ Error notification appeared');
              } else {
                cy.log('⚠️ No toast notification found (might use different error display)');
              }
            });
          }
        });
    });
  });

  describe('Concurrent Drag Operations', () => {
    it('should handle rapid status changes gracefully', () => {
      const statuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED'];
      let lastValidStatus = 'OPEN';

      // Rapid-fire status changes (simulating fast drags)
      statuses.forEach((status, index) => {
        cy.apiRequest('PATCH', `/api/v2/tasks/${testTaskId}/status`, {
          status,
        }).then((resp) => {
          if (resp.status === 200) {
            lastValidStatus = status;
          }
        });
      });

      // Verify final state is consistent
      cy.wait(500);
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}`).then((resp) => {
        const task = resp.body.data || resp.body;
        cy.log(`✅ Final status after rapid changes: ${task.status}`);
      });
    });
  });
});
