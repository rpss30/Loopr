import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.LOOPR_E2E_API_BASE_URL ?? 'http://127.0.0.1:3101';

test.beforeEach(async ({ page, request }) => {
  await request.post(`${apiBaseUrl}/api/v1/e2e/reset`);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test.afterEach(async ({ page, request }) => {
  await page.evaluate(() => window.localStorage.clear()).catch(() => undefined);
  await request.post(`${apiBaseUrl}/api/v1/e2e/reset`);
});

test('creates a project from Expo web and keeps it visible after reload', async ({ page }) => {
  const projectName = `Browser E2E ${Date.now()}`;

  await page.getByText('Create new project', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create Project' })).toBeVisible();

  await page.getByPlaceholder('e.g. Sunday acoustic riff').fill(projectName);
  await page.getByPlaceholder('100').fill('112');
  await page.getByText('Create workspace', { exact: true }).click();

  await expect(page.getByRole('button', { name: `Rename ${projectName}` })).toBeVisible();
  await expect(page.getByText('No tracks yet', { exact: true })).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('button', { name: `Open ${projectName}` })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: `Open ${projectName}` })).toBeVisible();
});

// Expo web records to blob: URLs through expo-av's MediaRecorder implementation.
// Those URLs can work inside the same page session, but they are not durable
// local file URIs after a full browser reload. The app's file persistence and
// cleanup path also uses expo-file-system, whose web implementation only warns
// that it is unsupported. Stubbing either behavior would make this pass for the
// wrong reason, so the native audio reload flow is intentionally skipped.
test.skip('records, plays, layers two tracks, and keeps recorded audio playable after reload', async () => {});
