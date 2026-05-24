import { cleanSet } from '../util/clean-modify';

export type SideIndex = 0 | 1;

export interface CopyableSide {
  file?: Blob;
  downloadUrl?: string;
}

export interface CopySideResult<Side extends CopyableSide> {
  sides: [Side, Side];
  oldSide: Side;
}

export interface CopySideAction {
  message: string;
  timeout: number;
  actions: string[];
}

export function getOtherSideIndex(index: SideIndex): SideIndex {
  return index === 0 ? 1 : 0;
}

export function getCopySideAction(): CopySideAction {
  return {
    message: 'Settings copied across',
    timeout: 5000,
    actions: ['undo', 'dismiss'],
  };
}

export function copySideToOther<Side extends CopyableSide>(
  sides: [Side, Side],
  index: SideIndex,
  createObjectUrl: (file: Blob) => string = URL.createObjectURL,
): CopySideResult<Side> {
  const otherIndex = getOtherSideIndex(index);
  const oldSide = sides[otherIndex];
  const newSide = {
    ...sides[index],
  };

  if (newSide.file) {
    newSide.downloadUrl = createObjectUrl(newSide.file);
  }

  return {
    sides: cleanSet(sides, otherIndex, newSide),
    oldSide,
  };
}
