import type { SourceImage, OutputType } from '..';
import type { EncoderState, ProcessorState } from '../../feature-meta';
import {
  canImportSavedSideSettings,
  type SavedSideSettingsAvailability,
} from './saved-settings-state';
import {
  getEncoderSelectValue,
  getOriginalImageOptionLabel,
} from './encoder-select-state';
import { getResizeOptionsState } from './processor-controls-state';

export interface OptionsRenderStateInput {
  index: 0 | 1;
  source: SourceImage | undefined;
  encoderState: EncoderState | undefined;
  processorState: ProcessorState;
  savedSideSettingsAvailability: SavedSideSettingsAvailability;
}

export interface OptionsRenderState {
  isOriginalImage: boolean;
  canImportSavedSettings: boolean;
  resizeOptionsState: ReturnType<typeof getResizeOptionsState>;
  resizeEnabled: boolean;
  quantizeEnabled: boolean;
  encoderSelectValue: OutputType;
  originalImageOptionLabel: string;
}

export function getOptionsRenderState({
  index,
  source,
  encoderState,
  processorState,
  savedSideSettingsAvailability,
}: OptionsRenderStateInput): OptionsRenderState {
  return {
    isOriginalImage: !encoderState,
    canImportSavedSettings: canImportSavedSideSettings(
      savedSideSettingsAvailability,
      index,
    ),
    resizeOptionsState: getResizeOptionsState(source),
    resizeEnabled: !!processorState.resize.enabled,
    quantizeEnabled: !!processorState.quantize.enabled,
    encoderSelectValue: getEncoderSelectValue(encoderState),
    originalImageOptionLabel: getOriginalImageOptionLabel(source),
  };
}
