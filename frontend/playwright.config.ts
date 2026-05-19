// Playwright E2E config.
//
// To activate:
//   1. cd frontend && npm install -D @playwright/test
//   2. npx playwright install --with-deps chromium
//   3. Set test credentials in e2e/.env (copy from e2e/.env.example)
//   4. npx playwright test
//
// CI: a separate workflow runs against a preview deployment.

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false, // sequential — shared test data
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
