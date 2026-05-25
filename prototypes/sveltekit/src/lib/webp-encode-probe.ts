import { webpEncodeProbeWorkerUrl } from './codec-assets';

export interface WebpEncodeProbeResult {
  outputBytes: number;
  magicBytes: string;
  riffHeader: string;
}

export function runWebpEncodeProbe(): Promise<WebpEncodeProbeResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(webpEncodeProbeWorkerUrl, { type: 'module' });

    worker.onmessage = (
      event: MessageEvent<WebpEncodeProbeResult | { error: string }>,
    ) => {
      worker.terminate();
      if ('error' in event.data) {
        reject(new Error(event.data.error));
        return;
      }
      resolve(event.data);
    };

    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || 'WebP encode worker failed.'));
    };

    worker.postMessage('encode');
  });
}
