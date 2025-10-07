import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  // Record a short video of each test run to help debug UI flows.
  // Files are saved per-test in Playwright's test-results directory.
  video: 'on',
  },
  testDir: 'tests/playwright',
  timeout: 30_000,
});
