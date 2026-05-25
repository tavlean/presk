import type { EncodeOptions } from '../shared/meta';

export interface WebPEncodeWorkerBridge {
  webpEncode(
    signal: AbortSignal,
    imageData: ImageData,
    options: EncodeOptions,
  ): Promise<ArrayBuffer> | Promise<Promise<ArrayBuffer>>;
}

export const encode = async (
  signal: AbortSignal,
  workerBridge: WebPEncodeWorkerBridge,
  imageData: ImageData,
  options: EncodeOptions,
): Promise<ArrayBuffer> => workerBridge.webpEncode(signal, imageData, options);
