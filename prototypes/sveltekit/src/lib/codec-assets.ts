import codecAssetProbeWorkerUrl from './codec-asset-probe.worker.ts?worker&url';
import { webpEncoderWasmUrl } from './webp-codec-assets';

export { codecAssetProbeWorkerUrl, webpEncoderWasmUrl };

export const codecAssetUrls = [codecAssetProbeWorkerUrl, webpEncoderWasmUrl];
