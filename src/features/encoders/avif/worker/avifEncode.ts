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
import checkThreadsSupport from 'worker-shared/supports-wasm-threads';

let emscriptenModule: Promise<AVIFModule>;

export interface AvifEncodeRuntimeOptions {
  supportsThreads?: typeof checkThreadsSupport;
}

async function init({
  supportsThreads = checkThreadsSupport,
}: AvifEncodeRuntimeOptions = {}) {
  if (await supportsThreads()) {
    const avifEncoder = await import('codecs/avif/enc/avif_enc_mt');
    return initEmscriptenModule<AVIFModule>(avifEncoder.default);
  }
  const avifEncoder = await import('codecs/avif/enc/avif_enc.js');
  return initEmscriptenModule(avifEncoder.default);
}

export default async function encode(
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
}
