import type { ProcessorState } from '../feature-meta';

export interface SourceDimensions {
  width: number;
  height: number;
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
