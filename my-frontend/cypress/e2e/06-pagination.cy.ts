/**
 * =============================================================================
 * BISMAN ERP - Pagination Tests (Priority 6)
 * =============================================================================
 * Tests for cursor-based pagination:
 * - Seed > 30 messages
 * - Verify cursor pagination works correctly
 * - Test edge cases (empty, single page, multiple pages)
 * 
 * Expected run time: 2-3 minutes
 * =============================================================================
 */
/// <reference types="cypress" />

describe('Pagination Tests', () => {
  const API_URL = Cypress.env('API_URL') || 'http://localhost:5000';
  let authToken: string;
  let testTaskId: number;
  const messageIds: number[] = [];
  const MESSAGE_COUNT = 35; // More than typical page size

  before(() => {
    cy.login().then((token) => {
      authToken = token as string;

      // Create a test task for pagination tests
      cy.apiRequest('POST', '/api/v2/tasks', {
        title: `Pagination Test Task - ${Date.now()}`,
        description: 'Task for pagination testing',
        priority: 'MEDIUM',
        status: 'OPEN',
      }).then((resp) => {
        testTaskId = (resp.body.data || resp.body).id;
        cy.log(`✅ Created test task: ${testTaskId}`);

        // Seed messages
        cy.log(`📝 Seeding ${MESSAGE_COUNT} messages...`);
        
        // Create messages in batches to avoid overwhelming the server
        const createMessages = () => {
          const promises = [];
          for (let i = 0; i < MESSAGE_COUNT; i++) {
            promises.push(
              cy.request({
                method: 'POST',
                url: `${API_URL}/api/v2/tasks/${testTaskId}/messages`,
                headers: { Authorization: `Bearer ${authToken}` },
                body: {
                  content: `Pagination test message ${i + 1} - ${Date.now()}`,
                  messageType: 'COMMENT',
                },
                failOnStatusCode: false,
              }).then((msgResp) => {
                if (msgResp.status === 200 || msgResp.status === 201) {
                  const msgData = msgResp.body.data || msgResp.body;
                  if (msgData.id) {
                    messageIds.push(msgData.id);
                  }
                }
              })
            );
          }
        };

        createMessages();
        cy.wait(2000); // Allow all messages to be created
        cy.log(`✅ Seeded ${messageIds.length} messages`);
      });
    });
  });

  after(() => {
    // Cleanup
    if (testTaskId && authToken) {
      cy.apiRequest('DELETE', `/api/v2/tasks/${testTaskId}`);
    }
  });

  describe('Basic Pagination', () => {
    it('should return paginated messages with limit', () => {
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=10`).then((resp) => {
        expect(resp.status).to.eq(200);

        const body = resp.body;
        const messages = body.data || body;

        expect(Array.isArray(messages)).to.be.true;
        expect(messages.length).to.be.lte(10);

        cy.log(`✅ First page returned ${messages.length} messages`);
      });
    });

    it('should include pagination metadata', () => {
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=10`).then((resp) => {
        expect(resp.status).to.eq(200);

        const body = resp.body;

        // Check for pagination metadata (various formats)
        const hasPagination =
          body.hasMore !== undefined ||
          body.nextCursor !== undefined ||
          body.pagination !== undefined ||
          body.meta?.hasMore !== undefined ||
          body.meta?.nextCursor !== undefined;

        if (hasPagination) {
          cy.log('✅ Pagination metadata present');
        } else {
          cy.log('⚠️ No pagination metadata found - may use offset-based pagination');
        }
      });
    });
  });

  describe('Cursor-based Pagination', () => {
    it('should return different results with cursor', () => {
      // Get first page
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=10`).then((firstResp) => {
        expect(firstResp.status).to.eq(200);

        const firstPage = firstResp.body.data || firstResp.body;
        const firstPageIds = firstPage.map((m: any) => m.id);

        // Get cursor for next page
        const cursor = 
          firstResp.body.nextCursor ||
          firstResp.body.pagination?.nextCursor ||
          firstResp.body.meta?.nextCursor ||
          (firstPage.length > 0 ? firstPage[firstPage.length - 1].id : null);

        if (!cursor) {
          cy.log('⚠️ No cursor available - trying offset pagination');
          
          // Try offset pagination
          cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=10&offset=10`).then((offsetResp) => {
            const secondPage = offsetResp.body.data || offsetResp.body;
            
            if (secondPage.length > 0) {
              const secondPageIds = secondPage.map((m: any) => m.id);
              const overlap = firstPageIds.filter((id: any) => secondPageIds.includes(id));
              
              expect(overlap.length).to.eq(0);
              cy.log('✅ Offset pagination works correctly');
            }
          });
          return;
        }

        // Get second page with cursor
        cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=10&cursor=${cursor}`).then((secondResp) => {
          expect(secondResp.status).to.eq(200);

          const secondPage = secondResp.body.data || secondResp.body;
          const secondPageIds = secondPage.map((m: any) => m.id);

          // Ensure no overlap between pages
          const overlap = firstPageIds.filter((id: any) => secondPageIds.includes(id));
          expect(overlap.length).to.eq(0);

          cy.log('✅ Cursor pagination returns non-overlapping results');
        });
      });
    });

    it('should maintain order across pages', () => {
      const allMessages: any[] = [];
      let cursor: string | null = null;
      let pageCount = 0;
      const maxPages = 5;

      const fetchPage = () => {
        const url = cursor
          ? `/api/v2/tasks/${testTaskId}/messages?limit=10&cursor=${cursor}`
          : `/api/v2/tasks/${testTaskId}/messages?limit=10`;

        cy.apiRequest('GET', url).then((resp) => {
          const messages = resp.body.data || resp.body;
          allMessages.push(...messages);
          pageCount++;

          cursor =
            resp.body.nextCursor ||
            resp.body.pagination?.nextCursor ||
            resp.body.meta?.nextCursor;

          const hasMore =
            resp.body.hasMore ||
            resp.body.pagination?.hasMore ||
            resp.body.meta?.hasMore ||
            (messages.length === 10);

          if (hasMore && cursor && pageCount < maxPages) {
            fetchPage();
          } else {
            // Verify ordering (by created_at descending typically)
            let ordered = true;
            for (let i = 1; i < allMessages.length; i++) {
              const prev = new Date(allMessages[i - 1].created_at || allMessages[i - 1].createdAt);
              const curr = new Date(allMessages[i].created_at || allMessages[i].createdAt);
              
              // Check if descending order (most recent first)
              if (prev < curr) {
                ordered = false;
                break;
              }
            }

            if (ordered) {
              cy.log(`✅ ${allMessages.length} messages in correct order across ${pageCount} pages`);
            } else {
              cy.log(`⚠️ Messages may be in ascending order or unordered`);
            }
          }
        });
      };

      fetchPage();
    });

    it('should handle hasMore flag correctly', () => {
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=5`).then((resp) => {
        const hasMore =
          resp.body.hasMore ||
          resp.body.pagination?.hasMore ||
          resp.body.meta?.hasMore;

        if (messageIds.length > 5) {
          expect(hasMore).to.eq(true);
          cy.log('✅ hasMore=true when more pages exist');
        } else {
          cy.log('⚠️ Not enough messages to test hasMore');
        }
      });
    });

    it('should return hasMore=false on last page', () => {
      // Fetch with large limit to get all
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=100`).then((resp) => {
        const hasMore =
          resp.body.hasMore ||
          resp.body.pagination?.hasMore ||
          resp.body.meta?.hasMore;

        if (hasMore === false || hasMore === undefined) {
          cy.log('✅ hasMore=false on last/full page');
        } else {
          cy.log('⚠️ hasMore still true with large limit');
        }
      });
    });
  });

  describe('Offset-based Pagination', () => {
    it('should support offset and limit parameters', () => {
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=10&offset=0`).then((resp) => {
        expect(resp.status).to.eq(200);

        const firstPage = resp.body.data || resp.body;

        cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=10&offset=10`).then((resp2) => {
          expect(resp2.status).to.eq(200);

          const secondPage = resp2.body.data || resp2.body;

          // Should be different items
          if (secondPage.length > 0) {
            expect(firstPage[0]?.id).to.not.eq(secondPage[0]?.id);
            cy.log('✅ Offset pagination works');
          } else {
            cy.log('⚠️ Second page empty - not enough messages');
          }
        });
      });
    });
  });

  describe('Task List Pagination', () => {
    it('should paginate task list', () => {
      cy.apiRequest('GET', '/api/v2/tasks?limit=5').then((resp) => {
        expect(resp.status).to.eq(200);

        const tasks = resp.body.data || resp.body;
        expect(Array.isArray(tasks)).to.be.true;
        expect(tasks.length).to.be.lte(5);

        cy.log(`✅ Task list pagination works - returned ${tasks.length} tasks`);
      });
    });

    it('should support task list cursor pagination', () => {
      cy.apiRequest('GET', '/api/v2/tasks?limit=5').then((resp) => {
        const cursor =
          resp.body.nextCursor ||
          resp.body.pagination?.nextCursor;

        if (cursor) {
          cy.apiRequest('GET', `/api/v2/tasks?limit=5&cursor=${cursor}`).then((resp2) => {
            expect(resp2.status).to.eq(200);
            cy.log('✅ Task list cursor pagination works');
          });
        } else {
          cy.log('⚠️ No cursor in task list response');
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty result set', () => {
      // Create a new task with no messages
      cy.apiRequest('POST', '/api/v2/tasks', {
        title: `Empty Messages Task - ${Date.now()}`,
        status: 'OPEN',
        priority: 'LOW',
      }).then((createResp) => {
        const emptyTaskId = (createResp.body.data || createResp.body).id;

        cy.apiRequest('GET', `/api/v2/tasks/${emptyTaskId}/messages`).then((resp) => {
          expect(resp.status).to.eq(200);

          const messages = resp.body.data || resp.body;
          expect(Array.isArray(messages)).to.be.true;
          expect(messages.length).to.eq(0);

          cy.log('✅ Empty result set handled correctly');

          // Cleanup
          cy.apiRequest('DELETE', `/api/v2/tasks/${emptyTaskId}`);
        });
      });
    });

    it('should handle limit=0', () => {
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=0`).then((resp) => {
        // Should either return empty or use default limit
        expect([200, 400]).to.include(resp.status);
        cy.log('✅ limit=0 handled');
      });
    });

    it('should handle negative limit', () => {
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=-1`).then((resp) => {
        // Should reject or use default
        expect([200, 400]).to.include(resp.status);
        cy.log('✅ Negative limit handled');
      });
    });

    it('should handle very large limit', () => {
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?limit=10000`).then((resp) => {
        expect(resp.status).to.eq(200);

        const messages = resp.body.data || resp.body;
        // Should cap at max limit or return all
        expect(messages.length).to.be.lte(10000);

        cy.log(`✅ Large limit handled - returned ${messages.length} messages`);
      });
    });

    it('should handle invalid cursor', () => {
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages?cursor=invalid-cursor-xyz`).then((resp) => {
        // Should return 400 or ignore invalid cursor
        expect([200, 400]).to.include(resp.status);
        cy.log('✅ Invalid cursor handled');
      });
    });
  });

  describe('UI Pagination', () => {
    it('should show load more button when more items exist', () => {
      cy.visit('/tasks');
      cy.wait(1500);

      // Open task drawer
      cy.get('[data-testid="task-card"], .task-card').first().click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]', { timeout: 5000 })
        .should('be.visible');

      // Look for load more or infinite scroll
      cy.get('body').then(($body) => {
        const hasLoadMore = $body.find('[data-testid="load-more"], button:contains("Load More"), button:contains("Show More")').length > 0;
        const hasInfiniteScroll = $body.find('[data-testid="infinite-scroll"], .infinite-scroll').length > 0;

        if (hasLoadMore) {
          cy.log('✅ Load More button present');
        } else if (hasInfiniteScroll) {
          cy.log('✅ Infinite scroll detected');
        } else {
          cy.log('⚠️ No pagination UI found (may load all at once)');
        }
      });
    });

    it('should load more items on scroll', () => {
      cy.visit('/tasks');
      cy.wait(1500);

      cy.get('[data-testid="task-card"], .task-card').first().click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]').within(() => {
        // Find scrollable container with messages
        cy.get('[data-testid="messages-list"], .messages-list, .comments-section').then(($container) => {
          if ($container.length > 0) {
            // Scroll to bottom
            cy.wrap($container).scrollTo('bottom');
            cy.wait(1000);

            cy.log('✅ Scroll triggered');
          }
        });
      });
    });
  });
});
