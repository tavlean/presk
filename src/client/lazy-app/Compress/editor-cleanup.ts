import type { ResettableSideState } from './side-state';
import { revokeSideDownloadUrls } from './side-state';

export interface DisposableWorker {
  dispose: () => void;
}

export interface EditorCleanupInput<Side extends ResettableSideState> {
  updateImageTimeout?: number;
  mainAbortController: AbortController;
  sideAbortControllers: readonly AbortController[];
  workerBridges: readonly DisposableWorker[];
  sides: readonly Side[];
  clearTimeout?: (timeout: number) => void;
  revokeObjectUrl?: (url: string) => void;
}

export function cleanupEditorRuntime<Side extends ResettableSideState>({
  updateImageTimeout,
  mainAbortController,
  sideAbortControllers,
  workerBridges,
  sides,
  clearTimeout = window.clearTimeout,
  revokeObjectUrl,
}: EditorCleanupInput<Side>): void {
  if (updateImageTimeout !== undefined) {
    clearTimeout(updateImageTimeout);
  }

  mainAbortController.abort();
  for (const controller of sideAbortControllers) {
    controller.abort();
  }

  for (const workerBridge of workerBridges) {
    workerBridge.dispose();
  }

  revokeSideDownloadUrls(sides, revokeObjectUrl);
}
