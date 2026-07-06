export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Response(blob).arrayBuffer();
}
