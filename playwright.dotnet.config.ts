import { defineConfig } from '@playwright/test';

const apiBaseUrl =
  process.env.LOOPR_DOTNET_E2E_API_BASE_URL ?? 'http://127.0.0.1:5102';

export default defineConfig({
  testDir: './e2e/dotnet-api',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-dotnet' }],
  ],
  use: {
    baseURL: apiBaseUrl,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run e2e:dotnet:backend',
    url: `${apiBaseUrl}/health`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
