// Single-image compression helper for the SvelteKit slice.
//
// Drives the SAME framework-neutral pipeline the bulk feature uses: decode ->
// preprocess -> resize -> `imagePipeline.compressImage`. compressImage dispatches
// on the encoder type through the generated encoder runtime map, which now covers
// every active codec (all except blocked wp2), so the single-image path and the
// bulk engine share one code path. Heavy work runs in the SvelteKit codec worker
// via SvelteKitWorkerBridge; browser encoders (GIF/JPEG/PNG) encode on the main
// thread through the same map. No per-format switch.

import {
  decodeImage,
  decodeSourceImage,
  imagePipeline,
  preprocessImage,
  processImage,
  type ImagePipelineWorkerBridge,
} from '../../../../src/client/lazy-app/image-pipeline';
import { getPercentChange } from '../../../../src/client/lazy-app/bulk/size';
import {
  encoderMap,
  type EncoderState,
  type EncoderType,
  type PreprocessorState,
  type ProcessorState,
} from 'client/lazy-app/feature-meta';
import SvelteKitWorkerBridge from './sveltekit-worker-bridge';

/** Any active encoder the generated surface supports (all codecs except wp2). */
export type OutputFormat = EncoderType;

/**
 * Formats surfaced in the slice's button row. The codec encoders the project
 * focuses on, plus the other single-thread WASM codecs. Browser encoders stay in
 * the type/generated surface but get their own option panels in the editor phase
 * (their quality scales differ), so they are intentionally not listed here yet.
 */
export const OUTPUT_FORMATS: {
  id: OutputFormat;
  label: string;
  ext: string;
}[] = [
  { id: 'webP', label: 'WebP', ext: encoderMap.webP.meta.extension },
  { id: 'avif', label: 'AVIF', ext: encoderMap.avif.meta.extension },
  { id: 'jxl', label: 'JPEG XL', ext: encoderMap.jxl.meta.extension },
  { id: 'mozJPEG', label: 'MozJPEG', ext: encoderMap.mozJPEG.meta.extension },
  { id: 'oxiPNG', label: 'OxiPNG', ext: encoderMap.oxiPNG.meta.extension },
  { id: 'qoi', label: 'QOI', ext: encoderMap.qoi.meta.extension },
];

export interface CompressRequest {
  format: OutputFormat;
  /** The encoder's full option object (e.g. webP EncodeOptions). */
  options: unknown;
  /** Resize + quantize processor state (enabled flags + options). */
  processorState: ProcessorState;
  /** Preprocessor state (rotate). */
  preprocessorState: PreprocessorState;
}

/** A fresh, mutable copy of an encoder's default options (for the UI to bind). */
export function getDefaultOptions(
  format: OutputFormat,
): Record<string, unknown> {
  return structuredClone(
    encoderMap[format].meta.defaultOptions as Record<string, unknown>,
  );
}

export interface CompressOutcome {
  outputFile: File;
  outputUrl: string;
  outputSize: number;
  originalSize: number;
  percentChange: number;
  /** The processed source fed to the encoder (left/"before" preview). */
  sourceImageData: ImageData;
  /** The encoded output decoded back to pixels (right/"after" preview). */
  outputImageData: ImageData;
}

/**
 * Pair the requested format with its option object. The options come from the UI
 * (each per-encoder panel binds the encoder's own option type), so the
 * discriminated-union cast is the prototype adapter's single typing seam.
 */
function buildEncoderState(request: CompressRequest): EncoderState {
  return { type: request.format, options: request.options } as EncoderState;
}

/**
 * Compress one file. Caller owns `outputUrl` and must revoke it when done.
 */
export async function compressFile(
  file: File,
  request: CompressRequest,
  signal: AbortSignal,
): Promise<CompressOutcome> {
  const bridge = new SvelteKitWorkerBridge();
  const pipelineBridge = bridge as unknown as ImagePipelineWorkerBridge;
  try {
    const decodedSource = await decodeSourceImage(signal, file, pipelineBridge);
    const preprocessed = await preprocessImage(
      signal,
      decodedSource.decoded,
      request.preprocessorState,
      pipelineBridge,
    );
    const processed = await processImage(
      signal,
      { ...decodedSource, preprocessed },
      request.processorState,
      pipelineBridge,
    );

    const outputFile = await imagePipeline.compressImage(
      signal,
      processed,
      buildEncoderState(request),
      file.name,
      pipelineBridge,
    );
    // Decode the output back to pixels so the editor can show the real codec
    // result (artifacts and all), the way Squoosh does. Same dimensions as the
    // processed source, so the two-up before/after view aligns.
    const outputImageData = await decodeImage(
      signal,
      outputFile,
      pipelineBridge,
    );
    const outputUrl = URL.createObjectURL(outputFile);

    return {
      outputFile,
      outputUrl,
      outputSize: outputFile.size,
      originalSize: file.size,
      percentChange:
        Math.round(getPercentChange(file.size, outputFile.size) * 10) / 10,
      sourceImageData: processed,
      outputImageData,
    };
  } finally {
    bridge.dispose();
  }
}
