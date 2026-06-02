import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

// The core codec-regression suite: load an image, switch the right side to each
// output format, and assert the encode produces a downloadable blob with the
// correct file-format magic bytes. If a codec rebuild breaks encoding (throws,
// emits garbage, or emits the wrong format) one of these fails.
const sample = fileURLToPath(new URL('./fixtures/sample.png', import.meta.url));

const ascii = (head: number[], a: number, b: number) =>
  String.fromCharCode(...head.slice(a, b));

type Fmt = { id: string; label: string; magic: (head: number[]) => boolean };

const FORMATS: Fmt[] = [
  {
    id: 'webP',
    label: 'WebP',
    magic: (h) => ascii(h, 0, 4) === 'RIFF' && ascii(h, 8, 12) === 'WEBP',
  },
  { id: 'avif', label: 'AVIF', magic: (h) => ascii(h, 4, 8) === 'ftyp' },
  {
    id: 'jxl',
    label: 'JPEG XL',
    magic: (h) => (h[0] === 0xff && h[1] === 0x0a) || ascii(h, 4, 8) === 'JXL ',
  },
  {
    id: 'mozJPEG',
    label: 'MozJPEG',
    magic: (h) => h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff,
  },
  {
    id: 'oxiPNG',
    label: 'OxiPNG',
    magic: (h) => h[0] === 0x89 && ascii(h, 1, 4) === 'PNG',
  },
  { id: 'qoi', label: 'QOI', magic: (h) => ascii(h, 0, 4) === 'qoif' },
  {
    id: 'browserPNG',
    label: 'Browser PNG',
    magic: (h) => h[0] === 0x89 && ascii(h, 1, 4) === 'PNG',
  },
  {
    id: 'browserJPEG',
    label: 'Browser JPEG',
    magic: (h) => h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff,
  },
  // Browser GIF is intentionally omitted: canvas.toBlob('image/gif') is
  // unsupported in Chromium, so the app correctly feature-detects it out of the
  // format dropdown (getSupportedFormatIds). Its availability is browser-specific.
];

for (const fmt of FORMATS) {
  test(`encodes ${fmt.label}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/');
    await page.setInputFiles('input[type=file]', sample);

    const rightSelect = page.locator('.options-2 select.builtin-select');
    await expect(rightSelect).toBeVisible();
    await rightSelect.selectOption(fmt.id);

    // Encode settled: the working spinner (⏳ in the title) has cleared and the
    // right-side download points at a fresh blob.
    await expect
      .poll(async () => (await page.title()).includes('⏳'), {
        timeout: 60_000,
      })
      .toBe(false);
    const download = page.locator('.options-2 a.download[href^="blob:"]');
    await expect(download).toBeVisible({ timeout: 60_000 });

    const href = await download.getAttribute('href');
    expect(href).toBeTruthy();
    const { size, head } = await page.evaluate(async (url: string) => {
      const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
      return { size: buf.byteLength, head: [...buf.slice(0, 16)] };
    }, href!);

    expect(size, `${fmt.label} output should be non-trivial`).toBeGreaterThan(
      24,
    );
    expect(
      fmt.magic(head),
      `${fmt.label} output magic bytes wrong: [${head.join(', ')}]`,
    ).toBe(true);
    expect(errors, `page errors during ${fmt.label} encode`).toEqual([]);
  });
}
