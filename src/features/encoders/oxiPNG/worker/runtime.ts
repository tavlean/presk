import type { optimise as singleThreadOptimise } from 'codecs/oxipng/pkg/squoosh_oxipng';
import type { optimise as multiThreadOptimise } from 'codecs/oxipng/pkg-parallel/squoosh_oxipng';
import type { EncodeOptions } from '../shared/meta';

export interface OxiPngWasmUrls {
  multiThread?: string;
  singleThread?: string;
}

export interface OxiPngRuntimeOptions {
  supportsThreads?: () => Promise<boolean>;
  wasmUrls?: OxiPngWasmUrls;
}

type OxiPngOptimise = typeof singleThreadOptimise | typeof multiThreadOptimise;

export interface OxiPngEncoderRuntime {
  loadMultiThread?: (wasmUrl?: string) => Promise<OxiPngOptimise>;
  loadSingleThread: (wasmUrl?: string) => Promise<OxiPngOptimise>;
  supportsThreads: () => Promise<boolean>;
}

export function createOxiPngEncoderRuntime({
  loadMultiThread,
  loadSingleThread,
  supportsThreads,
}: OxiPngEncoderRuntime) {
  let wasmReady: Promise<OxiPngOptimise>;

  async function loadMT(wasmUrl?: string) {
    if (!loadMultiThread) {
      throw new Error('OxiPNG multithread runtime is unavailable.');
    }

    return loadMultiThread(wasmUrl);
  }

  return async function encode(
    data: ImageData,
    options: EncodeOptions,
    runtimeOptions: OxiPngRuntimeOptions = {},
  ): Promise<ArrayBuffer> {
    if (!wasmReady) {
      const detectThreads = runtimeOptions.supportsThreads ?? supportsThreads;
      const { wasmUrls } = runtimeOptions;

      wasmReady = detectThreads().then((hasThreads: boolean) =>
        hasThreads
          ? loadMT(wasmUrls?.multiThread)
          : loadSingleThread(wasmUrls?.singleThread),
      );
    }

    const optimise = await wasmReady;
    const result = optimise(
      data.data,
      data.width,
      data.height,
      options.level,
      options.interlace,
    );
    const bytes = new Uint8Array(result.length);
    bytes.set(result);

    return bytes.buffer;
  };
}
