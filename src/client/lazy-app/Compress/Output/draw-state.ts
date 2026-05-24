export interface OutputDrawableSource<Drawable> {
  file?: unknown;
  preprocessed?: Drawable;
}

export interface OutputDrawableInput<Drawable> {
  source?: OutputDrawableSource<Drawable>;
  leftCompressed?: Drawable;
  rightCompressed?: Drawable;
}

export interface OutputDrawableState<Drawable> {
  leftDraw: Drawable | undefined;
  rightDraw: Drawable | undefined;
}

export interface OutputImageSize {
  width: number;
  height: number;
}

export interface OutputPinchZoomState {
  x: number;
  y: number;
  scale: number;
}

export interface OutputPinchZoomTransform {
  allowChangeEvent: true;
  x: number;
  y: number;
  scale?: number;
}

export interface OutputUpdatePlan {
  resetPinchZoom: boolean;
  pinchZoomUpdate: OutputPinchZoomTransform | undefined;
  redrawLeft: boolean;
  redrawRight: boolean;
}

export function getOutputDrawableState<Drawable>({
  source,
  leftCompressed,
  rightCompressed,
}: OutputDrawableInput<Drawable>): OutputDrawableState<Drawable> {
  return {
    leftDraw: leftCompressed || (source && source.preprocessed),
    rightDraw: rightCompressed || (source && source.preprocessed),
  };
}

export function didOutputSourceFileChange<Drawable>(
  previous: OutputDrawableInput<Drawable>,
  current: OutputDrawableInput<Drawable>,
): boolean {
  return (
    !!current.source !== !!previous.source ||
    Boolean(
      current.source &&
        previous.source &&
        current.source.file !== previous.source.file,
    )
  );
}

export function getOutputPinchZoomUpdate(
  previousSourceData: OutputImageSize | undefined,
  currentSourceData: OutputImageSize | undefined,
  pinchZoom: OutputPinchZoomState,
): OutputPinchZoomTransform | undefined {
  if (
    !previousSourceData ||
    !currentSourceData ||
    previousSourceData === currentSourceData
  ) {
    return undefined;
  }

  // Pinch zoom transforms from the content top-left, so compensate when the content size changes.
  const scaleChange = 1 - pinchZoom.scale;
  const oldXScaleOffset = (previousSourceData.width / 2) * scaleChange;
  const oldYScaleOffset = (previousSourceData.height / 2) * scaleChange;

  return {
    allowChangeEvent: true,
    x: pinchZoom.x - oldXScaleOffset + oldYScaleOffset,
    y: pinchZoom.y - oldYScaleOffset + oldXScaleOffset,
  };
}

export function getOutputUpdatePlan<Drawable extends OutputImageSize>(
  previous: OutputDrawableInput<Drawable>,
  current: OutputDrawableInput<Drawable>,
  pinchZoom: OutputPinchZoomState,
): OutputUpdatePlan {
  const previousDrawState = getOutputDrawableState(previous);
  const drawState = getOutputDrawableState(current);
  const resetPinchZoom = didOutputSourceFileChange(previous, current);
  const previousSourceData = previous.source && previous.source.preprocessed;
  const currentSourceData = current.source && current.source.preprocessed;

  return {
    resetPinchZoom,
    pinchZoomUpdate: resetPinchZoom
      ? undefined
      : getOutputPinchZoomUpdate(
          previousSourceData,
          currentSourceData,
          pinchZoom,
        ),
    redrawLeft: Boolean(
      drawState.leftDraw && drawState.leftDraw !== previousDrawState.leftDraw,
    ),
    redrawRight: Boolean(
      drawState.rightDraw &&
        drawState.rightDraw !== previousDrawState.rightDraw,
    ),
  };
}
