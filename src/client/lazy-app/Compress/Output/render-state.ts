import type { SourceImage } from '../../Compress';
import { getOutputScalePercent } from './control-state';
import { getOutputDrawableState, type OutputDrawableInput } from './draw-state';
import {
  getOutputPreviewState,
  type OutputPreviewState,
} from './preview-state';

export interface OutputRenderState {
  leftDraw?: ImageData;
  rightDraw?: ImageData;
  originalImage?: ImageData;
  previewState: OutputPreviewState;
  scalePercent: number;
}

export interface OutputRenderStateInput extends OutputDrawableInput<ImageData> {
  mobileView: boolean;
  source?: SourceImage;
  leftImgContain: boolean;
  rightImgContain: boolean;
  scale: number;
}

export function getOutputRenderState({
  mobileView,
  source,
  leftCompressed,
  rightCompressed,
  leftImgContain,
  rightImgContain,
  scale,
}: OutputRenderStateInput): OutputRenderState {
  const { leftDraw, rightDraw } = getOutputDrawableState({
    source,
    leftCompressed,
    rightCompressed,
  });
  const originalImage = source && source.preprocessed;

  return {
    leftDraw,
    rightDraw,
    originalImage,
    previewState: getOutputPreviewState({
      mobileView,
      originalImage,
      leftImgContain,
      rightImgContain,
    }),
    scalePercent: getOutputScalePercent(scale),
  };
}
