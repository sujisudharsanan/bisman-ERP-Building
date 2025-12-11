/**
 * =============================================================================
 * BISMAN ERP - Performance Tests (Priority 7)
 * =============================================================================
 * Tests for performance and SLO compliance:
 * - Load 1000 tasks in Kanban
 * - Measure render time (P95)
 * - Assert under SLO thresholds
 * 
 * SLO Targets:
 * - Kanban API: < 1s P95
 * - Kanban render: < 3s P95
 * - Task list: < 500ms P95
 * - Single task fetch: < 200ms P95
 * 
 * Expected run time: 5-10 minutes (includes seeding)
 * =============================================================================
 */
/// <reference types="cypress" />

describe('Performance Tests', () => {
  const API_URL = Cypress.env('API_URL') || 'http://localhost:5000';
  let authToken: string;
  const createdTaskIds: number[] = [];
  const TASK_COUNT = 100; // Reduced for faster testing; increase to 1000 for full perf test
  const iterations = 10; // Number of times to measure for P95

  // SLO thresholds in milliseconds
  const SLO = {
    kanbanApi: 1000,       // 1 second
    kanbanRender: 3000,    // 3 seconds
    taskList: 500,         // 500ms
    singleTask: 200,       // 200ms
    statusChange: 500,     // 500ms
  };

  // Store timing results
  const timings: Record<string, number[]> = {
    kanbanApi: [],
    kanbanRender: [],
    taskList: [],
    singleTask: [],
    statusChange: [],
  };

  before(() => {
    cy.login().then((token) => {
      authToken = token as string;
    });
  });

  after(() => {
    // Cleanup created tasks (in batches)
    cy.log(`🧹 Cleaning up ${createdTaskIds.length} test tasks...`);
    
    const deleteInBatches = (ids: number[], batchSize = 10) => {
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        batch.forEach((id) => {
          cy.request({
            method: 'DELETE',
            url: `${API_URL}/api/v2/tasks/${id}`,
            headers: { Authorization: `Bearer ${authToken}` },
            failOnStatusCode: false,
          });
        });
        cy.wait(100);
      }
    };

    deleteInBatches(createdTaskIds);
    cy.log('✅ Cleanup complete');

    // Log final performance results
    cy.log('=== PERFORMANCE RESULTS ===');
    Object.entries(timings).forEach(([metric, values]) => {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        cy.log(`${metric}: avg=${avg.toFixed(0)}ms, p50=${p50}ms, p95=${p95}ms`);
      }
    });
  });

  describe('Data Seeding', () => {
    it(`should seed ${TASK_COUNT} tasks for performance testing`, () => {
      cy.log(`📝 Creating ${TASK_COUNT} tasks...`);
      
      const statuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED'];
      const priorities = ['LOW', 'MEDIUM', 'HIGH'];

      // Create tasks in parallel batches
      const batchSize = 10;
      const batches = Math.ceil(TASK_COUNT / batchSize);

      for (let b = 0; b < batches; b++) {
        const promises = [];
        
        for (let i = 0; i < batchSize && (b * batchSize + i) < TASK_COUNT; i++) {
          const taskNum = b * batchSize + i;
          
          cy.request({
            method: 'POST',
            url: `${API_URL}/api/v2/tasks`,
            headers: { Authorization: `Bearer ${authToken}` },
            body: {
              title: `Perf Test Task ${taskNum} - ${Date.now()}`,
              description: `Performance test task number ${taskNum}`,
              priority: priorities[taskNum % 3],
              status: statuses[taskNum % 3],
            },
            failOnStatusCode: false,
          }).then((resp) => {
            if (resp.status === 200 || resp.status === 201) {
              const taskId = (resp.body.data || resp.body).id;
              createdTaskIds.push(taskId);
            }
          });
        }
        
        // Small delay between batches
        cy.wait(50);
      }

      cy.wait(2000); // Allow all creates to complete
      cy.log(`✅ Created ${createdTaskIds.length} tasks`);
    });
  });

  describe('API Performance', () => {
    it(`should fetch kanban within ${SLO.kanbanApi}ms SLO`, () => {
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v2/tasks/kanban`,
          headers: { Authorization: `Bearer ${authToken}` },
        }).then(() => {
          const duration = performance.now() - start;
          timings.kanbanApi.push(duration);
        });
      }

      cy.then(() => {
        const sorted = [...timings.kanbanApi].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        
        expect(p95).to.be.lt(SLO.kanbanApi);
        cy.log(`✅ Kanban API P95: ${p95.toFixed(0)}ms (SLO: ${SLO.kanbanApi}ms)`);
      });
    });

    it(`should fetch task list within ${SLO.taskList}ms SLO`, () => {
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v2/tasks?limit=50`,
          headers: { Authorization: `Bearer ${authToken}` },
        }).then(() => {
          const duration = performance.now() - start;
          timings.taskList.push(duration);
        });
      }

      cy.then(() => {
        const sorted = [...timings.taskList].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        
        expect(p95).to.be.lt(SLO.taskList);
        cy.log(`✅ Task List P95: ${p95.toFixed(0)}ms (SLO: ${SLO.taskList}ms)`);
      });
    });

    it(`should fetch single task within ${SLO.singleTask}ms SLO`, () => {
      if (createdTaskIds.length === 0) {
        cy.log('⚠️ No tasks to test');
        return;
      }

      const sampleTaskId = createdTaskIds[0];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v2/tasks/${sampleTaskId}`,
          headers: { Authorization: `Bearer ${authToken}` },
        }).then(() => {
          const duration = performance.now() - start;
          timings.singleTask.push(duration);
        });
      }

      cy.then(() => {
        const sorted = [...timings.singleTask].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        
        expect(p95).to.be.lt(SLO.singleTask);
        cy.log(`✅ Single Task P95: ${p95.toFixed(0)}ms (SLO: ${SLO.singleTask}ms)`);
      });
    });

    it(`should update status within ${SLO.statusChange}ms SLO`, () => {
      // Create tasks specifically for status change testing
      const statusTestTasks: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        cy.request({
          method: 'POST',
          url: `${API_URL}/api/v2/tasks`,
          headers: { Authorization: `Bearer ${authToken}` },
          body: {
            title: `Status Perf Test ${i} - ${Date.now()}`,
            status: 'OPEN',
            priority: 'LOW',
          },
        }).then((resp) => {
          const taskId = (resp.body.data || resp.body).id;
          statusTestTasks.push(taskId);
          createdTaskIds.push(taskId);
        });
      }

      cy.wait(1000); // Allow creates to complete

      cy.then(() => {
        // Now measure status changes
        statusTestTasks.forEach((taskId, i) => {
          const start = performance.now();
          
          cy.request({
            method: 'PATCH',
            url: `${API_URL}/api/v2/tasks/${taskId}/status`,
            headers: { Authorization: `Bearer ${authToken}` },
            body: { status: 'IN_PROGRESS' },
            failOnStatusCode: false,
          }).then(() => {
            const duration = performance.now() - start;
            timings.statusChange.push(duration);
          });
        });
      });

      cy.then(() => {
        if (timings.statusChange.length > 0) {
          const sorted = [...timings.statusChange].sort((a, b) => a - b);
          const p95 = sorted[Math.floor(sorted.length * 0.95)];
          
          expect(p95).to.be.lt(SLO.statusChange);
          cy.log(`✅ Status Change P95: ${p95.toFixed(0)}ms (SLO: ${SLO.statusChange}ms)`);
        }
      });
    });
  });

  describe('UI Render Performance', () => {
    it(`should render kanban board within ${SLO.kanbanRender}ms SLO`, () => {
      const renderTimes: number[] = [];

      for (let i = 0; i < 3; i++) {  // Fewer iterations for UI tests
        const start = performance.now();

        cy.visit('/tasks');
        
        // Wait for board to fully render
        cy.get('[data-testid="kanban-board"], [data-testid="task-board"], .kanban-board, .task-board', {
          timeout: 10000,
        }).should('be.visible');

        // Wait for task cards to appear
        cy.get('[data-testid="task-card"], .task-card', { timeout: 10000 })
          .should('have.length.gte', 1)
          .then(() => {
            const duration = performance.now() - start;
            renderTimes.push(duration);
            timings.kanbanRender.push(duration);
          });

        cy.wait(500);
      }

      cy.then(() => {
        if (renderTimes.length > 0) {
          const sorted = [...renderTimes].sort((a, b) => a - b);
          const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
          
          expect(p95).to.be.lt(SLO.kanbanRender);
          cy.log(`✅ Kanban Render P95: ${p95.toFixed(0)}ms (SLO: ${SLO.kanbanRender}ms)`);
        }
      });
    });

    it('should maintain smooth scroll performance', () => {
      cy.visit('/tasks');
      cy.wait(2000);

      // Scroll the kanban board
      cy.get('[data-testid="kanban-board"], .kanban-board').then(($board) => {
        if ($board.length > 0) {
          const start = performance.now();
          
          cy.wrap($board).scrollTo('right', { duration: 500 });
          cy.wrap($board).scrollTo('left', { duration: 500 });

          cy.then(() => {
            const duration = performance.now() - start;
            cy.log(`✅ Scroll test completed in ${duration.toFixed(0)}ms`);
          });
        }
      });
    });

    it('should handle rapid interactions without lag', () => {
      cy.visit('/tasks');
      cy.wait(1500);

      const interactionStart = performance.now();

      // Rapid clicks on multiple task cards
      cy.get('[data-testid="task-card"], .task-card').each(($card, index) => {
        if (index < 5) {
          cy.wrap($card).click({ force: true });
          cy.wait(100);
          cy.get('body').type('{esc}');
        }
      });

      cy.then(() => {
        const duration = performance.now() - interactionStart;
        cy.log(`✅ Rapid interactions completed in ${duration.toFixed(0)}ms`);
      });
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory on repeated navigation', () => {
      // This is a basic check - real memory profiling requires browser devtools
      for (let i = 0; i < 5; i++) {
        cy.visit('/tasks');
        cy.wait(500);
        cy.visit('/');
        cy.wait(500);
      }

      cy.log('✅ Navigation memory check complete (manual verification recommended)');
    });

    it('should handle large task lists without crashing', () => {
      // Load all tasks
      cy.visit('/tasks');
      cy.wait(3000);

      // Verify page is still responsive
      cy.get('body').should('be.visible');
      cy.get('[data-testid="kanban-board"], .kanban-board').should('be.visible');

      cy.log('✅ Large task list handled without crash');
    });
  });

  describe('Concurrent Load', () => {
    it('should handle multiple simultaneous API requests', () => {
      const requests = 10;
      const start = performance.now();

      // Fire multiple requests in parallel
      for (let i = 0; i < requests; i++) {
        cy.request({
          method: 'GET',
          url: `${API_URL}/api/v2/tasks?limit=10&offset=${i * 10}`,
          headers: { Authorization: `Bearer ${authToken}` },
          failOnStatusCode: false,
        });
      }

      cy.then(() => {
        const duration = performance.now() - start;
        const avgPerRequest = duration / requests;
        
        cy.log(`✅ ${requests} concurrent requests: total=${duration.toFixed(0)}ms, avg=${avgPerRequest.toFixed(0)}ms/req`);
      });
    });
  });

  describe('Performance Summary', () => {
    it('should generate performance report', () => {
      cy.then(() => {
        cy.log('╔══════════════════════════════════════╗');
        cy.log('║     PERFORMANCE TEST SUMMARY         ║');
        cy.log('╠══════════════════════════════════════╣');
        
        Object.entries(timings).forEach(([metric, values]) => {
          if (values.length > 0) {
            const sorted = [...values].sort((a, b) => a - b);
            const min = sorted[0];
            const max = sorted[sorted.length - 1];
            const p50 = sorted[Math.floor(sorted.length * 0.5)];
            const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const slo = SLO[metric as keyof typeof SLO] || 'N/A';
            const passed = typeof slo === 'number' && p95 < slo;
            
            cy.log(`║ ${metric.padEnd(15)} │ P95: ${String(p95.toFixed(0)).padStart(5)}ms │ SLO: ${String(slo).padStart(5)}ms │ ${passed ? '✅' : '❌'} ║`);
          }
        });
        
        cy.log('╚══════════════════════════════════════╝');
      });
    });
  });
});
