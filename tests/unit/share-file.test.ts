import { afterEach, describe, expect, it, vi } from 'vitest';
import { canShareFile, share } from '../../src/lib/share-file';

const file = new File(['x'], 'photo.webp', { type: 'image/webp' });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('canShareFile', () => {
  it('is false without a file or without canShare support', () => {
    expect(canShareFile(null)).toBe(false);
    vi.stubGlobal('navigator', {});
    expect(canShareFile(file)).toBe(false);
  });

  it('asks the engine about the exact file', () => {
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { canShare });
    expect(canShareFile(file)).toBe(true);
    expect(canShare).toHaveBeenCalledWith({ files: [file] });
  });
});

describe('share', () => {
  it('resolves null on success and on a dismissed sheet', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockResolvedValue(undefined) });
    expect(await share(file)).toBeNull();

    vi.stubGlobal('navigator', {
      share: vi
        .fn()
        .mockRejectedValue(new DOMException('closed', 'AbortError')),
    });
    expect(await share(file)).toBeNull();
  });

  it('resolves a user-facing message on real failures', async () => {
    vi.stubGlobal('navigator', {
      share: vi
        .fn()
        .mockRejectedValue(new DOMException('denied', 'NotAllowedError')),
    });
    expect(await share(file)).toMatch(/share sheet/);
  });
});
