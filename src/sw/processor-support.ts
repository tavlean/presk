import { simd } from 'wasm-feature-detect';
import webpDataUrl from 'data-url:./tiny.webp';
import avifDataUrl from 'data-url:./tiny.avif';
import checkThreadsSupport from 'worker-shared/supports-wasm-threads';
import type { ProcessorSupport } from './cache-plan';

declare var self: ServiceWorkerGlobalScope;

async function canDecodeDataUrl(dataUrl: string): Promise<boolean> {
  if (!self.createImageBitmap) return false;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return createImageBitmap(blob).then(
    () => true,
    () => false,
  );
}

export async function detectProcessorSupport(): Promise<ProcessorSupport> {
  const [threads, supportsSimd, webp, avif] = await Promise.all([
    checkThreadsSupport(),
    simd(),
    canDecodeDataUrl(webpDataUrl),
    canDecodeDataUrl(avifDataUrl),
  ]);

  return {
    threads,
    simd: supportsSimd,
    webp,
    avif,
  };
}
