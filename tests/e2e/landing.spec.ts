import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

// The promoted "frame" landing. These drive the REAL "Browse files" control (the
// filechooser path), which every other spec bypasses via setInputFiles on the
// hidden input — so a broken button, binding, or routing would otherwise ship
// green. Also pins the landing's accessible heading name.
const photo = fileURLToPath(new URL('../fixtures/photo.jpg', import.meta.url));
const gradient = fileURLToPath(
  new URL('../fixtures/gradient.png', import.meta.url),
);

test.describe('landing', () => {
  test('renders its affordances and a stable, app-named heading', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: 'Browse files' }),
    ).toBeVisible();
    // The quiet paste action beside Browse (shown when the async clipboard is
    // available, which it is in both test engines on a secure origin).
    await expect(page.getByRole('button', { name: 'paste' })).toBeVisible();
    // The visible headline is aria-hidden and swaps on drag; the heading's
    // accessible name stays stable and carries the app identity.
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(
      /Frisp/,
    );
  });

  test('the Browse button opens the picker; one image enters the single editor', async ({
    page,
  }) => {
    await page.goto('/');
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Browse files' }).click();
    await (await chooser).setFiles(photo);

    await expect(page.locator('.options-2')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.bulk-mode')).toHaveCount(0);
  });

  test('the Browse button multi-selects into bulk mode', async ({ page }) => {
    await page.goto('/');
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Browse files' }).click();
    await (await chooser).setFiles([photo, gradient]);

    await expect(page.locator('.bulk-mode')).toBeVisible({ timeout: 10_000 });
  });
});
