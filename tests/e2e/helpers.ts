import type { Locator } from '@playwright/test';

/**
 * Select an output format by clicking its chip in the panel's Format grid.
 * Long-tail formats (QOI, the browser encoders) live behind the "More…" chip,
 * so expand it first when the target chip isn't rendered yet.
 */
export async function pickFormat(panel: Locator, id: string): Promise<void> {
  const chip = panel.locator(`[data-format="${id}"]`);
  if ((await chip.count()) === 0) {
    await panel.locator('.chip-more').click();
  }
  await chip.click();
}
