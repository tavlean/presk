export type ResultLoadingEffect = 'hide' | 'delay-show' | 'none';

export function getInitialResultLoadingState(loading: boolean): boolean {
  return loading;
}

export function getResultLoadingVisibilityState(showLoadingState: boolean): {
  showLoadingState: boolean;
} {
  return { showLoadingState };
}

export function getResultLoadingEffect(
  previousLoading: boolean,
  nextLoading: boolean,
): ResultLoadingEffect {
  if (previousLoading && !nextLoading) return 'hide';
  if (!previousLoading && nextLoading) return 'delay-show';
  return 'none';
}
