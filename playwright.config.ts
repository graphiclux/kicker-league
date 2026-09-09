import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests',
  testMatch: '*.e2e.ts',
  timeout: 45000,
  fullyParallel: false,
  use: {
    baseURL: process.env.TEST_WEB_URL || 'https://anditsnogood.ddev.site',
    ignoreHTTPSErrors: process.env.TEST_IGNORE_HTTPS_ERRORS === 'true',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
});
