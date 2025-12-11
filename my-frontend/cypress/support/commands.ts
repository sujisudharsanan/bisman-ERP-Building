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
      .then((response): string => {
        if (response.status !== 200) {
          throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
        }

        const token = response.body.accessToken || response.body.token;
        if (!token) {
          throw new Error('No token in login response');
        }

        // Store token for later use
        Cypress.env('AUTH_TOKEN', token);

        // Also set as cookie if the app expects it
        cy.setCookie('access_token', token, { path: '/' });

        return token as string;
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

export {};
