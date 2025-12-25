/// <reference types="cypress" />
// ***********************************************************
// Cypress Custom Commands
// ***********************************************************

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      /**
       * Login via API and set the access token
       */
      login(email?: string, password?: string): Chainable<string>;

      /**
       * Login as a specific role using fixtures/users.json
       */
      loginAs(role: 'accountant' | 'financeController' | 'cfo' | 'banker' | 'requester' | 'hubIncharge' | 'superAdmin' | 'regionalHead'): Chainable<string>;

      /**
       * Make an authenticated API request
       */
      apiRequest(
        method: string,
        url: string,
        body?: object
      ): Chainable<Response<any>>;

      /**
       * Upload a file to an API endpoint
       */
      apiUpload(
        url: string,
        fileName: string,
        mimeType: string
      ): Chainable<Response<any>>;

      // ============ Settlement-Specific Commands ============

      /**
       * Create a settlement via API
       */
      createSettlement(paymentRequestIds: string[]): Chainable<Response<any>>;

      /**
       * Approve settlement as Finance Controller
       */
      fcApproveSettlement(settlementId: string, disallowedItems?: string[]): Chainable<Response<any>>;

      /**
       * Approve settlement as CFO
       */
      cfoApproveSettlement(settlementId: string, disallowedItems?: string[]): Chainable<Response<any>>;

      /**
       * Execute settlement (banker)
       */
      executeSettlement(settlementId: string, utr: string): Chainable<Response<any>>;

      /**
       * Retry a failed settlement
       */
      retryFailedSettlement(settlementId: string): Chainable<Response<any>>;

      /**
       * Get settlement details
       */
      getSettlement(settlementId: string): Chainable<Response<any>>;

      /**
       * Navigate to Task Approval page
       */
      visitTaskApproval(): Chainable<void>;

      /**
       * Navigate to Kanban board
       */
      visitKanban(): Chainable<void>;

      /**
       * Navigate to Settlement page
       */
      visitSettlements(): Chainable<void>;

      /**
       * Check if element is read-only (input or otherwise)
       */
      shouldBeReadOnly(): Chainable<Subject>;

      /**
       * Check consolidation UI visibility
       */
      consolidationShouldBeVisible(visible: boolean): Chainable<void>;
    }
  }
}

// Login command - authenticates via API and stores token
Cypress.Commands.add(
  'login',
  (email?: string, password?: string): Cypress.Chainable<string> => {
    const userEmail = email || Cypress.env('TEST_USER_EMAIL');
    const userPassword = password || Cypress.env('TEST_USER_PASSWORD');
    const apiUrl = Cypress.env('API_URL');

    return cy
      .request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: {
          email: userEmail,
          password: userPassword,
        },
        failOnStatusCode: false,
      })
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
        }

        const token = response.body.accessToken || response.body.token;
        if (!token) {
          throw new Error('No token in login response');
        }

        // Store token for later use
        Cypress.env('AUTH_TOKEN', token);

        return token as string;
      })
      .then((token) => {
        // Set cookie in a separate chain to avoid mixing sync/async
        cy.setCookie('access_token', token, { path: '/' });
        return cy.wrap(token);
      });
  }
);

// Authenticated API request command
Cypress.Commands.add(
  'apiRequest',
  (method: string, url: string, body?: object) => {
    const apiUrl = Cypress.env('API_URL');
    const token = Cypress.env('AUTH_TOKEN');

    return cy.request({
      method,
      url: url.startsWith('http') ? url : `${apiUrl}${url}`,
      body,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      failOnStatusCode: false,
    });
  }
);

// File upload command
Cypress.Commands.add(
  'apiUpload',
  (url: string, fileName: string, mimeType: string) => {
    const apiUrl = Cypress.env('API_URL');
    const token = Cypress.env('AUTH_TOKEN');

    return cy.fixture(fileName, 'binary').then((fileContent) => {
      const blob = Cypress.Blob.binaryStringToBlob(fileContent, mimeType);
      const formData = new FormData();
      formData.append('file', blob, fileName);

      return cy.request({
        method: 'POST',
        url: url.startsWith('http') ? url : `${apiUrl}${url}`,
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        failOnStatusCode: false,
      });
    });
  }
);

// ============ Role-Based Login Command ============
Cypress.Commands.add('loginAs', (role: string): Cypress.Chainable<string> => {
  return cy.fixture('users.json').then((users: Record<string, { email: string; password: string }>) => {
    const user = users[role];
    if (!user) {
      throw new Error(`Unknown role: ${role}. Available roles: ${Object.keys(users).join(', ')}`);
    }
    return cy.login(user.email, user.password);
  });
});

// ============ Settlement Commands ============
Cypress.Commands.add('createSettlement', (paymentRequestIds: string[]) => {
  return cy.apiRequest('POST', '/api/settlements', { paymentRequestIds });
});

Cypress.Commands.add('fcApproveSettlement', (settlementId: string, disallowedItems?: string[]) => {
  const body: { action: string; disallowedItems?: string[] } = { action: 'approve' };
  if (disallowedItems && disallowedItems.length > 0) {
    body.disallowedItems = disallowedItems;
  }
  return cy.apiRequest('POST', `/api/settlements/${settlementId}/fc-approve`, body);
});

Cypress.Commands.add('cfoApproveSettlement', (settlementId: string, disallowedItems?: string[]) => {
  const body: { action: string; disallowedItems?: string[] } = { action: 'approve' };
  if (disallowedItems && disallowedItems.length > 0) {
    body.disallowedItems = disallowedItems;
  }
  return cy.apiRequest('POST', `/api/settlements/${settlementId}/cfo-approve`, body);
});

Cypress.Commands.add('executeSettlement', (settlementId: string, utr: string) => {
  return cy.apiRequest('POST', `/api/settlements/${settlementId}/execute`, { utr });
});

Cypress.Commands.add('retryFailedSettlement', (settlementId: string) => {
  return cy.apiRequest('POST', `/api/settlements/${settlementId}/retry`);
});

Cypress.Commands.add('getSettlement', (settlementId: string) => {
  return cy.apiRequest('GET', `/api/settlements/${settlementId}`);
});

// ============ Navigation Commands ============
// Updated to use actual existing routes
Cypress.Commands.add('visitTaskApproval', () => {
  cy.visit('/admin/task-approvals');
  cy.url().should('include', '/admin/task-approvals');
});

Cypress.Commands.add('visitKanban', () => {
  cy.visit('/dashboard');
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('visitSettlements', () => {
  cy.visit('/finance/payment-approval-queue');
  cy.url().should('include', '/finance/payment-approval-queue');
});

// ============ UI Assertion Commands ============
Cypress.Commands.add('shouldBeReadOnly', { prevSubject: true }, (subject) => {
  cy.wrap(subject).should(($el) => {
    const isDisabled = $el.is(':disabled');
    const isReadOnly = $el.attr('readonly') !== undefined;
    const hasReadOnlyClass = $el.hasClass('read-only') || $el.hasClass('readonly');
    const isContentEditable = $el.attr('contenteditable') === 'false';
    expect(isDisabled || isReadOnly || hasReadOnlyClass || isContentEditable).to.be.true;
  });
  return cy.wrap(subject);
});

Cypress.Commands.add('consolidationShouldBeVisible', (visible: boolean) => {
  const selectors = [
    '[data-testid="consolidation-panel"]',
    '[data-testid="consolidate-button"]',
    '.consolidation-section',
    '#consolidation-ui'
  ];
  
  if (visible) {
    cy.get(selectors.join(', ')).should('exist');
  } else {
    selectors.forEach(selector => {
      cy.get('body').then($body => {
        if ($body.find(selector).length > 0) {
          throw new Error(`Consolidation UI should not be visible but found: ${selector}`);
        }
      });
    });
  }
});

export {};
