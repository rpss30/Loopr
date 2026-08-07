import { defineConfig, devices } from '@playwright/test';

const apiBaseUrl = process.env.LOOPR_E2E_API_BASE_URL ?? 'http://127.0.0.1:5102';
const webBaseUrl = process.env.LOOPR_E2E_WEB_BASE_URL ?? 'http://127.0.0.1:8082';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: webBaseUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
      },
    },
  ],
  webServer: [
    {
      command: 'npm run e2e:backend',
      url: `${apiBaseUrl}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run e2e:mobile',
      url: webBaseUrl,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
