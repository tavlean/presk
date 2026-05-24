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

export interface OutputViewControlState {
  aliasing: boolean;
  altBackground: boolean;
  editingScale: boolean;
  scale: number;
}

export function getInitialOutputViewControlState(): OutputViewControlState {
  return {
    scale: 1,
    editingScale: false,
    altBackground: false,
    aliasing: false,
  };
}

export function getAliasingToggleState(
  state: Pick<OutputViewControlState, 'aliasing'>,
): Pick<OutputViewControlState, 'aliasing'> {
  return {
    aliasing: !state.aliasing,
  };
}

export function getBackgroundToggleState(
  state: Pick<OutputViewControlState, 'altBackground'>,
): Pick<OutputViewControlState, 'altBackground'> {
  return {
    altBackground: !state.altBackground,
  };
}

export function getEditingScaleState(
  editingScale: boolean,
): Pick<OutputViewControlState, 'editingScale'> {
  return { editingScale };
}

export function getPinchZoomScaleState(
  scale: number,
): Pick<OutputViewControlState, 'scale'> {
  return { scale };
}

export interface OutputEventRetargetState {
  eventType: string;
  isTwoUpHandle: boolean;
  alreadyRetargeted: boolean;
}

export function shouldRetargetOutputEvent({
  eventType,
  isTwoUpHandle,
  alreadyRetargeted,
}: OutputEventRetargetState): boolean {
  if (eventType !== 'wheel' && isTwoUpHandle) return false;
  return !alreadyRetargeted;
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
