/**
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { AVIFModule } from 'codecs/avif/enc/avif_enc';
import type { EncodeOptions } from '../shared/meta';

import { initEmscriptenModule } from 'features/worker-utils';

type AvifEncoderModuleFactory = EmscriptenWasm.ModuleFactory<AVIFModule>;

export interface AvifEncodeRuntimeOptions {
  supportsThreads?: () => Promise<boolean>;
}

export interface AvifEncoderRuntime {
  loadMultiThread?: () => Promise<AvifEncoderModuleFactory>;
  loadSingleThread: () => Promise<AvifEncoderModuleFactory>;
  supportsThreads: () => Promise<boolean>;
}

export function createAvifEncoderRuntime({
  loadMultiThread,
  loadSingleThread,
  supportsThreads,
}: AvifEncoderRuntime) {
  let emscriptenModule: Promise<AVIFModule>;

  async function loadMT() {
    if (!loadMultiThread) {
      throw new Error('AVIF multithread runtime is unavailable.');
    }

    return loadMultiThread();
  }

  async function init({
    supportsThreads: detectThreads = supportsThreads,
  } = {}) {
    const moduleFactory = (await detectThreads())
      ? await loadMT()
      : await loadSingleThread();
    return initEmscriptenModule(moduleFactory);
  }

  return async function encode(
    data: ImageData,
    options: EncodeOptions,
    runtimeOptions?: AvifEncodeRuntimeOptions,
  ): Promise<ArrayBuffer> {
    if (!emscriptenModule) emscriptenModule = init(runtimeOptions);

    const module = await emscriptenModule;
    const result = module.encode(data.data, data.width, data.height, options);

    if (!result) throw new Error('Encoding error');

    const output = new Uint8Array(result.byteLength);
    output.set(result);
    return output.buffer as ArrayBuffer;
  };
}
