async function probeWasm(wasmUrl: string) {
  const response = await fetch(wasmUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch WebP WASM asset: ${response.status}`);
  }

  const bytes = await response.arrayBuffer();
  const magic = Array.from(new Uint8Array(bytes.slice(0, 4)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ');

  self.postMessage({
    wasmUrl,
    wasmBytes: bytes.byteLength,
    wasmMagic: magic,
  });
}

self.addEventListener('message', (event) => {
  const wasmUrl =
    typeof event.data?.wasmUrl === 'string' ? event.data.wasmUrl : '';
  if (!wasmUrl) return;

  probeWasm(wasmUrl).catch((error: unknown) => {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  });
});
