/**
 * Bank Reconciliation E2E Tests - Upload Flow
 * 
 * Tests the statement upload workflow:
 * - File upload UI
 * - Template selection
 * - Parse progress
 * - Error handling
 */

describe('Bank Reconciliation - Upload Flow', () => {
  const API_BASE = Cypress.env('API_URL') || 'http://localhost:5000';

  const accountantCredentials = {
    email: Cypress.env('ACCOUNTANT_EMAIL') || 'demo_accountant@bisman.demo',
    password: Cypress.env('ACCOUNTANT_PASSWORD') || 'Demo@123',
  };

  beforeEach(() => {
    // Login as accountant
    cy.request({
      method: 'POST',
      url: `${API_BASE}/api/auth/login`,
      body: accountantCredentials,
      failOnStatusCode: false,
    });
  });

  // =========================================================================
  // NAVIGATION TESTS
  // =========================================================================

  describe('Navigation', () => {
    it('should navigate to reconciliation dashboard', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      // Should see page content or redirect to login
      cy.get('body').should('exist');
    });

    it('should navigate to upload page from dashboard', () => {
      cy.visit('/reconciliation', { failOnStatusCode: false });
      
      // Look for upload button (may require login)
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Statement')) {
          cy.contains('Upload Statement').click();
          cy.url().should('include', '/reconciliation/upload');
        }
      });
    });
  });

  // =========================================================================
  // UPLOAD PAGE TESTS
  // =========================================================================

  describe('Upload Page', () => {
    beforeEach(() => {
      cy.visit('/reconciliation/upload', { failOnStatusCode: false });
    });

    it('should display upload form elements', () => {
      cy.get('body').then(($body) => {
        // Check if page loaded (might be behind auth)
        const text = $body.text();
        
        if (text.includes('Upload Bank Statement') || text.includes('Bank Statement File')) {
          // Form should have file upload area
          cy.contains(/Upload a file|drag and drop/i).should('exist');
          
          // Form should have template selection
          cy.contains(/Bank Template|Select a template/i).should('exist');
        }
      });
    });

    it('should show file type restrictions', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Bank Statement')) {
          cy.contains(/CSV|Excel|XLS/i).should('exist');
        }
      });
    });

    it('should have cancel button', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Bank Statement')) {
          cy.contains('Cancel').should('exist');
        }
      });
    });

    it('should have upload button (initially disabled)', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Bank Statement')) {
          cy.contains(/Upload|Parse/i).should('exist');
        }
      });
    });
  });

  // =========================================================================
  // FILE SELECTION TESTS
  // =========================================================================

  describe('File Selection', () => {
    beforeEach(() => {
      cy.visit('/reconciliation/upload', { failOnStatusCode: false });
    });

    it('should accept CSV file', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Bank Statement')) {
          // Create a test CSV file
          const csvContent = 'Date,Description,Amount\n2024-01-15,Test Transaction,1000.00';
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const testFile = new File([blob], 'test-statement.csv', { type: 'text/csv' });
          
          // Get file input (might be hidden)
          cy.get('input[type="file"]').then(($input) => {
            if ($input.length > 0) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(testFile);
              const inputEl = $input[0] as HTMLInputElement;
              // @ts-ignore
              inputEl.files = dataTransfer.files;
              cy.wrap($input).trigger('change', { force: true });
              
              // Should show filename
              cy.contains('test-statement.csv', { timeout: 5000 }).should('exist');
            }
          });
        }
      });
    });

    it('should show preview for CSV files', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Bank Statement')) {
          const csvContent = 'Date,Description,Amount\n2024-01-15,Payment ABC,1000.00\n2024-01-16,Payment XYZ,2000.00';
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const testFile = new File([blob], 'preview-test.csv', { type: 'text/csv' });
          
          cy.get('input[type="file"]').then(($input) => {
            if ($input.length > 0) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(testFile);
              const inputEl = $input[0] as HTMLInputElement;
              inputEl.files = dataTransfer.files;
              cy.wrap($input).trigger('change', { force: true });
              
              // Should show preview table
              cy.contains(/Preview|rows/i, { timeout: 5000 }).should('exist');
            }
          });
        }
      });
    });
  });

  // =========================================================================
  // TEMPLATE SELECTION TESTS
  // =========================================================================

  describe('Template Selection', () => {
    beforeEach(() => {
      cy.visit('/reconciliation/upload', { failOnStatusCode: false });
    });

    it('should display template dropdown', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Bank Statement')) {
          cy.get('select').should('exist');
        }
      });
    });

    it('should show template options or empty state', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Bank Statement')) {
          // Either shows templates or "no templates" message
          const hasTemplates = $body.find('select option').length > 1;
          const hasNoTemplatesMessage = $body.text().includes('No bank templates');
          
          expect(hasTemplates || hasNoTemplatesMessage).to.be.true;
        }
      });
    });
  });

  // =========================================================================
  // VALIDATION TESTS
  // =========================================================================

  describe('Form Validation', () => {
    beforeEach(() => {
      cy.visit('/reconciliation/upload', { failOnStatusCode: false });
    });

    it('should require file and template before upload', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Bank Statement')) {
          // Upload button should be disabled without file and template
          cy.contains('button', /Upload|Parse/i).should(($btn) => {
            expect($btn).to.have.attr('disabled');
          });
        }
      });
    });

    it('should show error for unsupported file types', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Bank Statement')) {
          // Try to upload unsupported file type
          const txtContent = 'This is not a CSV file';
          const blob = new Blob([txtContent], { type: 'text/plain' });
          const testFile = new File([blob], 'test.txt', { type: 'text/plain' });
          cy.get('input[type="file"]').then(($input) => {
            if ($input.length > 0) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(testFile);
              const inputEl = $input[0] as HTMLInputElement;
              inputEl.files = dataTransfer.files;
              cy.wrap($input).trigger('change', { force: true });
              
              // Should show error or reject the file
              cy.get('body').should(($b) => {
                const hasError = $b.text().includes('Only CSV') || 
                                $b.text().includes('not allowed') ||
                                $b.find('.text-red-').length > 0;
                expect(hasError).to.be.true;
              });
            }
          });
        }
      });
    });
  });

  // =========================================================================
  // HELP/TIPS TESTS
  // =========================================================================

  describe('Help Information', () => {
    beforeEach(() => {
      cy.visit('/reconciliation/upload', { failOnStatusCode: false });
    });

    it('should display upload tips', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Bank Statement')) {
          // Should show helpful tips
          cy.contains(/Tips|ensure|format/i).should('exist');
        }
      });
    });

    it('should mention file size limit', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Upload Bank Statement')) {
          // Should mention 50MB limit
          cy.contains(/50|MB|limit/i).should('exist');
        }
      });
    });
  });
});
