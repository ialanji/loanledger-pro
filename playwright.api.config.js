import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/api/playwright',
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false, // Run tests sequentially for API stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker to avoid database conflicts
  reporter: [
    ['line'],
    ['html', { outputFolder: 'playwright-report-api', open: 'never' }],
    ['json', { outputFile: 'test-results/api-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3001',
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'api-debugging',
      testDir: './tests/api/playwright',
      use: {
        baseURL: 'http://localhost:3001',
      },
    },
  ],
  // Global setup and teardown for database and server
  globalSetup: './tests/api/playwright/global-setup.js',
  globalTeardown: './tests/api/playwright/global-teardown.js',
});