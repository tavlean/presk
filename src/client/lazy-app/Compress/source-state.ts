import type { ProcessorState } from '../feature-meta';

export interface SourceDimensions {
  width: number;
  height: number;
}

export function didOrientationChange(
  oldRotate: number,
  newRotate: number,
): boolean {
  return oldRotate % 180 !== newRotate % 180;
}

export function getDefaultResizeState(
  source: SourceDimensions,
  hasVectorSource: boolean,
): Partial<ProcessorState['resize']> {
  return {
    width: source.width,
    height: source.height,
    method: hasVectorSource ? 'vector' : 'lanczos3',
    // A new source should show its real dimensions before the user opts into resizing.
    enabled: false,
  };
}

export function getOrientationAdjustedResizeState(
  resizeState: SourceDimensions,
): Partial<ProcessorState['resize']> {
  return {
    width: resizeState.height,
    height: resizeState.width,
  };
}
