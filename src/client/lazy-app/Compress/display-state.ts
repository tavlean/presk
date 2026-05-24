import type { SideSettings } from './saved-settings';

export interface DisplaySettingsSide {
  latestSettings: SideSettings;
  encodedSettings?: SideSettings;
}

export function getDisplaySettings(side: DisplaySettingsSide): SideSettings {
  return side.encodedSettings || side.latestSettings;
}

export function shouldContainImage(side: DisplaySettingsSide): boolean {
  const displaySettings = getDisplaySettings(side);
  const resizeSettings = displaySettings.processorState.resize;
  return Boolean(
    resizeSettings.enabled && resizeSettings.fitMethod === 'contain',
  );
}
