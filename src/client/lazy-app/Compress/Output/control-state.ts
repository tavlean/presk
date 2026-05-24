import type { PreprocessorState } from '../../feature-meta';
import { cleanSet } from '../../util/clean-modify';

export function getNextOutputScale(
  currentScale: number,
  direction: 'in' | 'out',
): number {
  return direction === 'in' ? currentScale * 1.25 : currentScale / 1.25;
}

export function getOutputScaleFromPercent(
  percentValue: string,
): number | undefined {
  const percent = parseFloat(percentValue);
  if (isNaN(percent)) return;
  return percent / 100;
}

export function getOutputScalePercent(scale: number): number {
  return Math.round(scale * 100);
}

export function getRotatedPreprocessorState(
  preprocessorState: PreprocessorState,
): PreprocessorState {
  return cleanSet(
    preprocessorState,
    'rotate.rotate',
    (preprocessorState.rotate.rotate + 90) % 360,
  );
}
