import { test, expect } from '@playwright/test';
const login = async (page: any) => {
  await page.goto('/');
  await page.getByLabel('Email address', { exact: true }).fill('admin@anditsnogood.local');
  await page.getByLabel('Password', { exact: true }).fill('NoGoodDemo2026!');
  await page.getByRole('button', { name: 'Enter the league' }).click();
  await expect(page.getByRole('heading', { name: 'Here’s to the misses.' })).toBeVisible();
};
test('sign in, standings, event breakdown, persistent session and responsive layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await page.getByLabel('Selected league').selectOption({ label: 'The Shank Tank · Demo' });
  await expect(
    page.locator('.hero-scores').getByText('+5', { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Standings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A race to the bottom.' })).toBeVisible();
  await expect(page.getByText('Demo Buffalo backup', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Here’s to the misses.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
test('CSV preview reports scores before confirmation and provides history', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Super Admin', exact: true }).click();
  await page
    .getByLabel('Reason for this change (required)')
    .fill('Browser test preview only, no global change');
  await page
    .getByLabel('CSV contents')
    .fill(
      'season,week,nfl_team,kicker,event_type,distance,result,event_id\n2026,3,BUF,Preview kicker,FIELD_GOAL,29,MISSED,preview-only-1\n2026,3,BUF,Preview backup,EXTRA_POINT,,BLOCKED,preview-only-2',
    );
  await page.getByRole('button', { name: 'Validate and preview' }).click();
  await expect(page.getByRole('heading', { name: 'Scoring preview' })).toBeVisible();
  await expect(page.locator('.scoring-rule').getByText('+5', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm global import' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Import history' })).toBeVisible();
});
test('draft room exposes one-round picks and commission settings', async ({ page }) => {
  await login(page);
  await page.getByLabel('Selected league').selectOption({ label: 'Fresh Misfortune · Demo Draft' });
  await page.getByRole('button', { name: 'Draft room', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The draft room.' })).toBeVisible();
  await expect(page.locator('.franchise-card')).toHaveCount(32);
  await expect(page.getByRole('button', { name: 'Start draft', exact: true })).toBeEnabled();
  await page.getByLabel('Your auto-pick rankings').fill('BUF, DAL, KC');
  await page.getByRole('button', { name: 'Save rankings' }).click();
  await expect(page.getByText('Auto-pick preferences saved', { exact: true })).toBeVisible();
});
