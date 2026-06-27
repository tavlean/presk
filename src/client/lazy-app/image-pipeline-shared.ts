import {
  blobToImg,
  blobToText,
  builtinDecode,
  sniffMimeType,
  canDecodeImageType,
} from './image-decode';
import type { ImageMimeTypes } from './image-decode';
import { abortable, assertSignal, isAbortError } from './abort';
import { parseSvgViewBoxSize } from './util/svg';
import type {
  PreprocessorState,
  ProcessorState,
} from 'client/lazy-app/feature-meta/shared';
import { resize } from 'features/processors/resize/client/runtime';
import { getOutputFileName } from './output-filename';
import { drawableToImageData } from './util/canvas';

export type WorkerBridgeReturn<T> = Promise<T> | Promise<Promise<T>>;

export interface SourceImage {
  file: File;
  decoded: ImageData;
  preprocessed: ImageData;
  vectorImage?: HTMLImageElement;
}

export interface DecodedSourceImage {
  file: File;
  decoded: ImageData;
  vectorImage?: HTMLImageElement;
}

export interface DecodeWorkerBridge {
  avifDecode(signal: AbortSignal, blob: Blob): WorkerBridgeReturn<ImageData>;
  webpDecode(signal: AbortSignal, blob: Blob): WorkerBridgeReturn<ImageData>;
  jxlDecode(signal: AbortSignal, blob: Blob): WorkerBridgeReturn<ImageData>;
  qoiDecode(signal: AbortSignal, blob: Blob): WorkerBridgeReturn<ImageData>;
}

export interface PreprocessWorkerBridge {
  rotate(
    signal: AbortSignal,
    data: ImageData,
    options: PreprocessorState['rotate'],
  ): WorkerBridgeReturn<ImageData>;
}

export interface ProcessWorkerBridge {
  resize: Parameters<typeof resize>[3]['resize'];
  quantize(
    signal: AbortSignal,
    data: ImageData,
    options: ProcessorState['quantize'],
  ): WorkerBridgeReturn<ImageData>;
}

export interface ImagePipelineEncoder<WorkerBridgeType, Options> {
  meta: {
    extension: string;
    mimeType: ImageMimeTypes;
  };
  encode(
    signal: AbortSignal,
    workerBridge: WorkerBridgeType,
    imageData: ImageData,
    options: Options,
  ): WorkerBridgeReturn<Blob | ArrayBuffer>;
}

export async function decodeImage(
  signal: AbortSignal,
  blob: Blob,
  workerBridge: DecodeWorkerBridge,
): Promise<ImageData> {
  assertSignal(signal);
  const mimeType = await abortable(signal, sniffMimeType(blob));
  const canDecode = await abortable(signal, canDecodeImageType(mimeType));

  try {
    if (!canDecode) {
      if (mimeType === 'image/avif') {
        return await workerBridge.avifDecode(signal, blob);
      }
      if (mimeType === 'image/webp') {
        return await workerBridge.webpDecode(signal, blob);
      }
      if (mimeType === 'image/jxl') {
        return await workerBridge.jxlDecode(signal, blob);
      }
      if (mimeType === 'image/qoi') {
        return await workerBridge.qoiDecode(signal, blob);
      }
    }
    return await builtinDecode(signal, blob);
  } catch (err) {
    if (isAbortError(err)) throw err;
    const error = Error("Couldn't decode image");
    if (err instanceof Error) {
      try {
        Object.defineProperty(error, 'cause', {
          value: err,
          configurable: true,
        });
      } catch {
        // Older browsers may not allow adding a cause. The user-facing error is still useful.
      }
    }
    throw error;
  }
}

export async function decodeSourceImage(
  signal: AbortSignal,
  file: File,
  workerBridge: DecodeWorkerBridge,
): Promise<DecodedSourceImage> {
  assertSignal(signal);

  if (file.type.startsWith('image/svg+xml')) {
    const vectorImage = await processSvg(signal, file);
    return {
      file,
      vectorImage,
      decoded: drawableToImageData(vectorImage),
    };
  }

  return {
    file,
    decoded: await decodeImage(signal, file, workerBridge),
  };
}

export async function preprocessImage(
  signal: AbortSignal,
  data: ImageData,
  preprocessorState: PreprocessorState,
  workerBridge: PreprocessWorkerBridge,
): Promise<ImageData> {
  assertSignal(signal);
  let processedData = data;

  if (preprocessorState.rotate.rotate !== 0) {
    processedData = await workerBridge.rotate(
      signal,
      processedData,
      preprocessorState.rotate,
    );
  }

  return processedData;
}

export async function processImage(
  signal: AbortSignal,
  source: SourceImage,
  processorState: ProcessorState,
  workerBridge: ProcessWorkerBridge,
): Promise<ImageData> {
  assertSignal(signal);
  let result = source.preprocessed;

  const { resize: resizeState, quantize: quantizeState } = processorState;
  // Only resize when the target differs from the source's own dimensions. At
  // identical dimensions the interpolating filters (Lanczos3 default, Catmull-Rom,
  // Triangle) are a mathematical identity, so running the pass would burn CPU — and
  // for a smoothing filter like Mitchell, needlessly soften the image — just to
  // reproduce the pixels we already have.
  const resizeChangesSize =
    resizeState.width !== source.preprocessed.width ||
    resizeState.height !== source.preprocessed.height;
  if (resizeState.enabled && resizeChangesSize) {
    result = await resize(signal, source, resizeState, workerBridge);
  }
  if (quantizeState.enabled) {
    result = await workerBridge.quantize(signal, result, quantizeState);
  }
  return result;
}

export async function compressImageWithEncoder<WorkerBridgeType, Options>(
  signal: AbortSignal,
  image: ImageData,
  options: Options,
  sourceFilename: string,
  workerBridge: WorkerBridgeType,
  encoder: ImagePipelineEncoder<WorkerBridgeType, Options>,
): Promise<File> {
  assertSignal(signal);

  const compressedData = await encoder.encode(
    signal,
    workerBridge,
    image,
    options,
  );

  return new File(
    [compressedData],
    getOutputFileName(sourceFilename, encoder.meta.extension),
    { type: encoder.meta.mimeType },
  );
}

export async function processSvg(
  signal: AbortSignal,
  blob: Blob,
): Promise<HTMLImageElement> {
  assertSignal(signal);
  const parser = new DOMParser();
  const text = await abortable(signal, blobToText(blob));
  const document = parser.parseFromString(text, 'image/svg+xml');
  const svg = document.documentElement!;

  if (svg.hasAttribute('width') && svg.hasAttribute('height')) {
    return blobToImg(blob);
  }

  const viewBox = svg.getAttribute('viewBox');
  if (viewBox === null) throw Error('SVG must have width/height or viewBox');

  const viewBoxSize = parseSvgViewBoxSize(viewBox);
  if (!viewBoxSize) throw Error('Invalid SVG viewBox');
  svg.setAttribute('width', viewBoxSize.width);
  svg.setAttribute('height', viewBoxSize.height);

  const serializer = new XMLSerializer();
  const newSource = serializer.serializeToString(document);
  return abortable(
    signal,
    blobToImg(new Blob([newSource], { type: 'image/svg+xml' })),
  );
}
