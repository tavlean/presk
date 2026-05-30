// Single-image compression helper for the SvelteKit slice.
//
// Drives the SAME framework-neutral pipeline helpers the bulk feature uses
// (decode -> preprocess -> resize), then encodes through the SvelteKit codec
// worker bridge. Encoding goes directly through the bridge per format
// (webpEncode / avifEncode / jxlEncode) because the prototype's generated
// `encoderMap`/`compressImage` path is currently WebP-only; the bridge has all
// three proven (see webp-pipeline-probe.ts). Heavy work runs in workers.

import {
  decodeSourceImage,
  preprocessImage,
  processImage,
  type ImagePipelineWorkerBridge,
} from '../../../../src/client/lazy-app/image-pipeline';
import { getPercentChange } from '../../../../src/client/lazy-app/bulk/size';
import { getOutputFileName } from '../../../../src/client/lazy-app/output-filename';
import {
  defaultPreprocessorState,
  defaultProcessorState,
} from 'client/lazy-app/feature-meta';
import * as webpMeta from 'features/encoders/webP/shared/meta';
import * as avifMeta from 'features/encoders/avif/shared/meta';
import * as jxlMeta from 'features/encoders/jxl/shared/meta';
import SvelteKitWorkerBridge from './sveltekit-worker-bridge';

/** Output formats the slice exposes. Matches the project's focus codecs. */
export type OutputFormat = 'webP' | 'avif' | 'jxl';

export const OUTPUT_FORMATS: {
  id: OutputFormat;
  label: string;
  ext: string;
}[] = [
  { id: 'webP', label: 'WebP', ext: 'webp' },
  { id: 'avif', label: 'AVIF', ext: 'avif' },
  { id: 'jxl', label: 'JPEG XL', ext: 'jxl' },
];

const FORMAT_META = {
  webP: { mime: 'image/webp', ext: 'webp' },
  avif: { mime: 'image/avif', ext: 'avif' },
  jxl: { mime: 'image/jxl', ext: 'jxl' },
} as const;

export interface CompressRequest {
  format: OutputFormat;
  /** 0-100 quality. Mapped onto each encoder's `quality` option. */
  quality: number;
  /** Optional resize. When omitted the image keeps its size. */
  resize?: { width: number; height: number };
}

export interface CompressOutcome {
  outputFile: File;
  outputUrl: string;
  outputSize: number;
  originalSize: number;
  percentChange: number;
}

function buildProcessorState(request: CompressRequest) {
  return {
    resize: {
      ...defaultProcessorState.resize,
      enabled: Boolean(request.resize),
      width: request.resize?.width ?? defaultProcessorState.resize.width,
      height: request.resize?.height ?? defaultProcessorState.resize.height,
    },
    quantize: {
      ...defaultProcessorState.quantize,
      enabled: false,
    },
  };
}

async function encode(
  bridge: SvelteKitWorkerBridge,
  signal: AbortSignal,
  processed: ImageData,
  request: CompressRequest,
): Promise<ArrayBuffer> {
  switch (request.format) {
    case 'webP':
      return bridge.webpEncode(signal, processed, {
        ...webpMeta.defaultOptions,
        quality: request.quality,
      });
    case 'avif':
      return bridge.avifEncode(signal, processed, {
        ...avifMeta.defaultOptions,
        quality: request.quality,
      });
    case 'jxl':
      return bridge.jxlEncode(signal, processed, {
        ...jxlMeta.defaultOptions,
        quality: request.quality,
      });
  }
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
      defaultPreprocessorState,
      pipelineBridge,
    );
    const processed = await processImage(
      signal,
      { ...decodedSource, preprocessed },
      buildProcessorState(request),
      pipelineBridge,
    );

    const buffer = await encode(bridge, signal, processed, request);
    const { mime, ext } = FORMAT_META[request.format];
    const outputFile = new File([buffer], getOutputFileName(file.name, ext), {
      type: mime,
    });
    const outputUrl = URL.createObjectURL(outputFile);

    return {
      outputFile,
      outputUrl,
      outputSize: outputFile.size,
      originalSize: file.size,
      percentChange:
        Math.round(getPercentChange(file.size, outputFile.size) * 10) / 10,
    };
  } finally {
    bridge.dispose();
  }
}
