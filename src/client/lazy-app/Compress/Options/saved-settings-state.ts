import { hasSavedSideSettings } from '../saved-settings';
import type { SideIndex } from '../side-state';

export interface SavedSideSettingsAvailability {
  hasLeftSideSettings: boolean;
  hasRightSideSettings: boolean;
}

export function getSavedSideSettingsAvailability(
  hasSettings = hasSavedSideSettings,
): SavedSideSettingsAvailability {
  return {
    hasLeftSideSettings: hasSettings('leftSideSettings'),
    hasRightSideSettings: hasSettings('rightSideSettings'),
  };
}

export function canImportSavedSideSettings(
  availability: SavedSideSettingsAvailability,
  index: SideIndex,
): boolean {
  return index === 0
    ? availability.hasLeftSideSettings
    : availability.hasRightSideSettings;
}
