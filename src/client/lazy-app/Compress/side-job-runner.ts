import type { EncoderState, ProcessorState } from '../feature-meta/shared';
import type { SourceImage } from '../image-pipeline';
import type {
  RunnableSideJob,
  SideEncodingPlan,
  SideEncodingResult,
  SideJobCacheEntry,
  SideJobEncodedResult,
} from './work-plan';
import {
  getSideJobCacheEntry,
  getSideJobEncodedResult,
  getSideJobExecutionPlan,
} from './work-plan';

export interface SideJobPipeline<WorkerBridgeType> {
  processImage: (
    signal: AbortSignal,
    source: SourceImage,
    processorState: ProcessorState,
    workerBridge: WorkerBridgeType,
  ) => Promise<ImageData>;
  compressImage: (
    signal: AbortSignal,
    processed: ImageData,
    encoderState: EncoderState,
    sourceFileName: string,
    workerBridge: WorkerBridgeType,
  ) => Promise<File>;
  decodeImage: (
    signal: AbortSignal,
    file: File,
    workerBridge: WorkerBridgeType,
  ) => Promise<ImageData>;
}

export interface RunSideEncodingPlanInput<WorkerBridgeType> {
  signal: AbortSignal;
  sidePlan: SideEncodingPlan;
  source: SourceImage;
  sourceFileName: string;
  workerBridge: WorkerBridgeType;
  pipeline: SideJobPipeline<WorkerBridgeType>;
  onProcessingStart?: () => void;
  onProcessed?: (processed: ImageData, processorState: ProcessorState) => void;
  onCacheEntry?: (cacheEntry: SideJobCacheEntry) => void;
}

export interface RunRunnableSideJobsInput<WorkerBridgeType> {
  runnableSideJobs: readonly RunnableSideJob[];
  sideSignals: readonly AbortSignal[];
  source: SourceImage;
  getCurrentProcessed: (sideIndex: number) => ImageData | undefined;
  getCacheResult: (
    preprocessed: ImageData,
    processorState: ProcessorState,
    encoderState: EncoderState,
  ) => SideEncodingResult | undefined;
  getWorkerBridge: (sideIndex: number) => WorkerBridgeType;
  pipeline: SideJobPipeline<WorkerBridgeType>;
  onProcessingStart?: (sideIndex: number, signal: AbortSignal) => void;
  onProcessed?: (
    sideIndex: number,
    signal: AbortSignal,
    processed: ImageData,
    processorState: ProcessorState,
  ) => void;
  onCacheEntry?: (cacheEntry: SideJobCacheEntry) => void;
  onEncodedResult?: (
    sideIndex: number,
    signal: AbortSignal,
    result: SideJobEncodedResult,
  ) => void;
  onSideComplete?: (sideIndex: number) => void;
  onError?: (sideIndex: number, signal: AbortSignal, error: unknown) => void;
}

export async function runSideEncodingPlan<WorkerBridgeType>({
  signal,
  sidePlan,
  source,
  sourceFileName,
  workerBridge,
  pipeline,
  onProcessingStart,
  onProcessed,
  onCacheEntry,
}: RunSideEncodingPlanInput<WorkerBridgeType>): Promise<
  SideEncodingResult | undefined
> {
  if (sidePlan.kind === 'skip') return undefined;

  if (sidePlan.kind === 'original' || sidePlan.kind === 'cache') {
    return sidePlan.result;
  }

  onProcessingStart?.();

  let processed: ImageData;
  if (sidePlan.needsProcessing) {
    processed = await pipeline.processImage(
      signal,
      source,
      sidePlan.processorState,
      workerBridge,
    );
    onProcessed?.(processed, sidePlan.processorState);
  } else {
    processed = sidePlan.processed!;
  }

  const file = await pipeline.compressImage(
    signal,
    processed,
    sidePlan.encoderState,
    sourceFileName,
    workerBridge,
  );
  const data = await pipeline.decodeImage(signal, file, workerBridge);
  const result = { data, file, processed };
  const cacheEntry = getSideJobCacheEntry(
    sidePlan,
    result,
    source.preprocessed,
  );
  if (cacheEntry) onCacheEntry?.(cacheEntry);

  return result;
}

export function runRunnableSideJobs<WorkerBridgeType>({
  runnableSideJobs,
  sideSignals,
  source,
  getCurrentProcessed,
  getCacheResult,
  getWorkerBridge,
  pipeline,
  onProcessingStart,
  onProcessed,
  onCacheEntry,
  onEncodedResult,
  onSideComplete,
  onError,
}: RunRunnableSideJobsInput<WorkerBridgeType>): Promise<void>[] {
  return runnableSideJobs.map(
    async ({ sideIndex, sideWorkNeeded, jobState }) => {
      const signal = sideSignals[sideIndex];
      try {
        const sidePlan = getSideJobExecutionPlan({
          currentProcessed: getCurrentProcessed(sideIndex),
          getCacheResult,
          jobState,
          sideWorkNeeded,
          sourceFile: source.file,
          sourcePreprocessed: source.preprocessed,
        });

        const result = await runSideEncodingPlan({
          signal,
          sidePlan,
          source,
          sourceFileName: source.file.name,
          workerBridge: getWorkerBridge(sideIndex),
          pipeline,
          onProcessingStart: () => {
            onProcessingStart?.(sideIndex, signal);
          },
          onProcessed: (processed, processorState) => {
            onProcessed?.(sideIndex, signal, processed, processorState);
          },
          onCacheEntry,
        });

        if (!result) return;

        onEncodedResult?.(
          sideIndex,
          signal,
          getSideJobEncodedResult(jobState, {
            data: result.data,
            file: result.file,
            processed: result.processed,
          }),
        );
        onSideComplete?.(sideIndex);
      } catch (error) {
        if (onError) {
          onError(sideIndex, signal, error);
          return;
        }
        throw error;
      }
    },
  );
}
