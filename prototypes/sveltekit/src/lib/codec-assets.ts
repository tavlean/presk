import codecAssetProbeWorkerUrl from './codec-asset-probe.worker.ts?worker&url';
import webpEncodeProbeWorkerUrl from './webp-encode-probe.worker.ts?worker&url';
import svelteKitFeaturesWorkerUrl from 'sqush-generated/features-worker/webp.ts?worker&url';
import {
  webpCodecAssetUrls,
  webpEncoderSimdWasmUrl,
  webpEncoderWasmUrl,
} from 'sqush-generated/codec-assets/webp';
import {
  rotateCodecAssetUrls,
  rotateWasmUrl,
} from 'sqush-generated/codec-assets/rotate';

export {
  codecAssetProbeWorkerUrl,
  rotateCodecAssetUrls,
  rotateWasmUrl,
  svelteKitFeaturesWorkerUrl,
  webpCodecAssetUrls,
  webpEncodeProbeWorkerUrl,
  webpEncoderSimdWasmUrl,
  webpEncoderWasmUrl,
};

export const codecAssetUrls = [
  codecAssetProbeWorkerUrl,
  webpEncodeProbeWorkerUrl,
  svelteKitFeaturesWorkerUrl,
  ...webpCodecAssetUrls,
  ...rotateCodecAssetUrls,
];
