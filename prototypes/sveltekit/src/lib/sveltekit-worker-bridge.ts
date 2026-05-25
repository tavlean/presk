import { createWorkerBridgeRuntime } from '../../../../src/client/lazy-app/worker-bridge/runtime';
import type { EncodeOptions } from 'features/encoders/webP/shared/meta';
import {
  webpEncoderSimdWasmUrl,
  webpEncoderWasmUrl,
  webpPipelineProbeWorkerUrl,
} from './codec-assets';

export interface WebpWasmUrls {
  baseline: string;
  simd: string;
}

export interface SvelteKitWorkerBridgeApi {
  webpEncode(
    signal: AbortSignal,
    imageData: ImageData,
    options: EncodeOptions,
  ): Promise<ArrayBuffer>;
  dispose(): void;
}

interface SvelteKitWorkerBridgeWorkerApi {
  webpEncode(
    signal: AbortSignal,
    imageData: ImageData,
    options: EncodeOptions,
    wasmUrls: WebpWasmUrls,
  ): Promise<ArrayBuffer>;
  dispose(): void;
}

const SvelteKitWorkerBridgeBase = createWorkerBridgeRuntime(
  ['webpEncode'] as const,
  () => new Worker(webpPipelineProbeWorkerUrl, { type: 'module' }),
) as new () => SvelteKitWorkerBridgeWorkerApi;

export default class SvelteKitWorkerBridge
  extends SvelteKitWorkerBridgeBase
  implements SvelteKitWorkerBridgeApi
{
  webpEncode(
    signal: AbortSignal,
    imageData: ImageData,
    options: EncodeOptions,
  ): Promise<ArrayBuffer> {
    return super.webpEncode(signal, imageData, options, {
      baseline: webpEncoderWasmUrl,
      simd: webpEncoderSimdWasmUrl,
    });
  }
}
