import codecAssetProbeWorkerUrl from './codec-asset-probe.worker.ts?worker&url';
import webpEncodeProbeWorkerUrl from './webp-encode-probe.worker.ts?worker&url';
import {
  webpEncoderSimdWasmUrl,
  webpEncoderWasmUrl,
} from './webp-codec-assets';

export {
  codecAssetProbeWorkerUrl,
  webpEncodeProbeWorkerUrl,
  webpEncoderSimdWasmUrl,
  webpEncoderWasmUrl,
};

export const codecAssetUrls = [
  codecAssetProbeWorkerUrl,
  webpEncodeProbeWorkerUrl,
  webpEncoderWasmUrl,
  webpEncoderSimdWasmUrl,
];
