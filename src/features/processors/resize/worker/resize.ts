import initResizeWasm, { resize as wasmResize } from 'codecs/resize/pkg';
import initHqxWasm, { resize as wasmHqx } from 'codecs/hqx/pkg';
import { createResize } from './runtime';

export type { ResizeWasmUrls } from './runtime';

export default createResize({
  initHqxWasm,
  initResizeWasm,
  wasmHqx,
  wasmResize,
});
