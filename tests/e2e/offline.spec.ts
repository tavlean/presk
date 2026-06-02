import { expect, test } from '@playwright/test';

// Local-first guarantee: after the service worker installs, a reload while
// offline must still serve the app shell.
test('reloads offline after the service worker installs', async ({
  page,
  context,
}) => {
  // On loopback hosts (localhost) the SW is opt-in via `?sw=1` (persisted), so
  // it never pollutes a dev origin by accident. Production hosts register it
  // unconditionally; here we opt in so the offline path is exercised.
  await page.goto('/?sw=1');
  await expect(page.getByRole('heading', { name: 'Sqush' })).toBeVisible();

  // Wait for the service worker to take control.
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller != null,
    null,
    { timeout: 30_000 },
  );

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sqush' })).toBeVisible();
  await context.setOffline(false);
});
