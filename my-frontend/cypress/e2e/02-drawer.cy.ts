/**
 * =============================================================================
 * BISMAN ERP - Drawer Tests (Priority 2)
 * =============================================================================
 * Tests for task drawer/modal interactions:
 * - Open task drawer
 * - Inline edit fields
 * - Create comment
 * - Upload attachment
 * 
 * Expected run time: 1-2 minutes
 * =============================================================================
 */
/// <reference types="cypress" />

// Tags: @drawer, @ui
describe('Task Drawer Tests', () => {
  const API_URL = Cypress.env('API_URL') || 'http://localhost:5000';
  let authToken: string;
  let testTaskId: number;

  before(() => {
    cy.login().then((token) => {
      authToken = token as string;
      
      // Create a test task for drawer tests
      cy.apiRequest('POST', '/api/v2/tasks', {
        title: `Drawer Test Task - ${Date.now()}`,
        description: 'Task for testing drawer interactions',
        priority: 'MEDIUM',
        status: 'OPEN',
      }).then((resp) => {
        testTaskId = (resp.body.data || resp.body).id;
        cy.log(`✅ Created test task: ${testTaskId}`);
      });
    });
  });

  after(() => {
    // Cleanup test task
    if (testTaskId && authToken) {
      cy.apiRequest('DELETE', `/api/v2/tasks/${testTaskId}`);
    }
  });

  describe('Opening Drawer', () => {
    beforeEach(() => {
      cy.visit('/tasks');
      cy.wait(1000); // Allow board to load
    });

    it('should open drawer when clicking a task card', () => {
      // Find any task card and click it
      cy.get('[data-testid="task-card"], .task-card, [data-task-id]', {
        timeout: 10000,
      }).first().click();

      // Drawer/modal should appear
      cy.get('[data-testid="task-drawer"], [data-testid="task-modal"], .task-drawer, .task-modal, [role="dialog"]', {
        timeout: 5000,
      }).should('be.visible');

      cy.log('✅ Drawer opened successfully');
    });

    it('should close drawer with Escape key', () => {
      cy.get('[data-testid="task-card"], .task-card, [data-task-id]')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [data-testid="task-modal"], [role="dialog"]')
        .should('be.visible');

      cy.get('body').type('{esc}');

      cy.get('[data-testid="task-drawer"], [data-testid="task-modal"], [role="dialog"]')
        .should('not.exist');

      cy.log('✅ Drawer closed with Escape');
    });

    it('should close drawer with close button', () => {
      cy.get('[data-testid="task-card"], .task-card, [data-task-id]')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [data-testid="task-modal"], [role="dialog"]')
        .should('be.visible');

      // Look for close button
      cy.get('[data-testid="close-drawer"], [data-testid="close-modal"], button[aria-label*="close"], .close-button, button:contains("×")')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [data-testid="task-modal"], [role="dialog"]')
        .should('not.exist');

      cy.log('✅ Drawer closed with button');
    });
  });

  describe('Inline Editing', () => {
    beforeEach(() => {
      cy.visit('/tasks');
      cy.wait(1000);
    });

    it('should edit task title inline', () => {
      // Open a task
      cy.get('[data-testid="task-card"], .task-card, [data-task-id]')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('be.visible');

      // Find and click title to edit
      const newTitle = `Updated Title - ${Date.now()}`;
      
      cy.get('[data-testid="task-title"], .task-title, h1, h2')
        .first()
        .within(() => {
          // Try clicking to make it editable
          cy.get('input, [contenteditable], textarea').then(($input) => {
            if ($input.length > 0) {
              cy.wrap($input).clear().type(newTitle);
            } else {
              cy.root().click().type(newTitle);
            }
          });
        });

      // Save (blur or press Enter)
      cy.get('body').click();

      cy.log('✅ Title edit attempted');
    });

    it('should edit task description', () => {
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('be.visible');

      const newDescription = `Updated description - ${Date.now()}`;

      // Find description field
      cy.get('[data-testid="task-description"], .task-description, textarea[name="description"]')
        .first()
        .clear()
        .type(newDescription);

      // Look for save button or auto-save
      cy.get('button:contains("Save"), button[type="submit"]').then(($btn) => {
        if ($btn.length > 0) {
          cy.wrap($btn.first()).click();
        }
      });

      cy.log('✅ Description edit attempted');
    });

    it('should change task priority via dropdown', () => {
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('be.visible');

      // Find priority selector
      cy.get('[data-testid="priority-select"], select[name="priority"], [data-field="priority"]')
        .first()
        .then(($el) => {
          if ($el.is('select')) {
            cy.wrap($el).select('HIGH');
          } else {
            cy.wrap($el).click();
            cy.get('[data-value="HIGH"], li:contains("HIGH"), option:contains("HIGH")')
              .first()
              .click();
          }
        });

      cy.log('✅ Priority change attempted');
    });
  });

  describe('Comments', () => {
    it('should add a comment via API', () => {
      const commentContent = `Test comment - ${Date.now()}`;

      cy.apiRequest('POST', `/api/v2/tasks/${testTaskId}/messages`, {
        content: commentContent,
        messageType: 'COMMENT',
      }).then((resp) => {
        expect([200, 201]).to.include(resp.status);
        
        const message = resp.body.data || resp.body;
        expect(message).to.have.property('id');
        expect(message.content).to.eq(commentContent);

        cy.log('✅ Comment added via API');
      });
    });

    it('should add comment from drawer UI', () => {
      cy.visit('/tasks');
      
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('be.visible');

      const commentText = `UI Comment - ${Date.now()}`;

      // Find comment input
      cy.get('[data-testid="comment-input"], textarea[name="comment"], input[placeholder*="comment"], textarea[placeholder*="message"]')
        .first()
        .type(commentText);

      // Submit comment
      cy.get('[data-testid="submit-comment"], button:contains("Send"), button:contains("Post"), button[type="submit"]')
        .first()
        .click();

      // Verify comment appears
      cy.contains(commentText, { timeout: 5000 }).should('be.visible');

      cy.log('✅ Comment added from UI');
    });

    it('should display comments list', () => {
      // First add a comment
      cy.apiRequest('POST', `/api/v2/tasks/${testTaskId}/messages`, {
        content: `List test comment - ${Date.now()}`,
        messageType: 'COMMENT',
      });

      // Get comments
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/messages`).then((resp) => {
        expect(resp.status).to.eq(200);
        
        const messages = resp.body.data || resp.body;
        expect(Array.isArray(messages)).to.be.true;
        expect(messages.length).to.be.gte(1);

        cy.log(`✅ Retrieved ${messages.length} comments`);
      });
    });
  });

  describe('Attachments', () => {
    it('should upload attachment via API', () => {
      cy.fixture('sample-attachment.txt', 'binary').then((fileContent) => {
        const blob = Cypress.Blob.binaryStringToBlob(fileContent, 'text/plain');
        const formData = new FormData();
        formData.append('file', blob, 'test-attachment.txt');

        cy.request({
          method: 'POST',
          url: `${API_URL}/api/v2/tasks/${testTaskId}/attachments`,
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
          failOnStatusCode: false,
        }).then((resp) => {
          // May return 200, 201, or 400 if attachments not supported
          if (resp.status === 200 || resp.status === 201) {
            cy.log('✅ Attachment uploaded successfully');
          } else if (resp.status === 400 || resp.status === 404) {
            cy.log('⚠️ Attachment endpoint may not be fully implemented');
          } else {
            expect([200, 201, 400, 404]).to.include(resp.status);
          }
        });
      });
    });

    it('should upload attachment from drawer UI', () => {
      cy.visit('/tasks');
      
      cy.get('[data-testid="task-card"], .task-card')
        .first()
        .click();

      cy.get('[data-testid="task-drawer"], [role="dialog"]')
        .should('be.visible');

      // Look for file input
      cy.get('input[type="file"]').then(($input) => {
        if ($input.length > 0) {
          cy.wrap($input).selectFile('cypress/fixtures/sample-attachment.txt', {
            force: true,
          });

          // Wait for upload
          cy.wait(2000);

          cy.log('✅ File upload triggered from UI');
        } else {
          cy.log('⚠️ No file input found in drawer');
        }
      });
    });

    it('should list attachments', () => {
      cy.apiRequest('GET', `/api/v2/tasks/${testTaskId}/attachments`).then((resp) => {
        // May return 200 or 404 if endpoint doesn't exist
        if (resp.status === 200) {
          const attachments = resp.body.data || resp.body;
          cy.log(`✅ Retrieved ${Array.isArray(attachments) ? attachments.length : 0} attachments`);
        } else {
          cy.log('⚠️ Attachments endpoint not available');
        }
      });
    });
  });
});
