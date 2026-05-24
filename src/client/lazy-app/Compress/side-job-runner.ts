import type { EncoderState, ProcessorState } from '../feature-meta';
import type { SourceImage } from '../image-pipeline';
import type {
  SideEncodingPlan,
  SideEncodingResult,
  SideJobCacheEntry,
} from './work-plan';
import { getSideJobCacheEntry } from './work-plan';

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
