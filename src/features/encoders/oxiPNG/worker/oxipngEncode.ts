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
import checkThreadsSupport from 'worker-shared/supports-wasm-threads';
import { createOxiPngEncoderRuntime } from './runtime';

export type { OxiPngRuntimeOptions, OxiPngWasmUrls } from './runtime';

export default createOxiPngEncoderRuntime({
  supportsThreads: checkThreadsSupport,
  async loadMultiThread(wasmUrl) {
    const {
      default: init,
      initThreadPool,
      optimise,
    } = await import('codecs/oxipng/pkg-parallel/squoosh_oxipng');
    await init(wasmUrl);
    await initThreadPool(navigator.hardwareConcurrency);

    return optimise;
  },
  async loadSingleThread(wasmUrl) {
    const { default: init, optimise } =
      await import('codecs/oxipng/pkg/squoosh_oxipng');
    await init(wasmUrl);

    return optimise;
  },
});
