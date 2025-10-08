import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://localhost:3000',
    headless: false, // Run with visible browser for debugging
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    // Record video for all tests
    video: 'retain-on-failure', // Keep video only on failure
    screenshot: 'only-on-failure', // Take screenshot on failure
    trace: 'on-first-retry', // Record trace for debugging
  },
  testDir: 'tests',
  timeout: 60_000, // Increase timeout for debugging
  outputDir: 'test-results',
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
