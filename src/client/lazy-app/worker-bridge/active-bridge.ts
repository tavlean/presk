import { BridgeMethods, methodNames } from './active-meta';
import { createWorkerBridgeRuntime } from './runtime';

export type ActiveWorkerBridgeInstance = BridgeMethods & {
  dispose(): void;
};

export type ActiveWorkerBridgeConstructor =
  new () => ActiveWorkerBridgeInstance;

export function createActiveWorkerBridge(
  createWorker: () => Worker,
): ActiveWorkerBridgeConstructor {
  return createWorkerBridgeRuntime(
    methodNames,
    createWorker,
  ) as unknown as ActiveWorkerBridgeConstructor;
}
