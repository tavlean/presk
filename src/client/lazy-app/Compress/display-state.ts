import type { EncoderState } from '../feature-meta';
import type { SideSettings } from './saved-settings';

export interface DisplaySettingsSide {
  latestSettings: SideSettings;
  encodedSettings?: SideSettings;
}

export interface DisplayLabelSide {
  file?: File;
  latestSettings: SideSettings;
}

export type EncoderLabelGetter = (encoderState: EncoderState) => string;

export function getDisplaySettings(side: DisplaySettingsSide): SideSettings {
  return side.encodedSettings || side.latestSettings;
}

export function getSideTypeLabel(
  side: DisplayLabelSide,
  getEncoderLabel: EncoderLabelGetter,
): string {
  const encoderState = side.latestSettings.encoderState;
  if (encoderState) return getEncoderLabel(encoderState);

  return side.file ? side.file.name : 'Original Image';
}

export function shouldContainImage(side: DisplaySettingsSide): boolean {
  const displaySettings = getDisplaySettings(side);
  const resizeSettings = displaySettings.processorState.resize;
  return Boolean(
    resizeSettings.enabled && resizeSettings.fitMethod === 'contain',
  );
}
