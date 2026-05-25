import { getResultLoadingEffect } from './loading-state';

export interface RunResultLoadingWorkflowInput {
  previousLoading: boolean;
  currentLoading: boolean;
  currentTimeoutId: number;
  delay: number;
  setLoadingState: (showLoadingState: boolean) => void;
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (timeoutId: number) => void;
}

export function runResultLoadingWorkflow({
  previousLoading,
  currentLoading,
  currentTimeoutId,
  delay,
  setLoadingState,
  setTimeout,
  clearTimeout,
}: RunResultLoadingWorkflowInput): number {
  const loadingEffect = getResultLoadingEffect(previousLoading, currentLoading);

  if (loadingEffect === 'hide') {
    clearTimeout(currentTimeoutId);
    setLoadingState(false);
    return 0;
  }

  if (loadingEffect === 'delay-show') {
    return setTimeout(() => setLoadingState(true), delay);
  }

  return currentTimeoutId;
}
