import type { SnackOptions } from 'shared/custom-els/snack-bar';

import {
  getCompressLoadedState,
  getShareTargetErrorState,
  getShareTargetImageState,
  type InitialAppState,
} from './state';

interface CompressModule<CompressComponent> {
  default: CompressComponent;
}

export interface InitialAppCompressLoadWorkflow<CompressComponent = unknown> {
  compressPromise: Promise<CompressModule<CompressComponent>>;
  isUnmounted: () => boolean;
  setState: (
    state: Pick<InitialAppState<CompressComponent>, 'Compress'>,
  ) => void;
  showSnack: (message: string) => void | Promise<string>;
}

export interface ShareTargetBridge {
  offliner(
    showSnack: (message: string, options?: SnackOptions) => Promise<string>,
  ): void;
  getSharedImage(): Promise<File>;
}

export interface InitialAppShareTargetWorkflow {
  swBridgePromise: Promise<ShareTargetBridge>;
  isUnmounted: () => boolean;
  isAwaitingShareTarget: () => boolean;
  setState: (
    state:
      | Pick<InitialAppState, 'awaitingShareTarget'>
      | Pick<InitialAppState, 'awaitingShareTarget' | 'file' | 'isEditorOpen'>,
  ) => void;
  showSnack: (message: string, options?: SnackOptions) => Promise<string>;
  openEditor: () => void;
  replaceUrl: (url: string) => void;
}

export async function runInitialAppCompressLoadWorkflow<CompressComponent>({
  compressPromise,
  isUnmounted,
  setState,
  showSnack,
}: InitialAppCompressLoadWorkflow<CompressComponent>): Promise<void> {
  try {
    const module = await compressPromise;
    if (isUnmounted()) return;
    setState(getCompressLoadedState(module.default));
  } catch {
    if (isUnmounted()) return;
    showSnack('Failed to load app');
  }
}

export async function runInitialAppShareTargetWorkflow({
  swBridgePromise,
  isUnmounted,
  isAwaitingShareTarget,
  showSnack,
  setState,
  openEditor,
  replaceUrl,
}: InitialAppShareTargetWorkflow): Promise<void> {
  const { offliner, getSharedImage } = await swBridgePromise;
  if (isUnmounted()) return;

  offliner(showSnack);
  if (!isAwaitingShareTarget()) return;

  let file: File;
  try {
    file = await getSharedImage();
  } catch {
    if (isUnmounted()) return;
    showSnack('Failed to load shared image');
    setState(getShareTargetErrorState());
    return;
  }

  if (isUnmounted()) return;
  replaceUrl('/');
  openEditor();
  setState(getShareTargetImageState(file));
}
