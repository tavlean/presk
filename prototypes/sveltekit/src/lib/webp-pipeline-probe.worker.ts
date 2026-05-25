import encodeWebp from '../../../../src/features/encoders/webP/worker/webpEncode';
import type { EncodeOptions } from 'features/encoders/webP/shared/meta';

export interface WebpPipelineEncodeRequest {
  imageData: ImageData;
  options: EncodeOptions;
}

export interface WebpPipelineEncodeResult {
  output: ArrayBuffer;
}

interface WebpPipelineWorkerScope {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<WebpPipelineEncodeRequest>) => void,
  ): void;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

const workerScope = self as unknown as WebpPipelineWorkerScope;

workerScope.addEventListener(
  'message',
  (event: MessageEvent<WebpPipelineEncodeRequest>) => {
    encodeWebp(event.data.imageData, event.data.options)
      .then((output) => {
        workerScope.postMessage({ output }, [output]);
      })
      .catch((error: unknown) => {
        workerScope.postMessage({
          error: error instanceof Error ? error.message : String(error),
        });
      });
  },
);
