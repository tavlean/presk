import { createWorkerBridgeRuntime } from '../../../../src/client/lazy-app/worker-bridge/runtime';
import type { EncodeOptions } from 'features/encoders/webP/shared/meta';
import type { Options as RotateOptions } from 'features/preprocessors/rotate/shared/meta';
import { methodNames } from 'sqush-generated/worker-bridge/meta';
import type { WebpWasmUrls } from 'sqush-generated/features-worker/webp';
import {
  svelteKitFeaturesWorkerUrl,
  webpEncoderSimdWasmUrl,
  webpEncoderWasmUrl,
} from './codec-assets';

export interface SvelteKitWorkerBridgeApi {
  webpEncode(
    signal: AbortSignal,
    imageData: ImageData,
    options: EncodeOptions,
  ): Promise<ArrayBuffer>;
  rotate(
    signal: AbortSignal,
    data: ImageData,
    options: RotateOptions,
  ): Promise<ImageData>;
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
  methodNames,
  () => new Worker(svelteKitFeaturesWorkerUrl, { type: 'module' }),
) as new () => SvelteKitWorkerBridgeWorkerApi;

export default class SvelteKitWorkerBridge
  extends SvelteKitWorkerBridgeBase
  implements SvelteKitWorkerBridgeApi
{
  declare rotate: SvelteKitWorkerBridgeApi['rotate'];

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
