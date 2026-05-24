import type { ProcessorState } from '../../feature-meta';
import {
  mergeProcessorOptions,
  type ProcessorType,
  setProcessorEnabled,
} from '../processor-state';

export interface ResizeOptionsSource {
  vectorImage?: unknown;
  preprocessed: {
    width: number;
    height: number;
  };
}

export interface ResizeOptionsState {
  isVector: boolean;
  inputWidth: number;
  inputHeight: number;
}

export function getProcessorTypeFromControlName(
  name: string,
): keyof ProcessorState {
  return name.split('.')[0] as keyof ProcessorState;
}

export function getProcessorStateWithEnabledControl(
  processorState: ProcessorState,
  controlName: string,
  enabled: boolean,
): ProcessorState {
  return setProcessorEnabled(
    processorState,
    getProcessorTypeFromControlName(controlName),
    enabled,
  );
}

export function getProcessorStateWithOptions<Processor extends ProcessorType>(
  processorState: ProcessorState,
  processor: Processor,
  options: Partial<ProcessorState[Processor]>,
): ProcessorState {
  return mergeProcessorOptions(processorState, processor, options);
}

export function getResizeOptionsState(
  source: ResizeOptionsSource | undefined,
): ResizeOptionsState {
  return {
    isVector: Boolean(source && source.vectorImage),
    inputWidth: source ? source.preprocessed.width : 1,
    inputHeight: source ? source.preprocessed.height : 1,
  };
}
