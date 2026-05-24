import type {
  EncoderState,
  PreprocessorState,
  ProcessorState,
} from '../feature-meta';
import { processorStateEquivalent } from './processor-state';

export interface MainJobState {
  file: File;
  preprocessorState: PreprocessorState;
}

export interface SideJobState {
  processorState: ProcessorState;
  encoderState?: EncoderState;
}

export interface SideWorkNeeded {
  processing: boolean;
  encoding: boolean;
}

export interface ImageWorkPlan {
  needsDecoding: boolean;
  needsPreprocessing: boolean;
  sideWorksNeeded: SideWorkNeeded[];
  jobNeeded: boolean;
}

export function getImageWorkPlan(
  latestMainJobState: Partial<MainJobState>,
  mainJobState: MainJobState,
  latestSideJobStates: readonly Partial<SideJobState>[],
  sideJobStates: readonly SideJobState[],
): ImageWorkPlan {
  const needsDecoding = latestMainJobState.file !== mainJobState.file;
  const needsPreprocessing =
    needsDecoding ||
    latestMainJobState.preprocessorState !== mainJobState.preprocessorState;
  const sideWorksNeeded = sideJobStates.map((sideJobState, index) => {
    const latestSideJobState = latestSideJobStates[index] || {};
    const outputTypeChanged =
      Boolean(latestSideJobState.encoderState) !==
      Boolean(sideJobState.encoderState);
    const processorChanged =
      !latestSideJobState.processorState ||
      !processorStateEquivalent(
        latestSideJobState.processorState,
        sideJobState.processorState,
      );
    const needsProcessing =
      needsPreprocessing || outputTypeChanged || processorChanged;

    return {
      processing: needsProcessing,
      encoding:
        needsProcessing ||
        latestSideJobState.encoderState !== sideJobState.encoderState,
    };
  });
  const sideJobNeeded = sideWorksNeeded.some(
    (sideWorkNeeded) => sideWorkNeeded.processing || sideWorkNeeded.encoding,
  );

  return {
    needsDecoding,
    needsPreprocessing,
    sideWorksNeeded,
    jobNeeded: needsDecoding || needsPreprocessing || sideJobNeeded,
  };
}
