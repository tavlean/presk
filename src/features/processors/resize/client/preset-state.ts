export const sizePresets = [0.25, 0.3333, 0.5, 1, 2, 3, 4];

export interface ResizePresetSize {
  width: number;
  height: number;
}

export function getResizePresetSize(
  inputWidth: number,
  inputHeight: number,
  preset: number,
): ResizePresetSize {
  return {
    width: Math.round(inputWidth * preset),
    height: Math.round(inputHeight * preset),
  };
}

export function getMatchingResizePreset(
  outputSize: ResizePresetSize,
  inputWidth: number,
  inputHeight: number,
  presets: readonly number[] = sizePresets,
): number | 'custom' {
  for (const preset of presets) {
    const presetSize = getResizePresetSize(inputWidth, inputHeight, preset);
    if (
      outputSize.width === presetSize.width &&
      outputSize.height === presetSize.height
    ) {
      return preset;
    }
  }

  return 'custom';
}
