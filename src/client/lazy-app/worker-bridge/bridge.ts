import { wrap } from 'comlink';
import { BridgeMethods, methodNames } from './meta';
import type { ProcessorWorkerApi } from '../../../features-worker';
import { abortable } from '../abort';

/** How long the worker should be idle before terminating. */
const workerTimeout = 10_000;

export type WorkerBridgeInstance = BridgeMethods & {
  dispose(): void;
};

export type WorkerBridgeConstructor = new () => WorkerBridgeInstance;

type BridgeMethod = (
  this: WorkerBridgeInstance & WorkerBridgeRuntime,
  signal: AbortSignal,
  ...args: unknown[]
) => Promise<unknown>;

interface WorkerBridgeRuntime {
  _queue: Promise<unknown>;
  _worker?: Worker;
  _workerApi?: ProcessorWorkerApi;
  _workerTimeout?: number;
  _terminateWorker(): void;
  _startWorker(): void;
}

export function createWorkerBridge(
  createWorker: () => Worker,
): WorkerBridgeConstructor {
  class GeneratedWorkerBridge implements WorkerBridgeRuntime {
    _queue = Promise.resolve() as Promise<unknown>;
    _worker?: Worker;
    _workerApi?: ProcessorWorkerApi;
    _workerTimeout?: number;

    _terminateWorker() {
      if (!this._worker) return;
      this._worker.terminate();
      this._worker = undefined;
      this._workerApi = undefined;
    }

    _startWorker() {
      this._worker = createWorker();
      this._workerApi = wrap<ProcessorWorkerApi>(this._worker);
    }

    dispose(): void {
      clearTimeout(this._workerTimeout);
      this._workerTimeout = undefined;
      this._terminateWorker();
    }
  }

  for (const methodName of methodNames) {
    const bridgeMethod: BridgeMethod = function (
      this: WorkerBridgeInstance & WorkerBridgeRuntime,
      signal: AbortSignal,
      ...args: unknown[]
    ) {
      this._queue = this._queue
        // Ignore any errors in the queue
        .catch(() => {})
        .then(async () => {
          if (signal.aborted)
            throw new DOMException('AbortError', 'AbortError');

          clearTimeout(this._workerTimeout);
          if (!this._worker) this._startWorker();

          const onAbort = () => this._terminateWorker();
          signal.addEventListener('abort', onAbort);

          const method = this._workerApi![methodName] as (
            ...args: unknown[]
          ) => Promise<unknown>;

          return abortable(signal, method(...args)).finally(() => {
            // No longer care about aborting - this task is complete.
            signal.removeEventListener('abort', onAbort);

            // Start a timer to clear up the worker.
            this._workerTimeout = setTimeout(() => {
              this._terminateWorker();
            }, workerTimeout);
          });
        });

      return this._queue;
    };
    (
      GeneratedWorkerBridge.prototype as unknown as WorkerBridgeRuntime &
        Record<typeof methodName, BridgeMethod>
    )[methodName] = bridgeMethod;
  }

  return GeneratedWorkerBridge as unknown as WorkerBridgeConstructor;
}
