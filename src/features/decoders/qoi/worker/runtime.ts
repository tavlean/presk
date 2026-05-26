import type { QOIModule } from 'codecs/qoi/dec/qoi_dec';

import { blobToArrayBuffer, initEmscriptenModule } from 'features/worker-utils';

type QoiDecoderModuleFactory = EmscriptenWasm.ModuleFactory<QOIModule>;

export interface QoiDecoderRuntime {
  loadDecoder(): Promise<QoiDecoderModuleFactory>;
}

export function createQoiDecoderRuntime({ loadDecoder }: QoiDecoderRuntime) {
  let emscriptenModule: Promise<QOIModule>;

  return async function decode(blob: Blob): Promise<ImageData> {
    if (!emscriptenModule) {
      const decoder = await loadDecoder();
      emscriptenModule = initEmscriptenModule(decoder);
    }

    const [module, data] = await Promise.all([
      emscriptenModule,
      blobToArrayBuffer(blob),
    ]);

    const result = module.decode(data);
    if (!result) throw new Error('Decoding error');
    return result;
  };
}
