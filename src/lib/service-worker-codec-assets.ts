import codecAssetProbeWorkerUrl from './codec-asset-probe.worker.ts?worker&url';
import webpEncodeProbeWorkerUrl from './webp-encode-probe.worker.ts?worker&url';
import {
  collectEntryUrls,
  dedupeUrls,
  type ServiceWorkerCacheEntry,
} from 'sw/cache-plan';
import { generatedCodecCacheUrls } from 'sqush-generated/service-worker/cache-plan';

const localProbeEntries = [
  { main: codecAssetProbeWorkerUrl, deps: [] },
  { main: webpEncodeProbeWorkerUrl, deps: [] },
] satisfies readonly ServiceWorkerCacheEntry[];

export const serviceWorkerCodecAssetUrls = dedupeUrls([
  ...collectEntryUrls(localProbeEntries),
  ...generatedCodecCacheUrls,
]);
